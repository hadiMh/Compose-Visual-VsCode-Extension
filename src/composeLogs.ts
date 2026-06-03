import * as path from 'path';
import * as vscode from 'vscode';
import { execDocker } from './dockerTracker';
import { isLogsFollowEnabled, isReuseLogsTerminalEnabled } from './settings';
import { scheduleTerminalCommand } from './composeTerminal';

export interface ComposeLogsOptions {
    composeFile: string;
    serviceName: string;
    projectName: string;
}

const LOGS_TERMINAL_PREFIX = 'Compose Visual · ';

/** Resolve the container ID for a compose service in the tracked project. */
export async function resolveComposeServiceContainerId(
    projectName: string,
    serviceName: string
): Promise<string | undefined> {
    const serviceFilters = [
        '--filter',
        `label=com.docker.compose.project=${projectName}`,
        '--filter',
        `label=com.docker.compose.service=${serviceName}`,
    ];

    const { stdout: runningOut } = await execDocker([
        'ps',
        '-a',
        ...serviceFilters,
        '--filter',
        'status=running',
        '--format',
        '{{.ID}}',
    ]);
    const runningIds = runningOut.trim().split('\n').filter(Boolean);
    if (runningIds.length) {
        return runningIds[0];
    }

    const { stdout } = await execDocker(['ps', '-a', ...serviceFilters, '--format', '{{.ID}}']);
    const ids = stdout.trim().split('\n').filter(Boolean);
    return ids[0];
}

export function buildDockerLogsExec(containerId: string): { executable: string; args: string[] } {
    const args = ['logs'];
    if (isLogsFollowEnabled()) {
        args.push('-f');
    } else {
        args.push('--tail', '200');
    }
    args.push(containerId);
    return { executable: 'docker', args };
}

export async function openServiceLogsTerminal(options: ComposeLogsOptions): Promise<void> {
    const composeDir = path.dirname(options.composeFile);
    const terminalName = `${LOGS_TERMINAL_PREFIX}${options.serviceName} logs`;

    let terminal: vscode.Terminal | undefined;
    if (isReuseLogsTerminalEnabled()) {
        terminal = vscode.window.terminals.find((t) => t.name === terminalName);
    }
    if (!terminal) {
        const name = isReuseLogsTerminalEnabled()
            ? terminalName
            : `${terminalName} ${Date.now()}`;
        // Hidden while the shell profile runs; shown once docker logs is scheduled.
        terminal = vscode.window.createTerminal({
            name,
            cwd: composeDir,
            hideFromUser: true,
        });
    }

    const containerIdPromise = resolveComposeServiceContainerId(
        options.projectName,
        options.serviceName
    );

    const containerId = await containerIdPromise;
    if (!containerId) {
        throw new Error(
            `No container found for service "${options.serviceName}" in project "${options.projectName}". Is the stack running?`
        );
    }

    const { executable, args } = buildDockerLogsExec(containerId);
    scheduleTerminalCommand(terminal, { kind: 'exec', executable, args }, { immediate: true });
    terminal.show();
}
