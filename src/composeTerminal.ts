import * as vscode from 'vscode';
import { getLogsShellReadyDelayMs } from './settings';

export type TerminalCommand =
    | { kind: 'line'; command: string }
    | { kind: 'exec'; executable: string; args: string[] };

function commandToLine(cmd: TerminalCommand): string {
    if (cmd.kind === 'line') {
        return cmd.command;
    }
    const escaped = cmd.args.map((arg) => {
        if (!/\s/.test(arg)) {
            return arg;
        }
        if (!/['"`\\]/.test(arg)) {
            return `"${arg}"`;
        }
        return `'${arg.replace(/'/g, `'\\''`)}'`;
    });
    return [cmd.executable, ...escaped].join(' ');
}

export interface ScheduleTerminalCommandOptions {
    /**
     * For docker logs: use shell integration with no extra delay once available,
     * so logs start right away instead of waiting for profile hooks (venv, etc.).
     */
    immediate?: boolean;
}

/** Run a shell command in a terminal after shell integration / profile hooks settle. */
export function scheduleTerminalCommand(
    terminal: vscode.Terminal,
    cmd: string | TerminalCommand,
    options: ScheduleTerminalCommandOptions = {}
): void {
    const command: TerminalCommand =
        typeof cmd === 'string' ? { kind: 'line', command: cmd } : cmd;
    const immediate = !!options.immediate;

    const run = () => {
        const si = terminal.shellIntegration;
        if (command.kind === 'exec' && si?.executeCommand) {
            si.executeCommand(command.executable, command.args);
            return;
        }
        terminal.sendText(commandToLine(command), true);
    };

    const delayMs = immediate ? 0 : getLogsShellReadyDelayMs();
    const runAfterReady = () => {
        if (delayMs <= 0) {
            run();
            return;
        }
        setTimeout(run, delayMs);
    };

    if (terminal.shellIntegration) {
        runAfterReady();
        return;
    }

    let scheduled = false;
    const scheduleOnce = () => {
        if (scheduled) {
            return;
        }
        scheduled = true;
        cleanup();
        runAfterReady();
    };

    const sub = vscode.window.onDidChangeTerminalShellIntegration((e) => {
        if (e.terminal === terminal && e.shellIntegration) {
            scheduleOnce();
        }
    });

    const fallbackMs = immediate ? 2500 : 5000;
    const fallback = setTimeout(scheduleOnce, fallbackMs);

    function cleanup(): void {
        clearTimeout(fallback);
        sub.dispose();
    }
}
