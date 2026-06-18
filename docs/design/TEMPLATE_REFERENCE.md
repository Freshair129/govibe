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
| A2 | Roadmap header card, global progress, stats, export menu, reset board, AI assist roster, phase accordion, sprint block, and detailed task dropdown cards backed by Task Container records. The header contract now uses `GoVibe Development Roadmap` with stat labels `Feature ทั้งหมด`, `พร้อมใช้งาน / IMP แล้ว`, and `Task ใน Backlog`. |
| A3 | Capability plugin management surface. Preserve plugin-slot density and operational controls when data events exist. |
| A4 | Brain/config panels with model/runtime controls. Preserve config feel without storing secrets in markup. |
| A5 | Agent Management Carousel: Agent Select stats, ability tags, infinity card-deck roster navigation without scrollbars, `interactive-card` mouse glare, Raycast 3D Agent Card style, Agent drag follow-cursor assignment style, video switcher, character media console with sequential EVA video playback, cursor glow, 3D tilt, configure/flip behavior, model source controls, sliders/meters, local/cloud endpoint settings, and a mobile single-column adaptation. React must avoid hardcoded secret values. |
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

## A2 Task Detail Reference

## A2 Header Contract

The A2 React header should preserve the current approved wording and semantics from the legacy template adaptation:

- Title: `GoVibe Development Roadmap`
- Description: Thai roadmap summary copy is allowed, but the title must stay `GoVibe`.
- Progress surface: derived from approved roadmap runtime state, never hardcoded from the legacy static template.
- Stat labels:
  - `Feature ทั้งหมด`
  - `พร้อมใช้งาน / IMP แล้ว`
  - `Task ใน Backlog`
- Count semantics:
  - `Feature ทั้งหมด` = actionable roadmap nodes of type `task`, `sub-task`, `micro-task`, or `atomic-task`
  - `พร้อมใช้งาน / IMP แล้ว` = actionable nodes in `done`
  - `Task ใน Backlog` = actionable nodes not in `done`
- Header actions from the template remain part of the visual contract:
  - `Export`
  - `Reset Board`
- Current React behavior for the approved A2 slice:
  - `Export` downloads the approved roadmap snapshot as `JSON`, `YAML`, or `Markdown`
  - `Reset Board` resets local A2 UI state such as the open phase and export menu

If React temporarily omits the action controls, that is a parity gap and must be tracked explicitly rather than silently reworded away.

The template task dropdown card is the visual reference for A2 `Task Container` rendering. React must reproduce the information architecture without copying the legacy imperative script as runtime.

Required A2 hierarchy:

```text
Roadmap Source
  -> Phase Container
    -> Sprint Container
      -> Task Container
        -> Task Detail Dropdown
```

Required task dropdown content:

- Sprint badge, sprint title, duration, and progress.
- Task header with status icon, collapse affordance, task title, requirement type badge, complexity badge, document/code/test indicators, and completed-by state.
- `SYMBOL LINKS` section with code link, doc link, and test link.
- Metadata row with version, complexity, requirement type, status, and tokens used.
- Responsibility row that keeps `PIC`, `Executor`, `Approver`, and `Auditor` separate from assignee/completed-by display.
- `DEFINITION OF DONE (DOD)` section split into Acceptance Criteria, Success Criteria, and Exit Criteria.
- `CHANGELOG` block with version/update metadata.
- Created/updated metadata and task ID.
- `EXPORT TASK` controls for JSON, YAML, and Markdown.

If a task container omits a field, React must show `unavailable` or an explicit disabled reason. It must not invent symbol links, token splits, completion state, or owner fields.

## A5 Interaction Style Reference

The React migration must preserve these template-level interaction contracts from `GoVibe-Mission-Control-template.html`:

| Template style | Contract |
| --- | --- |
| `interactive-card` | Uses `transform-style: preserve-3d`, hover border/glow elevation, and a glare layer driven by `--mouse-x` / `--mouse-y`. |
| `raycast-perspective-container` | Provides about `1000px` perspective for Raycast-style agent cards. Pointer movement tilts the container up to about `15deg` on X/Y and scales to about `1.04`; pointer leave resets to neutral. |
| `raycast-agent-card` | Uses glass blur, preserve-3D children, agent-specific hover border/shadow colors, shine/glare overlay, and raised child elements with `translateZ(20px)`. |
| `agent-drag-float` | During drag, clones the agent card into a fixed floating element that follows the cursor with `rotate(-5deg) scale(1.05)`, while the source card fades and uses grabbing cursor state. |
| `task-drop-hover` | Drop targets under the dragged card elevate/glow while hit-tested beneath the floating clone. |
| `character-perspective` / `character-tilt` | Character media console uses about `1500px` perspective, preserve-3D tilt, up to about `6deg` pointer rotation, and easing back to neutral on pointer leave. |

## Current React Alignment Against Template

- Sidebar now starts collapsed, expands on hover, supports lock/collapse, and shows collapsed tooltips.
- A2 now includes the roadmap header, progress area, live export menu, reset action, assist roster cards, accordion phase header, sprint shell, denser task rows, assignment side panel, and expandable task detail skeleton.
- A2 keeps runtime truth first: if task-container fields such as code/test links, token telemetry, DoD specifics, or per-task export payloads are not present in the approved snapshot, React renders `unavailable` or disabled controls instead of inventing data.
- A2 semantic parity for the title and stat labels is approved, and the current React surface is structurally aligned with the template within current runtime limits. Full task-container parity still depends on richer runtime-backed task-container fields.
- A5 now includes the template-style Agent Select infinity carousel with active stats, ability tags, deck navigation, bottom controls, EVA video switcher/media console sourced from `public/agents/eva`, sequential 01 -> 02 -> 03 playback, cursor glow, 3D character tilt, config overlay, no nested card wrappers, and a mobile single-column adaptation when no live agents are connected. It still needs backend-backed config persistence before save/dirty-state controls are meaningful.
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
- Task detail dropdowns show Task Container data or explicit unavailable values
