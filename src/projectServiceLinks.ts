import * as fs from 'fs';
import * as path from 'path';
import type { ServiceLink } from './types';

export const DOCKER_COMPOSE_FLOW_DIR_NAME = '.composeVisual';
export const SERVICE_LINKS_FILE_NAME = 'service-links.json';

export type ProjectServiceLinksFile = Record<string, ServiceLink[]>;

export function getDockerComposeFlowDir(workspaceRoot: string): string {
    return path.join(workspaceRoot, DOCKER_COMPOSE_FLOW_DIR_NAME);
}

export function getServiceLinksFilePath(workspaceRoot: string): string {
    return path.join(getDockerComposeFlowDir(workspaceRoot), SERVICE_LINKS_FILE_NAME);
}

function normalizeLinkEntry(entry: unknown): ServiceLink | undefined {
    if (!entry || typeof entry !== 'object') {
        return undefined;
    }
    const raw = entry as { label?: unknown; url?: unknown };
    if (typeof raw.url !== 'string') {
        return undefined;
    }
    const url = raw.url.trim();
    if (!url) {
        return undefined;
    }
    const label =
        typeof raw.label === 'string' && raw.label.trim()
            ? raw.label.trim()
            : url.replace(/^https?:\/\//i, '');
    return { label, url };
}

function normalizeProjectLinks(raw: unknown): ProjectServiceLinksFile {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }
    const out: ProjectServiceLinksFile = {};
    for (const [service, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!service.trim()) {
            continue;
        }
        const entries = Array.isArray(value) ? value : [value];
        const links: ServiceLink[] = [];
        for (const entry of entries) {
            const link = normalizeLinkEntry(entry);
            if (link) {
                links.push(link);
            }
        }
        if (links.length > 0) {
            out[service] = links;
        }
    }
    return out;
}

export function readProjectServiceLinks(workspaceRoot: string): ProjectServiceLinksFile {
    const filePath = getServiceLinksFilePath(workspaceRoot);
    if (!fs.existsSync(filePath)) {
        return {};
    }
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
        return normalizeProjectLinks(raw);
    } catch {
        return {};
    }
}

export function buildDisplayServiceLinksMap(
    serviceNames: string[],
    workspaceRoot: string | undefined
): Record<string, ServiceLink[]> {
    const project = workspaceRoot ? readProjectServiceLinks(workspaceRoot) : {};
    const out: Record<string, ServiceLink[]> = {};
    for (const name of serviceNames) {
        if (project[name]?.length) {
            out[name] = project[name];
        }
    }
    return out;
}

export async function writeServiceLinksForService(
    workspaceRoot: string,
    service: string,
    links: ServiceLink[]
): Promise<void> {
    const dir = getDockerComposeFlowDir(workspaceRoot);
    await fs.promises.mkdir(dir, { recursive: true });

    const all = readProjectServiceLinks(workspaceRoot);
    const normalized: ServiceLink[] = [];
    for (const entry of links) {
        const link = normalizeLinkEntry(entry);
        if (link) {
            normalized.push(link);
        }
    }

    if (normalized.length === 0) {
        delete all[service];
    } else {
        all[service] = normalized;
    }

    const filePath = getServiceLinksFilePath(workspaceRoot);
    await fs.promises.writeFile(filePath, `${JSON.stringify(all, null, 2)}\n`, 'utf8');
}
