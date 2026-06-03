import * as fs from 'fs';
import * as path from 'path';
import { getDockerComposeFlowDir } from './projectServiceLinks';
import type {
    GridColumnsSetting,
    MarkHealthyWhenSetting,
    ShowServiceLinksWhenSetting,
    WebviewSettingsPayload,
} from './types';

export const SIDEBAR_SETTINGS_FILE_NAME = 'sidebar-settings.json';

const GRID_COLUMNS: GridColumnsSetting[] = ['2', '3', 'auto'];
const LINKS_WHEN: ShowServiceLinksWhenSetting[] = ['healthy', 'running', 'healthcheck'];
const MARK_HEALTHY: MarkHealthyWhenSetting[] = ['healthy', 'running'];

export function getSidebarSettingsFilePath(workspaceRoot: string): string {
    return path.join(getDockerComposeFlowDir(workspaceRoot), SIDEBAR_SETTINGS_FILE_NAME);
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value)
        ? (value as T)
        : undefined;
}

/** Parse and validate stored sidebar settings (partial — only known keys). */
export function normalizeProjectSidebarSettings(raw: unknown): Partial<WebviewSettingsPayload> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }
    const o = raw as Record<string, unknown>;
    const out: Partial<WebviewSettingsPayload> = {};

    if (typeof o.composeFile === 'string') {
        const composeFile = o.composeFile.trim();
        if (composeFile) {
            out.composeFile = composeFile;
        }
    }
    if (typeof o.showComposeRunButton === 'boolean') {
        out.showComposeRunButton = o.showComposeRunButton;
    }
    if (typeof o.composeRunExtraArgs === 'string') {
        out.composeRunExtraArgs = o.composeRunExtraArgs.trim();
    }
    if (typeof o.showBootTimer === 'boolean') {
        out.showBootTimer = o.showBootTimer;
    }
    if (typeof o.showLogsButton === 'boolean') {
        out.showLogsButton = o.showLogsButton;
    }
    if (typeof o.showPortButtons === 'boolean') {
        out.showPortButtons = o.showPortButtons;
    }
    if (typeof o.showLegend === 'boolean') {
        out.showLegend = o.showLegend;
    }
    if (typeof o.showDependencyList === 'boolean') {
        out.showDependencyList = o.showDependencyList;
    }
    const grid = pickEnum(o.gridColumns, GRID_COLUMNS);
    if (grid) {
        out.gridColumns = grid;
    }
    if (typeof o.tierSeparator === 'boolean') {
        out.tierSeparator = o.tierSeparator;
    }
    const linksWhen = pickEnum(o.showServiceLinksWhen, LINKS_WHEN);
    if (linksWhen) {
        out.showServiceLinksWhen = linksWhen;
    }
    const markHealthy = pickEnum(o.markHealthyWhen, MARK_HEALTHY);
    if (markHealthy) {
        out.markHealthyWhen = markHealthy;
    }

    return out;
}

export function readProjectSidebarSettings(workspaceRoot: string): Partial<WebviewSettingsPayload> {
    const filePath = getSidebarSettingsFilePath(workspaceRoot);
    if (!fs.existsSync(filePath)) {
        return {};
    }
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
        return normalizeProjectSidebarSettings(raw);
    } catch {
        return {};
    }
}

export async function writeProjectSidebarSettings(
    workspaceRoot: string,
    settings: WebviewSettingsPayload
): Promise<void> {
    const dir = getDockerComposeFlowDir(workspaceRoot);
    await fs.promises.mkdir(dir, { recursive: true });
    const filePath = getSidebarSettingsFilePath(workspaceRoot);
    await fs.promises.writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
