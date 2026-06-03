import { getTerminalSnifferPatterns } from './settings';

export interface ParsedComposeUpCommand {
    composeFiles: string[];
    envFiles: string[];
    projectName?: string;
    detached: boolean;
    raw: string;
}

const COMPOSE_BIN_RE = /\b(docker\s+compose|docker-compose)\b/i;

/**
 * True when the line invokes compose with the `up` subcommand (any flag order).
 * Examples:
 *   docker compose --env-file .env.dev -f docker-compose.dev.yml up
 *   docker-compose -f compose.yml up -d --build
 */
export function isComposeUpCommand(commandLine: string): boolean {
    return parseComposeUpCommandWithCustom(commandLine) !== null;
}

/** Standard compose up parse, or a match against `composeVisual.terminalSnifferPatterns`. */
export function parseComposeUpCommandWithCustom(commandLine: string): ParsedComposeUpCommand | null {
    const parsed = parseComposeUpCommand(commandLine);
    if (parsed) {
        return parsed;
    }

    const raw = commandLine.trim();
    if (!raw) {
        return null;
    }

    for (const pattern of getTerminalSnifferPatterns()) {
        try {
            if (new RegExp(pattern, 'i').test(raw)) {
                return {
                    composeFiles: [],
                    envFiles: [],
                    detached: false,
                    raw,
                };
            }
        } catch {
            // Skip invalid regex in user settings
        }
    }

    return null;
}

/** Parse extra args appended after `-f <file>` (e.g. `--env-file .env.dev up -d`). */
export function parseComposeAppendArgs(extraArgs: string): ParsedComposeUpCommand {
    const trimmed = extraArgs.trim();
    const withUp = trimmed && /\bup\b/i.test(trimmed) ? trimmed : trimmed ? `${trimmed} up` : 'up';
    const synthetic = `docker compose ${withUp}`;
    return (
        parseComposeUpCommand(synthetic) ?? {
            composeFiles: [],
            envFiles: [],
            detached: /\b(-d|--detach)\b/i.test(withUp),
            raw: withUp,
        }
    );
}

export function parseComposeUpCommand(commandLine: string): ParsedComposeUpCommand | null {
    const raw = commandLine.trim();
    if (!raw || !COMPOSE_BIN_RE.test(raw)) {
        return null;
    }

    const tokens = tokenizeCommandLine(raw);
    const composeIndex = findComposeTokenIndex(tokens);
    if (composeIndex < 0) {
        return null;
    }

    const upIndex = findUpTokenIndex(tokens, composeIndex);
    if (upIndex < 0) {
        return null;
    }

    const composeFiles: string[] = [];
    const envFiles: string[] = [];
    let projectName: string | undefined;

    collectFlags(tokens, composeIndex + 1, tokens.length, composeFiles, envFiles, (name) => {
        projectName = name;
    });

    const detached =
        hasFlag(tokens, '-d') ||
        hasFlag(tokens, '--detach') ||
        hasFlagInRange(tokens, upIndex + 1, tokens.length, '-d', '--detach');

    return {
        composeFiles,
        envFiles,
        projectName,
        detached,
        raw,
    };
}

function tokenizeCommandLine(line: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let quote: '"' | "'" | null = null;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (quote) {
            if (ch === quote) {
                quote = null;
            } else {
                current += ch;
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (/\s/.test(ch)) {
            if (current) {
                tokens.push(current);
                current = '';
            }
            continue;
        }
        current += ch;
    }
    if (current) {
        tokens.push(current);
    }
    return tokens;
}

function findComposeTokenIndex(tokens: string[]): number {
    for (let i = 0; i < tokens.length; i++) {
        if (/^docker$/i.test(tokens[i]) && /^compose$/i.test(tokens[i + 1] ?? '')) {
            return i;
        }
        if (/^docker-compose$/i.test(tokens[i])) {
            return i;
        }
    }
    return -1;
}

function findUpTokenIndex(tokens: string[], afterCompose: number): number {
    const composeEnd =
        /^docker-compose$/i.test(tokens[afterCompose]) ? afterCompose + 1 : afterCompose + 2;

    for (let i = composeEnd; i < tokens.length; i++) {
        if (/^up$/i.test(tokens[i])) {
            return i;
        }
        if (/^(down|stop|rm|kill|pause|unpause|restart|logs|ps|build|pull|push|config|exec|run|watch)$/i.test(tokens[i])) {
            return -1;
        }
    }
    return -1;
}

function collectFlags(
    tokens: string[],
    start: number,
    end: number,
    composeFiles: string[],
    envFiles: string[],
    setProject: (name: string) => void
): void {
    for (let i = start; i < end; i++) {
        const t = tokens[i];
        if (t === '-f' || t === '--file') {
            const val = tokens[++i];
            if (val) {
                composeFiles.push(val);
            }
            continue;
        }
        if (t.startsWith('-f=') || t.startsWith('--file=')) {
            composeFiles.push(t.split('=').slice(1).join('='));
            continue;
        }
        if (t === '--env-file') {
            const val = tokens[++i];
            if (val) {
                envFiles.push(val);
            }
            continue;
        }
        if (t.startsWith('--env-file=')) {
            envFiles.push(t.slice('--env-file='.length));
            continue;
        }
        if (t === '-p' || t === '--project-name') {
            const val = tokens[++i];
            if (val) {
                setProject(val);
            }
            continue;
        }
        if (t.startsWith('-p=') || t.startsWith('--project-name=')) {
            setProject(t.split('=').slice(1).join('='));
        }
    }
}

function hasFlag(tokens: string[], flag: string): boolean {
    return tokens.includes(flag);
}

function hasFlagInRange(tokens: string[], start: number, end: number, ...flags: string[]): boolean {
    for (let i = start; i < end; i++) {
        if (flags.includes(tokens[i])) {
            return true;
        }
    }
    return false;
}

/** Pull likely full command lines from terminal output chunks (echoed input). */
export function extractComposeCommandsFromText(text: string): string[] {
    const plain = stripAnsi(text);
    const found: string[] = [];
    const lineRe =
        /(?:^|\n)\s*((?:docker\s+compose|docker-compose)(?:\s+(?:--?[\w-]+(?:=[^\s]+)?|[^\s-][^\s]*))*?\s+up(?:\s+(?:--?[\w-]+(?:=[^\s]+)?|[^\s-][^\s]*))*)/gi;

    let match: RegExpExecArray | null;
    while ((match = lineRe.exec(plain)) !== null) {
        const cmd = match[1].trim();
        if (isComposeUpCommand(cmd)) {
            found.push(cmd);
        }
    }
    return found;
}

function stripAnsi(text: string): string {
    return text
        .replace(/\x1b\][^\x07]*\x07/g, '')
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\r/g, '\n');
}
