import * as vscode from 'vscode';
import {
    isNotifyWhenStackReadyEnabled,
    isShowStatusBarProgressEnabled,
    shouldCountStateAsUp,
} from '../settings';
import type { ComposeTreePayload, ServiceNodeState } from '../types';

const PROGRESS_BAR_WIDTH = 12;

function progressBar(up: number, total: number): string {
    if (total <= 0) {
        return '░'.repeat(PROGRESS_BAR_WIDTH);
    }
    const progress = Math.min(1, up / total) * PROGRESS_BAR_WIDTH;
    const shades = ['░', '▒', '▓', '█'];
    let bar = '';
    for (let i = 0; i < PROGRESS_BAR_WIDTH; i++) {
        const fill = progress - i;
        if (fill >= 1) {
            bar += '█';
        } else if (fill <= 0) {
            bar += '░';
        } else {
            const idx = Math.min(shades.length - 1, Math.floor(fill * shades.length));
            bar += shades[idx];
        }
    }
    return bar;
}

export class StatusBarService {
    private readonly item: vscode.StatusBarItem;
    private stackReadyNotified = false;

    constructor(context: vscode.ExtensionContext, priority: number) {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
        this.reset();
        this.item.show();
        context.subscriptions.push(this.item);
    }

    reset(): void {
        this.item.text = '$(layers) Compose  ░░░░░░░░░░░░  idle';
        this.item.color = undefined;
        this.item.backgroundColor = undefined;
        this.item.tooltip = 'DockerComposeVisualizer — click to choose a compose file';
        this.item.command = 'composeVisual.statusBarClick';
    }

    setInitializing(composeFile?: string): void {
        this.item.text = '$(sync~spin) Compose  ░░░░░░░░░░░░  parsing…';
        this.item.color = new vscode.ThemeColor('charts.blue');
        this.item.backgroundColor = undefined;
        this.item.tooltip = composeFile
            ? `DockerComposeVisualizer — initializing (${composeFile})`
            : 'DockerComposeVisualizer — initializing';
    }

    setError(message: string): void {
        this.item.text = '$(error) Compose  ░░░░░░░░░░░░  error';
        this.item.color = new vscode.ThemeColor('charts.red');
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        this.item.tooltip = message;
    }

    setDockerOffline(): void {
        this.item.text = '$(warning) Compose  ░░░░░░░░░░░░  docker offline';
        this.item.color = new vscode.ThemeColor('charts.red');
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    setTracking(tree: ComposeTreePayload): void {
        const path = require('path') as typeof import('path');
        this.item.tooltip = `Project: ${tree.projectName}\nFile: ${path.basename(tree.composeFile)}\nClick to open sidebar`;
        this.item.command = 'composeVisual.statusBarClick';
    }

    setTooltip(tooltip: string): void {
        this.item.tooltip = tooltip;
    }

    resetReadyNotification(): void {
        this.stackReadyNotified = false;
    }

    update(
        serviceStates: Map<string, ServiceNodeState>,
        tree: ComposeTreePayload,
        overrideUp?: number,
        overrideTotal?: number
    ): void {
        const totalServices = overrideTotal ?? tree.totalServices;
        let healthyCount = overrideUp;
        if (healthyCount === undefined) {
            healthyCount = 0;
            for (const state of serviceStates.values()) {
                if (shouldCountStateAsUp(state)) {
                    healthyCount += 1;
                }
            }
        }

        const bar = isShowStatusBarProgressEnabled() ? progressBar(healthyCount, totalServices) : '';
        const barSegment = bar ? `  ${bar}  ` : '  ';
        const anyActive = [...serviceStates.values()].some((s) =>
            ['creating', 'starting', 'healthcheck', 'running'].includes(s)
        );
        const allDone = healthyCount >= totalServices && totalServices > 0;
        const hasErrors = [...serviceStates.values()].some((s) =>
            ['error', 'unhealthy', 'stopped'].includes(s)
        );
        const pct = totalServices > 0 ? Math.round((healthyCount / totalServices) * 100) : 0;

        if (allDone) {
            this.item.text = `$(check) Compose${barSegment}${healthyCount}/${totalServices} ready`;
            this.item.color = new vscode.ThemeColor('charts.green');
            this.item.backgroundColor = undefined;
            if (isNotifyWhenStackReadyEnabled() && !this.stackReadyNotified) {
                this.stackReadyNotified = true;
                vscode.window.showInformationMessage(
                    `DockerComposeVisualizer: all ${totalServices} services are up (${tree.projectName}).`
                );
            }
        } else if (hasErrors) {
            this.item.text = `$(error) Compose${barSegment}${healthyCount}/${totalServices} (${pct}%)`;
            this.item.color = new vscode.ThemeColor('charts.red');
            this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (anyActive) {
            this.item.text = `$(sync~spin) Compose${barSegment}${healthyCount}/${totalServices} (${pct}%)`;
            this.item.color = new vscode.ThemeColor('charts.blue');
            this.item.backgroundColor = undefined;
        } else {
            this.item.text = `$(layers) Compose${barSegment}${healthyCount}/${totalServices} (${pct}%)`;
            this.item.color = new vscode.ThemeColor('charts.orange');
            this.item.backgroundColor = undefined;
        }
    }
}
