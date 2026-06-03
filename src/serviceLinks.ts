import * as vscode from 'vscode';
import { getComposeFlowConfig } from './settings';
import { localhostHttpUrl } from './servicePorts';
import type { ServiceLink } from './types';

function normalizeOpenUrl(url: string): string | undefined {
    const trimmed = url.trim();
    if (!trimmed) {
        return undefined;
    }
    if (/^\d+$/.test(trimmed)) {
        return localhostHttpUrl(trimmed);
    }
    if (/^:\d+$/.test(trimmed)) {
        return localhostHttpUrl(trimmed.slice(1));
    }
    if (/^localhost(:\d+)?$/i.test(trimmed)) {
        return trimmed.includes(':') ? `http://${trimmed}` : 'http://localhost';
    }
    if (/^127\.0\.0\.1:\d+$/.test(trimmed)) {
        return `http://${trimmed}`;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
        return `http://${trimmed}`;
    }
    // Port buttons should always use plain HTTP on localhost.
    if (/^https:\/\/localhost(:\d+)?/i.test(trimmed)) {
        return trimmed.replace(/^https:/i, 'http:');
    }
    return trimmed;
}

type RawLinkEntry = string | { label?: string; url: string };
type RawServiceLinks = Record<string, RawLinkEntry | RawLinkEntry[]>;

function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) {
        return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `http://${trimmed}`;
}

function labelFromUrl(url: string): string {
    try {
        const parsed = new URL(url);
        if (parsed.port) {
            return `${parsed.hostname}:${parsed.port}`;
        }
        return parsed.hostname || url;
    } catch {
        return url.replace(/^https?:\/\//i, '');
    }
}

function parseLinkEntry(entry: unknown): ServiceLink | undefined {
    if (typeof entry === 'string') {
        const url = normalizeUrl(entry);
        if (!url) {
            return undefined;
        }
        return { label: labelFromUrl(url), url };
    }
    if (entry && typeof entry === 'object' && 'url' in entry) {
        const raw = entry as { label?: string; url: unknown };
        if (typeof raw.url !== 'string') {
            return undefined;
        }
        const url = normalizeUrl(raw.url);
        if (!url) {
            return undefined;
        }
        const label =
            typeof raw.label === 'string' && raw.label.trim()
                ? raw.label.trim()
                : labelFromUrl(url);
        return { label, url };
    }
    return undefined;
}

function parseServiceEntry(_service: string, value: unknown): ServiceLink[] {
    if (value == null) {
        return [];
    }
    const entries = Array.isArray(value) ? value : [value];
    const links: ServiceLink[] = [];
    for (const entry of entries) {
        const link = parseLinkEntry(entry);
        if (link) {
            links.push(link);
        }
    }
    return links;
}

/** Read `composeVisual.serviceLinks` from workspace settings. */
export function readServiceLinksFromConfig(): Record<string, ServiceLink[]> {
    const raw = getComposeFlowConfig().get<RawServiceLinks>('serviceLinks', {});

    const out: Record<string, ServiceLink[]> = {};
    for (const [service, value] of Object.entries(raw)) {
        const links = parseServiceEntry(service, value);
        if (links.length > 0) {
            out[service] = links;
        }
    }
    return out;
}

/** Map configured links onto known compose service names (case-sensitive). */
export function buildServiceLinksMap(serviceNames: string[]): Record<string, ServiceLink[]> {
    const configured = readServiceLinksFromConfig();
    const out: Record<string, ServiceLink[]> = {};
    for (const name of serviceNames) {
        if (configured[name]?.length) {
            out[name] = configured[name];
        }
    }
    return out;
}

export async function openServiceUrl(url: string, forceExternal = false): Promise<void> {
    const normalized = normalizeOpenUrl(url);
    if (!normalized) {
        void vscode.window.showWarningMessage('Compose Visual: invalid link URL.');
        return;
    }

    const external =
        forceExternal ||
        getComposeFlowConfig().get<boolean>('openLinksInExternalBrowser', false);

    const uri = vscode.Uri.parse(normalized);

    async function openInBrowser(): Promise<boolean> {
        return vscode.env.openExternal(uri);
    }

    if (external) {
        const ok = await openInBrowser();
        if (!ok) {
            void vscode.window.showWarningMessage(`Compose Visual: could not open ${normalized}`);
        }
        return;
    }

    try {
        await vscode.commands.executeCommand('simpleBrowser.show', uri);
    } catch {
        const ok = await openInBrowser();
        if (!ok) {
            void vscode.window.showWarningMessage(`Compose Visual: could not open ${normalized}`);
        }
    }
}
