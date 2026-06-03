import * as fs from 'fs';
import * as path from 'path';
import { execDocker } from './dockerTracker';
import { findFileByBasename } from './utils/fileSystem';

export interface RunningComposeProject {
    name: string;
    configFiles: string[];
    status: string;
}

export async function listRunningComposeProjects(): Promise<RunningComposeProject[]> {
    try {
        const { stdout } = await execDocker(['compose', 'ls', '--format', 'json']);
        const lines = stdout.trim().split('\n').filter(Boolean);
        const projects: RunningComposeProject[] = [];

        for (const line of lines) {
            const row = JSON.parse(line) as {
                Name?: string;
                Status?: string;
                ConfigFiles?: string;
            };
            if (!row.Name) {
                continue;
            }
            const status = (row.Status ?? '').toLowerCase();
            if (!status.includes('running')) {
                continue;
            }
            const configFiles = (row.ConfigFiles ?? '')
                .split(',')
                .map((f) => f.trim())
                .filter(Boolean);
            projects.push({
                name: row.Name,
                configFiles,
                status: row.Status ?? '',
            });
        }
        return projects;
    } catch {
        return [];
    }
}

export function findAllProjectsForWorkspace(
    projects: RunningComposeProject[],
    workspaceRoot: string
): RunningComposeProject[] {
    const root = path.resolve(workspaceRoot);
    const matches: RunningComposeProject[] = [];

    for (const project of projects) {
        const localized = project.configFiles
            .map((f) => findConfigFileUnderWorkspace(root, path.basename(f), f))
            .filter((f): f is string => f !== null);
        if (localized.length > 0) {
            matches.push({ ...project, configFiles: localized });
            continue;
        }
        const inRoot = project.configFiles.some((f) => {
            const resolved = path.resolve(f);
            return resolved === root || resolved.startsWith(root + path.sep);
        });
        if (inRoot) {
            matches.push(project);
        }
    }

    return matches;
}

export interface RunningStackPickHints {
    preferredComposeBasenames?: string[];
    projectName?: string;
}

/** Pick the running stack to track; auto-selects when exactly one stack matches the workspace. */
export function pickRunningProjectForTracking(
    projects: RunningComposeProject[],
    workspaceRoot: string,
    hints: RunningStackPickHints = {}
): RunningComposeProject | undefined {
    const preferred = hints.preferredComposeBasenames ?? [];
    const inWorkspace = findAllProjectsForWorkspace(projects, workspaceRoot);
    if (inWorkspace.length === 0) {
        return undefined;
    }

    if (hints.projectName) {
        const byName = inWorkspace.filter((p) => p.name === hints.projectName);
        if (byName.length === 1) {
            return byName[0];
        }
    }

    if (preferred.length > 0) {
        for (const project of inWorkspace) {
            for (const configFile of project.configFiles) {
                const base = path.basename(configFile);
                if (preferred.includes(base)) {
                    return { ...project, configFiles: [configFile] };
                }
            }
        }
    }

    if (inWorkspace.length === 1) {
        return inWorkspace[0];
    }

    return undefined;
}

export async function waitForRunningStackInWorkspace(
    workspaceRoot: string,
    hints: RunningStackPickHints = {},
    options?: { attempts?: number; delayMs?: number }
): Promise<RunningComposeProject | undefined> {
    const attempts = options?.attempts ?? 10;
    const delayMs = options?.delayMs ?? 400;

    for (let i = 0; i < attempts; i++) {
        const projects = await listRunningComposeProjects();
        const match = pickRunningProjectForTracking(projects, workspaceRoot, hints);
        if (match) {
            return match;
        }
        if (i < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    return undefined;
}

export function findProjectForWorkspace(
    projects: RunningComposeProject[],
    workspaceRoot: string,
    preferredComposeBasenames: string[] = []
): RunningComposeProject | undefined {
    return pickRunningProjectForTracking(projects, workspaceRoot, {
        preferredComposeBasenames,
    });
}

function findConfigFileUnderWorkspace(
    workspaceRoot: string,
    basename: string,
    dockerReportedPath: string
): string | null {
    const resolved = path.resolve(dockerReportedPath);
    if (fs.existsSync(resolved) && resolved.startsWith(workspaceRoot + path.sep)) {
        return resolved;
    }

    return findFileByBasename(workspaceRoot, basename, 6);
}

const COMPOSE_YAML_NAME = /^docker-compose.*\.ya?ml$|^compose.*\.ya?ml$/i;

/** List compose YAML files in the workspace root only (fast path for the file picker). */
export function discoverComposeFilesAtWorkspaceRoot(workspaceRoot: string): string[] {
    const found = listComposeYamlFilesInDir(workspaceRoot);
    return found.sort((a, b) => scoreComposeFile(a, workspaceRoot) - scoreComposeFile(b, workspaceRoot));
}

function listComposeYamlFilesInDir(dir: string): string[] {
    const found: string[] = [];
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return found;
    }
    for (const entry of entries) {
        if (entry.isFile() && COMPOSE_YAML_NAME.test(entry.name)) {
            found.push(path.join(dir, entry.name));
        }
    }
    return found;
}

export function discoverComposeFilesInWorkspace(workspaceRoot: string): string[] {
    const rootFiles = discoverComposeFilesAtWorkspaceRoot(workspaceRoot);
    if (rootFiles.length > 0) {
        return rootFiles;
    }

    const found: string[] = [];
    const skipDirs = new Set(['node_modules', '.git', 'out', 'dist', '.venv', 'vendor']);

    function walk(dir: string, depth: number): void {
        if (depth > 2) {
            return;
        }
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!skipDirs.has(entry.name)) {
                    walk(full, depth + 1);
                }
                continue;
            }
            if (COMPOSE_YAML_NAME.test(entry.name)) {
                found.push(full);
            }
        }
    }

    walk(workspaceRoot, 0);
    return found.sort((a, b) => scoreComposeFile(a, workspaceRoot) - scoreComposeFile(b, workspaceRoot));
}

function scoreComposeFile(filePath: string, workspaceRoot: string): number {
    const base = path.basename(filePath).toLowerCase();
    const depth = filePath.split(path.sep).length - workspaceRoot.split(path.sep).length;
    let score = depth * 10;
    if (base === 'compose.yaml') {
        score -= 5;
    }
    if (base === 'docker-compose.yml') {
        score -= 4;
    }
    if (base.includes('.dev.')) {
        score -= 3;
    }
    return score;
}
