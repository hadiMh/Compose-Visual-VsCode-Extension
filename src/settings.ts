import * as path from 'path';
import * as vscode from 'vscode';
import {
    readProjectSidebarSettings,
    writeProjectSidebarSettings,
} from './projectSidebarSettings';
import type {
    GridColumnsSetting,
    MarkHealthyWhenSetting,
    ServiceNodeState,
    ShowServiceLinksWhenSetting,
    WebviewSettingsPayload,
} from './types';

export type {
    GridColumnsSetting,
    MarkHealthyWhenSetting,
    ShowServiceLinksWhenSetting,
    WebviewSettingsPayload,
} from './types';

function getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getWebviewSettingsFromConfig(): WebviewSettingsPayload {
    const config = getComposeFlowConfig();
    const composeFile = config.get<string>('composeFile', '').trim();
    return {
        composeFile: composeFile || undefined,
        showComposeRunButton: config.get<boolean>('showComposeRunButton', false),
        composeRunExtraArgs: config.get<string>('composeRunExtraArgs', '').trim(),
        showBootTimer: config.get<boolean>('showBootTimer', true),
        showLogsButton: config.get<boolean>('showLogsButton', true),
        showPortButtons: config.get<boolean>('showPortButtons', true),
        showLegend: config.get<boolean>('showLegend', true),
        showDependencyList: config.get<boolean>('showDependencyList', true),
        gridColumns: config.get<GridColumnsSetting>('gridColumns', 'auto'),
        tierSeparator: config.get<boolean>('tierSeparator', true),
        showServiceLinksWhen: config.get<ShowServiceLinksWhenSetting>('showServiceLinksWhen', 'healthy'),
        markHealthyWhen: config.get<MarkHealthyWhenSetting>('markHealthyWhen', 'healthy'),
    };
}

export function isShowComposeRunButtonEnabled(): boolean {
    return getWebviewSettings().showComposeRunButton;
}

export function getComposeRunExtraArgs(): string {
    return getWebviewSettings().composeRunExtraArgs;
}

export function isShowPortButtonsEnabled(): boolean {
    return getWebviewSettings().showPortButtons;
}

const SECTION = 'composeVisual';

export function getComposeFlowConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(SECTION);
}

/** Workspace UI settings: VS Code defaults, overridden by `.composeVisual/sidebar-settings.json`. */
export function getWebviewSettings(): WebviewSettingsPayload {
    const merged = getWebviewSettingsFromConfig();
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return merged;
    }
    const project = readProjectSidebarSettings(workspaceRoot);
    return { ...merged, ...project };
}

export async function saveWebviewSettings(settings: WebviewSettingsPayload): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        throw new Error('Open a workspace folder to save Compose Visual settings.');
    }
    const existing = readProjectSidebarSettings(workspaceRoot);
    await writeProjectSidebarSettings(workspaceRoot, {
        ...settings,
        composeFile: settings.composeFile ?? existing.composeFile,
    });
}

/** Remember the compose file the user picked (workspace-relative path). */
export async function saveSelectedComposeFile(
    workspaceRoot: string,
    absoluteComposePath: string
): Promise<void> {
    const rel = path.relative(workspaceRoot, absoluteComposePath);
    const stored =
        rel && !rel.startsWith('..') && !path.isAbsolute(rel)
            ? rel.split(path.sep).join('/')
            : absoluteComposePath;

    const merged: WebviewSettingsPayload = {
        ...getWebviewSettings(),
        composeFile: stored,
    };
    await writeProjectSidebarSettings(workspaceRoot, merged);
    await getComposeFlowConfig().update(
        'composeFile',
        stored,
        vscode.ConfigurationTarget.Workspace
    );
}

export function isAutoTrackOnComposeUpEnabled(): boolean {
    return getComposeFlowConfig().get<boolean>('autoTrackOnComposeUp', true);
}

export function isAutoDiscoverRunningStackEnabled(): boolean {
    return getComposeFlowConfig().get<boolean>('autoDiscoverRunningStack', true);
}

export function getDiscoveryPollIntervalMs(): number {
    const seconds = getComposeFlowConfig().get<number>('discoveryPollIntervalSeconds', 6);
    return Math.max(2, seconds) * 1000;
}

export function getHealthPollIntervalMs(): number {
    const seconds = getComposeFlowConfig().get<number>('healthPollIntervalSeconds', 3);
    return Math.max(1, seconds) * 1000;
}

export function isReconcileOnTerminalCloseEnabled(): boolean {
    return getComposeFlowConfig().get<boolean>('reconcileOnTerminalClose', true);
}

export function getDefaultComposeFilePatterns(): string[] {
    const patterns = getComposeFlowConfig().get<string[]>('defaultComposeFilePatterns', [
        'compose.yaml',
        'compose.yml',
        'docker-compose.yaml',
        'docker-compose.yml',
    ]);
    return patterns.filter((p) => typeof p === 'string' && p.trim().length > 0);
}

export function getConfiguredProjectName(): string | undefined {
    const name = getComposeFlowConfig().get<string>('projectName', '').trim();
    return name || undefined;
}

export function getConfiguredComposeFile(): string | undefined {
    const file = getWebviewSettings().composeFile?.trim();
    return file || undefined;
}

export function getConfiguredEnvFiles(): string[] {
    const files = getComposeFlowConfig().get<string[]>('envFiles', []);
    return files.filter((f) => typeof f === 'string' && f.trim().length > 0);
}

export function getLogsShellReadyDelayMs(): number {
    const ms = getComposeFlowConfig().get<number>('logsShellReadyDelayMs', 900);
    return Math.max(0, ms);
}

export function isReuseLogsTerminalEnabled(): boolean {
    return getComposeFlowConfig().get<boolean>('reuseLogsTerminal', true);
}

export function isLogsFollowEnabled(): boolean {
    return getComposeFlowConfig().get<boolean>('logsFollow', true);
}

export function isShowStatusBarProgressEnabled(): boolean {
    return getComposeFlowConfig().get<boolean>('showStatusBarProgress', true);
}

export function getStatusBarPriority(): number {
    return getComposeFlowConfig().get<number>('statusBarPriority', 100);
}

export function isNotifyWhenStackReadyEnabled(): boolean {
    return getComposeFlowConfig().get<boolean>('notifyWhenStackReady', false);
}

export function getTerminalSnifferPatterns(): string[] {
    const patterns = getComposeFlowConfig().get<string[]>('terminalSnifferPatterns', []);
    return patterns.filter((p) => typeof p === 'string' && p.trim().length > 0);
}

export function getMarkHealthyWhen(): MarkHealthyWhenSetting {
    return getWebviewSettings().markHealthyWhen;
}

export function shouldCountStateAsUp(state: ServiceNodeState | undefined): boolean {
    if (!state) {
        return false;
    }
    const mode = getMarkHealthyWhen();
    if (mode === 'running') {
        return ['healthy', 'running', 'healthcheck'].includes(state);
    }
    return state === 'healthy' || state === 'running';
}

export function normalizeTrackerState(state: ServiceNodeState): ServiceNodeState {
    if (state === 'running' && getMarkHealthyWhen() === 'healthy') {
        return 'healthy';
    }
    return state;
}

const WEBVIEW_SETTING_KEYS = [
    'composeVisual.showComposeRunButton',
    'composeVisual.composeRunExtraArgs',
    'composeVisual.showBootTimer',
    'composeVisual.showLogsButton',
    'composeVisual.showPortButtons',
    'composeVisual.showLegend',
    'composeVisual.showDependencyList',
    'composeVisual.gridColumns',
    'composeVisual.tierSeparator',
    'composeVisual.showServiceLinksWhen',
    'composeVisual.markHealthyWhen',
] as const;

export function affectsWebviewSettings(event: vscode.ConfigurationChangeEvent): boolean {
    return WEBVIEW_SETTING_KEYS.some((key) => event.affectsConfiguration(key));
}

const TRACKING_SETTING_KEYS = [
    'composeVisual.autoTrackOnComposeUp',
    'composeVisual.autoDiscoverRunningStack',
    'composeVisual.discoveryPollIntervalSeconds',
] as const;

export function affectsTrackingSettings(event: vscode.ConfigurationChangeEvent): boolean {
    return TRACKING_SETTING_KEYS.some((key) => event.affectsConfiguration(key));
}

const STATUS_BAR_SETTING_KEYS = [
    'composeVisual.showStatusBarProgress',
    'composeVisual.statusBarPriority',
    'composeVisual.markHealthyWhen',
    'composeVisual.notifyWhenStackReady',
] as const;

export function affectsStatusBarSettings(event: vscode.ConfigurationChangeEvent): boolean {
    return STATUS_BAR_SETTING_KEYS.some((key) => event.affectsConfiguration(key));
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Move focus off the sidebar webview before opening Settings.
 * Opening settings from a webview message handler can leave an invisible overlay that blocks all clicks.
 */
async function releaseWebviewFocus(): Promise<void> {
    const editors = vscode.window.visibleTextEditors;
    if (editors.length > 0) {
        await vscode.window.showTextDocument(editors[0].document, {
            viewColumn: editors[0].viewColumn,
            preserveFocus: false,
        });
        return;
    }
    try {
        await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    } catch {
        // ignore
    }
    try {
        await vscode.commands.executeCommand('workbench.view.explorer');
    } catch {
        // ignore
    }
}

/**
 * Open Compose Visual settings (filtered to composeVisual.*).
 */
export async function openComposeFlowSettings(): Promise<void> {
    await releaseWebviewFocus();
    await delay(80);
    await vscode.commands.executeCommand('workbench.action.openSettings', 'composeVisual');
}

/**
 * Defer settings open so it never runs on the webview postMessage stack.
 */
export function scheduleOpenComposeFlowSettings(): void {
    setImmediate(() => {
        void openComposeFlowSettings();
    });
}
