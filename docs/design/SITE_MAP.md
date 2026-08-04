---
title: "GoVibe Mission Control Site Map"
doc_id: "DESIGN-SITE-MAP"
status: "approved"
version: "1.1.0"
updated: "2026-08-04"
owner: "Boss (CEO)"
source_of_truth: true
related_docs:
  - "docs/design/DOMAIN_DETAILS.md"
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
---

# GoVibe Mission Control Site Map

This document tracks the implemented React route structure in `src/App.tsx` and the domain metadata in `src/mission.ts`.

## Domain A: Project Overview

- **A1: Real-time Dashboard**
  - Implemented.
  - Reads `snapshot.metrics`, `snapshot.chart`, and `snapshot.reactor`.
  - Shows empty states when no telemetry has arrived.
- **A2: Roadmap Board**
  - Implemented as a React roadmap surface.
  - Shows Development Roadmap hierarchy: roadmap source, phase containers, sprint containers, task containers, and task detail dropdowns.
  - Expects roadmap hierarchy snapshots and Task Container records through the mission gateway.
  - Task detail dropdowns show symbol links, Definition of Done, changelog, task metadata, PIC/Executor/Approver/Auditor, token telemetry, and per-task export controls.
- **A3: Capability Plugins**
  - Implemented as a React capability surface.
  - Shows Transport, Runtime, and Workspace capability slots.
  - Expects plugin capability data through the mission gateway.
- **A4: Brain & Config**
  - Implemented as a React configuration surface.
  - Shows Models, Memory, and Safety configuration lanes.
  - Expects model/runtime configuration through the mission gateway.
- **A5: Agent Management**
  - Implemented.
  - Reads `snapshot.agents`.
  - Sends `agent.select` commands through the mission gateway.

## Domain B: Genesis Knowledge

- **B1: AST Hierarchy Tree**
  - Implemented as a React AST tree surface.
  - Reads `snapshot.graph.nodes` while the dedicated AST event shape is pending.
- **B2: Business Specifications**
  - Implemented.
  - Reads `snapshot.specs`.
- **B3: Interactive Graph**
  - Implemented.
  - Reads `snapshot.graph.nodes` and `snapshot.graph.edges`.
- **B4: Live Call Graph**
  - Implemented with the same graph renderer as B3.
  - Reads `snapshot.graph`.

## Domain C: Block DB

- **C1: Symbol Explorer Hub**
  - Implemented.
  - Reads `snapshot.symbols`.
- **C2: Intelligence Zoo**
  - Implemented as a React experiment surface.
  - Shows Candidate, Observed, and Promoted lanes.
  - Expects capability experiment records through the mission gateway.
- **C3: SRS-G Debugger**
  - Implemented.
  - Manual JSON entrypoint for `MissionEvent` payloads.
  - Used to verify real gateway updates without backend availability.
- **C4: Database ERD Schema**
  - Implemented as a React ERD surface.
  - Reads `snapshot.symbols` as the current schema-adjacent data source.
  - Needs schema-specific event shape before final ERD rendering.
- **C5: HNSW Vector Space Map**
  - Implemented as a React vector topology surface.
  - Reads `snapshot.graph.nodes` while the dedicated vector event shape is pending.

## Domain D: AI Benchmark

- **D1: Reactor Run Trigger**
  - Implemented as a dedicated command view.
  - View button and header Run button both send `reactor.run`.
- **D2: Cyber Reactor Heatmap**
  - Implemented.
  - Reads `snapshot.heatmap.cells` and `snapshot.heatmap.coreTemp`.
- **D3: EABS-01 Campaign Logs**
  - Implemented.
  - Reads `snapshot.campaignLogs`.

## Domain E: Memory

**Status: planned.** Domain E and its sub-modules are specified here ahead of
the persistent-memory MSP runtime work in
`docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`.
None of the three sub-modules below is implemented in `src/App.tsx` yet; this
entry follows Domain A-D's format so implementation has a governed target,
not to claim the route exists today.

- **E1: Memory Browser**
  - Planned.
  - Will read `snapshot.memory.entities` (`MemoryEntityRecord[]`) and expose
    `msp_memory_search`/`msp_memory_list` results.
  - Shows an explicit empty state when `snapshot.memory.entities.length === 0`;
    never fabricates rows.
- **E2: Temporal & Decay**
  - Planned.
  - Will read bi-temporal history (`msp_memory_history`) and decay/lifecycle
    state (`active` / `decayed` / `archived` / `forgotten`) for a selected
    entity.
  - Exposes a manual `govibe.memory.decay.run` trigger; the runtime never
    self-schedules decay ticks.
- **E3: Vault & Promotion**
  - Planned.
  - Will show vault scope (Shared / Workspace-Private / Global-Private) and
    promotion state for a selected entity via `govibe.memory.promote`.
  - Shared-scope promotion always displays as denied
    (`gks_provider_unconfigured`) until a real GKS provider exists; this must
    render as an honest denial, not a hidden or silently-retried action.

## Global Overlays

- **Floating Terminal**
  - Sends `terminal.command`.
  - Displays user command and transport warnings from the gateway.
- **Theme Switcher**
  - Local state persisted in `localStorage` under `govibe-theme`.
- **Sidebar**
  - Local expanded/collapsed state.
- **Status Row**
  - Displays gateway connection state and last snapshot update time.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.1.0 | 2026-08-04 | Claude (final-gate session) | Added the planned Domain E (Memory) entry with sub-modules E1 Memory Browser, E2 Temporal & Decay, and E3 Vault & Promotion, following the Domain A-D entry format; all three are marked planned/not yet implemented ahead of the persistent-memory MSP runtime work in CR-2026-08-04. |
| 1.0.0 | 2026-08-04 | Claude (final-gate session) | Backfilled governance frontmatter (doc_id, status, version, owner, source_of_truth) and registered in DOC-VERSION-REGISTRY.md; no body content changed. |
| 0.2.0 | 2026-06-14 | THESEUS / VIBE | Clarified that A2 consumes roadmap hierarchy plus Task Container detail records for template-parity dropdowns. |
| 0.1.0 | 2026-06-12 | THESEUS / VIBE | Added implemented React route map for Mission Control domains, modules, and global overlays. |
