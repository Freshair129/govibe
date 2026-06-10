# GoVibe Mission Control Design System

**Version:** 2.1.0  
**Status:** Active implementation reference  
**App Entry:** `src/App.tsx`  
**Data Entry:** `src/mission.ts`

## Principles

- **Live data first:** UI must render data from `MissionSnapshot` and `MissionEvent`, not hardcoded mock telemetry.
- **Honest empty states:** If no transport or snapshot exists, show an empty/live-waiting state instead of fake success.
- **No hidden runtime:** The dashboard is a React/Vite app. It must not depend on raw HTML injection or legacy imperative scripts.
- **Operational density:** The interface is a dashboard, so panels should be compact, scan-friendly, and stable under changing data.

## Visual Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--bg` | `#08090c` | Dark application background |
| `--panel` | `rgba(18, 20, 28, 0.72)` | Glass panels |
| `--panel-strong` | `rgba(9, 11, 18, 0.88)` | Terminal and stronger overlays |
| `--border` | `rgba(255, 255, 255, 0.09)` | Panel and control borders |
| `--text` | `#f8fafc` | Main text |
| `--muted` | `#9ca3af` | Secondary text |
| `--accent` | Domain-specific color | Active domain, graph nodes, highlights |

Light theme is implemented by the `.light-theme` body class and must keep the same layout dimensions.

## Layout

- Header height: minimum `64px`.
- Sidebar: `80px` collapsed, `280px` expanded.
- Main content: scrolls inside `main`; body/root remain fixed height.
- Content max width: `1280px`.
- Footer height: compact status bar, minimum `28px`.
- Floating terminal: fixed bottom-right overlay, not part of normal document flow.

## Components

### Header
- Shows product identity, domain tabs, Run command, and theme toggle.
- Domain tab state is local UI state and resets the active view via `defaultViewByDomain`.

### Sidebar
- Shows the current domain module list.
- Starts collapsed, expands on hover, and can be locked expanded with the sidebar toggle.
- Collapsed state must preserve module access, tooltip labels, and avoid text overflow.

### Panels
- Use `.panel` for framed content.
- Use `.empty-state` for missing live data.
- Do not populate panels with fake values to make the UI look full.

### Charts
- A1 uses a native canvas renderer in `useCanvasChart`.
- If `snapshot.chart.series` is empty, the canvas writes “Waiting for live chart data”.
- Chart data shape comes from `MissionSnapshot.chart`.

### Terminal
- Sends `terminal.command` through `missionGateway.send`.
- If no WebSocket or HTTP transport is configured, it displays a warning event.
- The terminal must not simulate successful backend execution.

### Data Ingest
- C3 is the manual JSON entrypoint for `MissionEvent`.
- It is intended for local testing, backend integration, and debugging real payload shape.
- C3 also contains query comparison panes for Standard RAG and Multi-Hop Graph Retrieve, but must not fake query results without a connected debugger feed.

### Template-Aligned Surfaces
- A2 includes roadmap header controls, export/reset affordances, an assist roster surface, and task lanes.
- A5 includes live-agent detail and inline configuration controls inspired by `UI Components/agentcard01`.
- B4 includes graph depth controls and a selected-node info panel.
- C1 uses a filterable table for symbols.
- C4 uses an ERD canvas/table-card surface.
- C5 uses an HNSW layer selector.
- D1 includes safety regulator, safety run command, and oscilloscope sandbox surfaces.

## Data Entrypoints

The UI accepts real data through:

- `VITE_GOVIBE_WS_URL`: WebSocket stream of `MissionEvent`.
- `VITE_GOVIBE_API_URL`: HTTP command endpoint at `/mission/commands`.
- `window.__govibeMissionGateway.handleEvent(event)`: direct integration handle.
- `govibe:mission-event`: custom browser event carrying `MissionEvent`.
- C3 Data Ingest form: manual JSON `MissionEvent` ingestion.

## Changelog

| Version | Date | Summary |
| --- | --- | --- |
| 2.1.0 | 2026-06-10 | Added template-aligned surfaces, hover sidebar behavior, filterable table, graph controls, debugger panes, ERD/vector/safety command surfaces, and PRODUCT.md context. |
| 2.0.0 | 2026-06-10 | Updated docs to match React/Vite dashboard, MissionGateway, honest empty states, and live data entrypoints. |
