import { spawn, ChildProcess } from 'child_process';
import { buildServicePortsMap } from './servicePorts';
import { getHealthPollIntervalMs, normalizeTrackerState, shouldCountStateAsUp } from './settings';
import type { ComposeServiceNode, ServiceNodeState, ServicePortLink } from './types';

export interface DockerTrackerCallbacks {
    onServiceState: (service: string, state: ServiceNodeState) => void;
    onProgress: (up: number, total: number) => void;
    onError: (message: string) => void;
    onDockerUnavailable?: () => void;
    onServicePorts?: (ports: Record<string, ServicePortLink[]>) => void;
}

interface DockerEventLine {
    status?: string;
    Action?: string;
    Actor?: {
        Attributes?: Record<string, string>;
    };
}

interface DockerInspectContainer {
    State?: {
        Status?: string;
        ExitCode?: number;
        Health?: { Status?: string };
    };
    Config?: {
        Labels?: Record<string, string>;
    };
    NetworkSettings?: {
        Ports?: Record<string, { HostIp?: string; HostPort?: string }[] | null>;
    };
}

const TERMINAL_STATES: ServiceNodeState[] = ['healthy', 'running', 'stopped', 'error', 'unhealthy'];
/** Allow stopped/error to replace running; block downgrade from error to stopped. */
function shouldApplyStateChange(prev: ServiceNodeState | undefined, next: ServiceNodeState): boolean {
    if (!prev) {
        return true;
    }
    if (prev === next) {
        return false;
    }
    if (next === 'error' || next === 'unhealthy') {
        return true;
    }
    if (next === 'stopped' && prev !== 'error' && prev !== 'unhealthy') {
        return true;
    }
    return statePriority(next) >= statePriority(prev) || !TERMINAL_STATES.includes(prev);
}

export class DockerEventTracker {
    private proc?: ChildProcess;
    private healthPollTimer?: NodeJS.Timeout;
    private reconcileInFlight = false;
    private readonly states = new Map<string, ServiceNodeState>();
    private readonly hasHealthcheck = new Map<string, boolean>();
    private serviceNames: string[] = [];
    private total = 0;
    private stopped = false;
    private lastPortsSnapshot = '';

    constructor(
        private readonly projectName: string,
        private readonly callbacks: DockerTrackerCallbacks
    ) {}

    start(services: ComposeServiceNode[]): void {
        this.stop();
        this.stopped = false;
        this.serviceNames = services.map((s) => s.name);
        this.total = this.serviceNames.length;

        for (const service of services) {
            this.states.set(service.name, 'pending');
            this.hasHealthcheck.set(service.name, service.hasHealthcheck);
        }

        void this.reconcileContainerStates();
        this.startEventStream();
        this.healthPollTimer = setInterval(
            () => void this.reconcileContainerStates(),
            getHealthPollIntervalMs()
        );
    }

    stop(): void {
        this.stopped = true;
        if (this.healthPollTimer) {
            clearInterval(this.healthPollTimer);
            this.healthPollTimer = undefined;
        }
        if (this.proc) {
            this.proc.kill();
            this.proc = undefined;
        }
    }

    /** Run an immediate health/container reconcile (e.g. when the compose terminal closes). */
    reconcileNow(): void {
        void this.reconcileContainerStates();
    }

    private startEventStream(): void {
        const args = [
            'events',
            '--filter',
            'type=container',
            '--filter',
            `label=com.docker.compose.project=${this.projectName}`,
            '--format',
            '{{json .}}',
        ];

        let proc: ChildProcess;
        try {
            proc = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
            this.proc = proc;
        } catch (err) {
            this.callbacks.onError(`Failed to start docker events: ${err}`);
            this.callbacks.onDockerUnavailable?.();
            return;
        }

        let buffer = '';

        proc.stdout?.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                if (line.trim()) {
                    this.handleEventLine(line);
                }
            }
        });

        proc.stderr?.on('data', (chunk: Buffer) => {
            const msg = chunk.toString().trim();
            if (msg && /cannot connect|permission denied|docker daemon/i.test(msg)) {
                this.callbacks.onError(msg);
                this.callbacks.onDockerUnavailable?.();
                this.stop();
            }
        });

        proc.on('error', (err) => {
            this.callbacks.onError(`Docker events error: ${err.message}`);
            this.callbacks.onDockerUnavailable?.();
        });

        proc.on('close', (code) => {
            if (!this.stopped && code !== 0 && code !== null) {
                this.callbacks.onDockerUnavailable?.();
            }
        });
    }

    private handleEventLine(line: string): void {
        let event: DockerEventLine;
        try {
            event = JSON.parse(line) as DockerEventLine;
        } catch {
            return;
        }

        const attrs = event.Actor?.Attributes ?? {};
        const service = attrs['com.docker.compose.service'];
        if (!service || !this.serviceNames.includes(service)) {
            return;
        }

        const status = (event.status ?? event.Action ?? '').toLowerCase();
        const healthStatus = attrs['health_status']?.toLowerCase();

        if (status.includes('health_status') || healthStatus) {
            if (healthStatus === 'healthy') {
                this.setState(service, 'healthy');
            } else if (healthStatus === 'unhealthy') {
                this.setState(service, 'unhealthy');
            } else {
                this.setState(service, 'healthcheck');
            }
            return;
        }

        switch (status) {
            case 'create':
                this.setState(service, 'creating');
                break;
            case 'start':
                this.setState(service, 'starting');
                void this.reconcileContainerStates();
                break;
            case 'restart':
                this.setState(service, 'starting');
                break;
            case 'die':
            case 'stop':
            case 'kill':
            case 'destroy':
            case 'remove':
                this.setState(service, 'stopped', true);
                break;
            case 'pause':
            case 'unpause':
                break;
            default:
                break;
        }
    }

    /**
     * Authoritative poll: inspect all project containers for runtime + health,
     * and mark services with no container as stopped.
     */
    private async reconcileContainerStates(): Promise<void> {
        if (this.stopped || this.reconcileInFlight) {
            return;
        }
        this.reconcileInFlight = true;

        try {
            const { stdout: psOut } = await execDocker([
                'ps',
                '-a',
                '--filter',
                `label=com.docker.compose.project=${this.projectName}`,
                '--format',
                '{{.ID}}',
            ]);

            const ids = psOut.trim().split('\n').filter(Boolean);
            const observed = new Map<string, ServiceNodeState>();

            if (ids.length === 0) {
                for (const name of this.serviceNames) {
                    this.setState(name, 'stopped', true);
                }
                this.emitServicePorts([]);
                this.emitProgress();
                return;
            }

            const { stdout: inspectOut } = await execDocker(['inspect', '--format', '{{json .}}', ...ids]);
            const containers = parseInspectOutput(inspectOut);

            for (const container of containers) {
                const service = container.Config?.Labels?.['com.docker.compose.service'];
                if (!service || !this.serviceNames.includes(service)) {
                    continue;
                }

                const state = stateFromInspect(
                    container,
                    this.hasHealthcheck.get(service) ?? false
                );
                const prev = observed.get(service);
                observed.set(service, prev ? mergeServiceStates(prev, state) : state);
            }

            for (const [service, state] of observed) {
                this.setState(service, state, true);
            }

            for (const name of this.serviceNames) {
                if (!observed.has(name)) {
                    this.setState(name, 'stopped', true);
                }
            }

            this.emitServicePorts(containers);
            this.emitProgress();
        } catch {
            // Docker may not be ready yet during early boot
        } finally {
            this.reconcileInFlight = false;
        }
    }

    private normalizeState(_service: string, state: ServiceNodeState): ServiceNodeState {
        return normalizeTrackerState(state);
    }

    private setState(service: string, state: ServiceNodeState, authoritative = false): void {
        state = this.normalizeState(service, state);

        const prev = this.states.get(service);
        if (prev === state) {
            return;
        }

        if (!authoritative && !shouldApplyStateChange(prev, state)) {
            return;
        }

        this.states.set(service, state);
        this.callbacks.onServiceState(service, state);
        this.emitProgress();
    }

    private emitServicePorts(containers: DockerInspectContainer[]): void {
        if (!this.callbacks.onServicePorts) {
            return;
        }
        const map = buildServicePortsMap(containers, this.serviceNames);
        const snapshot = JSON.stringify(map);
        if (snapshot === this.lastPortsSnapshot) {
            return;
        }
        this.lastPortsSnapshot = snapshot;
        this.callbacks.onServicePorts(map);
    }

    private emitProgress(): void {
        let up = 0;
        for (const name of this.serviceNames) {
            const s = this.states.get(name);
            if (shouldCountStateAsUp(s)) {
                up += 1;
            }
        }
        this.callbacks.onProgress(up, this.total);
    }
}

function parseInspectOutput(stdout: string): DockerInspectContainer[] {
    const trimmed = stdout.trim();
    if (!trimmed) {
        return [];
    }
    try {
        const parsed = JSON.parse(trimmed) as DockerInspectContainer | DockerInspectContainer[];
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        return trimmed
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line) as DockerInspectContainer);
    }
}

function stateFromInspect(
    container: DockerInspectContainer,
    hasConfiguredHealthcheck: boolean
): ServiceNodeState {
    const status = (container.State?.Status ?? '').toLowerCase();
    const exitCode = container.State?.ExitCode ?? 0;
    const health = container.State?.Health?.Status?.toLowerCase();

    if (status === 'exited' || status === 'dead') {
        return exitCode !== 0 ? 'error' : 'stopped';
    }
    if (status === 'created') {
        return 'creating';
    }
    if (status === 'restarting') {
        return 'starting';
    }
    if (status === 'paused' || status === 'removing') {
        return 'stopped';
    }
    if (status === 'running') {
        if (health === 'healthy') {
            return 'healthy';
        }
        if (health === 'unhealthy') {
            return 'unhealthy';
        }
        if (health === 'starting') {
            return 'healthcheck';
        }
        if (hasConfiguredHealthcheck && !health) {
            return 'healthcheck';
        }
        return 'healthy';
    }
    return 'stopped';
}

/** Prefer the least-healthy state when multiple containers map to one service. */
function mergeServiceStates(a: ServiceNodeState, b: ServiceNodeState): ServiceNodeState {
    const rank: Record<ServiceNodeState, number> = {
        error: 0,
        unhealthy: 1,
        stopped: 2,
        healthcheck: 3,
        starting: 4,
        creating: 5,
        pending: 6,
        running: 7,
        healthy: 8,
    };
    return rank[a] <= rank[b] ? a : b;
}

function statePriority(state: ServiceNodeState): number {
    const ranks: Record<ServiceNodeState, number> = {
        pending: 0,
        creating: 1,
        starting: 2,
        running: 3,
        healthcheck: 4,
        healthy: 5,
        unhealthy: 4,
        stopped: 1,
        error: 1,
    };
    return ranks[state];
}

export function execDocker(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const proc = spawn('docker', args);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (c) => (stdout += c.toString()));
        proc.stderr.on('data', (c) => (stderr += c.toString()));
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(stderr || `docker exited ${code}`));
            }
        });
    });
}
