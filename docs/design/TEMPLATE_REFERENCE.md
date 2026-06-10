# GoVibe Mission Control Template Reference

This document captures the design and interaction patterns observed in `GoVibe-Mission-Control-template.html`.
Use it as the visual reference when migrating the React/Vite dashboard, while keeping `src/mission.ts` as the runtime data source.

## Template Identity

- Source file: `GoVibe-Mission-Control-template.html`
- Original title: `CoDev - Agent Command Center`
- Primary language mix: English UI labels with Thai explanatory copy in roadmap and benchmark areas.
- Main libraries in the template:
  - Tailwind CDN
  - Chart.js
  - Cytoscape.js
  - Phosphor Icons
  - Font Awesome

## Visual Contract

- Dark glassmorphism shell with fixed body/root height and internal scroll.
- Animated ambient orbs and domain-colored accent glow.
- Shimmer title treatment on the main command/dashboard header.
- Compact operational dashboard panels, not a marketing landing page.
- Domain colors:
  - Project Overview: emerald `#10b981`
  - Genesis Knowledge: indigo `#6366f1`
  - Block DB: cyan `#06b6d4`
  - AI Benchmark: orange `#f59e0b`
- Sidebar behavior:
  - Collapsed width around `80px`
  - Expanded width around `280px`
  - Hover expansion plus lock/collapse toggle in the original template
  - Tooltip behavior when collapsed

## Navigation Contract

The template `siteMap` contains the same 17 modules as the React implementation:

| Domain | Modules |
| --- | --- |
| A Project Overview | A1 Real-time Dashboard, A2 Roadmap Board, A3 Capability Plugins, A4 Brain & Config, A5 Agent Management |
| B Genesis Knowledge | B1 AST Hierarchy Tree, B2 Business Specifications, B3 Interactive Graph, B4 Live Call Graph |
| C Block DB | C1 Symbol Explorer Hub, C2 Intelligence Zoo, C3 SRS-G Debugger, C4 Database ERD Schema, C5 HNSW Vector Space Map |
| D AI Benchmark | D1 Reactor Run Trigger, D2 Cyber Reactor Heatmap, D3 EABS-01 Campaign Logs |

## View-Level Reference

| View | Template behavior to preserve in React |
| --- | --- |
| A1 | Command Control Center header, telemetry metric cards, chart panel, Reactor Telemetry panel. Template uses mock values; React must use live `MissionSnapshot` data or honest empty states. |
| A2 | Roadmap header card, global progress, stats, export menu, reset board, AI assist roster, detailed roadmap checklist/accordion. |
| A3 | Capability plugin management surface. Preserve plugin-slot density and operational controls when data events exist. |
| A4 | Brain/config panels with model/runtime controls. Preserve config feel without storing secrets in markup. |
| A5 | Agent Management Carousel: Agent Select stats, ability tags, card-deck roster navigation, video switcher, character media console with sequential EVA video playback, configure/flip behavior, model source controls, sliders/meters, local/cloud endpoint settings, and a mobile single-column adaptation. React must avoid hardcoded secret values. |
| B1 | AST hierarchy/tree-oriented view. |
| B2 | Business specification / Genesis regulation content panels. |
| B3 | Interactive graph where nodes can be moved in a 2D graph space. |
| B4 | Cytoscape call graph, depth controls, sync button, selected-node info panel. |
| C1 | Symbol Explorer table with filter input. |
| C2 | Intelligence Zoo roster/cards with agent/model status. |
| C3 | SRS-G Debugger with query input and two output panes: Standard RAG and Multi-Hop Graph Retrieve. |
| C4 | ERD canvas with draggable table cards and connection lines. |
| C5 | HNSW layer selector and vector simulation panel. |
| D1 | Reactor safety trigger, power regulator slider, safety campaign progress, audio oscilloscope sandbox. |
| D2 | Cyber reactor heatmap. |
| D3 | EABS-01 campaign log stream. |

## Migration Guardrails

- Do not reintroduce raw HTML injection or legacy imperative runtime as the dashboard driver.
- Do not carry template mock telemetry into React as live-looking data.
- Keep UI density and visual identity close to the template, but source all runtime values from `MissionSnapshot` / `MissionEvent`.
- Any static structural labels are allowed only when they define the surface contract, not when they pretend to be backend data.
- Replace template secrets and sample credentials with empty inputs, redacted placeholders, or real configuration events.

## Current React Alignment Against Template

- Sidebar now starts collapsed, expands on hover, supports lock/collapse, and shows collapsed tooltips.
- A2 now includes the roadmap header, progress area, export menu, reset action, assist roster cards, accordion phase header, task rows, badges, and assignment selects. It still needs real roadmap event shapes before task state can be backed by data.
- A5 now includes the template-style Agent Select card-deck carousel with active stats, ability tags, deck navigation, bottom controls, EVA video switcher/media console sourced from `public/agents/eva`, sequential 01 -> 02 -> 03 playback, config overlay, and a mobile single-column adaptation when no live agents are connected. It still needs backend-backed config persistence before save/dirty-state controls are meaningful.
- A3 now has plugin cards and action controls rather than a generic live shell.
- A4 now has runtime configuration control surfaces rather than a generic live shell.
- B1 now has AST code preview and graph canvas details.
- B2 now has the Business Protocol Specification blueprint when no live specs are connected.
- B3 now has an Interactive Graph Studio blueprint.
- B4 now includes depth controls, sync action, and a selected-node info panel around the graph renderer. Cytoscape-specific physics remains a follow-up.
- C1 now uses a filterable symbol table.
- C2 now has Intelligence Zoo roster cards.
- C3 now includes query comparison panes plus the MissionEvent JSON debugger.
- C4 now uses an ERD-style canvas and table cards from `snapshot.symbols`. Draggable table positions and connection-line persistence remain follow-ups.
- C5 now includes an HNSW layer selector and vector simulation panel.
- D1 now includes the safety regulator, safety campaign command panel, and oscilloscope sandbox placeholder.
- D2 now has Reactor Overview Status and an 8x8 heatmap blueprint when no live heatmap is connected.
- D3 now has campaign log blueprint rows when no live campaign logs are connected.

## Verification Target

The React app should still pass:

- `npm run lint`
- `npm run build`
- Browser load without console errors
- Domain switching A/B/C/D with exact module names
- No fake live data when no transport or snapshot exists
