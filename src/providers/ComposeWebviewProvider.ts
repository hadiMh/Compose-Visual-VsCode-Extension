import * as vscode from 'vscode';
import { hasUserRatedExtension } from '../extensionRating';
import { getWebviewSettings } from '../settings';
import { getWebviewHtml } from '../webview/getWebviewHtml';
import type {
    ComposeBootstrapPayload,
    ComposeRunUiPayload,
    ComposeSelectedPayload,
    ComposeTreePayload,
    ServiceLink,
    ServiceNodeState,
    ServicePortLink,
    TrackingSnapshotPayload,
    WebviewEventHandlers,
    WebviewInboundMessage,
    WebviewMessage,
} from '../types';

export class ComposeWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'composeVisual.treeView';

    private _view?: vscode.WebviewView;
    private _cachedTree?: ComposeTreePayload;
    private readonly _cachedStates = new Map<string, ServiceNodeState>();
    private _cachedProgress?: { up: number; total: number; label: string };
    private _cachedError?: string;
    private _cachedComposeSelected?: ComposeSelectedPayload;
    private _cachedServicePorts: Record<string, ServicePortLink[]> = {};
    private _cachedComposeRunUi: ComposeRunUiPayload = { spinning: false, showTerminal: false };
    private _cachedBootstrap?: ComposeBootstrapPayload;
    private _isIdle = true;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext,
        private readonly _handlers: WebviewEventHandlers
    ) {}

    postComposeBootstrap(data: ComposeBootstrapPayload): void {
        this._cachedBootstrap = data;
        this.post({ type: 'compose-bootstrap', data });
    }

    postComposeRunUi(data: ComposeRunUiPayload): void {
        this._cachedComposeRunUi = data;
        this.post({ type: 'compose-run-ui', data });
    }

    postComposePickLoading(loading: boolean): void {
        this.post({ type: 'compose-pick-loading', data: { loading } });
    }

    postSyncStates(): void {
        if (this._cachedStates.size === 0) {
            return;
        }
        const states = Object.fromEntries(this._cachedStates);
        this.post({ type: 'sync-states', data: states });
    }

    showSidebarSettings(): void {
        this.post({ type: 'show-settings-view' });
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = getWebviewHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage((message: WebviewInboundMessage) => {
            if (message.type === 'webview-ready') {
                this.postSettings();
                this.postExtensionUi();
                this._handlers.onWebviewReady();
                this.flushCachedState();
                return;
            }
            if (message.type === 'rate-extension') {
                this._handlers.onRateExtension();
            }
            if (message.type === 'open-logs' && message.service) {
                this._handlers.onOpenLogs(message.service);
            }
            if (message.type === 'pick-compose-file') {
                this._handlers.onPickComposeFile();
            }
            if (message.type === 'open-link' && message.url) {
                this._handlers.onOpenLink(message.url, message.external);
            }
            if (message.type === 'save-service-links' && message.service) {
                this._handlers.onSaveServiceLinks(message.service, message.links ?? []);
            }
            if (message.type === 'save-sidebar-settings' && message.data) {
                this._handlers.onSaveSidebarSettings(message.data);
            }
            if (message.type === 'run-compose-up') {
                this._handlers.onRunComposeUp();
            }
            if (message.type === 'show-compose-terminal') {
                this._handlers.onShowComposeTerminal();
            }
            if (message.type === 'stop-compose-stack') {
                this._handlers.onStopComposeStack();
            }
        });

        webviewView.onDidChangeVisibility(() => {
            this.flushCachedState();
        });
    }

    private post(message: WebviewMessage): void {
        void this._view?.webview.postMessage(message);
    }

    flushCachedState(): void {
        if (!this._view) {
            return;
        }
        if (!this._cachedTree && this._cachedBootstrap) {
            this.post({ type: 'compose-bootstrap', data: this._cachedBootstrap });
        }
        if (this._cachedTree) {
            this.post({
                type: 'restore-tracking',
                data: this.buildTrackingSnapshot(),
            });
            return;
        }
        if (this._cachedComposeSelected) {
            this.post({ type: 'compose-selected', data: this._cachedComposeSelected });
        }
        if (this._isIdle && !this._cachedComposeSelected) {
            this.post({ type: 'idle' });
            return;
        }
        if (this._cachedError) {
            this.post({ type: 'error', data: { message: this._cachedError } });
        }
        if (this._cachedTree) {
            this.post({ type: 'init-tree', data: this.buildInitTreePayload(this._cachedTree) });
        }
        for (const [service, state] of this._cachedStates) {
            this.post({ type: 'service-state', data: { service, state } });
        }
        if (this._cachedProgress) {
            this.post({ type: 'progress', data: this._cachedProgress });
        }
        this.post({ type: 'compose-run-ui', data: this._cachedComposeRunUi });
        this.postSyncStates();
    }

    postTracking(): void {
        this._isIdle = false;
        this._cachedComposeSelected = undefined;
        this.post({ type: 'tracking' });
    }

    private buildInitTreePayload(tree: ComposeTreePayload): ComposeTreePayload {
        const serviceNames = new Set(tree.tiers.flat().map((n) => n.name));
        const states: Record<string, ServiceNodeState> = {};
        for (const [name, state] of this._cachedStates) {
            if (serviceNames.has(name)) {
                states[name] = state;
            }
        }
        const ports =
            Object.keys(this._cachedServicePorts).length > 0
                ? this._cachedServicePorts
                : tree.servicePorts;
        return { ...tree, servicePorts: ports, states };
    }

    private buildTrackingSnapshot(): TrackingSnapshotPayload {
        const tree = this.buildInitTreePayload(this._cachedTree!);
        const states: Record<string, ServiceNodeState> = {};
        for (const [name, state] of this._cachedStates) {
            states[name] = state;
        }
        return {
            tree,
            states,
            progress: this._cachedProgress,
            servicePorts:
                Object.keys(this._cachedServicePorts).length > 0
                    ? this._cachedServicePorts
                    : undefined,
            composeRunUi: this._cachedComposeRunUi,
            error: this._cachedError,
        };
    }

    postInitTree(tree: ComposeTreePayload): void {
        this._isIdle = false;
        this._cachedError = undefined;
        this._cachedTree = tree;
        const serviceNames = new Set(tree.tiers.flat().map((n) => n.name));
        for (const name of [...this._cachedStates.keys()]) {
            if (!serviceNames.has(name)) {
                this._cachedStates.delete(name);
            }
        }
        this.post({ type: 'init-tree', data: this.buildInitTreePayload(tree) });
    }

    postServiceLinks(links: Record<string, ServiceLink[]>): void {
        if (this._cachedTree) {
            this._cachedTree = { ...this._cachedTree, serviceLinks: links };
        }
        this.post({ type: 'service-links', data: links });
    }

    postServicePorts(ports: Record<string, ServicePortLink[]>): void {
        this._cachedServicePorts = ports;
        if (this._cachedTree) {
            this._cachedTree = { ...this._cachedTree, servicePorts: ports };
        }
        this.post({ type: 'service-ports', data: ports });
    }

    postServiceState(
        service: string,
        state: ServiceNodeState,
        previousState?: ServiceNodeState
    ): void {
        this._cachedStates.set(service, state);
        this.post({ type: 'service-state', data: { service, state, previousState } });
    }

    postProgress(up: number, total: number, label: string): void {
        this._cachedProgress = { up, total, label };
        this.post({ type: 'progress', data: { up, total, label } });
    }

    postError(message: string): void {
        this._cachedError = message;
        this.post({ type: 'error', data: { message } });
    }

    postIdle(): void {
        this._isIdle = true;
        this._cachedTree = undefined;
        this._cachedStates.clear();
        this._cachedProgress = undefined;
        this._cachedError = undefined;
        this._cachedComposeSelected = undefined;
        this._cachedServicePorts = {};
        this.post({ type: 'idle' });
    }

    postComposeSelected(data: ComposeSelectedPayload): void {
        this._isIdle = false;
        this._cachedComposeSelected = data;
        this.post({ type: 'compose-selected', data });
    }

    postSettings(): void {
        this.post({ type: 'settings', data: getWebviewSettings() });
    }

    postExtensionUi(): void {
        this.post({
            type: 'extension-ui',
            data: { showRateButton: !hasUserRatedExtension(this._context) },
        });
    }

    hideRateExtensionButton(): void {
        this.post({
            type: 'extension-ui',
            data: { showRateButton: false },
        });
    }
}
