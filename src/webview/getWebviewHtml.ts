import * as vscode from 'vscode';

export function getWebviewHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    const csp = [
        `default-src 'none'`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DockerComposeVisualizer</title>
  <style>
:root {
  --node-min: 128px;
  --tier-gap: 10px;
  --connector: color-mix(in srgb, var(--vscode-foreground) 42%, var(--vscode-panel-border, #555));
  --connector-strong: color-mix(in srgb, var(--vscode-foreground) 58%, var(--vscode-charts-blue, #3794ff) 42%);
  --glow-blue: var(--vscode-charts-blue, #3794ff);
  --glow-green: var(--vscode-charts-green, #4ec9b0);
  --glow-yellow: var(--vscode-charts-yellow, #dcdcaa);
  --glow-orange: var(--vscode-charts-orange, #ce9178);
  --glow-red: var(--vscode-errorForeground, #f48771);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 12px 10px 0;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-sideBar-background);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
#main-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vscode-widget-border, var(--connector));
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
header h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex: 1;
  min-width: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.header-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: var(--vscode-descriptionForeground);
  background: transparent;
  transition: color 0.2s ease, background 0.2s ease;
}
.header-icon-btn:hover {
  color: var(--vscode-foreground);
  background: var(--vscode-toolbar-hoverBackground, rgba(255,255,255,0.08));
}
.header-icon-btn:active {
  opacity: 0.9;
}
.header-icon-btn svg,
.header-icon-btn .icon-lucide {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.icon-lucide-stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.icon-lucide-fill {
  fill: currentColor;
  stroke: none;
}
.header-transport-btn {
  display: none;
}
.header-transport-btn.is-visible {
  display: inline-flex;
}
.header-transport-btn.run-btn {
  color: var(--vscode-button-foreground, #fff);
  background: var(--vscode-button-background, var(--glow-blue));
}
.header-transport-btn.run-btn:hover {
  color: var(--vscode-button-foreground, #fff);
  background: var(--vscode-button-hoverBackground, color-mix(in srgb, var(--glow-blue) 85%, #fff));
}
.header-transport-btn.stop-btn {
  color: #fff;
  background: var(--glow-red, #f14c4c);
}
.header-transport-btn.stop-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--glow-red, #f14c4c) 88%, #fff);
}
.header-transport-btn.stop-btn:disabled,
.header-transport-btn.run-btn:disabled {
  opacity: 0.65;
  cursor: wait;
  pointer-events: none;
}
.header-transport-btn.run-btn .header-run-spinner {
  display: none;
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
}
.header-transport-btn.run-btn.is-spinning .header-run-spinner {
  display: inline-block;
}
.header-transport-btn.run-btn.is-spinning .run-btn-icon {
  display: none;
}
.header-transport-btn.run-btn.is-spinning {
  opacity: 0.85;
}
.header-show-terminal-btn {
  display: none;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 4px;
  background: var(--vscode-button-secondaryBackground, var(--vscode-editor-background));
  color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.header-show-terminal-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
}
.header-show-terminal-btn.is-visible {
  display: inline-flex;
}
.header-compose-bar {
  flex-shrink: 0;
  padding: 0 10px 12px;
}
.header-compose-bar[hidden] {
  display: none !important;
}
.header-compose-btn {
  width: 100%;
  box-sizing: border-box;
  margin-top: 0;
}
.sidebar-footer {
  flex-shrink: 0;
  margin-top: auto;
  padding: 10px 10px 12px;
  border-top: 1px solid var(--vscode-widget-border, var(--connector));
  background: var(--vscode-sideBar-background);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sidebar-footer[hidden] {
  display: none !important;
}
.rate-extension-btn {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  line-height: 1.25;
  color: #fff;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, #e84393 88%, var(--glow-red, #f48771)) 0%,
    color-mix(in srgb, #fd79a8 75%, var(--glow-orange, #ce9178)) 45%,
    color-mix(in srgb, #a29bfe 70%, var(--glow-blue, #3794ff)) 100%
  );
  border: 1px solid color-mix(in srgb, #fff 18%, transparent);
  border-radius: 8px;
  cursor: pointer;
  box-shadow:
    0 2px 10px color-mix(in srgb, #e84393 28%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent);
  transition: transform 0.2s ease, box-shadow 0.25s ease, filter 0.2s ease;
}
.rate-extension-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow:
    0 5px 18px color-mix(in srgb, #e84393 38%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 28%, transparent);
}
.rate-extension-btn:active {
  transform: translateY(0);
  filter: brightness(0.98);
}
.rate-extension-btn[hidden],
.footer-compose-btn[hidden] {
  display: none !important;
}
.rate-heart {
  font-size: 15px;
  line-height: 1;
  animation: rate-heartbeat 1.35s ease-in-out infinite;
}
@keyframes rate-heartbeat {
  0%, 100% { transform: scale(1); }
  14% { transform: scale(1.18); }
  28% { transform: scale(1); }
  42% { transform: scale(1.1); }
}
.footer-compose-btn {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.2;
  color: var(--vscode-button-foreground, #fff);
  background: var(--vscode-button-background, var(--glow-blue));
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease, opacity 0.2s ease;
}
.footer-compose-btn:hover {
  background: var(--vscode-button-hoverBackground, color-mix(in srgb, var(--glow-blue) 85%, #fff));
  transform: translateY(-1px);
}
.footer-compose-btn:active {
  transform: translateY(0);
  opacity: 0.92;
}
.footer-compose-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: currentColor;
}
.change-compose-label {
  white-space: nowrap;
}
.meta {
  font-size: 11px;
  opacity: 0.75;
  word-break: break-all;
}
.progress-strip {
  margin-top: 8px;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--vscode-foreground) 8%, var(--vscode-input-background));
  border: 1px solid color-mix(in srgb, var(--vscode-widget-border, #555) 70%, transparent);
  overflow: hidden;
  box-shadow: inset 0 1px 2px color-mix(in srgb, #000 18%, transparent);
}
.progress-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--glow-blue) 0%,
    color-mix(in srgb, var(--glow-blue) 70%, var(--glow-green)) 55%,
    var(--glow-green) 100%
  );
  box-shadow: 0 0 8px color-mix(in srgb, var(--glow-blue) 35%, transparent);
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1), background 0.35s ease, box-shadow 0.35s ease;
}
.progress-strip.is-active .progress-fill {
  background: linear-gradient(
    90deg,
    var(--glow-blue),
    color-mix(in srgb, var(--glow-blue) 50%, var(--glow-yellow))
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--glow-blue) 45%, transparent);
}
.progress-strip.is-complete .progress-fill {
  background: linear-gradient(90deg, var(--glow-green), color-mix(in srgb, var(--glow-green) 80%, #fff));
  box-shadow: 0 0 12px color-mix(in srgb, var(--glow-green) 50%, transparent);
}
.progress-strip.has-errors .progress-fill {
  background: linear-gradient(90deg, var(--glow-orange), var(--glow-red));
  box-shadow: 0 0 10px color-mix(in srgb, var(--glow-red) 40%, transparent);
}
#empty, #error-banner {
  padding: 16px 12px;
  border-radius: 8px;
  background: var(--vscode-input-background);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}
#empty[hidden],
#tree-stage[hidden] {
  display: none !important;
}
#empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 24px 16px;
}
#empty-loading,
#empty-pick,
#empty-failed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}
#empty-pick[hidden],
#empty-failed[hidden],
#empty-loading[hidden] {
  display: none !important;
}
.bootstrap-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid color-mix(in srgb, var(--glow-blue) 22%, transparent);
  border-top-color: var(--glow-blue);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  flex-shrink: 0;
}
#empty-loading .empty-title {
  letter-spacing: 0.02em;
}
#empty-loading-detail {
  font-size: 11px;
  opacity: 0.85;
  max-width: 280px;
  text-align: center;
  margin: 0;
}
#empty-loading-detail strong {
  color: var(--glow-blue);
  font-weight: 600;
}
body.is-bootstrap-loading .sidebar-footer,
body.is-bootstrap-loading .header-compose-bar {
  visibility: hidden;
  pointer-events: none;
}
#empty .empty-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-foreground);
}
#empty .empty-hint {
  margin: 0;
  font-size: 11px;
  opacity: 0.8;
  max-width: 260px;
  line-height: 1.45;
}
#empty .empty-hint code {
  font-size: 10px;
}
.pick-compose-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  color: var(--vscode-button-foreground, #fff);
  background: var(--vscode-button-background, var(--glow-blue));
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease, opacity 0.2s ease;
}
.pick-compose-btn:hover {
  background: var(--vscode-button-hoverBackground, color-mix(in srgb, var(--glow-blue) 85%, #fff));
  transform: translateY(-1px);
}
.pick-compose-btn:active {
  transform: translateY(0);
  opacity: 0.92;
}
.pick-compose-btn.is-loading,
.footer-compose-btn.is-loading {
  opacity: 0.85;
  cursor: wait;
  pointer-events: none;
}
.pick-compose-btn.is-loading .pick-compose-label,
.footer-compose-btn.is-loading .change-compose-label {
  opacity: 0.7;
}
.compose-pick-spinner {
  display: none;
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, currentColor 25%, transparent);
  border-top-color: currentColor;
  border-radius: 50%;
  flex-shrink: 0;
}
.pick-compose-btn.is-loading .compose-pick-spinner,
.footer-compose-btn.is-loading .compose-pick-spinner,
.header-compose-btn.is-loading .compose-pick-spinner {
  display: inline-block;
  animation: spin 0.65s linear infinite;
}
.pick-compose-btn svg,
.header-compose-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.footer-compose-btn.is-loading svg {
  display: none;
}
.header-icon-btn.is-active {
  color: var(--vscode-foreground);
  background: var(--vscode-toolbar-hoverBackground, rgba(255,255,255,0.1));
}
#settings-view {
  display: none;
  flex-direction: column;
  gap: 12px;
  margin: 0 4px 12px;
  padding: 0 4px 8px;
}
#settings-view.is-visible {
  display: flex;
}
#main-view[hidden] {
  display: none !important;
}
.settings-section {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--vscode-widget-border, #454545);
  background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-focusBorder) 8%);
}
.settings-section h3 {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vscode-descriptionForeground);
}
.settings-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.settings-field:last-child {
  margin-bottom: 0;
}
.settings-field label,
.settings-check {
  font-size: 12px;
  line-height: 1.35;
  color: var(--vscode-foreground);
}
.settings-option {
  margin-bottom: 12px;
}
.settings-option:last-child {
  margin-bottom: 0;
}
.settings-check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 0;
  cursor: pointer;
}
.settings-check input {
  margin-top: 2px;
  flex-shrink: 0;
}
.settings-option-title {
  font-weight: 500;
  color: var(--vscode-foreground);
}
.settings-option .settings-hint {
  margin: 4px 0 0 24px;
}
.settings-persist-hint {
  margin: 0 4px 10px;
}
.settings-field input[type="text"],
.settings-field select {
  padding: 5px 8px;
  font-size: 12px;
  font-family: var(--vscode-font-family);
  color: var(--vscode-input-foreground);
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
  border-radius: 4px;
}
.settings-hint {
  margin: 0;
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}
.settings-field .settings-hint {
  margin-top: 4px;
  margin-left: 0;
}
.settings-run-preview {
  margin: 6px 0 0;
  font-size: 10px;
  word-break: break-all;
}
.settings-run-preview code {
  font-size: 10px;
}
#settings-run-details[hidden] {
  display: none !important;
}
.settings-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}
.settings-save-btn {
  flex: 1;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  color: var(--vscode-button-foreground, #fff);
  background: var(--vscode-button-background, var(--glow-blue));
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.settings-save-btn:hover {
  background: var(--vscode-button-hoverBackground, color-mix(in srgb, var(--glow-blue) 85%, #fff));
}
.settings-cancel-btn {
  padding: 8px 12px;
  font-size: 12px;
  font-family: inherit;
  color: var(--vscode-foreground);
  background: var(--vscode-button-secondaryBackground);
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 6px;
  cursor: pointer;
}
.settings-cancel-btn:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}
#service-links-modal {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 100;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: color-mix(in srgb, var(--vscode-editor-background) 35%, #000 65%);
}
#service-links-modal.is-visible {
  display: flex;
}
.service-links-modal-panel {
  width: 100%;
  max-width: 360px;
  max-height: min(80vh, 420px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--vscode-widget-border, #454545);
  background: var(--vscode-editor-background);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
}
.service-links-modal-panel h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.service-links-modal-hint {
  margin: 0;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}
.service-links-editor-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 220px;
  padding-right: 2px;
}
.link-editor-row {
  display: grid;
  grid-template-columns: 1fr 1.4fr auto;
  gap: 6px;
  align-items: center;
}
.link-editor-row input {
  padding: 5px 8px;
  font-size: 11px;
  font-family: var(--vscode-font-family);
  color: var(--vscode-input-foreground);
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
  border-radius: 4px;
  min-width: 0;
}
.link-row-remove {
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  color: var(--vscode-foreground);
  background: transparent;
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 4px;
  cursor: pointer;
}
.link-row-remove:hover {
  background: var(--vscode-toolbar-hoverBackground);
}
.link-editor-add-btn {
  align-self: flex-start;
  padding: 4px 10px;
  font-size: 11px;
  font-family: inherit;
  color: var(--vscode-button-secondaryForeground);
  background: var(--vscode-button-secondaryBackground);
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 4px;
  cursor: pointer;
}
.service-links-modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
#error-banner {
  display: none;
  border: 1px solid var(--glow-red);
  color: var(--glow-red);
}
.tree-stage {
  position: relative;
  width: 100%;
  min-height: 120px;
  padding-top: 8px;
}
#tree-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--tier-gap);
  padding: 6px 4px 12px;
  min-height: 200px;
}
.tier-row,
.tier-row.grid-cols-auto {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  position: relative;
  padding: 0 4px;
}
@media (min-width: 420px) {
  .tier-row.grid-cols-auto {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.tier-row.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.tier-row.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.legend.is-hidden {
  display: none;
}
.node-card.hide-deps-list .deps-list {
  display: none;
}
.tier-row .node-card {
  width: 100%;
  min-width: 0;
}
.tier-divider {
  width: calc(100% - 16px);
  height: 0;
  margin: 4px 8px;
  border: none;
  border-top: 1px solid color-mix(in srgb, var(--vscode-widget-border, #555) 55%, transparent);
  flex-shrink: 0;
}
.node-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 72px;
  padding: 10px 10px 30px;
  border-radius: 10px;
  border: 1px solid var(--vscode-widget-border, #454545);
  background: var(--vscode-editor-background);
  text-align: left;
  transform: scale(0.98);
  opacity: 0.85;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
              border-color 0.5s ease,
              box-shadow 0.5s ease,
              opacity 0.5s ease,
              background 0.5s ease,
              filter 0.45s ease;
}
.node-card .card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.node-card .name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.node-card .name {
  font-weight: 600;
  font-size: 12px;
  line-height: 1.25;
  word-break: break-word;
  margin: 0;
  flex: 1;
  min-width: 0;
  transition: color 0.5s ease;
}
.node-card .card-header .boot-timer {
  flex-shrink: 0;
  align-self: flex-start;
}
.node-card .card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.node-card .card-bottom-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
  width: 100%;
  margin-top: 4px;
  padding-top: 2px;
  position: relative;
  z-index: 5;
}
.node-card .deps-list + .card-bottom-links {
  margin-top: 6px;
}
.node-card .card-bottom-links[hidden] {
  display: none !important;
}
.node-card .boot-timer {
  font-size: 9px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  padding: 2px 5px;
  border-radius: 4px;
  color: var(--glow-blue);
  background: color-mix(in srgb, var(--glow-blue) 12%, transparent);
  opacity: 0;
  transition: opacity 0.2s ease, color 0.25s ease, background 0.25s ease;
}
.node-card .boot-timer:not(.is-visible):not(.is-done) {
  display: none;
}
.node-card .boot-timer.is-visible {
  opacity: 1;
}
.node-card .boot-timer.is-done {
  color: var(--glow-green);
  background: color-mix(in srgb, var(--glow-green) 14%, transparent);
}
.loader {
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, var(--glow-blue) 25%, transparent);
  border-top-color: var(--glow-blue);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
  display: none;
}
/* Blue spinner left of service name while booting toward green */
.node-card.show-main-loader .loader {
  display: block;
}
.node-card.boot-focus {
  outline: 2px solid color-mix(in srgb, var(--glow-blue) 55%, transparent);
  outline-offset: 2px;
}
.node-card.parent-flow {
  animation: parent-glow 1.1s ease-out;
}
.node-card .deps-list {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}
.node-card .dep-item {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 1px 0;
  padding: 0;
  font-size: 8px;
  font-weight: 500;
  line-height: 1.2;
  opacity: 1;
  transition: color 0.25s ease;
}
.node-card .dep-item.is-running {
  color: var(--glow-green);
}
.node-card .dep-item.is-not-running {
  color: var(--vscode-descriptionForeground);
  opacity: 0.72;
}
.node-card .dep-item.is-in-progress {
  color: var(--glow-blue);
}
.node-card .dep-item.is-error {
  color: var(--glow-red);
}
.node-card .dep-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}
.node-card .dep-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.25s ease, box-shadow 0.25s ease;
}
.node-card .dep-item.is-running .dep-dot {
  background: var(--glow-green);
  box-shadow: 0 0 4px color-mix(in srgb, var(--glow-green) 45%, transparent);
}
.node-card .dep-item.is-not-running .dep-dot {
  width: 4px;
  height: 4px;
  background: var(--vscode-descriptionForeground);
  opacity: 0.4;
  box-shadow: none;
}
.node-card .dep-item.is-error .dep-dot {
  background: var(--glow-red);
  box-shadow: 0 0 4px color-mix(in srgb, var(--glow-red) 45%, transparent);
}
.node-card .dep-item.is-in-progress .dep-dot {
  display: none;
}
.node-card .dep-spinner {
  display: none;
  width: 8px;
  height: 8px;
  border: 1.5px solid color-mix(in srgb, var(--glow-blue) 25%, transparent);
  border-top-color: var(--glow-blue);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
.node-card .dep-item.is-in-progress .dep-spinner {
  display: block;
}
.node-card.has-deps.can-run:not(.healthy):not(.creating):not(.starting):not(.running):not(.healthcheck):not(.pending) {
  border-color: color-mix(in srgb, var(--glow-green) 45%, var(--vscode-widget-border, #454545));
  box-shadow: 0 0 12px color-mix(in srgb, var(--glow-green) 18%, transparent);
}
.node-card.no-deps {
  min-height: auto;
}
.node-card.has-deps .card-body {
  display: flex;
}
.node-card.no-deps:not(.creating):not(.starting):not(.healthcheck):not(.is-booting) .card-body {
  display: none;
}
.node-card.no-deps .card-body:has(.card-bottom-links:not([hidden])) {
  display: flex;
}
.node-card .service-card-settings-btn,
.node-card .logs-btn {
  position: absolute;
  bottom: 6px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--vscode-descriptionForeground);
  background: transparent;
  transition: color 0.2s ease, background 0.2s ease;
}
.node-card .service-card-settings-btn {
  right: 32px;
}
.node-card .logs-btn {
  right: 6px;
}
.service-card-settings-btn:hover,
.logs-btn:hover {
  color: var(--vscode-textLink-foreground, var(--glow-blue));
  background: var(--vscode-toolbar-hoverBackground, rgba(255,255,255,0.08));
}
.service-card-settings-btn:active,
.logs-btn:active {
  background: var(--vscode-toolbar-activeBackground, rgba(255,255,255,0.12));
}
.service-card-settings-btn:focus-visible,
.logs-btn:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, var(--glow-blue));
  outline-offset: 1px;
}
.service-card-settings-btn svg,
.logs-btn svg {
  width: 14px;
  height: 14px;
  display: block;
  flex-shrink: 0;
}
.service-card-settings-btn .icon-lucide-stroke,
.logs-btn .icon-lucide-stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.node-card.hide-logs-btn .logs-btn {
  display: none;
}
.node-card.no-deps.hide-logs-btn {
  padding-bottom: 10px;
}
.service-links {
  display: contents;
}
.service-links[hidden] {
  display: none !important;
}
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  font-size: 9px;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.2;
  color: var(--vscode-textLink-foreground, var(--glow-green));
  background: color-mix(in srgb, var(--glow-green) 14%, var(--vscode-editor-background));
  border: 1px solid color-mix(in srgb, var(--glow-green) 45%, var(--vscode-widget-border, #454545));
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}
.link-btn::before {
  content: '↗';
  font-size: 10px;
  opacity: 0.85;
}
.service-ports {
  display: contents;
}
.service-ports[hidden] {
  display: none !important;
}
.port-btn {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.2;
  color: var(--vscode-textLink-foreground, #75beff);
  background: color-mix(in srgb, var(--glow-blue, #3794ff) 16%, var(--vscode-editor-background));
  border: 1px solid color-mix(in srgb, var(--glow-blue, #3794ff) 50%, var(--vscode-widget-border, #454545));
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}
.port-btn:hover {
  background: color-mix(in srgb, var(--glow-blue, #3794ff) 28%, var(--vscode-editor-background));
  border-color: var(--glow-blue, #3794ff);
  transform: translateY(-1px);
}
.link-btn:hover {
  background: color-mix(in srgb, var(--glow-green) 22%, var(--vscode-editor-background));
  border-color: var(--glow-green);
  transform: translateY(-1px);
}
.link-btn:active {
  transform: translateY(0);
}
.node-card.pending {
  border-color: var(--vscode-descriptionForeground);
  opacity: 0.65;
}
.node-card.creating .name,
.node-card.starting .name,
.node-card.running .name {
  color: var(--glow-blue);
}
.node-card.healthcheck .name {
  color: var(--glow-yellow);
}
.node-card.stopped .name {
  color: var(--glow-orange);
}
.node-card.unhealthy .name,
.node-card.error .name {
  color: var(--glow-red);
}
.node-card.creating,
.node-card.starting,
.node-card.running,
.node-card.healthcheck,
.node-card.healthy,
.node-card.stopped,
.node-card.unhealthy,
.node-card.error {
  border-width: 2px;
}
.node-card.creating,
.node-card.starting,
.node-card.running,
.node-card.pending.can-run {
  border-color: var(--glow-blue);
  opacity: 1;
  transition: border-color 0.35s ease, box-shadow 0.35s ease, opacity 0.35s ease, background 0.35s ease;
  animation: pulse-blue 1.4s ease-in-out infinite;
}
.node-card.creating,
.node-card.starting {
  background: color-mix(in srgb, var(--glow-blue) 14%, var(--vscode-editor-background));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--glow-blue) 35%, transparent),
              0 0 18px color-mix(in srgb, var(--glow-blue) 25%, transparent);
}
.node-card.running {
  background: color-mix(in srgb, var(--glow-blue) 10%, var(--vscode-editor-background));
  box-shadow: 0 0 14px color-mix(in srgb, var(--glow-blue) 22%, transparent);
}
.node-card.pending.can-run {
  background: color-mix(in srgb, var(--glow-blue) 8%, var(--vscode-editor-background));
  box-shadow: 0 0 12px color-mix(in srgb, var(--glow-blue) 18%, transparent);
}
.node-card.healthcheck {
  border-color: var(--glow-yellow);
  background: color-mix(in srgb, var(--glow-yellow) 12%, var(--vscode-editor-background));
  box-shadow: 0 0 14px color-mix(in srgb, var(--glow-yellow) 30%, transparent);
  transform: scale(1);
  opacity: 1;
  transition: border-color 0.35s ease, box-shadow 0.35s ease, opacity 0.35s ease, background 0.35s ease;
  animation: heartbeat 1.1s ease-in-out infinite;
}
.node-card.healthy {
  border-color: var(--glow-green);
  background: color-mix(in srgb, var(--glow-green) 16%, var(--vscode-editor-background));
  box-shadow: 0 0 22px color-mix(in srgb, var(--glow-green) 35%, transparent);
  transform: scale(1.02);
  opacity: 1;
}
.node-card.healthy .name {
  color: var(--glow-green);
}
.node-card.flash-once {
  animation: flash-healthy 0.55s ease-out;
}
.node-card.animate-state-change {
  animation: card-state-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.node-card.animate-deps-ready {
  animation: card-deps-ready 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.node-card.stopped {
  border-color: var(--glow-orange);
  background: color-mix(in srgb, var(--glow-orange) 14%, var(--vscode-editor-background));
  box-shadow: 0 0 16px color-mix(in srgb, var(--glow-orange) 32%, transparent);
  transform: scale(1);
  opacity: 1;
}
.node-card.unhealthy,
.node-card.error {
  border-color: var(--glow-red);
  background: color-mix(in srgb, var(--glow-red) 14%, var(--vscode-editor-background));
  box-shadow: 0 0 18px color-mix(in srgb, var(--glow-red) 35%, transparent);
  transform: scale(1);
  opacity: 1;
  animation: shake 0.45s ease;
}
.node-card.unhealthy .loader,
.node-card.error .loader,
.node-card.stopped .loader {
  display: none;
}
@supports not (background: color-mix(in srgb, #000 50%, #fff)) {
  .node-card.creating,
  .node-card.starting {
    background: rgba(55, 148, 255, 0.14);
    box-shadow: 0 0 0 1px rgba(55, 148, 255, 0.35), 0 0 18px rgba(55, 148, 255, 0.25);
  }
  .node-card.running {
    background: rgba(55, 148, 255, 0.1);
    box-shadow: 0 0 14px rgba(55, 148, 255, 0.22);
  }
  .node-card.healthcheck {
    background: rgba(220, 220, 170, 0.12);
    box-shadow: 0 0 14px rgba(220, 220, 170, 0.3);
  }
  .node-card.healthy {
    background: rgba(78, 201, 176, 0.16);
    box-shadow: 0 0 22px rgba(78, 201, 176, 0.35);
  }
  .node-card.stopped {
    background: rgba(206, 145, 120, 0.14);
    box-shadow: 0 0 16px rgba(206, 145, 120, 0.32);
  }
  .node-card.unhealthy,
  .node-card.error {
    background: rgba(244, 135, 113, 0.14);
    box-shadow: 0 0 18px rgba(244, 135, 113, 0.35);
  }
}
@keyframes card-state-enter {
  0% {
    transform: scale(0.97);
    filter: brightness(0.88);
  }
  45% {
    transform: scale(1.04);
    filter: brightness(1.18);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}
@keyframes card-deps-ready {
  0% {
    transform: scale(0.98);
    filter: brightness(0.92);
    box-shadow: 0 0 0 0 transparent;
  }
  50% {
    transform: scale(1.05);
    filter: brightness(1.2);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--glow-blue) 40%, transparent),
                0 0 26px color-mix(in srgb, var(--glow-blue) 38%, transparent);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}
@keyframes pulse-blue {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--glow-blue) 30%, transparent),
                0 0 16px color-mix(in srgb, var(--glow-blue) 22%, transparent);
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--glow-blue) 48%, transparent),
                0 0 28px color-mix(in srgb, var(--glow-blue) 38%, transparent);
  }
}
@keyframes heartbeat {
  0%, 100% { box-shadow: 0 0 8px color-mix(in srgb, var(--glow-yellow) 20%, transparent); }
  50% { box-shadow: 0 0 22px color-mix(in srgb, var(--glow-yellow) 45%, transparent); }
}
@keyframes flash-healthy {
  0% { filter: brightness(1.8); }
  100% { filter: brightness(1); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes flow-packet-down {
  0% { opacity: 0; transform: translateY(0) scale(0.6); }
  12% { opacity: 1; transform: translateY(4px) scale(1); }
  88% { opacity: 1; transform: translateY(26px) scale(1); }
  100% { opacity: 0; transform: translateY(34px) scale(0.5); }
}
@keyframes parent-glow {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--glow-green) 50%, transparent); }
  70% { box-shadow: 0 0 24px color-mix(in srgb, var(--glow-green) 35%, transparent); }
  100% { box-shadow: none; }
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 18px;
  font-size: 9px;
  opacity: 0.85;
  justify-content: center;
  line-height: 1.35;
}
.legend span::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
  flex-shrink: 0;
}
/* Card: pending */
.legend .l-pending::before {
  background: var(--vscode-descriptionForeground);
  opacity: 0.55;
}
/* Dep: parent not running yet */
.legend .l-dep-wait::before {
  background: var(--glow-orange);
  opacity: 0.85;
}
/* Card: creating / starting; dep: in progress */
.legend .l-active::before {
  background: var(--glow-blue);
  box-shadow: 0 0 4px color-mix(in srgb, var(--glow-blue) 50%, transparent);
}
/* Card: healthcheck */
.legend .l-health::before {
  background: var(--glow-yellow);
  box-shadow: 0 0 4px color-mix(in srgb, var(--glow-yellow) 45%, transparent);
}
/* Card: healthy; dep: satisfied */
.legend .l-ok::before {
  background: var(--glow-green);
  box-shadow: 0 0 4px color-mix(in srgb, var(--glow-green) 50%, transparent);
}
/* Card: stopped */
.legend .l-stopped::before {
  background: var(--glow-orange);
  box-shadow: 0 0 4px color-mix(in srgb, var(--glow-orange) 40%, transparent);
}
/* Card: error / unhealthy; dep: failed */
.legend .l-error::before {
  background: var(--glow-red);
  box-shadow: 0 0 4px color-mix(in srgb, var(--glow-red) 45%, transparent);
}
  </style>
</head>
<body>
  <header>
<div class="header-row">
  <h2>Dependency tree</h2>
  <div class="header-actions">
    <button type="button" class="header-icon-btn header-transport-btn run-btn" id="run-compose-header-btn" title="Run docker compose up" aria-label="Run docker compose up" aria-busy="false">
      <span class="header-run-spinner" aria-hidden="true"></span>
      <svg class="icon-lucide icon-lucide-fill run-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>
    </button>
    <button type="button" class="header-show-terminal-btn" id="show-compose-terminal-btn" title="Show the terminal where docker compose up is running" aria-label="Show terminal">Show terminal</button>
    <button type="button" class="header-icon-btn header-transport-btn stop-btn" id="stop-compose-btn" title="Stop all services (docker compose down)" aria-label="Stop compose stack">
      <svg class="icon-lucide icon-lucide-fill" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
    </button>
    <button type="button" class="header-icon-btn" id="open-settings-btn" title="DockerComposeVisualizer settings" aria-label="Open DockerComposeVisualizer settings">
      <svg class="icon-lucide icon-lucide-stroke" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      </svg>
    </button>
  </div>
</div>
<div class="meta" id="meta">Run <code>docker compose up</code> to begin tracking.</div>
<div class="progress-strip" id="progress-strip"><div class="progress-fill" id="progress-fill"></div></div>
  </header>
  <div class="header-compose-bar" id="header-compose-bar" hidden>
    <button type="button" class="pick-compose-btn header-compose-btn" id="pick-compose-top-btn" title="Choose a compose YAML file to track" aria-label="Choose YAML file" aria-busy="false">
      <span class="compose-pick-spinner" aria-hidden="true"></span>
      <svg class="icon-lucide icon-lucide-stroke" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      </svg>
      <span class="pick-compose-label">Choose YAML file</span>
    </button>
  </div>
  <div id="main-view">
<div id="error-banner"></div>
<div id="empty">
  <div id="empty-loading" aria-live="polite">
    <div class="bootstrap-spinner" aria-hidden="true"></div>
    <p class="empty-title">Loading DockerComposeVisualizer</p>
    <p id="empty-loading-detail" class="empty-hint">Preparing your visual dependency tree…</p>
  </div>
  <div id="empty-pick" hidden>
    <p class="empty-title">No compose file selected</p>
    <p class="empty-hint">Use <strong>Choose YAML file</strong> above to pick a <code>docker-compose.yml</code> (or dev variant), or run <code>docker compose up</code> in a terminal to auto-track.</p>
  </div>
  <div id="empty-failed" hidden>
    <p class="empty-title">Compose file not found</p>
    <p class="empty-hint" id="empty-failed-msg"></p>
    <p class="empty-hint">Use <strong>Choose YAML file</strong> above to select another compose file.</p>
  </div>
</div>
<div id="tree-stage" class="tree-stage" hidden>
  <div id="tree-content"></div>
</div>
<div class="legend" id="status-legend">
<span class="l-pending">Waiting</span>
<span class="l-dep-wait">Dep waiting</span>
<span class="l-active">Booting</span>
<span class="l-health">Health</span>
<span class="l-ok">Healthy</span>
<span class="l-stopped">Stopped</span>
<span class="l-error">Error</span>
</div>
  </div>
  <section id="settings-view" aria-label="DockerComposeVisualizer settings">
<p class="settings-hint settings-persist-hint">Preferences are saved in <code>.composeVisual/sidebar-settings.json</code> in this workspace.</p>
<div class="settings-section">
  <h3>Run stack</h3>
  <div class="settings-option">
    <label class="settings-check">
      <input type="checkbox" id="setting-show-run" />
      <span class="settings-option-title">Show Run button in header</span>
    </label>
    <p class="settings-hint">Starts <code>docker compose up</code> for the compose file selected in this sidebar.</p>
  </div>
  <div id="settings-run-details" hidden>
    <p class="settings-hint" style="margin-left: 0;">Command uses <code>docker compose -f &lt;file&gt;</code> plus any extra flags below (the file path is added for you).</p>
    <p class="settings-run-preview" id="settings-run-preview"></p>
    <div class="settings-field">
      <label for="setting-compose-args">Extra flags</label>
      <input type="text" id="setting-compose-args" spellcheck="false" placeholder="--env-file .env.dev up -d" />
      <p class="settings-hint">Example: <code>--env-file .env.dev up -d</code>. Include <code>up</code> if you want detached mode.</p>
    </div>
  </div>
</div>
<div class="settings-section">
  <h3>Tree display</h3>
  <div class="settings-option">
    <label class="settings-check">
      <input type="checkbox" id="setting-boot-timer" />
      <span class="settings-option-title">Show boot timer on containers</span>
    </label>
    <p class="settings-hint">Counts seconds from when dependencies are satisfied until the container is healthy.</p>
  </div>
  <div class="settings-option">
    <label class="settings-check">
      <input type="checkbox" id="setting-logs-btn" />
      <span class="settings-option-title">Show log button on containers</span>
    </label>
    <p class="settings-hint">Clicking the log button opens that container&rsquo;s logs in a terminal (<code>docker logs</code>).</p>
  </div>
  <div class="settings-option">
    <label class="settings-check">
      <input type="checkbox" id="setting-port-btns" />
      <span class="settings-option-title">Show port buttons on containers</span>
    </label>
    <p class="settings-hint">Quick links to published host ports when the service is up (unless you set custom links on a card).</p>
  </div>
  <div class="settings-option">
    <label class="settings-check">
      <input type="checkbox" id="setting-legend" />
      <span class="settings-option-title">Show status legend</span>
    </label>
    <p class="settings-hint">Color key for waiting, booting, healthy, stopped, and error states below the tree.</p>
  </div>
  <div class="settings-option">
    <label class="settings-check">
      <input type="checkbox" id="setting-deps-list" />
      <span class="settings-option-title">Show dependency list on containers</span>
    </label>
    <p class="settings-hint">Lists which other services each container must wait for before it can start.</p>
  </div>
  <div class="settings-option">
    <label class="settings-check">
      <input type="checkbox" id="setting-tier-sep" />
      <span class="settings-option-title">Show tier separators</span>
    </label>
    <p class="settings-hint">Adds visual dividers between dependency tiers in the grid layout.</p>
  </div>
  <div class="settings-field">
    <label for="setting-grid-cols">Grid columns</label>
    <select id="setting-grid-cols">
      <option value="auto">Auto</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
    <p class="settings-hint">How many service cards appear per row in the dependency tree.</p>
  </div>
  <div class="settings-field">
    <label for="setting-links-when">Show service links when</label>
    <select id="setting-links-when">
      <option value="healthy">Healthy</option>
      <option value="running">Running</option>
      <option value="healthcheck">Healthcheck</option>
    </select>
    <p class="settings-hint">Minimum container state before custom or port link buttons appear on a card.</p>
  </div>
  <div class="settings-field">
    <label for="setting-mark-healthy">Count service as up when</label>
    <select id="setting-mark-healthy">
      <option value="healthy">Healthy</option>
      <option value="running">Running</option>
    </select>
    <p class="settings-hint">Used for progress, dependencies unlocking, and the status bar&mdash;not only for link buttons.</p>
  </div>
</div>
<div class="settings-actions">
  <button type="button" class="settings-save-btn" id="settings-save-btn">Save</button>
  <button type="button" class="settings-cancel-btn" id="settings-cancel-btn">Cancel</button>
</div>
  </section>
  <div id="service-links-modal" role="dialog" aria-modal="true" aria-labelledby="service-links-modal-title" hidden>
<div class="service-links-modal-panel">
  <h3 id="service-links-modal-title">Service links</h3>
  <p class="service-links-modal-hint">Add name and URL pairs (e.g. <code>landing</code> → <code>http://localhost</code>). Saved in <code>.composeVisual/service-links.json</code>. These replace auto-detected port buttons for this service.</p>
  <div class="service-links-editor-rows" id="service-links-editor-rows"></div>
  <button type="button" class="link-editor-add-btn" id="link-editor-add-btn">+ Add link</button>
  <div class="service-links-modal-actions">
    <button type="button" class="settings-save-btn" id="service-links-save-btn">Save</button>
    <button type="button" class="settings-cancel-btn" id="service-links-cancel-btn">Cancel</button>
  </div>
</div>
  </div>
  <footer class="sidebar-footer" id="sidebar-footer" hidden>
    <button type="button" class="rate-extension-btn" id="rate-extension-btn" title="Rate DockerComposeVisualizer on the VS Code Marketplace" aria-label="Rate this extension on the Marketplace" hidden>
      <span class="rate-heart" aria-hidden="true">❤️</span>
      <span>Please rate this extension</span>
    </button>
    <button type="button" class="footer-compose-btn" id="change-compose-btn" title="Choose a different compose YAML file" aria-label="Change YAML file" aria-busy="false" hidden>
      <span class="compose-pick-spinner" aria-hidden="true"></span>
      <svg class="icon-lucide icon-lucide-stroke" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      </svg>
      <span class="change-compose-label" id="change-compose-label">Change YAML file</span>
    </button>
  </footer>
  <script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const treeStage = document.getElementById('tree-stage');
const treeContent = document.getElementById('tree-content');
const emptyEl = document.getElementById('empty');
const errorBanner = document.getElementById('error-banner');
const metaEl = document.getElementById('meta');
const progressStrip = document.getElementById('progress-strip');
const progressFill = document.getElementById('progress-fill');
const mainView = document.getElementById('main-view');
const settingsView = document.getElementById('settings-view');
const headerTitle = document.querySelector('header h2');
const openSettingsBtn = document.getElementById('open-settings-btn');
const runComposeHeaderBtn = document.getElementById('run-compose-header-btn');
const showComposeTerminalBtn = document.getElementById('show-compose-terminal-btn');
const stopComposeBtn = document.getElementById('stop-compose-btn');
const pickComposeTopBtn = document.getElementById('pick-compose-top-btn');
const headerComposeBar = document.getElementById('header-compose-bar');
const emptyLoadingEl = document.getElementById('empty-loading');
const emptyPickEl = document.getElementById('empty-pick');
const emptyFailedEl = document.getElementById('empty-failed');
const emptyLoadingDetail = document.getElementById('empty-loading-detail');
const emptyFailedMsg = document.getElementById('empty-failed-msg');
const changeComposeBtn = document.getElementById('change-compose-btn');
const changeComposeLabel = document.getElementById('change-compose-label');
const sidebarFooter = document.getElementById('sidebar-footer');
const rateExtensionBtn = document.getElementById('rate-extension-btn');
const settingShowRun = document.getElementById('setting-show-run');
const settingsRunDetails = document.getElementById('settings-run-details');
const settingsRunPreview = document.getElementById('settings-run-preview');
const settingComposeArgs = document.getElementById('setting-compose-args');
let settingsViewOpen = false;
let lastSettingsData = null;
let hasComposeFileSelected = false;
let showRateExtensionButton = true;
let bootstrapPhase = 'loading';
const STOP_VISIBLE_STATES = ['creating', 'starting', 'running', 'healthcheck', 'healthy'];

function setEmptyBootstrapPhase(phase, data) {
  if (!emptyEl) return;
  bootstrapPhase = phase === 'hidden' ? (hasComposeFileSelected ? 'hidden' : 'pick') : phase;
  document.body.classList.toggle('is-bootstrap-loading', phase === 'loading');
  if (phase === 'hidden') {
    emptyEl.hidden = true;
    if (emptyLoadingEl) emptyLoadingEl.hidden = true;
    if (emptyPickEl) emptyPickEl.hidden = true;
    if (emptyFailedEl) emptyFailedEl.hidden = true;
    syncComposeFileUi();
    return;
  }
  emptyEl.hidden = false;
  treeStage.hidden = true;
  if (emptyLoadingEl) emptyLoadingEl.hidden = phase !== 'loading';
  if (emptyPickEl) emptyPickEl.hidden = phase !== 'pick';
  if (emptyFailedEl) emptyFailedEl.hidden = phase !== 'failed';
  if (phase === 'loading' && emptyLoadingDetail) {
    const file = data && data.composeFile ? escapeHtml(data.composeFile) : '';
    emptyLoadingDetail.innerHTML = file
      ? 'Loading visual tree from <strong>' + file + '</strong>…'
      : 'Preparing your visual dependency tree…';
  }
  if (phase === 'failed' && emptyFailedMsg) {
    emptyFailedMsg.textContent =
      (data && data.message) ||
      'The saved compose file could not be found in this workspace.';
  }
  if (phase === 'pick') {
    metaEl.textContent = 'Select a compose file or run docker compose up.';
  } else if (phase === 'loading') {
    metaEl.textContent = 'Loading DockerComposeVisualizer…';
    progressFill.style.width = '0%';
  }
  syncTransportControls();
  syncComposeFileUi();
}

function syncComposeFileUi() {
  const isLoading = bootstrapPhase === 'loading' || document.body.classList.contains('is-bootstrap-loading');
  const showTopPick = !hasComposeFileSelected && !isLoading && !settingsViewOpen;
  const showFooterChange = hasComposeFileSelected && !settingsViewOpen;
  const showRate = showRateExtensionButton && !settingsViewOpen && !isLoading;
  const showFooter = showFooterChange || showRate;

  if (headerComposeBar) {
    headerComposeBar.hidden = !showTopPick;
  }
  if (changeComposeBtn) {
    changeComposeBtn.hidden = !showFooterChange;
    if (showFooterChange && changeComposeLabel) {
      changeComposeLabel.textContent = 'Change YAML file';
      changeComposeBtn.title = 'Choose a different compose YAML file';
      changeComposeBtn.setAttribute('aria-label', 'Change YAML file');
    }
  }
  if (rateExtensionBtn) {
    rateExtensionBtn.hidden = !showRate;
  }
  if (sidebarFooter) {
    sidebarFooter.hidden = !showFooter;
  }
}
const nodeEls = new Map();
const nodeMeta = new Map();
const serviceStates = new Map();
let serviceLinks = {};
let servicePorts = {};
let treePayload = null;
let currentBootFocus = null;
let showBootTimer = true;
let showLogsButton = true;
let showPortButtons = true;
let showLegend = true;
let showDependencyList = true;
let gridColumns = 'auto';
let tierSeparator = true;
let showServiceLinksWhen = 'healthy';
let markHealthyWhen = 'healthy';
let showComposeRunButton = false;
let composeRunSpinning = false;
let showComposeTerminalAvailable = false;
let lastCommandPreview = '';
let lastComposeFileName = '';
const bootTimers = new Map();

const STOP_ICON_HTML =
  '<svg class="icon-lucide icon-lucide-fill" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';

function isStackRunning() {
  let anyRunning = false;
  serviceStates.forEach(function(state) {
    if (STOP_VISIBLE_STATES.indexOf(state) >= 0) {
      anyRunning = true;
    }
  });
  return anyRunning;
}

function syncComposeRunUi() {
  const showTerminal =
    hasComposeFileSelected && showComposeRunButton && showComposeTerminalAvailable;
  if (showComposeTerminalBtn) {
    if (showTerminal) {
      showComposeTerminalBtn.classList.add('is-visible');
    } else {
      showComposeTerminalBtn.classList.remove('is-visible');
    }
  }
  if (runComposeHeaderBtn) {
    if (composeRunSpinning) {
      runComposeHeaderBtn.classList.add('is-spinning');
      runComposeHeaderBtn.disabled = true;
      runComposeHeaderBtn.setAttribute('aria-busy', 'true');
      runComposeHeaderBtn.setAttribute('aria-label', 'Starting stack…');
      runComposeHeaderBtn.title = 'Starting docker compose up…';
    } else {
      runComposeHeaderBtn.classList.remove('is-spinning');
      runComposeHeaderBtn.disabled = false;
      runComposeHeaderBtn.setAttribute('aria-busy', 'false');
      runComposeHeaderBtn.setAttribute('aria-label', 'Run docker compose up');
    }
  }
}

function syncTransportControls() {
  const running = isStackRunning();
  const showRunBase = hasComposeFileSelected && showComposeRunButton && !running;
  const showRunBtn = showRunBase || (composeRunSpinning && hasComposeFileSelected && showComposeRunButton);
  const showStop = hasComposeFileSelected && showComposeRunButton && running && !composeRunSpinning;

  if (runComposeHeaderBtn) {
    if (showRunBtn) {
      runComposeHeaderBtn.classList.add('is-visible');
      if (!composeRunSpinning) {
        const preview = lastCommandPreview || ('docker compose -f ' + (lastComposeFileName || '…') + ' up');
        runComposeHeaderBtn.title = 'Run: ' + preview;
      }
    } else {
      runComposeHeaderBtn.classList.remove('is-visible');
      if (!composeRunSpinning) {
        runComposeHeaderBtn.classList.remove('is-spinning');
        runComposeHeaderBtn.disabled = false;
      }
    }
  }

  if (stopComposeBtn) {
    if (showStop) {
      stopComposeBtn.classList.add('is-visible');
    } else {
      stopComposeBtn.classList.remove('is-visible');
      stopComposeBtn.disabled = false;
      stopComposeBtn.setAttribute('aria-label', 'Stop compose stack');
      if (!stopComposeBtn.querySelector('svg')) {
        stopComposeBtn.innerHTML = STOP_ICON_HTML;
      }
    }
  }
  syncComposeRunUi();
}

function applyComposeRunUi(data) {
  composeRunSpinning = !!(data && data.spinning);
  showComposeTerminalAvailable = !!(data && data.showTerminal);
  syncTransportControls();
}

function updateStopButtonVisibility() {
  syncTransportControls();
}

function renderDepsList(deps) {
  if (!showDependencyList || !deps || !deps.length) {
    return '';
  }
  return (
    '<ul class="deps-list">' +
    deps
      .map(function(d) {
        return (
          '<li class="dep-item" data-dep="' + escapeHtml(d.service) + '">' +
          '<span class="dep-indicator" aria-hidden="true">' +
          '<span class="dep-dot"></span>' +
          '<span class="dep-spinner"></span>' +
          '</span>' +
          '<span class="dep-name">' + escapeHtml(d.service) + '</span>' +
          '</li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

function showError(msg) {
  errorBanner.style.display = 'block';
  errorBanner.textContent = msg;
}

function hideError() {
  errorBanner.style.display = 'none';
}

function depConditionMet(entry, parentState) {
  const condition = entry.condition || 'service_started';
  if (condition === 'service_healthy') {
    return parentState === 'healthy' || (markHealthyWhen === 'running' && parentState === 'running');
  }
  if (condition === 'service_completed_successfully') {
    return parentState === 'stopped' || parentState === 'healthy';
  }
  return (
    parentState === 'healthy' ||
    parentState === 'running' ||
    parentState === 'healthcheck' ||
    parentState === 'starting' ||
    parentState === 'creating'
  );
}

function getDepVisualState(entry, parentState) {
  if (!parentState || parentState === 'pending') {
    return 'not-running';
  }
  if (parentState === 'error' || parentState === 'unhealthy') {
    return 'error';
  }

  const condition = entry.condition || 'service_started';

  if (condition === 'service_healthy') {
    if (parentState === 'healthy') {
      return 'running';
    }
    if (parentState === 'running' && markHealthyWhen === 'running') {
      return 'running';
    }
    if (
      parentState === 'creating' ||
      parentState === 'starting' ||
      parentState === 'running' ||
      parentState === 'healthcheck'
    ) {
      return 'in-progress';
    }
    return 'not-running';
  }

  if (condition === 'service_completed_successfully') {
    if (parentState === 'stopped' || parentState === 'healthy') {
      return 'running';
    }
    if (
      parentState === 'creating' ||
      parentState === 'starting' ||
      parentState === 'running' ||
      parentState === 'healthcheck'
    ) {
      return 'in-progress';
    }
    return 'not-running';
  }

  // service_started — green when up, blue spinner while booting
  if (
    parentState === 'healthy' ||
    parentState === 'running' ||
    parentState === 'healthcheck'
  ) {
    return 'running';
  }
  if (parentState === 'creating' || parentState === 'starting') {
    return 'in-progress';
  }
  return 'not-running';
}

const DEP_STATE_CLASSES = ['is-running', 'is-not-running', 'is-in-progress', 'is-error'];

function applyDepVisualClass(item, visualState) {
  item.classList.remove.apply(item.classList, DEP_STATE_CLASSES);
  if (visualState === 'running') {
    item.classList.add('is-running');
  } else if (visualState === 'in-progress') {
    item.classList.add('is-in-progress');
  } else if (visualState === 'error') {
    item.classList.add('is-error');
  } else {
    item.classList.add('is-not-running');
  }
}

function updateCardDependencies(serviceName) {
  const card = nodeEls.get(serviceName);
  const meta = nodeMeta.get(serviceName);
  if (!card || !meta) return;

  const deps = meta.dependsOn || [];
  const list = card.querySelector('.deps-list');

  if (!deps.length) {
    card.classList.remove('can-run');
    syncBootTimer(serviceName);
    return;
  }

  let allOk = true;
  const depVisual = new Map();
  deps.forEach(function(dep) {
    const depName = dep.service || dep;
    const parentState = serviceStates.get(depName);
    depVisual.set(depName, getDepVisualState(dep, parentState));
    if (!depConditionMet(dep, parentState)) {
      allOk = false;
    }
  });
  if (list) {
    list.querySelectorAll('.dep-item').forEach(function(item) {
      const depName = item.dataset.dep;
      applyDepVisualClass(item, depVisual.get(depName) || 'not-running');
    });
  }

  const hadCanRun = card.classList.contains('can-run');
  if (allOk) {
    card.classList.add('can-run');
  } else {
    card.classList.remove('can-run');
  }
  if (!hadCanRun && allOk) {
    const state = serviceStates.get(serviceName);
    if (resolveVisualState(state) === 'pending') {
      triggerCardStateAnimation(card, 'animate-deps-ready');
    }
  }
  syncMainLoader(serviceName);
  syncBootTimer(serviceName);
}

function hasDepsStillBooting(deps) {
  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i];
    const depName = dep.service || dep;
    const parentState = serviceStates.get(depName);
    if (getDepVisualState(dep, parentState) === 'in-progress') {
      return true;
    }
  }
  return false;
}

function shouldShowMainLoader(serviceName) {
  const card = nodeEls.get(serviceName);
  const meta = nodeMeta.get(serviceName);
  if (!card) {
    return false;
  }
  const state = serviceStates.get(serviceName);
  if (!state || isHealthyState(state)) {
    return false;
  }
  if (state === 'running' || state === 'healthcheck') {
    return true;
  }
  if (state !== 'creating' && state !== 'starting') {
    return false;
  }
  const deps = meta && meta.dependsOn ? meta.dependsOn : [];
  if (deps.length === 0) {
    return true;
  }
  if (hasDepsStillBooting(deps)) {
    return false;
  }
  return card.classList.contains('can-run');
}

function syncMainLoader(serviceName) {
  const card = nodeEls.get(serviceName);
  if (!card) {
    return;
  }
  const show = shouldShowMainLoader(serviceName);
  card.classList.toggle('show-main-loader', show);
  const state = serviceStates.get(serviceName);
  const isStartingUp =
    state === 'creating' ||
    state === 'starting' ||
    state === 'running' ||
    state === 'healthcheck';
  if (show && (state === 'creating' || state === 'starting')) {
    card.classList.add('is-booting');
  } else if (!show || state === 'healthy' || state === 'stopped') {
    card.classList.remove('is-booting');
  }
}

function isHealthyState(state) {
  if (markHealthyWhen === 'running') {
    return state === 'healthy' || state === 'running';
  }
  return state === 'healthy';
}

function stateAllowsServiceLinks(state) {
  if (!state) return false;
  if (showServiceLinksWhen === 'running') {
    return ['running', 'healthcheck', 'healthy'].includes(state);
  }
  if (showServiceLinksWhen === 'healthcheck') {
    return ['healthcheck', 'healthy'].includes(state);
  }
  return state === 'healthy';
}

function getBootTimerEl(card) {
  return card ? card.querySelector('.boot-timer') : null;
}

function clearBootTimerInterval(serviceName) {
  const t = bootTimers.get(serviceName);
  if (!t) return;
  clearInterval(t.intervalId);
  bootTimers.delete(serviceName);
}

function clearAllBootTimers() {
  bootTimers.forEach(function(t) {
    clearInterval(t.intervalId);
  });
  bootTimers.clear();
  nodeEls.forEach(function(card) {
    const el = getBootTimerEl(card);
    if (!el) return;
    el.classList.remove('is-visible', 'is-done');
    el.textContent = '';
  });
}

function hideBootTimerEl(card) {
  const el = getBootTimerEl(card);
  if (!el) return;
  el.classList.remove('is-visible', 'is-done');
  el.textContent = '';
}

function stopBootTimer(serviceName) {
  const t = bootTimers.get(serviceName);
  const card = nodeEls.get(serviceName);
  const el = getBootTimerEl(card);
  if (!t || !el) {
    clearBootTimerInterval(serviceName);
    return;
  }
  clearInterval(t.intervalId);
  bootTimers.delete(serviceName);
  const sec = Math.max(0, Math.floor((Date.now() - t.startMs) / 1000));
  el.textContent = sec + 's';
  el.classList.add('is-visible', 'is-done');
  el.setAttribute('title', 'Time until healthy: ' + sec + 's');
}

function startBootTimer(serviceName) {
  if (bootTimers.has(serviceName)) return;
  const card = nodeEls.get(serviceName);
  const el = getBootTimerEl(card);
  if (!card || !el) return;
  const startMs = Date.now();
  el.classList.remove('is-done');
  el.classList.add('is-visible');
  el.setAttribute('title', 'Waiting to become healthy');
  function tick() {
    const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    el.textContent = sec + 's';
  }
  tick();
  const intervalId = setInterval(tick, 250);
  bootTimers.set(serviceName, { intervalId: intervalId, startMs: startMs });
}

function syncBootTimer(serviceName) {
  const card = nodeEls.get(serviceName);
  if (!card) return;
  if (!showBootTimer) {
    clearBootTimerInterval(serviceName);
    hideBootTimerEl(card);
    return;
  }
  const state = serviceStates.get(serviceName);
  if (isHealthyState(state)) {
    if (bootTimers.has(serviceName)) {
      stopBootTimer(serviceName);
    }
    return;
  }
  const meta = nodeMeta.get(serviceName);
  const hasDeps = meta && meta.dependsOn && meta.dependsOn.length > 0;
  const isBooting =
    state === 'creating' ||
    state === 'starting' ||
    state === 'healthcheck';

  if (hasDeps && card.classList.contains('can-run')) {
    startBootTimer(serviceName);
  } else if (!hasDeps && isBooting) {
    startBootTimer(serviceName);
  } else {
    clearBootTimerInterval(serviceName);
    hideBootTimerEl(card);
  }
}

function applyLogsButtonSetting(enabled) {
  showLogsButton = !!enabled;
  nodeEls.forEach(function(card) {
    if (showLogsButton) {
      card.classList.remove('hide-logs-btn');
    } else {
      card.classList.add('hide-logs-btn');
    }
  });
}

function applyBootTimerSetting(enabled) {
  showBootTimer = !!enabled;
  if (!showBootTimer) {
    clearAllBootTimers();
    return;
  }
  nodeEls.forEach(function(_card, name) {
    syncBootTimer(name);
  });
}

function applyLegendSetting(enabled) {
  showLegend = !!enabled;
  const legend = document.getElementById('status-legend');
  if (legend) {
    legend.classList.toggle('is-hidden', !showLegend);
  }
}

function applyDependencyListSetting(enabled) {
  showDependencyList = !!enabled;
  nodeEls.forEach(function(card) {
    card.classList.toggle('hide-deps-list', !showDependencyList);
  });
}

function applyGridColumnsSetting(cols) {
  gridColumns = cols || 'auto';
  document.querySelectorAll('.tier-row').forEach(function(row) {
    row.classList.remove('grid-cols-2', 'grid-cols-3', 'grid-cols-auto');
    row.classList.add('grid-cols-' + gridColumns);
  });
}

function applySettings(data) {
  if (!data) return;
  lastSettingsData = data;
  showComposeRunButton = !!data.showComposeRunButton;
  applyBootTimerSetting(data.showBootTimer);
  applyLogsButtonSetting(data.showLogsButton);
  applyPortButtonsSetting(data.showPortButtons);
  applyLegendSetting(data.showLegend);
  applyDependencyListSetting(data.showDependencyList);
  applyGridColumnsSetting(data.gridColumns);
  tierSeparator = data.tierSeparator !== false;
  showServiceLinksWhen = data.showServiceLinksWhen || 'healthy';
  markHealthyWhen = data.markHealthyWhen || 'healthy';
  syncRunControls();
  nodeEls.forEach(function(_card, name) {
    updateLinkButtons(name);
    updatePortButtons(name);
    updateCardDependencies(name);
  });
  reapplyAllCardStateClasses();
}

function syncRunControls() {
  syncTransportControls();
}

function metaForComposePreview() {
  if (showComposeRunButton && lastCommandPreview) {
    return 'Click Run to start: ' + lastCommandPreview;
  }
  if (hasComposeFileSelected) {
    return 'Preview — run docker compose up in a terminal, or enable Run in settings.';
  }
  return metaEl.textContent;
}

function updateSettingsRunPreview() {
  if (!settingsRunPreview) return;
  if (lastCommandPreview) {
    settingsRunPreview.innerHTML = 'Command: <code>' + escapeHtml(lastCommandPreview) + '</code>';
  } else if (lastComposeFileName) {
    settingsRunPreview.innerHTML = 'Command: <code>docker compose -f ' + escapeHtml(lastComposeFileName) + ' up</code>';
  } else {
    settingsRunPreview.textContent = 'Select a compose file to see the run command.';
  }
}

function syncSettingsRunDetailsVisibility() {
  if (!settingsRunDetails || !settingShowRun) return;
  settingsRunDetails.hidden = !settingShowRun.checked;
  if (settingShowRun.checked) {
    updateSettingsRunPreview();
  }
}

function populateSettingsForm() {
  const d = lastSettingsData;
  if (!d) return;
  if (settingShowRun) settingShowRun.checked = !!d.showComposeRunButton;
  if (settingComposeArgs) settingComposeArgs.value = d.composeRunExtraArgs || '';
  const boot = document.getElementById('setting-boot-timer');
  const logs = document.getElementById('setting-logs-btn');
  const ports = document.getElementById('setting-port-btns');
  const legend = document.getElementById('setting-legend');
  const deps = document.getElementById('setting-deps-list');
  const tier = document.getElementById('setting-tier-sep');
  const grid = document.getElementById('setting-grid-cols');
  const linksWhen = document.getElementById('setting-links-when');
  const markHealthy = document.getElementById('setting-mark-healthy');
  if (boot) boot.checked = !!d.showBootTimer;
  if (logs) logs.checked = !!d.showLogsButton;
  if (ports) ports.checked = !!d.showPortButtons;
  if (legend) legend.checked = !!d.showLegend;
  if (deps) deps.checked = !!d.showDependencyList;
  if (tier) tier.checked = d.tierSeparator !== false;
  if (grid) grid.value = d.gridColumns || 'auto';
  if (linksWhen) linksWhen.value = d.showServiceLinksWhen || 'healthy';
  if (markHealthy) markHealthy.value = d.markHealthyWhen || 'healthy';
  syncSettingsRunDetailsVisibility();
}

function collectSettingsForm() {
  const grid = document.getElementById('setting-grid-cols');
  const linksWhen = document.getElementById('setting-links-when');
  const markHealthy = document.getElementById('setting-mark-healthy');
  return {
    showComposeRunButton: !!(settingShowRun && settingShowRun.checked),
    composeRunExtraArgs: settingComposeArgs ? settingComposeArgs.value.trim() : '',
    showBootTimer: !!(document.getElementById('setting-boot-timer') && document.getElementById('setting-boot-timer').checked),
    showLogsButton: !!(document.getElementById('setting-logs-btn') && document.getElementById('setting-logs-btn').checked),
    showPortButtons: !!(document.getElementById('setting-port-btns') && document.getElementById('setting-port-btns').checked),
    showLegend: !!(document.getElementById('setting-legend') && document.getElementById('setting-legend').checked),
    showDependencyList: !!(document.getElementById('setting-deps-list') && document.getElementById('setting-deps-list').checked),
    gridColumns: grid ? grid.value : 'auto',
    tierSeparator: !!(document.getElementById('setting-tier-sep') && document.getElementById('setting-tier-sep').checked),
    showServiceLinksWhen: linksWhen ? linksWhen.value : 'healthy',
    markHealthyWhen: markHealthy ? markHealthy.value : 'healthy',
  };
}

function showSettingsView() {
  settingsViewOpen = true;
  populateSettingsForm();
  if (mainView) mainView.hidden = true;
  if (settingsView) settingsView.classList.add('is-visible');
  if (headerTitle) headerTitle.textContent = 'Settings';
  if (openSettingsBtn) openSettingsBtn.classList.add('is-active');
  if (metaEl) metaEl.textContent = 'Configure DockerComposeVisualizer, then click Save.';
  syncComposeFileUi();
}

function showMainView() {
  settingsViewOpen = false;
  if (mainView) mainView.hidden = false;
  if (settingsView) settingsView.classList.remove('is-visible');
  if (headerTitle) headerTitle.textContent = 'Dependency tree';
  if (openSettingsBtn) openSettingsBtn.classList.remove('is-active');
  if (hasComposeFileSelected) {
    metaEl.textContent = metaForComposePreview();
  } else {
    metaEl.textContent = 'Select a compose file or run docker compose up.';
  }
  syncComposeFileUi();
}

function updateAllDependencies() {
  nodeEls.forEach(function(_card, name) {
    updateCardDependencies(name);
  });
}

function notifyDependentsParentReady(parentName) {
  nodeEls.forEach(function(_childCard, childName) {
    const meta = nodeMeta.get(childName);
    if (!meta || !meta.dependsOn) return;
    const dependsOnParent = meta.dependsOn.some(function(dep) {
      return (dep.service || dep) === parentName;
    });
    if (dependsOnParent) {
      updateCardDependencies(childName);
    }
  });
}

function preservedCardClasses(card) {
  const extra = [];
  if (card.classList.contains('hide-logs-btn')) extra.push('hide-logs-btn');
  if (card.classList.contains('hide-deps-list')) extra.push('hide-deps-list');
  if (card.classList.contains('show-main-loader')) extra.push('show-main-loader');
  if (card.classList.contains('is-booting')) extra.push('is-booting');
  if (card.classList.contains('boot-focus')) extra.push('boot-focus');
  if (card.classList.contains('flash-once')) extra.push('flash-once');
  return extra.length ? ' ' + extra.join(' ') : '';
}

const LUCIDE_SETTINGS_ICON =
  '<svg class="icon-lucide icon-lucide-stroke" viewBox="0 0 24 24" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="3"/>' +
  '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>' +
  '</svg>';
const LUCIDE_SCROLL_TEXT_ICON =
  '<svg class="icon-lucide icon-lucide-stroke" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M15 12h6"/><path d="M15 6h6"/><path d="M15 18h6"/>' +
  '<path d="M3 12h.01"/><path d="M3 6h.01"/><path d="M3 18h.01"/>' +
  '<path d="M7 12h.01"/><path d="M7 6h.01"/><path d="M7 18h.01"/>' +
  '<path d="M11 12h.01"/><path d="M11 6h.01"/><path d="M11 18h.01"/>' +
  '</svg>';

function clearCardInlineVisual(card) {
  card.style.removeProperty('border');
  card.style.removeProperty('background');
  card.style.removeProperty('opacity');
  card.style.removeProperty('box-shadow');
  card.style.removeProperty('transform');
  const nameEl = card.querySelector('.name');
  if (nameEl) {
    nameEl.style.removeProperty('color');
  }
}

function resolveVisualState(state) {
  return state || 'pending';
}

function triggerCardStateAnimation(card, animClass) {
  if (!card || !animClass) {
    return;
  }
  card.classList.remove('animate-state-change', 'animate-deps-ready');
  void card.offsetWidth;
  card.classList.add(animClass);
  window.setTimeout(function() {
    card.classList.remove(animClass);
  }, animClass === 'animate-deps-ready' ? 720 : 620);
}

function paintCardStateClass(card, state) {
  clearCardInlineVisual(card);
  const visual = resolveVisualState(state);
  const prevVisual = card.dataset.visualState || '';
  const hadCanRun = card.classList.contains('can-run');
  const depKind = card.classList.contains('has-deps') ? ' has-deps' : ' no-deps';
  const canRun = card.classList.contains('can-run') ? ' can-run' : '';
  card.className = 'node-card ' + visual + depKind + canRun + preservedCardClasses(card);
  card.dataset.visualState = visual;

  if (prevVisual && prevVisual !== visual) {
    if (visual !== 'healthy') {
      triggerCardStateAnimation(card, 'animate-state-change');
    }
  } else if (!hadCanRun && canRun && visual === 'pending') {
    triggerCardStateAnimation(card, 'animate-deps-ready');
  }

  const serviceName = card.dataset.service;
  if (serviceName) {
    syncMainLoader(serviceName);
  }
}

function applyServiceStatesMap(states) {
  if (!states || typeof states !== 'object') {
    return;
  }
  Object.keys(states).forEach(function(name) {
    const raw = states[name];
    if (!nodeEls.has(name) || !raw) {
      return;
    }
    serviceStates.set(name, raw);
  });
  updateAllDependencies();
  Object.keys(states).forEach(function(name) {
    const raw = states[name];
    if (!raw || raw === 'pending') {
      return;
    }
    const card = nodeEls.get(name);
    if (card) {
      paintCardStateClass(card, raw);
    }
  });
  updateAllDependencies();
}

function restoreTrackingSnapshot(data) {
  if (!data || !data.tree) {
    return;
  }
  if (data.error) {
    showError(data.error);
  } else {
    hideError();
  }
  hasComposeFileSelected = true;
  syncComposeFileUi();
  renderTree(data.tree);
  const states = data.states || data.tree.states || {};
  applyServiceStatesMap(states);
  if (data.servicePorts) {
    applyServicePorts(data.servicePorts);
  }
  nodeEls.forEach(function(_card, name) {
    updateLinkButtons(name);
  });
  if (data.progress) {
    updateProgress(data.progress.up, data.progress.total);
    metaEl.textContent = data.progress.label || metaEl.textContent;
  } else {
    updateProgress(countHealthyServices(), data.tree.totalServices);
  }
  if (data.composeRunUi) {
    applyComposeRunUi(data.composeRunUi);
  }
  syncRunControls();
}

function renderTree(payload) {
  const previousStates = new Map(serviceStates);
  const payloadStates = payload.states || null;
  hideError();
  emptyEl.hidden = true;
  treeStage.hidden = false;
  treeContent.innerHTML = '';
  clearAllBootTimers();
  nodeEls.clear();
  nodeMeta.clear();
  treePayload = payload;
  serviceLinks = payload.serviceLinks || {};
  servicePorts = payload.servicePorts || {};
  currentBootFocus = null;

  const fileName = payload.composeFile.split(/[/\\\\]/).pop();
  lastComposeFileName = fileName;
  if (!settingsViewOpen) {
    metaEl.textContent = metaForComposePreview();
  }
  updateSettingsRunPreview();
  syncRunControls();

  payload.tiers.forEach(function(tier, tierIndex) {
    if (tierIndex > 0 && tierSeparator) {
      const divider = document.createElement('hr');
      divider.className = 'tier-divider';
      divider.setAttribute('aria-hidden', 'true');
      treeContent.appendChild(divider);
    }
    const row = document.createElement('div');
    row.className = 'tier-row grid-cols-' + gridColumns;
    row.dataset.tier = String(tierIndex);

    tier.forEach(function(node) {
      const card = document.createElement('div');
      const hasDeps = node.dependsOn && node.dependsOn.length > 0;
      card.className = 'node-card pending' + (hasDeps ? ' has-deps' : ' no-deps');
      if (!showDependencyList) {
        card.classList.add('hide-deps-list');
      }
      if (!showLogsButton) {
        card.classList.add('hide-logs-btn');
      }
      card.dataset.service = node.name;
      card.innerHTML =
        '<div class="card-header">' +
        '<div class="name-row">' +
        '<span class="loader" aria-hidden="true"></span>' +
        '<div class="name">' + escapeHtml(node.name) + '</div>' +
        '</div>' +
        '<span class="boot-timer" aria-live="polite"></span>' +
        '</div>' +
        '<div class="card-body">' +
        renderDepsList(node.dependsOn) +
        '<div class="card-bottom-links" hidden>' +
        '<div class="service-ports" hidden></div>' +
        '<div class="service-links" hidden></div>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="service-card-settings-btn" data-service="' + escapeHtml(node.name) + '" title="Configure service links" aria-label="Configure links for ' + escapeHtml(node.name) + '">' +
        LUCIDE_SETTINGS_ICON +
        '</button>' +
        '<button type="button" class="logs-btn" data-service="' + escapeHtml(node.name) + '" title="Show logs for this container" aria-label="Show logs for this container">' +
        LUCIDE_SCROLL_TEXT_ICON +
        '</button>';
      row.appendChild(card);
      serviceStates.set(node.name, 'pending');
      updateLinkButtons(node.name);
      updatePortButtons(node.name);
      nodeEls.set(node.name, card);
      nodeMeta.set(node.name, {
        tier: tierIndex,
        dependsOn: node.dependsOn,
        hasHealthcheck: !!node.hasHealthcheck,
      });
    });

    treeContent.appendChild(row);
  });

  const mergedStates = {};
  if (payloadStates) {
    Object.keys(payloadStates).forEach(function(k) {
      mergedStates[k] = payloadStates[k];
    });
  }
  previousStates.forEach(function(state, name) {
    if (!Object.prototype.hasOwnProperty.call(mergedStates, name)) {
      mergedStates[name] = state;
    }
  });
  applyServiceStatesMap(mergedStates);
  updateProgress(countHealthyServices(), payload.totalServices);
  updateStopButtonVisibility();
  applyLogsButtonSetting(showLogsButton);
}

function onComposeSelected(data) {
  lastComposeFileName = data.fileName || '';
  lastCommandPreview = data.commandPreview || '';
  syncRunControls();
  if (!settingsViewOpen) {
    metaEl.textContent = metaForComposePreview();
  }
  updateSettingsRunPreview();
}

function setComposePickLoading(loading) {
  [pickComposeTopBtn, changeComposeBtn].forEach(function(btn) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!loading);
    btn.setAttribute('aria-busy', loading ? 'true' : 'false');
  });
}

function requestPickComposeFile(e) {
  e.preventDefault();
  setComposePickLoading(true);
  vscode.postMessage({ type: 'pick-compose-file' });
}
if (pickComposeTopBtn) pickComposeTopBtn.addEventListener('click', requestPickComposeFile);
if (changeComposeBtn) changeComposeBtn.addEventListener('click', requestPickComposeFile);
if (rateExtensionBtn) {
  rateExtensionBtn.addEventListener('click', function(e) {
    e.preventDefault();
    showRateExtensionButton = false;
    syncComposeFileUi();
    vscode.postMessage({ type: 'rate-extension' });
  });
}
if (stopComposeBtn) {
  stopComposeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (stopComposeBtn.disabled) return;
    stopComposeBtn.disabled = true;
    stopComposeBtn.setAttribute('aria-label', 'Stopping stack…');
    vscode.postMessage({ type: 'stop-compose-stack' });
  });
}
if (openSettingsBtn) {
  openSettingsBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (settingsViewOpen) {
      showMainView();
    } else {
      showSettingsView();
    }
  });
}
if (settingShowRun) {
  settingShowRun.addEventListener('change', syncSettingsRunDetailsVisibility);
}
document.getElementById('settings-save-btn').addEventListener('click', function(e) {
  e.preventDefault();
  const data = collectSettingsForm();
  vscode.postMessage({ type: 'save-sidebar-settings', data: data });
  applySettings(data);
  showMainView();
});
document.getElementById('settings-cancel-btn').addEventListener('click', function(e) {
  e.preventDefault();
  showMainView();
});
if (runComposeHeaderBtn) {
  runComposeHeaderBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (runComposeHeaderBtn.disabled || composeRunSpinning) {
      return;
    }
    composeRunSpinning = true;
    syncComposeRunUi();
    syncTransportControls();
    vscode.postMessage({ type: 'run-compose-up' });
  });
}
if (showComposeTerminalBtn) {
  showComposeTerminalBtn.addEventListener('click', function(e) {
    e.preventDefault();
    vscode.postMessage({ type: 'show-compose-terminal' });
  });
}

function localhostPortUrl(hostPort) {
  var port = parseInt(String(hostPort), 10);
  if (!isFinite(port) || port <= 0) {
    return 'http://localhost';
  }
  return 'http://localhost:' + port;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function hasCustomServiceLinks(service) {
  const links = serviceLinks[service];
  return !!(links && links.length);
}

function openLinkFromButton(btn) {
  if (!btn) return;
  const url =
    btn.getAttribute('data-url') ||
    localhostPortUrl(btn.getAttribute('data-host-port'));
  if (url) {
    const external = btn.getAttribute('data-external') === 'true';
    vscode.postMessage({ type: 'open-link', url: url, external: external });
  }
}

function bindLinkButtons(container) {
  if (!container) return;
  container.querySelectorAll('.link-btn, .port-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openLinkFromButton(btn);
    });
  });
}

const serviceLinksModal = document.getElementById('service-links-modal');
const serviceLinksEditorRows = document.getElementById('service-links-editor-rows');
const serviceLinksModalTitle = document.getElementById('service-links-modal-title');
let editingServiceLinksFor = null;

function createLinkEditorRow(label, url) {
  const row = document.createElement('div');
  row.className = 'link-editor-row';
  row.innerHTML =
    '<input type="text" class="link-label-input" placeholder="Name" value="' + escapeAttr(label || '') + '" />' +
    '<input type="text" class="link-url-input" placeholder="http://localhost" value="' + escapeAttr(url || '') + '" />' +
    '<button type="button" class="link-row-remove" title="Remove" aria-label="Remove link">×</button>';
  row.querySelector('.link-row-remove').addEventListener('click', function() {
    row.remove();
    if (serviceLinksEditorRows && !serviceLinksEditorRows.children.length) {
      serviceLinksEditorRows.appendChild(createLinkEditorRow('', ''));
    }
  });
  return row;
}

function openServiceLinksEditor(service) {
  if (!service || !serviceLinksModal || !serviceLinksEditorRows) return;
  editingServiceLinksFor = service;
  if (serviceLinksModalTitle) {
    serviceLinksModalTitle.textContent = 'Links — ' + service;
  }
  serviceLinksEditorRows.innerHTML = '';
  const existing = serviceLinks[service] || [];
  if (existing.length) {
    existing.forEach(function(link) {
      serviceLinksEditorRows.appendChild(createLinkEditorRow(link.label, link.url));
    });
  } else {
    serviceLinksEditorRows.appendChild(createLinkEditorRow('', ''));
  }
  serviceLinksModal.hidden = false;
  serviceLinksModal.classList.add('is-visible');
}

function closeServiceLinksEditor() {
  editingServiceLinksFor = null;
  if (!serviceLinksModal) return;
  serviceLinksModal.classList.remove('is-visible');
  serviceLinksModal.hidden = true;
}

function collectServiceLinksFromEditor() {
  const links = [];
  if (!serviceLinksEditorRows) return links;
  serviceLinksEditorRows.querySelectorAll('.link-editor-row').forEach(function(row) {
    const labelEl = row.querySelector('.link-label-input');
    const urlEl = row.querySelector('.link-url-input');
    const label = labelEl ? labelEl.value.trim() : '';
    const url = urlEl ? urlEl.value.trim() : '';
    if (label && url) {
      links.push({ label: label, url: url });
    }
  });
  return links;
}

document.getElementById('link-editor-add-btn').addEventListener('click', function(e) {
  e.preventDefault();
  if (serviceLinksEditorRows) {
    serviceLinksEditorRows.appendChild(createLinkEditorRow('', ''));
  }
});
document.getElementById('service-links-save-btn').addEventListener('click', function(e) {
  e.preventDefault();
  if (!editingServiceLinksFor) return;
  const links = collectServiceLinksFromEditor();
  vscode.postMessage({
    type: 'save-service-links',
    service: editingServiceLinksFor,
    links: links,
  });
  serviceLinks[editingServiceLinksFor] = links;
  updateLinkButtons(editingServiceLinksFor);
  updatePortButtons(editingServiceLinksFor);
  closeServiceLinksEditor();
});
document.getElementById('service-links-cancel-btn').addEventListener('click', function(e) {
  e.preventDefault();
  closeServiceLinksEditor();
});
if (serviceLinksModal) {
  serviceLinksModal.addEventListener('click', function(e) {
    if (e.target === serviceLinksModal) {
      closeServiceLinksEditor();
    }
  });
}

function handleMainViewClick(e) {
  const cardSettingsBtn = e.target.closest('.service-card-settings-btn');
  if (cardSettingsBtn) {
    e.preventDefault();
    e.stopPropagation();
    openServiceLinksEditor(cardSettingsBtn.getAttribute('data-service'));
    return;
  }
  const portBtn = e.target.closest('.port-btn');
  if (portBtn) {
    e.preventDefault();
    e.stopPropagation();
    openLinkFromButton(portBtn);
    return;
  }
  const linkBtn = e.target.closest('.link-btn');
  if (linkBtn) {
    e.preventDefault();
    e.stopPropagation();
    openLinkFromButton(linkBtn);
    return;
  }
  const logsBtn = e.target.closest('.logs-btn');
  if (!logsBtn) return;
  e.preventDefault();
  e.stopPropagation();
  const service = logsBtn.getAttribute('data-service');
  if (service) {
    vscode.postMessage({ type: 'open-logs', service: service });
  }
}

if (mainView) {
  mainView.addEventListener('click', handleMainViewClick);
}

function syncCardBottomLinksVisibility(service) {
  const card = nodeEls.get(service);
  if (!card) return;
  const wrapper = card.querySelector('.card-bottom-links');
  const portsEl = card.querySelector('.service-ports');
  const linksEl = card.querySelector('.service-links');
  if (!wrapper) return;
  const showWrapper =
    (portsEl && !portsEl.hidden && portsEl.innerHTML.length > 0) ||
    (linksEl && !linksEl.hidden && linksEl.innerHTML.length > 0);
  wrapper.hidden = !showWrapper;
}

function updatePortButtons(service) {
  const card = nodeEls.get(service);
  if (!card) return;
  const container = card.querySelector('.service-ports');
  if (!container) return;
  if (hasCustomServiceLinks(service)) {
    container.hidden = true;
    container.innerHTML = '';
    syncCardBottomLinksVisibility(service);
    return;
  }
  const state = serviceStates.get(service);
  const ports = servicePorts[service];
  const showPorts =
    markHealthyWhen === 'running'
      ? state === 'healthy' || state === 'running'
      : state === 'healthy';
  if (showPortButtons && showPorts && ports && ports.length) {
    container.hidden = false;
    container.innerHTML = ports
      .map(function(port) {
        const openUrl = port.url || localhostPortUrl(port.hostPort);
        return (
          '<button type="button" class="port-btn" data-host-port="' +
          escapeAttr(String(port.hostPort)) +
          '" data-url="' +
          escapeAttr(openUrl) +
          '" title="Open ' +
          escapeAttr(openUrl) +
          '">' +
          escapeHtml(port.label) +
          '</button>'
        );
      })
      .join('');
    bindLinkButtons(container);
  } else {
    container.hidden = true;
    container.innerHTML = '';
  }
  syncCardBottomLinksVisibility(service);
}

function applyPortButtonsSetting(enabled) {
  showPortButtons = !!enabled;
  nodeEls.forEach(function(_card, name) {
    updatePortButtons(name);
  });
}

function updateLinkButtons(service) {
  const card = nodeEls.get(service);
  if (!card) return;
  const container = card.querySelector('.service-links');
  if (!container) return;
  const state = serviceStates.get(service);
  const links = serviceLinks[service];
  const custom = hasCustomServiceLinks(service);
  if (stateAllowsServiceLinks(state) && links && links.length) {
    container.hidden = false;
    container.innerHTML = links
      .map(function(link) {
        const externalAttr = custom ? ' data-external="true"' : '';
        return (
          '<button type="button" class="link-btn" data-url="' +
          escapeAttr(link.url) +
          '"' +
          externalAttr +
          ' title="Open ' +
          escapeAttr(link.url) +
          '">' +
          escapeHtml(link.label) +
          '</button>'
        );
      })
      .join('');
    bindLinkButtons(container);
  } else {
    container.hidden = true;
    container.innerHTML = '';
  }
  syncCardBottomLinksVisibility(service);
}

function applyServiceLinks(links) {
  serviceLinks = links || {};
  nodeEls.forEach(function(_card, name) {
    updateLinkButtons(name);
  });
}

function applyServicePorts(ports) {
  servicePorts = ports || {};
  nodeEls.forEach(function(_card, name) {
    updatePortButtons(name);
  });
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const BOOTING_STATES = ['creating', 'starting'];

function reapplyAllCardStateClasses() {
  updateAllDependencies();
  serviceStates.forEach(function(state, name) {
    const card = nodeEls.get(name);
    if (card && state && state !== 'pending') {
      paintCardStateClass(card, state);
    }
  });
}

function setNodeState(service, state, previousState) {
  const card = nodeEls.get(service);
  if (!card) return;

  const wasBooting = previousState && BOOTING_STATES.includes(previousState);
  const isActiveBoot = state === 'creating' || state === 'starting';

  serviceStates.set(service, state);
  card.setAttribute('aria-label', service + ' — ' + state);
  updateLinkButtons(service);
  updatePortButtons(service);
  updateAllDependencies();
  paintCardStateClass(card, state);

  if (isActiveBoot && card.classList.contains('show-main-loader')) {
    setBootFocus(service);
    if (!wasBooting) {
      triggerFlowToService(service);
    }
  } else if (currentBootFocus === service) {
    clearBootFocus();
  }

  if (
    currentBootFocus === service &&
    (state === 'healthy' || state === 'healthcheck' || state === 'stopped' || state === 'error' || state === 'unhealthy')
  ) {
    clearBootFocus();
  }

  if (state === 'healthy' && previousState && previousState !== 'healthy') {
    card.classList.add('flash-once');
    setTimeout(function() { card.classList.remove('flash-once'); }, 600);
    notifyDependentsParentReady(service);
  }
  updateStopButtonVisibility();
  if (treePayload) {
    updateProgress(countHealthyServices(), treePayload.totalServices);
  }
}

function setBootFocus(service) {
  if (currentBootFocus) {
    const prev = nodeEls.get(currentBootFocus);
    if (prev) prev.classList.remove('boot-focus');
  }
  currentBootFocus = service;
  const card = nodeEls.get(service);
  if (card) card.classList.add('boot-focus');
}

function clearBootFocus() {
  if (!currentBootFocus) return;
  const card = nodeEls.get(currentBootFocus);
  if (card) card.classList.remove('boot-focus', 'is-booting');
  currentBootFocus = null;
}

function triggerFlowToService(service) {
  updateCardDependencies(service);
}

function countHealthyServices() {
  let n = 0;
  serviceStates.forEach(function(state) {
    if (isHealthyState(state)) {
      n += 1;
    }
  });
  return n;
}

function updateProgress(up, total) {
  const pct = total > 0 ? Math.round((up / total) * 100) : 0;
  progressFill.style.width = pct + '%';
  if (!progressStrip) return;
  progressStrip.classList.remove('is-active', 'is-complete', 'has-errors');
  let hasErrors = false;
  serviceStates.forEach(function(state) {
    if (state === 'error' || state === 'unhealthy') {
      hasErrors = true;
    }
  });
  if (hasErrors) {
    progressStrip.classList.add('has-errors');
  } else if (pct >= 100) {
    progressStrip.classList.add('is-complete');
  } else if (pct > 0) {
    progressStrip.classList.add('is-active');
  }
}

window.addEventListener('message', (event) => {
  const msg = event.data;
  switch (msg.type) {
    case 'restore-tracking':
      setEmptyBootstrapPhase('hidden');
      restoreTrackingSnapshot(msg.data);
      break;
    case 'init-tree':
      setEmptyBootstrapPhase('hidden');
      restoreTrackingSnapshot({
        tree: msg.data,
        states: msg.data.states || {},
      });
      break;
    case 'service-links':
      applyServiceLinks(msg.data);
      break;
    case 'service-ports':
      applyServicePorts(msg.data);
      break;
    case 'service-state':
      setNodeState(msg.data.service, msg.data.state, msg.data.previousState);
      break;
    case 'progress':
      updateProgress(msg.data.up, msg.data.total);
      metaEl.textContent = msg.data.label || metaEl.textContent;
      if (msg.data.up > 0) {
        reapplyAllCardStateClasses();
      }
      break;
    case 'error':
      showError(msg.data.message);
      break;
    case 'compose-bootstrap':
      if (hasComposeFileSelected || treePayload) {
        setEmptyBootstrapPhase('hidden');
      } else {
        setEmptyBootstrapPhase(msg.data.phase, msg.data);
      }
      break;
    case 'extension-ui':
      showRateExtensionButton = !!(msg.data && msg.data.showRateButton);
      syncComposeFileUi();
      break;
    case 'compose-selected':
      hasComposeFileSelected = true;
      syncComposeFileUi();
      onComposeSelected(msg.data);
      hideError();
      setEmptyBootstrapPhase('hidden');
      treeStage.hidden = false;
      syncTransportControls();
      break;
    case 'tracking':
      if (settingsViewOpen) showMainView();
      hideError();
      setEmptyBootstrapPhase('hidden');
      treeStage.hidden = true;
      syncTransportControls();
      metaEl.textContent = 'Loading compose stack…';
      progressFill.style.width = '0%';
      break;
    case 'compose-pick-loading':
      setComposePickLoading(!!(msg.data && msg.data.loading));
      break;
    case 'sync-states':
      applyServiceStatesMap(msg.data);
      reapplyAllCardStateClasses();
      updateProgress(countHealthyServices(), treePayload ? treePayload.totalServices : 0);
      break;
    case 'compose-run-ui':
      applyComposeRunUi(msg.data);
      break;
    case 'settings':
      applySettings(msg.data);
      break;
    case 'show-settings-view':
      showSettingsView();
      break;
    case 'idle':
      hasComposeFileSelected = false;
      bootstrapPhase = 'pick';
      syncComposeFileUi();
      clearAllBootTimers();
      treePayload = null;
      nodeEls.clear();
      nodeMeta.clear();
      treeContent.innerHTML = '';
      hideError();
      setEmptyBootstrapPhase('pick');
      progressFill.style.width = '0%';
      break;
  }
});

syncComposeFileUi();
setEmptyBootstrapPhase('loading');
vscode.postMessage({ type: 'webview-ready' });
  </script>
</body>
</html>`;
}

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
