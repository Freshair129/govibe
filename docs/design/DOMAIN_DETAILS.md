# GoVibe Domain Details & Verification Matrix

This file is the design verification companion for the current React/Vite Mission Control app.

## Runtime Contract

Authoritative types live in `src/mission.ts`.

### MissionSnapshot

The dashboard renders from:

- `connectionState`
- `metrics`
- `chart`
- `reactor`
- `agents`
- `terminal`
- `graph`
- `specs`
- `symbols`
- `heatmap`
- `campaignLogs`

### MissionEvent

Supported event types:

- `snapshot`
- `terminal.line`
- `metrics.update`
- `chart.update`
- `agents.update`
- `graph.update`
- `heatmap.update`

### MissionCommand

Supported command types:

- `terminal.command`
- `agent.select`
- `reactor.run`
- `file.save`

## Domain Verification

Each domain and module below must match `docs/design/SITE_MAP.md`, `src/mission.ts`, and the rendered React route in `src/App.tsx`.

### Domain A: Project Overview

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| A1 Real-time Dashboard | Renders metrics, chart, and reactor rows from `MissionSnapshot`. | Ingest a `snapshot` payload with metrics; A1 must update and remove the no-telemetry empty state. |
| A2 Roadmap Board | Renders roadmap header, progress surface, export/reset controls, assist roster cards, phase accordion, task rows, badges, and assignment selects. | Switch to A2; controls, roster cards, phase header, and task rows must be visible. |
| A3 Capability Plugins | Renders plugin cards for transport, export, knowledge, and benchmark extension points. | Switch to A3; plugin cards and action controls must be visible without mock telemetry. |
| A4 Brain & Config | Renders model source, Genesis Knowledge, behavior, and runtime-limit control surfaces. | Switch to A4; configuration controls must be visible without implying active backend state. |
| A5 Agent Management | Renders `snapshot.agents` when available; otherwise shows the Agent Select card-deck carousel with active stats, ability tags, EVA media/video switcher from `public/agents/eva`, and config overlay. | Switch to A5 with no agents; cycle the deck, confirm active stats/media update, open Configure, and verify the EVA video or portrait renders. Ingest `agents`; live roster appears and selecting an agent sends `agent.select`. |

### Domain B: Genesis Knowledge

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| B1 AST Hierarchy Tree | Renders AST code preview and canvas nodes from `snapshot.graph.nodes` or template blueprint nodes. | Switch to B1; code lines and AST nodes appear. |
| B2 Business Specifications | Renders `snapshot.specs` or the template Business Protocol Specification blueprint. | Switch to B2 without specs; protocol spec appears. Ingest specs; live cards appear. |
| B3 Interactive Graph | Renders graph studio canvas from `snapshot.graph.nodes` or blueprint nodes. | Switch to B3; graph studio and add-node action appear. |
| B4 Live Call Graph | Uses the graph renderer with depth controls, sync action, and selected-node info panel. | Switch to B4 after graph ingest; node labels, edge rows, depth controls, and info panel remain visible. |

### Domain C: Block DB

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| C1 Symbol Explorer Hub | Renders `snapshot.symbols` in a filterable table. | Ingest symbols; table rows appear; filtering narrows visible rows. |
| C2 Intelligence Zoo | Renders agent/model roster cards from the template blueprint. | Switch to C2; Intelligence Zoo cards appear. |
| C3 SRS-G Debugger | Shows query comparison panes and accepts JSON `MissionEvent` payload. | Type a query; panes show waiting/transport copy; paste a `snapshot` event and click Ingest; UI updates. |
| C4 Database ERD Schema | Renders an ERD canvas with table cards from `snapshot.symbols` while schema-specific events are pending. | Switch to C4; ingest symbols; schema table cards appear. |
| C5 HNSW Vector Space Map | Renders layer controls and vector topology from `snapshot.graph.nodes` while vector-specific events are pending. | Switch to C5; change layer; ingest graph nodes; vector nodes appear. |

### Domain D: AI Benchmark

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| D1 Reactor Run Trigger | Safety regulator, campaign run command, and oscilloscope sandbox surface; header Run and view run both send `reactor.run`. | Switch to D1; adjust power limit; click Start Safety Campaign Run; gateway sends command or warns if no transport exists. |
| D2 Cyber Reactor Heatmap | Renders reactor overview and 8x8 heatmap from `snapshot.heatmap` or blueprint cells. | Switch to D2; overview and 64 grid cells appear. Ingest heatmap; live values render. |
| D3 EABS-01 Campaign Logs | Renders `snapshot.campaignLogs` or blueprint campaign rows. | Switch to D3; log panel appears. Ingest logs; live log lines appear. |

## Global Verification

| Surface | Implemented Evidence | Verification |
| --- | --- | --- |
| Top navigation | Shows the four exact domain names from `missionDomains`. | Browser load must show Project Overview, Genesis Knowledge, Block DB, and AI Benchmark. |
| Sidebar | Shows active domain modules with `A1-D3` IDs and accessible labels. | Domain switching must reset to that domain's default route and show the matching module list. |
| Footer | Shows `Domain > ID: Module Name`. | Switch C4 and C5; footer must match the active route. |
| Terminal | Sends `terminal.command`; does not fake success. | Send a command without transport; warning appears. |
| Theme switcher | Persists `govibe-theme` in `localStorage`. | Toggle theme; reload; selected theme remains active. |

## Acceptance Criteria

- `npm run lint` passes.
- `npm run build` passes.
- Browser load at `http://127.0.0.1:1420/` has no console errors.
- Empty state appears when no data is connected.
- Ingesting a valid `MissionEvent` updates visible UI.
- No UI module should use random or hardcoded mock telemetry to imply a live backend.

## Known Follow-ups

- Add backend producer for `MissionEvent` over `VITE_GOVIBE_WS_URL`.
- Add schema-specific events for roadmap tasks, AST trees, ERD tables, and vector map nodes.
- Add automated browser smoke tests for ingest, terminal command, and domain switching.
