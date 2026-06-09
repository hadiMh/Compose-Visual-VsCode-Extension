import * as vscode from 'vscode';
import { ComposeWebviewProvider } from './providers/ComposeWebviewProvider';
import { ComposeTrackingCoordinator } from './services/ComposeTrackingCoordinator';
import { StatusBarService } from './services/StatusBarService';
import { registerAllCommands } from './commands';
import { openExtensionReviewPage } from './extensionRating';
import { getStatusBarPriority } from './settings';

export function activate(context: vscode.ExtensionContext): void {
    const statusBar = new StatusBarService(context, getStatusBarPriority());
    const coordinator = new ComposeTrackingCoordinator(context, statusBar);

    const webviewProvider = new ComposeWebviewProvider(context.extensionUri, context, {
        onOpenLogs:            (s) =>         void coordinator.openLogs(s),
        onPickComposeFile:     () =>           void coordinator.pickComposeFile(),
        onOpenLink:            (url, ext) =>   void coordinator.openLink(url, ext),
        onSaveServiceLinks:    (s, l) =>       void coordinator.saveServiceLinks(s, l),
        onSaveSidebarSettings: (cfg) =>        void coordinator.saveSidebarSettings(cfg),
        onRunComposeUp:        () =>           void coordinator.runComposeUp(),
        onShowComposeTerminal: () =>           coordinator.showComposeTerminal(),
        onStopComposeStack:    () =>           void coordinator.stopComposeStack(),
        onWebviewReady:        () =>           void coordinator.onWebviewReady(),
        onRateExtension: () => {
            void (async () => {
                await openExtensionReviewPage(context);
                webviewProvider.hideRateExtensionButton();
            })();
        },
    });

    coordinator.setWebviewProvider(webviewProvider);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ComposeWebviewProvider.viewId,
            webviewProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    registerAllCommands(context, coordinator, webviewProvider);
    coordinator.boot();
}

export function deactivate(): void {
    // All cleanup flows through context.subscriptions
}
