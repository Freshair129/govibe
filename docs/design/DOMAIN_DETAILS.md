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

| Domain | Implemented Evidence | Verification |
| --- | --- | --- |
| A1 Dashboard | Renders metrics, chart, and reactor rows from `MissionSnapshot`. | Ingest a `snapshot` payload with metrics; A1 must update and remove the no-telemetry empty state. |
| A5 Agents | Renders `snapshot.agents`; selecting an agent sends `agent.select`. | Ingest `agents`; click an agent; no console errors. |
| B2 Specs | Renders `snapshot.specs`. | Ingest specs; B2 cards appear. |
| B3/B4 Graph | Renders `snapshot.graph.nodes` and edges. | Ingest graph; node labels and edge rows appear. |
| C1 Symbols | Renders `snapshot.symbols`. | Ingest symbols; symbol cards appear. |
| C3 Data Ingest | Accepts JSON `MissionEvent` payload. | Paste a `snapshot` event and click Ingest; UI updates. |
| D1 Reactor | Header Run sends `reactor.run`. | Click Run; gateway sends command or warns if no transport exists. |
| D2 Heatmap | Renders `snapshot.heatmap`. | Ingest heatmap; grid and core temp appear. |
| D3 Logs | Renders `snapshot.campaignLogs`. | Ingest logs; log lines appear. |
| Terminal | Sends `terminal.command`; does not fake success. | Send a command without transport; warning appears. |

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
