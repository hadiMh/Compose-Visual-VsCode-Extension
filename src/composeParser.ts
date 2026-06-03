import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { getDefaultComposeFilePatterns } from './settings';
import { findFileByBasename } from './utils/fileSystem';
import type { ComposeServiceNode, ComposeTreePayload, DependsOnEntry } from './types';

interface ComposeDocument {
    name?: string;
    services?: Record<string, ComposeServiceRaw>;
}

interface ComposeServiceRaw {
    depends_on?: string[] | Record<string, { condition?: string }>;
    healthcheck?: unknown;
    [key: string]: unknown;
}

export function resolveComposeFilePath(
    workspaceRoot: string,
    cwd: string | undefined,
    explicitFiles: string[]
): string | null {
    const baseDir = cwd && fs.existsSync(cwd) ? cwd : workspaceRoot;

    if (explicitFiles.length > 0) {
        for (const file of explicitFiles) {
            const found = findComposeFileInWorkspace(workspaceRoot, file, baseDir);
            if (found) {
                return found;
            }
        }
        return null;
    }

    for (const name of getDefaultComposeFilePatterns()) {
        const candidate = path.join(baseDir, name);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    if (baseDir !== workspaceRoot) {
        for (const name of getDefaultComposeFilePatterns()) {
            const candidate = path.join(workspaceRoot, name);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
    }

    const devCandidates = findDevComposeCandidates(baseDir).concat(
        findDevComposeCandidates(workspaceRoot)
    );
    for (const candidate of devCandidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

/** Resolve `-f docker-compose.dev.yml` against cwd, workspace root, or a recursive basename search. */
export function findComposeFileInWorkspace(
    workspaceRoot: string,
    fileRef: string,
    cwd?: string
): string | null {
    if (path.isAbsolute(fileRef) && fs.existsSync(fileRef)) {
        return fileRef;
    }

    const searchRoots = uniquePaths([
        cwd,
        workspaceRoot,
        ...getAllWorkspaceFolderPaths(),
    ]);

    for (const root of searchRoots) {
        const direct = path.join(root, fileRef);
        if (fs.existsSync(direct)) {
            return direct;
        }
    }

    const basename = path.basename(fileRef);
    for (const root of searchRoots) {
        const found = findFileByBasename(root, basename, 6);
        if (found) {
            return found;
        }
    }

    return null;
}

function getAllWorkspaceFolderPaths(): string[] {
    return (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
}

function uniquePaths(paths: (string | undefined)[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of paths) {
        if (!p || !fs.existsSync(p)) {
            continue;
        }
        const resolved = path.resolve(p);
        if (!seen.has(resolved)) {
            seen.add(resolved);
            out.push(resolved);
        }
    }
    return out;
}

function findDevComposeCandidates(dir: string): string[] {
    try {
        return fs
            .readdirSync(dir)
            .filter((f) => /^docker-compose\..*\.ya?ml$|^compose\..*\.ya?ml$/i.test(f))
            .map((f) => path.join(dir, f));
    } catch {
        return [];
    }
}

export function deriveProjectName(
    composePath: string,
    doc: ComposeDocument,
    cliProjectName?: string
): string {
    if (cliProjectName) {
        return cliProjectName;
    }
    if (doc.name && typeof doc.name === 'string') {
        return doc.name;
    }
    const dir = path.basename(path.dirname(composePath));
    return dir
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '')
        .replace(/^[^a-z0-9]+/, '') || 'compose';
}

function parseDependsOn(raw: ComposeServiceRaw['depends_on']): DependsOnEntry[] {
    if (!raw) {
        return [];
    }
    if (Array.isArray(raw)) {
        return raw.map((name) => ({ service: name }));
    }
    return Object.entries(raw).map(([service, value]) => ({
        service,
        condition: normalizeCondition(value?.condition),
    }));
}

function normalizeCondition(
    value: string | undefined
): DependsOnEntry['condition'] | undefined {
    if (
        value === 'service_started' ||
        value === 'service_healthy' ||
        value === 'service_completed_successfully'
    ) {
        return value;
    }
    return undefined;
}

function hasHealthcheck(service: ComposeServiceRaw): boolean {
    return service.healthcheck !== undefined && service.healthcheck !== null;
}

/**
 * Assigns each service a tier (0 = no dependencies) and groups parallel peers per tier.
 */
export function buildDependencyTiers(serviceNames: string[], dependsMap: Map<string, DependsOnEntry[]>): number[] {
    const tiers = new Map<string, number>();
    const visiting = new Set<string>();

    const visit = (name: string): number => {
        if (tiers.has(name)) {
            return tiers.get(name)!;
        }
        if (visiting.has(name)) {
            return 0;
        }
        visiting.add(name);
        const deps = dependsMap.get(name) ?? [];
        let maxDep = -1;
        for (const dep of deps) {
            if (serviceNames.includes(dep.service)) {
                maxDep = Math.max(maxDep, visit(dep.service));
            }
        }
        visiting.delete(name);
        const tier = maxDep + 1;
        tiers.set(name, tier);
        return tier;
    };

    for (const name of serviceNames) {
        visit(name);
    }

    return serviceNames.map((name) => tiers.get(name) ?? 0);
}

export function parseComposeFile(
    composePath: string,
    cliProjectName?: string
): ComposeTreePayload {
    const content = fs.readFileSync(composePath, 'utf8');
    const doc = yaml.load(content) as ComposeDocument;

    if (!doc || typeof doc !== 'object') {
        throw new Error('Compose file is empty or invalid.');
    }

    const services = doc.services;
    if (!services || typeof services !== 'object' || Object.keys(services).length === 0) {
        throw new Error('No services found under `services:` in compose file.');
    }

    const serviceNames = Object.keys(services);
    const dependsMap = new Map<string, DependsOnEntry[]>();
    const healthMap = new Map<string, boolean>();

    for (const [name, raw] of Object.entries(services)) {
        dependsMap.set(name, parseDependsOn(raw.depends_on));
        healthMap.set(name, hasHealthcheck(raw));
    }

    const tierNumbers = buildDependencyTiers(serviceNames, dependsMap);
    const maxTier = Math.max(...tierNumbers, 0);
    const tiers: ComposeServiceNode[][] = Array.from({ length: maxTier + 1 }, () => []);

    serviceNames.forEach((name, index) => {
        const tier = tierNumbers[index];
        tiers[tier].push({
            name,
            dependsOn: dependsMap.get(name) ?? [],
            tier,
            state: 'pending',
            hasHealthcheck: healthMap.get(name) ?? false,
        });
    });

    return {
        projectName: deriveProjectName(composePath, doc, cliProjectName),
        composeFile: composePath,
        composeDir: path.dirname(composePath),
        envFiles: [],
        tiers,
        totalServices: serviceNames.length,
    };
}
