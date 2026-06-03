import * as vscode from 'vscode';
import {
    extractComposeCommandsFromText,
    isComposeUpCommand,
    parseComposeUpCommandWithCustom,
    type ParsedComposeUpCommand,
} from './commandParser';

export interface TerminalComposeContext {
    terminal: vscode.Terminal;
    commandLine: string;
    parsed: ParsedComposeUpCommand;
    cwd?: string;
}

type ComposeHandler = (ctx: TerminalComposeContext) => void;

const DEDUPE_MS = 2500;

export class TerminalComposeSniffer {
    private readonly recentCommands = new Map<string, number>();

    constructor(private readonly onComposeUp: ComposeHandler) {}

    attach(context: vscode.ExtensionContext): void {
        for (const terminal of vscode.window.terminals) {
            this.registerTerminal(terminal);
        }

        context.subscriptions.push(
            vscode.window.onDidOpenTerminal((terminal) => this.registerTerminal(terminal))
        );

        context.subscriptions.push(
            vscode.window.onDidChangeTerminalShellIntegration(({ terminal }) => {
                this.registerTerminal(terminal);
            })
        );

        context.subscriptions.push(
            vscode.window.onDidStartTerminalShellExecution((event) => {
                this.handleShellExecutionStart(event);
            })
        );

        context.subscriptions.push(
            vscode.window.onDidEndTerminalShellExecution((event) => {
                const commandLine = event.execution.commandLine?.value?.trim() ?? '';
                const cwd = this.resolveCwd(event);
                if (commandLine) {
                    this.evaluateCommandLine(event.terminal, commandLine, cwd);
                }
            })
        );
    }

    private registerTerminal(terminal: vscode.Terminal): void {
        if (!terminal.shellIntegration) {
            return;
        }
        // Shell integration available — global execution listeners will handle commands.
    }

    private handleShellExecutionStart(event: vscode.TerminalShellExecutionStartEvent): void {
        const commandLine = event.execution.commandLine?.value?.trim() ?? '';
        const cwd = this.resolveCwd(event);

        if (commandLine) {
            this.evaluateCommandLine(event.terminal, commandLine, cwd);
        }

        void this.sniffExecutionStream(event.execution, event.terminal, cwd);
    }

    private async sniffExecutionStream(
        execution: vscode.TerminalShellExecution,
        terminal: vscode.Terminal,
        cwd?: string
    ): Promise<void> {
        try {
            for await (const chunk of execution.read()) {
                const commands = extractComposeCommandsFromText(chunk);
                for (const cmd of commands) {
                    this.evaluateCommandLine(terminal, cmd, cwd);
                }
            }
        } catch {
            // Stream may end when terminal closes or execution completes
        }
    }

    private evaluateCommandLine(terminal: vscode.Terminal, commandLine: string, cwd?: string): void {
        if (!isComposeUpCommand(commandLine)) {
            return;
        }

        const parsed = parseComposeUpCommandWithCustom(commandLine);
        if (!parsed) {
            return;
        }

        const dedupeKey = `${terminal.name}:${parsed.raw}`;
        const now = Date.now();
        const last = this.recentCommands.get(dedupeKey);
        if (last && now - last < DEDUPE_MS) {
            return;
        }
        this.recentCommands.set(dedupeKey, now);

        this.onComposeUp({
            terminal,
            commandLine: parsed.raw,
            parsed,
            cwd,
        });
    }

    private resolveCwd(event: {
        execution: vscode.TerminalShellExecution;
        terminal: vscode.Terminal;
    }): string | undefined {
        return (
            event.execution.cwd?.fsPath ??
            event.terminal.shellIntegration?.cwd?.fsPath
        );
    }

}
