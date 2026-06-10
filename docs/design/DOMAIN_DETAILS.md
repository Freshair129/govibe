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
| A2 Roadmap Board | Renders a React roadmap surface with Phase, Sprint, Epic, User Story, and Task lanes. | Switch to A2; the five lanes and live-feed empty state must be visible. |
| A3 Capability Plugins | Renders Transport, Runtime, and Workspace capability slots. | Switch to A3; capability slots must be visible without mock telemetry. |
| A4 Brain & Config | Renders Models, Memory, and Safety configuration lanes. | Switch to A4; configuration lanes must be visible without implying active backend state. |
| A5 Agent Management | Renders `snapshot.agents`; selecting an agent sends `agent.select`. | Ingest `agents`; click an agent; no console errors. |

### Domain B: Genesis Knowledge

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| B1 AST Hierarchy Tree | Renders an AST tree surface from `snapshot.graph.nodes` while AST-specific events are pending. | Switch to B1; ingest graph nodes; tree rows appear. |
| B2 Business Specifications | Renders `snapshot.specs`. | Ingest specs; B2 cards appear. |
| B3 Interactive Graph | Renders `snapshot.graph.nodes` and `snapshot.graph.edges`. | Ingest graph; node labels and edge rows appear. |
| B4 Live Call Graph | Uses the graph renderer for live call relationships. | Switch to B4 after graph ingest; node labels and edge rows remain visible. |

### Domain C: Block DB

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| C1 Symbol Explorer Hub | Renders `snapshot.symbols`. | Ingest symbols; symbol cards appear. |
| C2 Intelligence Zoo | Renders Candidate, Observed, and Promoted experiment lanes. | Switch to C2; experiment lanes and live-feed empty state must be visible. |
| C3 SRS-G Debugger | Accepts JSON `MissionEvent` payload. | Paste a `snapshot` event and click Ingest; UI updates. |
| C4 Database ERD Schema | Renders an ERD surface from `snapshot.symbols` while schema-specific events are pending. | Switch to C4; ingest symbols; schema cards appear. |
| C5 HNSW Vector Space Map | Renders vector topology from `snapshot.graph.nodes` while vector-specific events are pending. | Switch to C5; ingest graph nodes; vector nodes appear. |

### Domain D: AI Benchmark

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| D1 Reactor Run Trigger | Dedicated view button and header Run button both send `reactor.run`. | Switch to D1; click Run Reactor; gateway sends command or warns if no transport exists. |
| D2 Cyber Reactor Heatmap | Renders `snapshot.heatmap`. | Ingest heatmap; grid and core temp appear. |
| D3 EABS-01 Campaign Logs | Renders `snapshot.campaignLogs`. | Ingest logs; log lines appear. |

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
