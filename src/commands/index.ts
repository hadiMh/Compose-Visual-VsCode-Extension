import * as vscode from 'vscode';
import type { ComposeTrackingCoordinator } from '../services/ComposeTrackingCoordinator';
import type { ComposeWebviewProvider } from '../providers/ComposeWebviewProvider';

export function registerAllCommands(
    context: vscode.ExtensionContext,
    coordinator: ComposeTrackingCoordinator,
    webviewProvider: ComposeWebviewProvider
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('composeVisual.trackWorkspace', () => {
            void coordinator.trackWorkspaceInteractively();
        }),

        vscode.commands.registerCommand('composeVisual.statusBarClick', () => {
            void coordinator.handleStatusBarClick();
        }),

        vscode.commands.registerCommand('composeVisual.focusSidebar', () => {
            void coordinator.focusSidebar();
        }),

        vscode.commands.registerCommand('composeVisual.openSettings', () => {
            coordinator.openSettings();
        }),

        vscode.commands.registerCommand('composeVisual.trackRunningStack', () => {
            void coordinator.autoDiscoverRunningStack(true);
        }),

        vscode.commands.registerCommand('composeVisual.stopTracking', () => {
            coordinator.handleStopTrackingCommand();
        }),

        vscode.commands.registerCommand('composeVisual.showSidebarSettings', () => {
            webviewProvider.showSidebarSettings();
        })
    );
}
