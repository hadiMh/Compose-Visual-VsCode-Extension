import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    discoverComposeFilesAtWorkspaceRoot,
    discoverComposeFilesInWorkspace,
    findProjectForWorkspace,
    listRunningComposeProjects,
    waitForRunningStackInWorkspace,
} from '../composeDiscovery';
import { findComposeFileInWorkspace, parseComposeFile, resolveComposeFilePath } from '../composeParser';
import { buildComposeUpCommand, runComposeDownInHiddenTerminal, runComposeUpInHiddenTerminal } from '../composeRun';
import { openServiceLogsTerminal } from '../composeLogs';
import { DockerEventTracker, execDocker } from '../dockerTracker';
import { openServiceUrl } from '../serviceLinks';
import {
    buildDisplayServiceLinksMap,
    DOCKER_COMPOSE_FLOW_DIR_NAME,
    SERVICE_LINKS_FILE_NAME,
    writeServiceLinksForService,
} from '../projectServiceLinks';
import { SIDEBAR_SETTINGS_FILE_NAME } from '../projectSidebarSettings';
import {
    affectsStatusBarSettings,
    affectsTrackingSettings,
    affectsWebviewSettings,
    getConfiguredComposeFile,
    getConfiguredEnvFiles,
    getConfiguredProjectName,
    getComposeRunExtraArgs,
    saveSelectedComposeFile,
    saveWebviewSettings,
    isShowComposeRunButtonEnabled,
    isAutoTrackOnComposeUpEnabled,
    isReconcileOnTerminalCloseEnabled,
    scheduleOpenComposeFlowSettings,
} from '../settings';
import { TerminalComposeSniffer } from '../terminalSniffer';
import { ComposeDiscoveryService } from './ComposeDiscoveryService';
import { StatusBarService } from './StatusBarService';
import { resolveEnvFiles } from '../utils/envFiles';
import type {
    ComposeTreePayload,
    ServiceLink,
    ServiceNodeState,
    WebviewSettingsPayload,
} from '../types';
import type { ComposeWebviewProvider } from '../providers/ComposeWebviewProvider';

interface BeginTrackingOptions {
    preferRunningStack?: boolean;
}

interface PrepareComposeLaunchOptions {
    persist?: boolean;
    preferRunningStack?: boolean;
}

export class ComposeTrackingCoordinator {
    private webviewProvider?: ComposeWebviewProvider;
    private activeTracker?: DockerEventTracker;
    private activeTree?: ComposeTreePayload;
    private readonly serviceStates = new Map<string, ServiceNodeState>();
    private lastTrackedComposePath?: string;
    private lastSniffedComposeFiles: string[] = [];
    private lastSniffedEnvFiles: string[] = [];
    private trackedComposeTerminal?: vscode.Terminal;
    private pendingComposeFile?: string;
    private composeStopInFlight = false;
    private composeRunInFlight = false;
    private bootstrapRestorePromise: Promise<void> = Promise.resolve();
    private readonly outputChannel: vscode.OutputChannel;
    private readonly discoveryService: ComposeDiscoveryService;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly statusBar: StatusBarService
    ) {
        this.outputChannel = vscode.window.createOutputChannel('Compose Visual');
        context.subscriptions.push(this.outputChannel);

        this.discoveryService = new ComposeDiscoveryService(
            () => this.getWorkspaceRoot(),
            () => this.lastSniffedComposeFiles.map((f) => path.basename(f)),
            () => !!(this.lastTrackedComposePath && this.activeTree),
            async (composePath, configFiles, projectName, _notify) => {
                if (composePath === this.lastTrackedComposePath && this.activeTree) {
                    return;
                }
                this.lastSniffedComposeFiles = configFiles.map((f) => path.basename(f));
                const workspaceRoot = this.getWorkspaceRoot();
                if (!workspaceRoot) {
                    return;
                }
                await this.beginTracking(workspaceRoot, path.dirname(composePath), configFiles, projectName);
            }
        );

        context.subscriptions.push({ dispose: () => this.discoveryService.stop() });
        context.subscriptions.push({ dispose: () => this.stopActiveTracker() });
    }

    setWebviewProvider(provider: ComposeWebviewProvider): void {
        this.webviewProvider = provider;
    }

    boot(): void {
        const context = this.context;

        const sniffer = new TerminalComposeSniffer(({ parsed, cwd, terminal }) => {
            if (!isAutoTrackOnComposeUpEnabled()) {
                return;
            }
            const workspaceRoot = this.getWorkspaceRoot();
            if (!workspaceRoot) {
                vscode.window.showWarningMessage('Compose Visual: open a workspace folder to track compose.');
                return;
            }
            this.trackedComposeTerminal = terminal;
            this.lastSniffedComposeFiles = parsed.composeFiles;
            this.lastSniffedEnvFiles = parsed.envFiles;
            void this.beginTracking(
                workspaceRoot,
                cwd,
                parsed.composeFiles,
                parsed.projectName,
                parsed.envFiles,
                { preferRunningStack: true }
            );
        });
        sniffer.attach(context);

        context.subscriptions.push(
            vscode.window.onDidCloseTerminal((terminal) => {
                if (terminal !== this.trackedComposeTerminal) {
                    return;
                }
                this.trackedComposeTerminal = undefined;
                this.webviewProvider?.postComposeRunUi({ spinning: false, showTerminal: false });
                if (isReconcileOnTerminalCloseEnabled()) {
                    this.activeTracker?.reconcileNow();
                }
            })
        );

        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (affectsWebviewSettings(e)) {
                    this.webviewProvider?.postSettings();
                    if (e.affectsConfiguration('composeVisual.composeRunExtraArgs') && this.pendingComposeFile) {
                        this.refreshComposeSelectedPreview();
                    }
                }
                if (affectsStatusBarSettings(e)) {
                    if (this.activeTree) {
                        this.statusBar.update(this.serviceStates, this.activeTree);
                    }
                    this.statusBar.resetReadyNotification();
                }
                if (affectsTrackingSettings(e)) {
                    this.discoveryService.restart();
                }
                if (e.affectsConfiguration('composeVisual.composeFile')) {
                    void this.tryRestoreSavedComposeFile();
                }
                if (e.affectsConfiguration('composeVisual.openLinksInExternalBrowser')) {
                    this.refreshServiceLinks();
                }
            })
        );

        const workspaceRoot = this.getWorkspaceRoot();
        if (workspaceRoot) {
            const linksPattern = new vscode.RelativePattern(
                workspaceRoot,
                `${DOCKER_COMPOSE_FLOW_DIR_NAME}/${SERVICE_LINKS_FILE_NAME}`
            );
            const linksWatcher = vscode.workspace.createFileSystemWatcher(linksPattern);
            linksWatcher.onDidChange(() => this.refreshServiceLinks());
            linksWatcher.onDidCreate(() => this.refreshServiceLinks());
            linksWatcher.onDidDelete(() => this.refreshServiceLinks());
            context.subscriptions.push(linksWatcher);

            const settingsPattern = new vscode.RelativePattern(
                workspaceRoot,
                `${DOCKER_COMPOSE_FLOW_DIR_NAME}/${SIDEBAR_SETTINGS_FILE_NAME}`
            );
            const settingsWatcher = vscode.workspace.createFileSystemWatcher(settingsPattern);
            settingsWatcher.onDidChange(() => this.refreshSidebarSettings());
            settingsWatcher.onDidCreate(() => this.refreshSidebarSettings());
            settingsWatcher.onDidDelete(() => this.refreshSidebarSettings());
            context.subscriptions.push(settingsWatcher);
        }

        this.webviewProvider?.postSettings();

        this.bootstrapRestorePromise = this.tryRestoreSavedComposeFile();
        void this.bootstrapRestorePromise.finally(() => {
            this.discoveryService.start();
        });
    }

    // ── Webview callbacks ─────────────────────────────────────────────────────

    async onWebviewReady(): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            this.webviewProvider?.postComposeBootstrap({ phase: 'pick' });
            return;
        }

        const configured = getConfiguredComposeFile();
        if (!configured) {
            this.webviewProvider?.postComposeBootstrap({ phase: 'pick' });
            return;
        }

        if (!this.activeTree && !this.pendingComposeFile) {
            this.webviewProvider?.postComposeBootstrap({ phase: 'loading', composeFile: configured });
        }

        await this.bootstrapRestorePromise;

        if (this.activeTree || this.pendingComposeFile) {
            return;
        }

        const composePath = findComposeFileInWorkspace(workspaceRoot, configured);
        if (!composePath || !fs.existsSync(composePath)) {
            this.webviewProvider?.postComposeBootstrap({
                phase: 'failed',
                composeFile: configured,
                message: `Saved compose file not found: ${configured}. Choose another file.`,
            });
        }
    }

    async openLogs(serviceName: string): Promise<void> {
        const tree = this.activeTree;
        if (!tree) {
            vscode.window.showWarningMessage('Compose Visual: start tracking a stack before opening logs.');
            return;
        }
        try {
            await openServiceLogsTerminal({
                composeFile: tree.composeFile,
                serviceName,
                projectName: tree.projectName,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Compose Visual: ${message}`);
        }
    }

    async pickComposeFile(): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showWarningMessage('Compose Visual: open a workspace folder first.');
            return;
        }

        this.webviewProvider?.postComposePickLoading(true);
        try {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));

            let files = discoverComposeFilesAtWorkspaceRoot(workspaceRoot);
            if (files.length === 0) {
                files = discoverComposeFilesInWorkspace(workspaceRoot);
            }
            if (files.length === 0) {
                vscode.window.showWarningMessage('Compose Visual: no compose YAML files found in the workspace root.');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                files.map((f) => ({
                    label: path.basename(f),
                    description: path.relative(workspaceRoot, path.dirname(f)) || '.',
                    fullPath: f,
                })),
                { title: 'Compose Visual', placeHolder: 'Select compose file (e.g. docker-compose.dev.yml)' }
            );
            if (!selected) {
                return;
            }

            await this.prepareComposeLaunch(workspaceRoot, selected.fullPath);
        } finally {
            this.webviewProvider?.postComposePickLoading(false);
        }
    }

    async openLink(url: string, external?: boolean): Promise<void> {
        await openServiceUrl(url, external);
    }

    async saveServiceLinks(service: string, links: ServiceLink[]): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showWarningMessage('Compose Visual: open a workspace folder to save service links.');
            return;
        }
        try {
            await writeServiceLinksForService(workspaceRoot, service, links);
            this.refreshServiceLinks();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Compose Visual: failed to save service links: ${message}`);
        }
    }

    async saveSidebarSettings(settings: WebviewSettingsPayload): Promise<void> {
        try {
            await saveWebviewSettings(settings);
            this.refreshSidebarSettings();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Compose Visual: failed to save settings: ${message}`);
        }
    }

    async runComposeUp(): Promise<void> {
        if (this.composeRunInFlight) {
            return;
        }

        const workspaceRoot = this.getWorkspaceRoot();
        const composePath = this.pendingComposeFile;
        if (!workspaceRoot || !composePath) {
            vscode.window.showWarningMessage('Compose Visual: select a compose file first.');
            this.webviewProvider?.postComposeRunUi({ spinning: false, showTerminal: false });
            return;
        }
        if (!isShowComposeRunButtonEnabled()) {
            vscode.window.showWarningMessage(
                'Compose Visual: enable the Run button first (Add run button in the sidebar).'
            );
            this.webviewProvider?.postComposeRunUi({ spinning: false, showTerminal: false });
            return;
        }

        this.composeRunInFlight = true;
        const extraArgs = getComposeRunExtraArgs();
        this.webviewProvider?.postComposeRunUi({ spinning: true, showTerminal: false });

        let result;
        try {
            try {
                result = runComposeUpInHiddenTerminal(composePath, extraArgs);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                vscode.window.showErrorMessage(`Compose Visual: failed to start compose: ${message}`);
                return;
            }

            this.trackedComposeTerminal = result.terminal;
            this.webviewProvider?.postComposeRunUi({ spinning: true, showTerminal: true });
            this.lastSniffedComposeFiles = [path.basename(composePath)];
            this.lastSniffedEnvFiles = result.parsed.envFiles;

            await this.beginTracking(
                workspaceRoot,
                path.dirname(composePath),
                [composePath],
                result.parsed.projectName,
                result.parsed.envFiles,
                { preferRunningStack: true }
            );
        } finally {
            this.composeRunInFlight = false;
            this.webviewProvider?.postComposeRunUi({
                spinning: false,
                showTerminal: !!this.trackedComposeTerminal,
            });
        }
    }

    showComposeTerminal(): void {
        if (!this.trackedComposeTerminal) {
            vscode.window.showWarningMessage(
                'Compose Visual: no compose terminal yet. Use Run to start docker compose up.'
            );
            return;
        }
        this.trackedComposeTerminal.show();
    }

    async stopComposeStack(): Promise<void> {
        const tree = this.activeTree;
        if (!tree || !this.activeTracker) {
            vscode.window.showWarningMessage('Compose Visual: nothing is running to stop.');
            return;
        }
        if (this.composeStopInFlight) {
            return;
        }

        this.composeStopInFlight = true;
        try {
            runComposeDownInHiddenTerminal(tree.composeFile, tree.projectName, tree.envFiles);
            this.trackedComposeTerminal = undefined;
            this.webviewProvider?.postComposeRunUi({ spinning: false, showTerminal: false });
            for (const delayMs of [1200, 3000, 5500]) {
                setTimeout(() => this.activeTracker?.reconcileNow(), delayMs);
            }
            vscode.window.setStatusBarMessage('Compose Visual: stopping stack…', 3000);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Compose Visual: failed to stop stack: ${message}`);
        } finally {
            this.composeStopInFlight = false;
        }
    }

    // ── Command handlers ──────────────────────────────────────────────────────

    async trackWorkspaceInteractively(): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            vscode.window.showWarningMessage('Compose Visual: open a workspace folder first.');
            return;
        }

        const running = await listRunningComposeProjects();
        const runningInWs = findProjectForWorkspace(running, workspaceRoot);
        if (runningInWs && runningInWs.configFiles.length > 0) {
            const pick = await vscode.window.showQuickPick(
                [
                    {
                        label: '$(pulse) Track running stack',
                        description: `${runningInWs.name} — ${path.basename(runningInWs.configFiles[0])}`,
                        action: 'running' as const,
                    },
                    {
                        label: '$(file) Pick compose file…',
                        description: 'Choose docker-compose.dev.yml or another file',
                        action: 'pick' as const,
                    },
                ],
                { title: 'Compose Visual', placeHolder: 'How do you want to track?' }
            );
            if (!pick) {
                return;
            }
            if (pick.action === 'running') {
                await this.beginTracking(
                    workspaceRoot,
                    path.dirname(runningInWs.configFiles[0]),
                    runningInWs.configFiles,
                    runningInWs.name
                );
                return;
            }
        }

        await this.pickComposeFile();
    }

    async handleStatusBarClick(): Promise<void> {
        if (this.isComposeFileSelected()) {
            await this.focusSidebar();
            return;
        }
        await this.trackWorkspaceInteractively();
    }

    async focusSidebar(): Promise<void> {
        await vscode.commands.executeCommand('workbench.view.extension.compose-visual-sidebar');
        await vscode.commands.executeCommand(`${(await import('../providers/ComposeWebviewProvider')).ComposeWebviewProvider.viewId}.focus`);
    }

    handleStopTrackingCommand(): void {
        this.stopActiveTracker();
        this.activeTree = undefined;
        this.pendingComposeFile = undefined;
        this.statusBar.reset();
        this.webviewProvider?.postIdle();
    }

    async autoDiscoverRunningStack(notify: boolean): Promise<void> {
        await this.discoveryService.discoverNow(notify);
    }

    openSettings(): void {
        scheduleOpenComposeFlowSettings();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    private isComposeFileSelected(): boolean {
        return !!(this.pendingComposeFile || this.activeTree);
    }

    private refreshSidebarSettings(): void {
        this.webviewProvider?.postSettings();
        this.refreshComposeSelectedPreview();
    }

    private refreshServiceLinks(): void {
        const names = this.activeTree?.tiers.flat().map((n) => n.name) ?? [];
        if (names.length === 0) {
            return;
        }
        const links = buildDisplayServiceLinksMap(names, this.getWorkspaceRoot());
        this.activeTree = this.activeTree ? { ...this.activeTree, serviceLinks: links } : this.activeTree;
        this.webviewProvider?.postServiceLinks(links);
    }

    private refreshComposeSelectedPreview(): void {
        if (!this.pendingComposeFile) {
            return;
        }
        const extraArgs = getComposeRunExtraArgs();
        this.webviewProvider?.postComposeSelected({
            composeFile: this.pendingComposeFile,
            fileName: path.basename(this.pendingComposeFile),
            composeDir: path.dirname(this.pendingComposeFile),
            extraArgs,
            commandPreview: buildComposeUpCommand(this.pendingComposeFile, extraArgs),
        });
    }

    private async tryRestoreSavedComposeFile(): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            this.webviewProvider?.postComposeBootstrap({ phase: 'pick' });
            return;
        }

        const configured = getConfiguredComposeFile();
        if (!configured) {
            this.webviewProvider?.postComposeBootstrap({ phase: 'pick' });
            return;
        }

        this.webviewProvider?.postComposeBootstrap({ phase: 'loading', composeFile: configured });

        const composePath = findComposeFileInWorkspace(workspaceRoot, configured);
        if (!composePath || !fs.existsSync(composePath)) {
            this.webviewProvider?.postComposeBootstrap({
                phase: 'failed',
                composeFile: configured,
                message: `Saved compose file not found: ${configured}. Choose another file.`,
            });
            return;
        }

        if (this.pendingComposeFile === composePath && this.activeTree) {
            return;
        }

        try {
            await this.prepareComposeLaunch(workspaceRoot, composePath, { persist: false, preferRunningStack: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.webviewProvider?.postComposeBootstrap({ phase: 'failed', composeFile: configured, message });
        }
    }

    private async prepareComposeLaunch(
        workspaceRoot: string,
        composePath: string,
        options: PrepareComposeLaunchOptions = {}
    ): Promise<void> {
        if (options.persist !== false) {
            try {
                await saveSelectedComposeFile(workspaceRoot, composePath);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                vscode.window.showWarningMessage(`Compose Visual: could not save compose file to settings: ${message}`);
            }
        }

        this.pendingComposeFile = composePath;
        const composeDir = path.dirname(composePath);
        const envFiles = resolveEnvFiles(composeDir, workspaceRoot, getConfiguredEnvFiles());

        await this.beginTracking(
            workspaceRoot,
            composeDir,
            [composePath],
            getConfiguredProjectName(),
            envFiles,
            { preferRunningStack: options.preferRunningStack ?? true }
        );

        if (!this.activeTree) {
            return;
        }

        const extraArgs = getComposeRunExtraArgs();
        this.webviewProvider?.postComposeSelected({
            composeFile: composePath,
            fileName: path.basename(composePath),
            composeDir: this.activeTree.composeDir,
            extraArgs,
            commandPreview: buildComposeUpCommand(composePath, extraArgs),
        });
        this.statusBar.setTooltip(`Compose Visual — ${path.basename(composePath)} · click to open sidebar`);
        this.refreshServiceLinks();
    }

    private async beginTracking(
        workspaceRoot: string,
        cwd: string | undefined,
        composeFiles: string[],
        cliProjectName?: string,
        envFiles: string[] = [],
        options: BeginTrackingOptions = {}
    ): Promise<void> {
        this.stopActiveTracker();
        this.serviceStates.clear();
        this.statusBar.resetReadyNotification();
        this.webviewProvider?.postTracking();

        const configuredCompose = getConfiguredComposeFile();
        if (configuredCompose && composeFiles.length === 0) {
            const found = findComposeFileInWorkspace(workspaceRoot, configuredCompose, cwd);
            if (found) {
                composeFiles = [found];
            }
        }

        cliProjectName = cliProjectName ?? getConfiguredProjectName();
        const mergedEnvFiles = [...getConfiguredEnvFiles(), ...envFiles];
        envFiles = mergedEnvFiles;

        this.statusBar.setInitializing();

        const preferRunning = options.preferRunningStack !== false;
        if (preferRunning) {
            const preferredBasenames = [
                ...composeFiles.map((f) => path.basename(f)),
                ...this.lastSniffedComposeFiles.map((f) => path.basename(f)),
            ].filter((name, index, arr) => name.length > 0 && arr.indexOf(name) === index);
            const hasExplicitFile = composeFiles.length > 0;
            const running = await waitForRunningStackInWorkspace(
                workspaceRoot,
                { preferredComposeBasenames: preferredBasenames, projectName: cliProjectName },
                { attempts: hasExplicitFile ? 6 : 12, delayMs: 400 }
            );
            if (running && running.configFiles.length > 0) {
                composeFiles = running.configFiles;
                cliProjectName = cliProjectName ?? running.name;
                cwd = path.dirname(running.configFiles[0]);
                this.lastSniffedComposeFiles = running.configFiles.map((f) => path.basename(f));
            }
        }

        let composePath: string | null = resolveComposeFilePath(workspaceRoot, cwd, composeFiles);
        if (!composePath && composeFiles.length > 0) {
            composePath = findComposeFileInWorkspace(workspaceRoot, composeFiles[0], cwd);
        }

        if (!composePath) {
            const hint = composeFiles.length ? composeFiles.join(', ') : 'compose.yaml / docker-compose.yml';
            this.failTracking(`Compose file not found (${hint}).`);
            return;
        }

        this.lastTrackedComposePath = composePath;

        let tree: ComposeTreePayload;
        try {
            tree = parseComposeFile(composePath, cliProjectName);
            const resolvedName = await this.resolveProjectNameViaDocker(composePath);
            if (resolvedName) {
                tree = { ...tree, projectName: resolvedName };
            }
            if (cliProjectName) {
                tree = { ...tree, projectName: cliProjectName };
            }
            const composeDir = path.dirname(composePath);
            tree = {
                ...tree,
                composeDir,
                envFiles: resolveEnvFiles(
                    composeDir,
                    workspaceRoot,
                    envFiles.length ? envFiles : this.lastSniffedEnvFiles
                ),
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.failTracking(`Invalid compose YAML: ${message}`);
            return;
        }

        const allNodes = tree.tiers.flat();
        tree = {
            ...tree,
            serviceLinks: buildDisplayServiceLinksMap(
                allNodes.map((n) => n.name),
                workspaceRoot
            ),
        };
        this.activeTree = tree;
        this.webviewProvider?.postInitTree(tree);

        this.statusBar.setTracking(tree);
        this.statusBar.update(this.serviceStates, tree, 0, tree.totalServices);
        vscode.window.setStatusBarMessage(`Compose Visual: tracking ${path.basename(composePath)}`, 4000);

        this.activeTracker = new DockerEventTracker(tree.projectName, {
            onServiceState: (service, state) => {
                const prev = this.serviceStates.get(service);
                this.serviceStates.set(service, state);
                this.webviewProvider?.postServiceState(service, state, prev);
                if (this.activeTree) {
                    this.statusBar.update(this.serviceStates, this.activeTree);
                }
            },
            onProgress: (up, total) => {
                if (this.activeTree) {
                    this.statusBar.update(this.serviceStates, this.activeTree, up, total);
                    this.webviewProvider?.postProgress(
                        up,
                        total,
                        `Project: ${this.activeTree.projectName} · ${up}/${total} services up`
                    );
                }
            },
            onError: (message) => {
                this.outputChannel.appendLine(`[error] ${message}`);
                vscode.window.showErrorMessage(`Compose Visual: ${message}`);
            },
            onDockerUnavailable: () => {
                this.statusBar.setDockerOffline();
                this.webviewProvider?.postError('Docker daemon unreachable. Is Docker running?');
            },
            onServicePorts: (ports) => {
                if (this.activeTree) {
                    this.activeTree = { ...this.activeTree, servicePorts: ports };
                }
                this.webviewProvider?.postServicePorts(ports);
            },
        });

        this.activeTracker.start(allNodes);
    }

    private stopActiveTracker(): void {
        this.activeTracker?.stop();
        this.activeTracker = undefined;
        this.serviceStates.clear();
        this.trackedComposeTerminal = undefined;
        this.webviewProvider?.postComposeRunUi({ spinning: false, showTerminal: false });
        this.webviewProvider?.postServicePorts({});
    }

    private failTracking(message: string): void {
        this.statusBar.setError(message);
        this.webviewProvider?.postError(message);
        this.activeTree = undefined;
        this.pendingComposeFile = undefined;
        const configured = getConfiguredComposeFile();
        if (configured) {
            this.webviewProvider?.postComposeBootstrap({ phase: 'failed', composeFile: configured, message });
        } else {
            this.webviewProvider?.postIdle();
        }
        this.outputChannel.appendLine(`[tracking error] ${message}`);
        vscode.window.showErrorMessage(`Compose Visual: ${message}`);
    }

    private async resolveProjectNameViaDocker(composePath: string): Promise<string | undefined> {
        try {
            const { stdout } = await execDocker(['compose', '-f', composePath, 'config', '--format', 'json']);
            const config = JSON.parse(stdout) as { name?: string };
            return typeof config.name === 'string' ? config.name : undefined;
        } catch {
            return undefined;
        }
    }
}
