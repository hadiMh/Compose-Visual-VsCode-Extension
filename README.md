# DockerComposeVisualizer

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=HadiHajihosseini.dockercompose-visualizer">
    <img alt="Install DockerComposeVisualizer in VS Code" src="https://img.shields.io/badge/Install%20in-VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white">
  </a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=HadiHajihosseini.dockercompose-visualizer">
    <img alt="Visual Studio Marketplace version" src="https://img.shields.io/visual-studio-marketplace/v/HadiHajihosseini.dockercompose-visualizer?label=Version&color=007ACC">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=HadiHajihosseini.dockercompose-visualizer">
    <img alt="Visual Studio Marketplace installs" src="https://img.shields.io/visual-studio-marketplace/i/HadiHajihosseini.dockercompose-visualizer?label=Installs&color=007ACC">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=HadiHajihosseini.dockercompose-visualizer">
    <img alt="Visual Studio Marketplace rating" src="https://img.shields.io/visual-studio-marketplace/r/HadiHajihosseini.dockercompose-visualizer?label=Rating&color=007ACC">
  </a>
</p>

<p align="center"><strong>Created by Hadi Hajihosseini.</strong></p>

> See your **docker compose** stack boot in dependency order — live health, ports, and logs — inside VS Code and Cursor.
> 
<img width="1920" height="1080" alt="running_with_terminal" src="https://github.com/user-attachments/assets/1d3480a1-fdd7-4f47-b751-30bb56078a2f" style="width: 100%; max-width: 1920px; height: auto;" />
>
> *Live dependency tiers, per-service health and ports, status-bar progress, and auto-tracked `docker compose up` in the integrated terminal.*

Stop guessing which service is blocking the rest. **DockerComposeVisualizer** parses your compose file, lays out services by dependency tier, and updates each card as containers move through creating → starting → healthcheck → healthy. Dependencies light up when their parents are ready, so you can see *why* something is still waiting.

Works in **Visual Studio Code** (1.93+) and **Cursor**.

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Getting started](#getting-started)
- [How it works](#how-it-works)
- [Commands](#commands)
- [Configuration](#configuration)
- [Workspace data](#workspace-data)
- [Development](#development)
- [Feedback](#feedback)

---

## Features

- **Live dependency tree** — Services grouped by `depends_on` tiers with color-coded states and optional tier dividers.

<img width="270" height="660" alt="running_sidebar" src="https://github.com/user-attachments/assets/86e1e289-f6c2-4f6c-b6c8-beebaff41345" />

- **Per-service dependency list** — See which upstream services each card is waiting on, with running / in-progress / not-started indicators.
- **Auto-track on `compose up`** — Detects `docker compose up` (and custom patterns) in integrated terminals and starts tracking automatically.
- **Auto-discover running stacks** — Polls `docker compose ls` and attaches when a stack for your workspace is already up.
- **Status bar progress** — Segmented bar showing how many services have reached your configured “up” state.

<div style="padding-left: 24px;">
<img width="328" height="24" alt="Custom service links on a service card" src="https://github.com/user-attachments/assets/95e77b2f-c85a-427f-8f8c-18a2111f187c" />
<p><em>Status bar while running up command</em></p>
<br/>
<img width="328" height="24" alt="Auto-detected port links on a service card" src="https://github.com/user-attachments/assets/7bdf5d92-95d5-4faf-b718-5b49c209276d" />
<p><em>Status bar when the containers are running correctly</em></p>
</div>

- **One-click logs** — Open `docker logs -f` for a service in a dedicated terminal (reused per service by default).


- **Port & link buttons** — Open published ports on localhost; configure custom URLs per service.




<div align="center" style="margin: 24px 0;">
  <div style="display: inline-flex; justify-content: center; align-items: flex-start; gap: 64px; padding: 16px 48px;">
    <div style="text-align: center;">
      <img width="151" height="164" alt="Custom service links on a service card" src="https://github.com/user-attachments/assets/85952373-e71a-4766-807d-359fd20800be" />
      <p><em>Custom service links</em></p>
    </div>
    <div style="text-align: center;">
      <img width="153" height="149" alt="Auto-detected port links on a service card" src="https://github.com/user-attachments/assets/adc2e6bf-267f-417a-881c-df08382551b3" />
      <p><em>Auto-detected port links</em></p>
    </div>
  </div>
</div>
- **Boot timer** — Optional per-card timer from “deps ready” until healthy.
- **Run / Stop (optional)** — Start or stop the stack from the sidebar without leaving the editor.
- **Sidebar settings** — Grid columns, legend, logs button, dependency list, and more — saved per workspace.

---

## Requirements

| Requirement | Notes |
|-------------|--------|
| **VS Code** ≥ 1.93 or **Cursor** | Extension host with webview support |
| **Docker** | Engine running; `docker` CLI on your `PATH` |
| **docker compose** | V2 plugin (`docker compose`, not legacy `docker-compose` only) |
| **Compose file** | `compose.yaml`, `docker-compose.yml`, or a file you select in the sidebar |

---

## Installation

Works in **VS Code** (1.93+) and **Cursor**. Pick one of the options below.

### 1. Install from the Marketplace

The easiest way — search in the editor or use the badge at the top of this page.

1. Open **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for **DockerComposeVisualizer**.
3. Click **Install**.

Or open the listing directly: [DockerComposeVisualizer on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=HadiHajihosseini.dockercompose-visualizer).

### 2. Install from the terminal

Install the published extension by ID (requires the `code` or `cursor` CLI on your `PATH`):

**VS Code**

```bash
code --install-extension HadiHajihosseini.dockercompose-visualizer
```

**Cursor**

```bash
cursor --install-extension HadiHajihosseini.dockercompose-visualizer
```

To install a specific version:

```bash
code --install-extension HadiHajihosseini.dockercompose-visualizer@1.0.1
```

### 3. Install from a VSIX (GitHub Releases)

Use this for offline installs, pinned versions, or testing a release before it appears on the Marketplace.

1. Open [GitHub Releases](https://github.com/hadiMh/Compose-Visual-VsCode-Extension/releases).
2. Download the `.vsix` for the version you want (e.g. `dockercompose-visualizer-1.0.1.vsix`).
3. Install it:

   **From the terminal**

   ```bash
   code --install-extension /path/to/dockercompose-visualizer-1.0.1.vsix
   ```

   **From the UI** — Command Palette → **Extensions: Install from VSIX…** → select the downloaded file.

   On Cursor, use `cursor --install-extension` or **Extensions: Install from VSIX…** the same way.

After installing, reload the window if prompted (`Developer: Reload Window`).

---

## Getting started

1. **Install** the extension using one of the methods in [Installation](#installation) (or see [Development](#development) to run from source).
2. **Open a workspace** that contains your compose YAML.
3. Open the **DockerComposeVisualizer** view on the activity bar (graph icon).
4. **Pick a compose file** if prompted, or run your stack:
   ```bash
   docker compose -f docker-compose.yml up
   ```
5. Tracking starts automatically when `dockerComposeFlow.autoTrackOnComposeUp` is enabled (default), or use **DockerComposeVisualizer: Track Running Stack** from the Command Palette.

Click the **status bar** item to open the sidebar or choose a compose file. Click a service’s **logs** icon to stream container logs.

<img width="328" height="24" alt="Screenshot 1405-03-13 at 23 43 26" src="https://github.com/user-attachments/assets/7bdf5d92-95d5-4faf-b718-5b49c209276d" />

---

## How it works

```text
compose.yaml  →  parse depends_on tiers  →  poll docker inspect
                      ↓
              webview cards + status bar
                      ↓
         terminal sniffer (compose up) / compose ls discovery
```

1. **Parse** — Reads `services` and `depends_on` (including conditions where present) and builds a tiered layout.
2. **Track** — Matches containers by Compose project + service labels (`com.docker.compose.*`).
3. **Reconcile** — Polls health on an interval; optional immediate reconcile when the compose terminal closes.
4. **Unlock** — A service’s “can run” state reflects whether dependency conditions are met, so cards pulse when they become runnable.

### Service states (legend)

| State | Meaning |
|-------|---------|
| Pending | Not started yet, or waiting on dependencies |
| Creating / Starting | Container lifecycle in progress |
| Running / Healthcheck | Up but not yet counted “healthy” (configurable) |
| Healthy | Reached your configured “up” threshold |
| Stopped / Error | Exited or failed |

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **DockerComposeVisualizer**.

| Command | Description |
|---------|-------------|
| **DockerComposeVisualizer: Open or Track** | Status bar action — open sidebar or start tracking |
| **DockerComposeVisualizer: Open Sidebar** | Focus the Live Dependency Tree view |
| **DockerComposeVisualizer: Open Settings** | Jump to `dockerComposeFlow.*` in Settings |
| **DockerComposeVisualizer: Track Compose Stack** | Pick a compose file and prepare tracking |
| **DockerComposeVisualizer: Track Running Stack** | Attach to an already-running project |
| **DockerComposeVisualizer: Stop Tracking** | Clear tracking and status bar |

---

## Configuration

All settings live under **`dockerComposeFlow.*`**. Open Settings and search for `DockerComposeVisualizer`, or edit `settings.json`.

### Tracking & discovery

| Setting | Default | Description |
|---------|---------|-------------|
| `autoTrackOnComposeUp` | `true` | Start tracking when `docker compose up` is detected in a terminal |
| `autoDiscoverRunningStack` | `true` | Poll for a running stack in this workspace |
| `discoveryPollIntervalSeconds` | `6` | Poll interval for auto-discover |
| `composeFile` | `""` | Workspace-relative compose file (also saved in `.dockerComposeFlow`) |
| `defaultComposeFilePatterns` | `compose.yaml`, … | Filenames tried when resolving the compose file |
| `projectName` | `""` | Override Compose project name (`-p`) |
| `healthPollIntervalSeconds` | `3` | Docker inspect poll interval while tracking |
| `markHealthyWhen` | `healthy` | Count “up” at `healthy` or `running` |

### Sidebar UI

| Setting | Default | Description |
|---------|---------|-------------|
| `showDependencyList` | `true` | List `depends_on` services on each card |
| `showLogsButton` | `true` | Per-service logs button |
| `showPortButtons` | `true` | Auto-detected localhost port links |
| `showBootTimer` | `true` | Seconds-to-healthy timer on cards |
| `showComposeRunButton` | `false` | Run / Stop stack from sidebar header |
| `composeRunExtraArgs` | `""` | Extra args for Run (e.g. `--env-file .env up -d`) |
| `gridColumns` | `auto` | `2`, `3`, or responsive `auto` |
| `showLegend` | `true` | State color legend under the tree |

### Logs & links

| Setting | Default | Description |
|---------|---------|-------------|
| `logsFollow` | `true` | `docker logs -f` vs last 200 lines |
| `reuseLogsTerminal` | `true` | One terminal per service name |
| `serviceLinks` | `{}` | Map service names → URL buttons (see below) |
| `showServiceLinksWhen` | `healthy` | When custom links appear |
| `openLinksInExternalBrowser` | `false` | System browser vs Simple Browser |

**Example — custom service links** in `settings.json`:

```json
{
  "dockerComposeFlow.serviceLinks": {
    "frontend": [
      { "label": "App", "url": "http://localhost:3000" }
    ],
    "api": "http://localhost:8000/docs"
  }
}
```

Per-project links can also be edited from each card’s **settings** icon; they are stored in `.dockerComposeFlow/service-links.json`.

---

## Workspace data

The extension stores workspace-specific data under **`.dockerComposeFlow/`** (gitignored by default):

| File | Purpose |
|------|---------|
| `sidebar-settings.json` | UI preferences from the in-sidebar settings panel |
| `service-links.json` | Per-service link overrides from the card editor |

---

## Development

### Build & run

```bash
npm install
npm run compile
```

Press **F5** in VS Code/Cursor to launch an **Extension Development Host** with this folder as `extensionDevelopmentPath`.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | One-shot TypeScript build → `out/` |
| `npm run watch` | Watch mode for development |

### Package

```bash
npm install -g @vscode/vsce
vsce package
```

Produces a `.vsix` for local install. `out/` must be compiled first; `src/` is excluded via `.vscodeignore`.

---

## License

Copyright © 2026 **Hadi Hajihosseini**. **DockerComposeVisualizer Source License** (see [LICENSE](LICENSE)).

- You may **use, modify, and run** this project for yourself or your team.
- **Contributions** are welcome via **pull requests** to the official repository.
- You may **not publish** this code (or derivatives) as an extension or plugin for **any editor or IDE** (VS Code, Cursor, JetBrains, Vim/Neovim, etc.) on any marketplace or registry without permission from the copyright holder.

---

## Feedback

Found a bug or have an idea? Open an issue or pull request on the project repository.

---

**DockerComposeVisualizer** — created by Hadi Hajihosseini. Clarity for multi-service local development, without leaving the editor.
