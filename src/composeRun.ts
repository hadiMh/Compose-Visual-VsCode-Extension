import * as path from 'path';
import * as vscode from 'vscode';
import { parseComposeAppendArgs } from './commandParser';
import { scheduleTerminalCommand } from './composeTerminal';

export function toRelativeComposePath(baseDir: string, filePath: string): string {
    if (!path.isAbsolute(filePath)) {
        return filePath;
    }
    const rel = path.relative(baseDir, filePath);
    return rel && !rel.startsWith('..') ? rel : filePath;
}

export function quoteShellArg(value: string): string {
    return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

/** Build `docker compose -f <file> <extra>`; appends `up` when missing from extras. */
export function buildComposeUpCommand(composeFile: string, extraArgs: string): string {
    const composeDir = path.dirname(composeFile);
    const relFile = toRelativeComposePath(composeDir, composeFile);
    const trimmed = extraArgs.trim();
    const suffix = trimmed && /\bup\b/i.test(trimmed) ? trimmed : trimmed ? `${trimmed} up` : 'up';
    return `docker compose -f ${quoteShellArg(relFile)} ${suffix}`.trim();
}

export interface RunComposeUpResult {
    terminal: vscode.Terminal;
    parsed: ReturnType<typeof parseComposeAppendArgs>;
    command: string;
}

/** Start compose up in a hidden integrated terminal (not shown to the user). */
export function runComposeUpInHiddenTerminal(
    composeFile: string,
    extraArgs: string
): RunComposeUpResult {
    const composeDir = path.dirname(composeFile);
    const command = buildComposeUpCommand(composeFile, extraArgs);
    const parsed = parseComposeAppendArgs(extraArgs);

    const terminal = vscode.window.createTerminal({
        name: `Compose Visual · ${path.basename(composeFile)}`,
        cwd: composeDir,
        hideFromUser: true,
    });

    scheduleTerminalCommand(terminal, command);

    return { terminal, parsed, command };
}

/** Build `docker compose -f <file> … down` using the same file, env, and project as tracking. */
export function buildComposeDownCommand(
    composeFile: string,
    projectName?: string,
    envFiles: string[] = []
): string {
    const composeDir = path.dirname(composeFile);
    const relFile = toRelativeComposePath(composeDir, composeFile);
    const parts = ['docker', 'compose'];

    for (const envFile of envFiles) {
        parts.push('--env-file', quoteShellArg(toRelativeComposePath(composeDir, envFile)));
    }

    parts.push('-f', quoteShellArg(relFile));

    if (projectName) {
        parts.push('-p', quoteShellArg(projectName));
    }

    parts.push('down');
    return parts.join(' ');
}

/** Stop the stack in a hidden terminal (not shown to the user). */
export function runComposeDownInHiddenTerminal(
    composeFile: string,
    projectName?: string,
    envFiles: string[] = []
): vscode.Terminal {
    const composeDir = path.dirname(composeFile);
    const command = buildComposeDownCommand(composeFile, projectName, envFiles);

    const terminal = vscode.window.createTerminal({
        name: `Compose Visual · down`,
        cwd: composeDir,
        hideFromUser: true,
    });

    scheduleTerminalCommand(terminal, command);
    return terminal;
}
