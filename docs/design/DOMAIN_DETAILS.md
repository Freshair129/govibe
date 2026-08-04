---
title: "GoVibe Domain Details & Verification Matrix"
doc_id: "DESIGN-DOMAIN-DETAILS"
status: "approved"
version: "1.1.0"
updated: "2026-08-04"
owner: "Boss (CEO)"
source_of_truth: true
related_docs:
  - "docs/design/SITE_MAP.md"
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
---

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
- `roadmap`
- `memory` (planned; see MemorySnapshot below)

### A2 Task Container

A2 roadmap task detail dropdowns require `Task Container` records in addition to roadmap hierarchy nodes. The container supplies detailed fields that must not be inferred from a title-only `WorkflowTaskNode`.

Required task container fields:

- `task_container_id`, `task_id`, `legacy_task_id`, and `legacy_code`
- `parent_phase_id` and `parent_sprint_id`
- `pic`, `executor`, `approver`, and `auditor`
- `symbol_links.code`, `symbol_links.doc`, and `symbol_links.test`
- `definition_of_done.acceptance_criteria`
- `definition_of_done.success_criteria`
- `definition_of_done.exit_criteria`
- `changelog`, `created_at`, and `last_update`
- `token_telemetry.model_name`, `context_length`, `predicted_token_usage`, `actual_input_tokens`, `actual_output_tokens`, `tool_calling_tokens`, and `total_token_usage`
- `export.json`, `export.yaml`, and `export.markdown`
- `ui_state.dropdown_default`, `expanded`, and `disabled_reason`

### MemorySnapshot (planned)

Field contract for Domain E, specified ahead of implementation per
`docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`
and `docs/api/API-009-Persistent-Memory-Contract.md`. Not yet produced by any
runtime code; `src/mission/domain.ts` does not define these types yet.

Required fields:

- `entities: MemoryEntityRecord[]` — current-state projection; each record
  carries `entity_id`, `vault_id`, `category`, `key`, `epistemic_state`
  (`hypothesis`\|`confirmed`\|`contested`\|`deprecated`), `confidence`,
  `lifecycle_state` (`active`\|`decayed`\|`archived`\|`forgotten`),
  `decay_score`, `current_version`, `valid_from`, `valid_to`, `recorded_at`,
  `superseded_at` — mirroring `MemoryEntity` in API-009 §3.
- `searchMode: "hybrid" | "fts_only" | "vector_only"` and
  `vectorAvailable: boolean` — the last known degraded-search state; E1 must
  render this, not infer it from result count.
- `selectedEntityId: string | null` — set by `govibe.memory.select`.
- `lastDecayTick: { evaluated: number; transitioned: number; dryRun: boolean; at: string } | null`.

E1/E2/E3 must render an explicit empty state when `entities.length === 0` and
must never fabricate a `MemoryEntityRecord`, matching the no-mock-telemetry
rule already stated in this file's Acceptance Criteria.

### MissionEvent

Supported event types:

- `snapshot`
- `terminal.line`
- `metrics.update`
- `chart.update`
- `agents.update`
- `graph.update`
- `heatmap.update`
- `roadmap.snapshot`
- `roadmap.node.update`
- `roadmap.assignment`
- `roadmap.handoff`
- `roadmap.verification`
- `memory.snapshot` (planned — requires the `packages/mission-protocol/index.js`
  `isMissionEvent` allow-list addition specified in
  `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`)
- `memory.entity.update` (planned, same dependency)

### MissionCommand

Supported command types:

- `terminal.command`
- `agent.select`
- `reactor.run`
- `file.save`
- `memory.search`, `memory.select`, `memory.forget`, `memory.decay.run` (planned
  — requires the `packages/mission-protocol/index.js` `isMissionCommand`
  allow-list addition; without it these commands are silently dropped with
  only a logged warning at the wire-level security boundary enforced by both
  `sidecar-server.mjs` and the browser gateway, not an error)

## Domain Verification

Each domain and module below must match `docs/design/SITE_MAP.md`, `src/mission.ts`, and the rendered React route in `src/App.tsx`.

### Domain A: Project Overview

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| A1 Real-time Dashboard | Renders metrics, chart, and reactor rows from `MissionSnapshot`. | Ingest a `snapshot` payload with metrics; A1 must update and remove the no-telemetry empty state. |
| A2 Roadmap Board | Renders roadmap header, progress surface, export/reset controls, assist roster cards, phase accordion, sprint shell, sprint blocks, denser task rows, expandable task detail skeleton, badges, symbol links, DoD, changelog, token telemetry placeholders, PIC/Executor/Approver/Auditor placeholders, task ID, and per-task export controls. Header wording must use `GoVibe Development Roadmap`, `Feature ทั้งหมด`, `พร้อมใช้งาน / IMP แล้ว`, and `Task ใน Backlog`. The current React slice exports the approved roadmap snapshot as `JSON`, `YAML`, or `Markdown`, with serialization and download behavior sourced from `src/roadmapExport.ts`, and `Reset Board` restores local A2 UI state without mutating runtime data. If no sprint node exists in the approved runtime snapshot, React derives a visual sprint shell from the active phase and marks unavailable sprint metadata honestly. Missing task-container fields render `unavailable` or disabled controls rather than fabricated values. Detail sections may include short explanatory subcopy to clarify snapshot-backed fields versus intentionally unavailable template-era placeholders. A2 mobile wrapping must keep source metadata, action controls, phase header content, and disabled task export controls readable without horizontal overflow. | Load a roadmap snapshot with at least one Task Container generated from `docs/roadmap/BACKLOG-p1-mvp-core.md`; switch to A2; verify the header uses `GoVibe Development Roadmap`; verify the three stat labels match the design contract; verify `Export` downloads the approved roadmap source in `JSON`, `YAML`, and `Markdown`; verify `Reset Board` reopens the phase and closes the export menu; verify a sprint shell appears before task rows; verify missing sprint duration shows `unavailable` rather than a fabricated value; expand a task dropdown; verify `SYMBOL LINKS`, `Metadata`, `Responsibility`, `DEFINITION OF DONE`, `CHANGELOG`, `Task ID`, and disabled task export buttons are visible; verify unavailable task-container fields remain explicitly unavailable; verify the unfinished queue task is visibly not done; verify narrow-width layouts do not overflow when source paths or disabled export controls are long. |
| A3 Capability Plugins | Renders plugin cards for transport, export, knowledge, and benchmark extension points. | Switch to A3; plugin cards and action controls must be visible without mock telemetry. |
| A4 Brain & Config | Renders model source, Genesis Knowledge, behavior, and runtime-limit control surfaces. | Switch to A4; configuration controls must be visible without implying active backend state. |
| A5 Agent Management | Renders `snapshot.agents` when available; otherwise shows the Agent Select infinity carousel with active stats, ability tags, EVA media/video switcher from `public/agents/eva`, sequential autoplay 01 -> 02 -> 03 -> 01, `interactive-card` glare, Raycast 3D Agent Card tilt, Agent drag follow-cursor assignment, cursor glow, 3D character tilt, mobile single-column layout, and config overlay. Visual Agent Fleet metadata may be shown as configuration/provenance only: agent identity, fleet role, job-title equivalent, domain, cluster, responsibility badges, authority boundaries, source refs, and scope status. | Switch to A5 with no agents; cycle the deck repeatedly and confirm it wraps without a scrollbar, confirm active stats/media update, move the pointer over Raycast agent cards and verify about `15deg` tilt/shine, drag an agent card and verify a floating clone follows the cursor while task drop targets glow, move the pointer over the character console to verify about `6deg` tilt/glow, open Configure, and verify the EVA video sequence renders. At mobile width, deck cards and media panel must not overflow horizontally. Ingest `agents`; live roster appears and selecting an agent sends `agent.select`. If Visual Agent Fleet metadata is present, verify it is labeled as role/provenance metadata and does not imply live execution without runtime data. |

### Domain B: Genesis Knowledge

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| B1 AST Hierarchy Tree | Renders AST code preview and canvas nodes from `snapshot.graph.nodes` or template blueprint nodes. | Switch to B1; code lines and AST nodes appear. |
| B2 Business Specifications | Renders `snapshot.specs` or the template Business Protocol Specification blueprint. | Switch to B2 without specs; protocol spec appears. Ingest specs; live cards appear. |
| B3 Interactive Graph | Renders graph studio canvas from `snapshot.graph.nodes` or blueprint nodes. | Switch to B3; graph studio and add-node action appear. |
| B4 Live Call Graph | Uses the graph renderer with depth controls, sync action, and selected-node info panel. | Switch to B4 after graph ingest; node labels, edge rows, depth controls, and info panel remain visible. |

### Domain C: GenesisBlock DB

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

### Domain E: Memory (planned)

Domain E is specified ahead of implementation; no module below is
implemented in `src/App.tsx` yet. This section exists so implementation has a
governed verification target, matching this file's role as the design
verification companion for the other domains.

| Module | Implemented Evidence | Verification |
| --- | --- | --- |
| E1 Memory Browser | Not implemented. Will render `MemorySnapshot.entities` in a filterable/searchable list, sourced from `msp_memory_search`/`msp_memory_list` via `govibe.memory.search`. | Once implemented: switch to E1 with no memory snapshot; an explicit empty state must appear, not fabricated rows. Ingest a `memory.snapshot` event; entity rows must appear and match `entities`. |
| E2 Temporal & Decay | Not implemented. Will render `msp_memory_history` for a selected entity and expose a manual `govibe.memory.decay.run` trigger. | Once implemented: select an entity; history rows must appear in version order. Trigger a decay run; `lastDecayTick` must update and no in-app scheduler must exist. |
| E3 Vault & Promotion | Not implemented. Will render vault scope and `govibe.memory.promote` state for a selected entity. | Once implemented: attempt a shared-scope promotion; the UI must show the denial reason `gks_provider_unconfigured` explicitly, not a generic failure or a silent no-op. |

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
- A2 task detail dropdowns render from Task Container records; missing fields appear as `unavailable`.
- A2 displays `PIC`, `Executor`, `Approver`, and `Auditor` as distinct responsibility fields.

## Known Follow-ups

- Add backend producer for `MissionEvent` over `VITE_GOVIBE_WS_URL`.
- Add schema-specific events for roadmap tasks, AST trees, ERD tables, and vector map nodes.
- Add runtime support for A2 Task Container records after the design/data contract is approved.
- Add automated browser smoke tests for ingest, terminal command, and domain switching.
- Implement Domain E (E1/E2/E3), `MemorySnapshot`, the `memory.*` event/command
  types, and the `packages/mission-protocol/index.js` allow-list additions
  they depend on, per
  `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`.

## Changelog

| Version | Date | Owner | Summary |
| --- | --- | --- | --- |
| 1.1.0 | 2026-08-04 | Claude (final-gate session) | Added the planned `MemorySnapshot` field contract, `memory.snapshot`/`memory.entity.update` event types, `memory.*` command types, and a Domain E (Memory) verification-matrix section; all marked not-yet-implemented ahead of the persistent-memory MSP runtime work in CR-2026-08-04. |
| 1.0.0 | 2026-08-04 | Claude (final-gate session) | Backfilled governance frontmatter (doc_id, status, version, owner, source_of_truth) and registered in DOC-VERSION-REGISTRY.md; no body content changed. |
| 0.2.1 | 2026-06-18 | THESEUS | Added A2 roadmap header verification for GoVibe naming and feature/backlog stat labels. |
| 0.2.0 | 2026-06-14 | THESEUS | Added A2 Task Container verification requirements for template-parity roadmap task detail dropdowns. |
