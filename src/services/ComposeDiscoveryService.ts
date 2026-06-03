import * as path from 'path';
import { findProjectForWorkspace, listRunningComposeProjects } from '../composeDiscovery';
import { getDiscoveryPollIntervalMs, isAutoDiscoverRunningStackEnabled } from '../settings';

type OnDiscovered = (
    composePath: string,
    composeFiles: string[],
    projectName: string,
    notify: boolean
) => Promise<void>;

export class ComposeDiscoveryService {
    private timer?: NodeJS.Timeout;

    constructor(
        private readonly getWorkspaceRoot: () => string | undefined,
        private readonly getLastSniffedBasenames: () => string[],
        private readonly isAlreadyTracking: () => boolean,
        private readonly onDiscovered: OnDiscovered
    ) {}

    start(): void {
        this.stop();
        if (!isAutoDiscoverRunningStackEnabled()) {
            return;
        }
        const intervalMs = getDiscoveryPollIntervalMs();
        this.timer = setInterval(() => {
            void this.poll(false);
        }, intervalMs);
        void this.poll(false);
    }

    restart(): void {
        this.start();
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    async discoverNow(notify: boolean): Promise<void> {
        return this.poll(notify);
    }

    private async poll(notify: boolean): Promise<void> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return;
        }

        const projects = await listRunningComposeProjects();
        const preferredBasenames = this.getLastSniffedBasenames();
        const match = findProjectForWorkspace(projects, workspaceRoot, preferredBasenames);
        if (!match || match.configFiles.length === 0) {
            if (notify) {
                const vscode = await import('vscode');
                vscode.window.showInformationMessage(
                    'Compose Visual: no running compose stack found for this workspace. Start with `docker compose -f <file> up` or click the status bar to pick a file.'
                );
            }
            return;
        }

        const composePath = match.configFiles[0];
        if (this.isAlreadyTracking()) {
            return;
        }

        await this.onDiscovered(composePath, match.configFiles, match.name, notify);

        if (notify) {
            const vscode = await import('vscode');
            vscode.window.showInformationMessage(
                `Compose Visual: tracking running stack "${match.name}" (${path.basename(composePath)}).`
            );
        }
    }
}
