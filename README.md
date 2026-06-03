# Compose Visual

> See your **docker compose** stack boot in dependency order — live health, ports, and logs — inside VS Code and Cursor.
> 
<img width="1636" height="1080" alt="running_with_terminal" src="https://github.com/user-attachments/assets/1d3480a1-fdd7-4f47-b751-30bb56078a2f" />

Stop guessing which service is blocking the rest. **Compose Visual** parses your compose file, lays out services by dependency tier, and updates each card as containers move through creating → starting → healthcheck → healthy. Dependencies light up when their parents are ready, so you can see *why* something is still waiting.

Works in **Visual Studio Code** (1.93+) and **Cursor**.

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
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
<img width="180" height="440" alt="running_sidebar" src="https://github.com/user-attachments/assets/86e1e289-f6c2-4f6c-b6c8-beebaff41345" />

- **Per-service dependency list** — See which upstream services each card is waiting on, with running / in-progress / not-started indicators.
- **Auto-track on `compose up`** — Detects `docker compose up` (and custom patterns) in integrated terminals and starts tracking automatically.
- **Auto-discover running stacks** — Polls `docker compose ls` and attaches when a stack for your workspace is already up.
- **Status bar progress** — Segmented bar showing how many services have reached your configured “up” state.

<img width="328" height="24" alt="Screenshot 1405-03-13 at 23 21 22" src="https://github.com/user-attachments/assets/95e77b2f-c85a-427f-8f8c-18a2111f187c" />
<br/>
<img width="328" height="24" alt="Screenshot 1405-03-13 at 23 43 26" src="https://github.com/user-attachments/assets/7bdf5d92-95d5-4faf-b718-5b49c209276d" />

- **One-click logs** — Open `docker logs -f` for a service in a dedicated terminal (reused per service by default).


- **Port & link buttons** — Open published ports on localhost; configure custom URLs per service.

<img width="151" height="164" alt="Screenshot 1405-03-13 at 23 19 23" src="https://github.com/user-attachments/assets/85952373-e71a-4766-807d-359fd20800be" />
<img width="153" height="149" alt="Screenshot 1405-03-13 at 23 51 47" src="https://github.com/user-attachments/assets/adc2e6bf-267f-417a-881c-df08382551b3" />

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

## Getting started

1. **Install** the extension (from the marketplace when published, or see [Development](#development) to run from source).
2. **Open a workspace** that contains your compose YAML.
3. Open the **Compose Visual** view on the activity bar (graph icon).
4. **Pick a compose file** if prompted, or run your stack:
   ```bash
   docker compose -f docker-compose.yml up
   ```
5. Tracking starts automatically when `dockerComposeFlow.autoTrackOnComposeUp` is enabled (default), or use **Compose Visual: Track Running Stack** from the Command Palette.

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

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search for **Compose Visual**.

| Command | Description |
|---------|-------------|
| **Compose Visual: Open or Track** | Status bar action — open sidebar or start tracking |
| **Compose Visual: Open Sidebar** | Focus the Live Dependency Tree view |
| **Compose Visual: Open Settings** | Jump to `dockerComposeFlow.*` in Settings |
| **Compose Visual: Track Compose Stack** | Pick a compose file and prepare tracking |
| **Compose Visual: Track Running Stack** | Attach to an already-running project |
| **Compose Visual: Stop Tracking** | Clear tracking and status bar |

---

## Configuration

All settings live under **`dockerComposeFlow.*`**. Open Settings and search for `Compose Visual`, or edit `settings.json`.

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

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/YOUR_ORG/docker-compose-flow/issues) on GitHub.

---

**Compose Visual** — clarity for multi-service local development, without leaving the editor.
