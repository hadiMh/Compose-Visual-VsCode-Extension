import * as vscode from 'vscode';

const RATED_GLOBAL_STATE_KEY = 'composeVisual.hasRatedExtension';
export const EXTENSION_MARKETPLACE_ID = 'HadiHajihosseini.dockercompose-visualizer';

export function hasUserRatedExtension(context: vscode.ExtensionContext): boolean {
    return !!context.globalState.get<boolean>(RATED_GLOBAL_STATE_KEY);
}

export function getExtensionReviewUrl(): string {
    return `https://marketplace.visualstudio.com/items?itemName=${EXTENSION_MARKETPLACE_ID}&ssr=false#review-details`;
}

export async function openExtensionReviewPage(context: vscode.ExtensionContext): Promise<void> {
    await context.globalState.update(RATED_GLOBAL_STATE_KEY, true);
    await vscode.env.openExternal(vscode.Uri.parse(getExtensionReviewUrl()));
}
