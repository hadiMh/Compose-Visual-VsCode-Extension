import type { ServicePortLink } from './types';

interface PortBinding {
    HostIp?: string;
    HostPort?: string;
}

export interface DockerInspectWithPorts {
    Config?: {
        Labels?: Record<string, string>;
    };
    NetworkSettings?: {
        Ports?: Record<string, PortBinding[] | null>;
    };
}

/** Extract host-published TCP ports from `docker inspect` network settings. */
export function extractPublishedPorts(container: DockerInspectWithPorts): ServicePortLink[] {
    const portMap = container.NetworkSettings?.Ports;
    if (!portMap) {
        return [];
    }

    const links: ServicePortLink[] = [];
    const seenHostPorts = new Set<number>();

    for (const [containerKey, bindings] of Object.entries(portMap)) {
        if (!bindings?.length) {
            continue;
        }
        if (containerKey.endsWith('/udp')) {
            continue;
        }

        const containerPort = containerKey.split('/')[0] ?? containerKey;

        for (const binding of bindings) {
            const hostPortRaw = binding.HostPort?.trim();
            if (!hostPortRaw) {
                continue;
            }
            const hostPort = Number.parseInt(hostPortRaw, 10);
            if (!Number.isFinite(hostPort) || hostPort <= 0 || seenHostPorts.has(hostPort)) {
                continue;
            }
            seenHostPorts.add(hostPort);

            const url = localhostHttpUrl(hostPort);
            const label =
                containerPort && containerPort !== String(hostPort)
                    ? `${hostPort}→${containerPort}`
                    : `:${hostPort}`;

            links.push({ label, url, hostPort });
        }
    }

    links.sort((a, b) => a.hostPort - b.hostPort);
    return links;
}

/** Build per-service published port map from inspect results. */
export function buildServicePortsMap(
    containers: DockerInspectWithPorts[],
    serviceNames: string[]
): Record<string, ServicePortLink[]> {
    const out: Record<string, ServicePortLink[]> = {};

    for (const container of containers) {
        const service = container.Config?.Labels?.['com.docker.compose.service'];
        if (!service || !serviceNames.includes(service)) {
            continue;
        }

        const ports = extractPublishedPorts(container);
        if (ports.length === 0) {
            continue;
        }

        const existing = out[service] ?? [];
        const merged = [...existing];
        for (const port of ports) {
            if (!merged.some((p) => p.hostPort === port.hostPort)) {
                merged.push(port);
            }
        }
        merged.sort((a, b) => a.hostPort - b.hostPort);
        out[service] = merged;
    }

    return out;
}

/** URL opened when a published port button is clicked. */
export function localhostHttpUrl(hostPort: number | string): string {
    const port = typeof hostPort === 'number' ? hostPort : Number.parseInt(String(hostPort), 10);
    if (!Number.isFinite(port) || port <= 0) {
        return 'http://localhost';
    }
    return `http://localhost:${port}`;
}
