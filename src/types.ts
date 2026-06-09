export type ServiceNodeState =
    | 'pending'
    | 'creating'
    | 'starting'
    | 'running'
    | 'healthcheck'
    | 'healthy'
    | 'unhealthy'
    | 'stopped'
    | 'error';

export interface DependsOnEntry {
    service: string;
    condition?: 'service_started' | 'service_healthy' | 'service_completed_successfully';
}

export interface ComposeServiceNode {
    name: string;
    dependsOn: DependsOnEntry[];
    tier: number;
    state: ServiceNodeState;
    hasHealthcheck: boolean;
}

export interface ServiceLink {
    label: string;
    url: string;
}

export interface ServicePortLink {
    label: string;
    url: string;
    hostPort: number;
}

export interface ComposeTreePayload {
    projectName: string;
    composeFile: string;
    composeDir: string;
    envFiles: string[];
    tiers: ComposeServiceNode[][];
    totalServices: number;
    serviceLinks?: Record<string, ServiceLink[]>;
    servicePorts?: Record<string, ServicePortLink[]>;
    /** Latest per-service states from the extension (applied when the tree is rendered). */
    states?: Record<string, ServiceNodeState>;
}

export interface OpenLogsRequest {
    service: string;
}

export interface ServiceStateUpdate {
    service: string;
    state: ServiceNodeState;
    previousState?: ServiceNodeState;
}

export interface ProgressUpdate {
    up: number;
    total: number;
    label: string;
}

export interface ComposeSelectedPayload {
    composeFile: string;
    fileName: string;
    composeDir: string;
    extraArgs?: string;
    commandPreview: string;
}

export type GridColumnsSetting = '2' | '3' | 'auto';
export type MarkHealthyWhenSetting = 'healthy' | 'running';
export type ShowServiceLinksWhenSetting = 'healthy' | 'running' | 'healthcheck';

export interface WebviewSettingsPayload {
    /** Workspace-relative compose file path (saved when user picks a YAML file). */
    composeFile?: string;
    showComposeRunButton: boolean;
    composeRunExtraArgs: string;
    showBootTimer: boolean;
    showLogsButton: boolean;
    showPortButtons: boolean;
    showLegend: boolean;
    showDependencyList: boolean;
    gridColumns: GridColumnsSetting;
    tierSeparator: boolean;
    showServiceLinksWhen: ShowServiceLinksWhenSetting;
    markHealthyWhen: MarkHealthyWhenSetting;
}

export type WebviewMessage =
    | { type: 'init-tree'; data: ComposeTreePayload }
    | { type: 'service-links'; data: Record<string, ServiceLink[]> }
    | { type: 'service-ports'; data: Record<string, ServicePortLink[]> }
    | { type: 'service-state'; data: ServiceStateUpdate }
    | { type: 'progress'; data: ProgressUpdate }
    | { type: 'error'; data: { message: string } }
    | { type: 'tracking' }
    | { type: 'idle' }
    | { type: 'compose-selected'; data: ComposeSelectedPayload }
    | { type: 'settings'; data: WebviewSettingsPayload }
    | { type: 'show-settings-view' }
    | { type: 'compose-run-ui'; data: ComposeRunUiPayload }
    | { type: 'compose-pick-loading'; data: { loading: boolean } }
    | { type: 'compose-bootstrap'; data: ComposeBootstrapPayload }
    | { type: 'sync-states'; data: Record<string, ServiceNodeState> }
    | { type: 'restore-tracking'; data: TrackingSnapshotPayload }
    | { type: 'extension-ui'; data: { showRateButton: boolean } };

export type ComposeBootstrapPhase = 'loading' | 'pick' | 'failed';

export interface ComposeBootstrapPayload {
    phase: ComposeBootstrapPhase;
    composeFile?: string;
    message?: string;
}

export interface TrackingSnapshotPayload {
    tree: ComposeTreePayload;
    states: Record<string, ServiceNodeState>;
    progress?: ProgressUpdate;
    servicePorts?: Record<string, ServicePortLink[]>;
    composeRunUi?: ComposeRunUiPayload;
    error?: string;
}

export interface ComposeRunUiPayload {
    spinning: boolean;
    showTerminal: boolean;
}

export interface WebviewEventHandlers {
    onOpenLogs(service: string): void;
    onPickComposeFile(): void;
    onOpenLink(url: string, external?: boolean): void;
    onSaveServiceLinks(service: string, links: ServiceLink[]): void;
    onSaveSidebarSettings(settings: WebviewSettingsPayload): void;
    onRunComposeUp(): void;
    onShowComposeTerminal(): void;
    onStopComposeStack(): void;
    onWebviewReady(): void;
    onRateExtension(): void;
}

export type WebviewInboundMessage =
    | { type: 'open-logs'; service: string }
    | { type: 'open-link'; url: string; external?: boolean }
    | { type: 'webview-ready' }
    | { type: 'pick-compose-file' }
    | { type: 'run-compose-up' }
    | { type: 'show-compose-terminal' }
    | { type: 'stop-compose-stack' }
    | { type: 'save-sidebar-settings'; data: WebviewSettingsPayload }
    | { type: 'save-service-links'; service: string; links: ServiceLink[] }
    | { type: 'rate-extension' };
