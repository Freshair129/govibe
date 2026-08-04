---
title: "ROADMAP: Persistent-Memory MSP Runtime"
doc_id: "ROADMAP-PERSISTENT-MEMORY-RUNTIME"
id: RM-persistent-memory-runtime
version: "0.1.0+draft"
updated: "2026-08-04"
status: draft
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
related_docs:
  - "docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md"
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/srs/SRS-Persistent-Memory-MSP-Runtime.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
  - "docs/roadmap/BACKLOG-persistent-memory-runtime.md"
  - "docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md"
---

# ROADMAP: Persistent-Memory MSP Runtime

**Source CR:** docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md
**Authority:** docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md
**Contract:** docs/api/API-009-Persistent-Memory-Contract.md
**Owner:** LYRA
**Auditor:** ATHER
**Roadmap Source Path:** docs/roadmap/ROADMAP-persistent-memory-runtime.md
**Authorized work packet:** WP-12 (Phase 0 + Phase 1 only)

## Purpose and non-claims

This roadmap sequences the six-phase persistent-memory MSP runtime plan
recorded in
`docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`.
It is a plan, not an implementation claim.

- `Status` and `Progress` columns describe **repository-observable state
  only** (merged code, merged tests, merged documents), never runtime
  conformance.
- Only WP-12 (Phase 0 + Phase 1) is currently authorized for execution.
  Phases 2 through 5 are sequenced here for planning visibility but each
  requires its own future work packet, proposed and authorized only after the
  prior phase closes with reviewed evidence.
- No phase in this roadmap may be reported as an implemented runtime
  capability until its own tests pass and are reviewed. Documented decisions
  (ADR-027, SRS, SDD, API-009) are authority records, not proof that the
  described runtime behavior exists yet — at the time this roadmap was
  authored, `packages/msp-runtime` does not yet exist in the repository.
- Promotion of this roadmap's `status` beyond `draft` is LYRA's call, not the
  author's.

## Product Goal

Give GoVibe agents and Mission Control a real, restart-surviving, hybrid-
searchable memory store — implemented as `packages/msp-runtime`, a separate
OS process per ADR-026/ADR-027 — without fabricating shared-knowledge
promotion, execution-replay evidence, or search results the runtime cannot
actually produce.

## Phases

| Phase | Goal | PRD Systems | Required Docs | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| PHASE-PMR-00 | Package scaffold and NDJSON-RPC stdio transport parity | SYSTEM-05, SYSTEM-06 | ADR-027, SDD §2-3 | Real-process transport test passes against `createMspStdioCaller`; wire format confirmed distinct from the Content-Length/LSP transport | planned | 0 |
| PHASE-PMR-01 | Storage foundation: migrations, entity-store, temporal-engine | SYSTEM-05 | SDD §5, SRS FR-002 to FR-004 | Migration checksum-drift and downgrade guards enforced; temporal-engine parity test passes against `scripts/mcp/temporal-versioning.mjs` | planned | 0 |
| PHASE-PMR-02 | Existing frozen `msp_*` contract surface | SYSTEM-05, SYSTEM-06 | API-006, API-009 §1 | Contract-conformance tests pass against the real running process for every existing `msp_*` tool | planned | 0 |
| PHASE-PMR-03 | Hybrid retrieval: FTS5, vector, RRF fusion | SYSTEM-05 | API-009 §4.6, SRS FR-010/FR-011 | Graceful-degradation test proves `searchMode` flips to `fts_only` when Ollama is stopped mid-test | planned | 0 |
| PHASE-PMR-04 | Temporal decay lifecycle | SYSTEM-05 | SDD §5, SRS FR-012 | Full `active -> decayed -> archived -> forgotten` transition test passes under an injected clock | planned | 0 |
| PHASE-PMR-05 | Links, GoVibe-side bridge, Mission Control Domain E | SYSTEM-01, SYSTEM-05, SYSTEM-06 | SRS FR-013/FR-019 to FR-021, LLD-GoVibe-MCP-Tools | `memory-service.test.mjs`, mission-protocol allow-list tests, and snapshot-reducer tests for Domain E all pass | planned | 0 |

## Sprints

| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| SPRINT-PMR-00 | PHASE-PMR-00 | Package scaffold and transport parity (WP-12 part 1) | 1 | Real-process NDJSON-RPC round trip verified | planned | 0 |
| SPRINT-PMR-01 | PHASE-PMR-01 | Storage foundation (WP-12 part 2) | 1 | Migrations, entity-store, temporal-engine parity test pass | planned | 0 |
| SPRINT-PMR-02 | PHASE-PMR-02 | Frozen `msp_*` contract-conformance | 1 | Every existing `msp_*` tool passes conformance tests against the real process | planned | 0 |
| SPRINT-PMR-03 | PHASE-PMR-03 | Hybrid retrieval | 1 | FTS5/vector/RRF and graceful-degradation tests pass | planned | 0 |
| SPRINT-PMR-04 | PHASE-PMR-04 | Temporal decay lifecycle | 1 | Full lifecycle transition test passes deterministically | planned | 0 |
| SPRINT-PMR-05 | PHASE-PMR-05 | Links + GoVibe bridge + Domain E dashboard | 1 | Bridge, mission-protocol allow-list, and Domain E tests pass | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-PMR-00 | SPRINT-PMR-00 | task | Package scaffold and transport parity | SYSTEM-05 | P0 | unassigned | WP-12 | ADR-027 | Real-process transport test passes; wire format verified distinct from LSP framing | planned | 0 |
| TASK-PMR-01 | SPRINT-PMR-01 | task | Storage foundation: migrations, entity-store, temporal-engine | SYSTEM-05 | P0 | unassigned | WP-12 | TASK-PMR-00 | Migration guards enforced; temporal-engine parity test passes | planned | 0 |
| TASK-PMR-02 | SPRINT-PMR-02 | task | Existing `msp_*` contract surface implementation | SYSTEM-05 | P0 | unassigned | Future WP (post-WP-12) | TASK-PMR-01 | Contract-conformance tests pass against the real process for every existing `msp_*` tool | planned | 0 |
| TASK-PMR-03 | SPRINT-PMR-03 | task | Hybrid retrieval: FTS5, vector, RRF fusion | SYSTEM-05 | P1 | unassigned | Future WP (post-WP-12) | TASK-PMR-01 | Graceful-degradation test proves `searchMode` flips to `fts_only` | planned | 0 |
| TASK-PMR-04 | SPRINT-PMR-04 | task | Temporal decay lifecycle | SYSTEM-05 | P1 | unassigned | Future WP (post-WP-12) | TASK-PMR-01 | Full lifecycle transition test passes under an injected clock | planned | 0 |
| TASK-PMR-05 | SPRINT-PMR-05 | task | Links, GoVibe-side bridge, Mission Control Domain E | SYSTEM-01; SYSTEM-05; SYSTEM-06 | P2 | unassigned | Future WP (post-WP-12) | TASK-PMR-02; TASK-PMR-03; TASK-PMR-04 | `memory-service.test.mjs`, mission-protocol allow-list, and Domain E snapshot-reducer tests pass | planned | 0 |

## Dependency and release-gate mapping

| Gate | Blocking items | Releasable claim once passed | Still not claimable |
|---|---|---|---|
| GATE-PMR-A Transport and storage foundation | TASK-PMR-00, TASK-PMR-01 | The runtime process starts, speaks the correct wire format, and persists/retrieves bi-temporal entities correctly | Any `msp_*`/`msp_memory_*` tool behavior beyond entity-store primitives |
| GATE-PMR-B Existing contract surface | TASK-PMR-02 | The frozen `msp_*` surface already called by `packages/govibe-core/src/msp-client.mjs` works against a real process | New memory-specific tools (`msp_memory_*`), retrieval, decay |
| GATE-PMR-C Retrieval and lifecycle | TASK-PMR-03, TASK-PMR-04 | Hybrid search and decay lifecycle work with observable, non-silent degradation | GoVibe-side bridge or Mission Control visibility |
| GATE-PMR-D Bridge and dashboard | TASK-PMR-05 | Agents and Mission Control can read and act on real memory state through `govibe.memory.*` and Domain E | Shared-scope (`gks:`) knowledge promotion, which remains fail-closed indefinitely pending a future GKS provider decision |

Ordering rule: **Phase 0 -> Phase 1 -> {Phase 2, Phase 3, Phase 4 in any
relative order, each depending only on Phase 1} -> Phase 5**. Phase 5 depends
on Phase 2, Phase 3, and Phase 4 because the GoVibe-side bridge and dashboard
need the full tool surface, retrieval, and lifecycle behavior to have
something real to display.

## Acceptance Criteria

- Every roadmap phase maps to exactly one phase in
  `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`.
- Only WP-12 (Phase 0 + Phase 1) is marked with any authorization; Phase 2
  through Phase 5 remain `planned` until their own future work packets are
  proposed and authorized.
- Every task carries a Definition of Done recorded in
  `docs/roadmap/BACKLOG-persistent-memory-runtime.md`.
- No runtime capability is described as implemented before its phase's tests
  pass and are reviewed.
- This document and its backlog are registered in
  `docs/DOC-VERSION-REGISTRY.md`.

## Success Criteria

| Metric | Target |
|---|---:|
| Roadmap phases with a matching CR phase | 100% |
| Tasks with a written Definition of Done in the backlog | 100% |
| Status values backed by an observable repository artifact | 100% |
| Runtime-conformance claims made before a phase's tests pass | 0 |

## Definition of Done

- `npm run docs:validate` passes with this roadmap and backlog present.
- `npm run roadmap:validate` passes for this source (no Task Container
  declarations exist in this draft roadmap, so the Definition-of-Ready gate
  only applies at warning level while `status: draft`).
- Registry rows for both documents match their frontmatter version and
  status.
- The roadmap parser reads the Phases, Sprints, and Backlog Items tables
  without broken parent references or duplicate node ids.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-04 | LYRA | Initial governed roadmap for the six-phase persistent-memory MSP runtime plan recorded in CR-2026-08-04; only Phase 0 + Phase 1 (WP-12) are authorized, Phases 2-5 are sequenced for planning visibility only. |
