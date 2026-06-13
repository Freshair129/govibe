# GoVibe Mission Control Design System

**Version:** 2.5.1  
**Status:** Active implementation reference  
**App Entry:** `src/App.tsx`  
**Data Entry:** `src/mission.ts`

## Principles

- **Live data first:** UI must render data from `MissionSnapshot` and `MissionEvent`, not hardcoded mock telemetry.
- **Honest empty states:** If no transport or snapshot exists, show an empty/live-waiting state instead of fake success.
- **No hidden runtime:** The dashboard is a React/Vite app. It must not depend on raw HTML injection or legacy imperative scripts.
- **Operational density:** The interface is a dashboard, so panels should be compact, scan-friendly, and stable under changing data.
- **Template fidelity:** React surfaces should preserve the Mission Control template's interaction feel where that feel is part of the product identity.

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
- Smooth hover expansion: inactive sidebar sits at `w-16` or `w-20`. On hover, the sidebar expands to reveal module text with subtle translation and opacity eases.
- Pure CSS tooltips are preferred for collapsed sidebar labels, using `data-tooltip` or equivalent non-scripted affordances.

### Panels
- Use `.panel` for framed content.
- Use `.empty-state` for missing live data.
- Do not populate panels with fake values to make the UI look full.

### Charts
- A1 uses a native canvas renderer in `useCanvasChart`.
- If `snapshot.chart.series` is empty, the canvas writes `Waiting for live chart data`.
- Chart data shape comes from `MissionSnapshot.chart`.

### Terminal
- Sends `terminal.command` through `missionGateway.send`.
- If no WebSocket or HTTP transport is configured, it displays a warning event.
- The terminal must not simulate successful backend execution.

### Data Ingest
- C3 is the manual JSON entrypoint for `MissionEvent`.
- It is intended for local testing, backend integration, and debugging real payload shape.
- C3 also contains query comparison panes for Standard RAG and Multi-Hop Graph Retrieve, but must not fake query results without a connected debugger feed.

## A5 Interactive Card System

A5 uses a dark glass interactive-card system derived from the Mission Control template. The goal is to preserve the template's agent-theater feel while keeping the React implementation component-based and data-driven.

### A5 Card Tokens

| Property | Value | Description |
|---|---|---|
| **Base Background** | `#060508` | Solid dark backdrop for the agent stage |
| **Card Glass** | `rgba(16, 14, 20, 0.45)` | Semi-translucent black with strong blur |
| **Primary Accent** | `#F3553C` | Warm agent-console highlight |
| **Secondary Accent** | `#8F55EB` | Secondary glow and depth accent |
| **Card Borders** | `rgba(143, 85, 235, 0.08)` | Ultra-thin borders with glow lift |
| **Glow Highlights** | `rgba(143, 85, 235, 0.28)` | Hover halo and pointer-reactive glare |

### A5 Interaction Rules
- Use perspective containers around agent cards and the character console to enable 3D tilt.
- Preserve `transform-style: preserve-3d` on card shells and glare layers.
- Drive hover glare and cursor glow from pointer position variables such as `--mouse-x` and `--mouse-y`.
- Keep tilt ranges restrained so the interface feels precise rather than theatrical.
- Do not wrap the full selection stage in nested cards. The stage is an unframed layout containing individual interactive cards.
- Use mobile-safe fallbacks that keep the deck within the viewport and convert the two-column stage into one vertical stack.

## Template-Aligned Surfaces

- A2 includes roadmap header controls, export/reset affordances, assist roster cards, and detailed task rows from the template blueprint.
- A5 includes the Agent Select infinity card-deck carousel, active-agent stats, ability tags, bottom controls, EVA video switcher and media console from `public/agents/eva`, sequential autoplay from EVA video 01 to 02 to 03 and back to 01, pointer-driven cursor glow, 3D tilt on the character console, and a config overlay when no live agents are connected. Live agents still render from `snapshot.agents`.
- A5 interactive cards must preserve the template's `interactive-card` behavior: preserve-3D transform style, hover border and glow elevation, and a glare layer driven by `--mouse-x` and `--mouse-y`.
- A5 agent config cards must preserve the template's Raycast 3D card style: `raycast-perspective-container` perspective around `1000px`, `raycast-agent-card` glass blur, preserve-3D children, shine or glare layer, hover accent shadow per agent, and pointer-driven `rotateX` and `rotateY` tilt up to about `15deg` with `scale(1.04)`.
- A5 agent assignment drag must preserve the template's drag follow-cursor style: dragging a `raycast-agent-card[data-agent]` creates a fixed floating clone following the cursor, rotates and scales it around `rotate(-5deg) scale(1.05)`, fades the source card, uses `cursor: grabbing`, and highlights task drop targets under the pointer.
- A5 character media console must preserve the template's separate character tilt style: `character-perspective` around `1500px`, `character-tilt` preserve-3D, pointer-driven `rotateX` and `rotateY` up to about `6deg`, and reset-to-zero easing on pointer leave.
- A5 must not use nested card or panel wrappers for the selection and character sectors. Cards may appear as individual controls inside an unframed stage, but not as card-inside-card shells.
- On mobile widths, A5 stacks selection and character sectors into a single column, converts the sidebar into a horizontal module rail, keeps deck cards within the viewport, and compresses the config overlay without hiding controls.
- A3 and A4 use plugin and configuration control surfaces instead of generic live shells.
- B1 includes an AST code preview and graph canvas blueprint.
- B2 includes the Genesis business protocol specification surface when no live specs are connected.
- B3 includes an interactive graph studio canvas blueprint.
- B4 includes graph depth controls and a selected-node info panel.
- C1 uses a filterable table for symbols.
- C2 includes Intelligence Zoo roster cards.
- C4 uses an ERD canvas and table-card surface.
- C5 uses an HNSW layer selector.
- D1 includes safety regulator, safety run command, and oscilloscope sandbox surfaces.
- D2 includes reactor overview and an `8x8` heatmap blueprint when no live heatmap is connected.
- D3 includes campaign log blueprint rows when no live logs are connected.

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
| 2.5.1 | 2026-06-13 | Cleaned the design SSOT by removing stray reference snippets, normalizing interactive-card guidance, and keeping only GoVibe-relevant design contracts. |
| 2.2.0 | 2026-06-10 | Expanded domain detail views to match the template more closely: A2 task rows, A5 select screen, AST/graph/spec/zoo/heatmap/log blueprints. |
| 2.1.0 | 2026-06-10 | Added template-aligned surfaces, hover sidebar behavior, filterable table, graph controls, debugger panes, ERD/vector/safety command surfaces, and PRODUCT.md context. |
| 2.0.0 | 2026-06-10 | Updated docs to match React/Vite dashboard, MissionGateway, honest empty states, and live data entrypoints. |
