---
title: "BACKLOG: Persistent-Memory MSP Runtime"
doc_id: "BACKLOG-PERSISTENT-MEMORY-RUNTIME"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-04"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/roadmap/ROADMAP-persistent-memory-runtime.md"
  - "docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md"
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/srs/SRS-Persistent-Memory-MSP-Runtime.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
  - "docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md"
---

# BACKLOG: Persistent-Memory MSP Runtime

**Roadmap Source Path:** `docs/roadmap/ROADMAP-persistent-memory-runtime.md`
**Backlog Source Path:** `docs/roadmap/BACKLOG-persistent-memory-runtime.md`
**Governing CR:** `CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME`
**Authorized Work Packet:** `WP-12` (Phase 0 + Phase 1 only)
**Planning PIC:** `LYRA`
**Architecture PIC:** `ARCHON`
**Security PIC:** `ATHER`
**Status:** `draft`

## Purpose and non-claims

This backlog records the Definition of Done, tests, and evidence required for
each phase of the persistent-memory MSP runtime. Recording a DoD is not
evidence that it is met. Every implementation status here reflects merged
repository artifacts only; at the time this backlog was authored,
`packages/msp-runtime` does not yet exist, so every task below is `planned`.

## Goal

Give each phase of the persistent-memory MSP runtime an executable work
definition with explicit dependencies, tests, and evidence, and a gate
structure that prevents premature implementation claims — mirroring the
discipline already applied in
`docs/roadmap/BACKLOG-provider-entitlement-runtime.md`.

## Phases

| Phase | Parent ID | Goal | Status | Progress |
|---|---|---|---|---:|
| PHA-PMR-00 | | Package scaffold and transport parity | planned | 0 |
| PHA-PMR-01 | | Storage foundation | planned | 0 |
| PHA-PMR-02 | | Existing `msp_*` contract surface | planned | 0 |
| PHA-PMR-03 | | Hybrid retrieval | planned | 0 |
| PHA-PMR-04 | | Temporal decay lifecycle | planned | 0 |
| PHA-PMR-05 | | Links, GoVibe bridge, Domain E dashboard | planned | 0 |

## Sprints

| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---:|
| SPR-PMR-00 | PHA-PMR-00 | Package scaffold and NDJSON-RPC stdio transport | 1 | Real-process transport round trip verified | planned | 0 |
| SPR-PMR-01 | PHA-PMR-01 | Migrations, entity-store, temporal-engine | 1 | Migration guards enforced; temporal-engine parity proven | planned | 0 |
| SPR-PMR-02 | PHA-PMR-02 | Frozen `msp_*` contract-conformance | 1 | Every existing `msp_*` tool passes conformance tests against the real process | planned | 0 |
| SPR-PMR-03 | PHA-PMR-03 | FTS5, vector, RRF fusion | 1 | Graceful-degradation test passes | planned | 0 |
| SPR-PMR-04 | PHA-PMR-04 | Decay scoring and lifecycle transitions | 1 | Full lifecycle transition test passes deterministically | planned | 0 |
| SPR-PMR-05 | PHA-PMR-05 | Links, bridge, Domain E | 1 | Bridge, allow-list, and Domain E tests pass | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TSK-PMR-00 | SPR-PMR-00 | task | Package scaffold and NDJSON-RPC stdio transport parity | SYSTEM-05 | P0 | unassigned | WP-12 | ADR-027 | Real-process round trip via `createMspStdioCaller`; wire format confirmed distinct from Content-Length/LSP framing | planned | 0 |
| TSK-PMR-01 | SPR-PMR-01 | task | Migrations, entity-store, temporal-engine | SYSTEM-05 | P0 | unassigned | WP-12 | TSK-PMR-00 | Checksum-drift and downgrade guards enforced; temporal-engine parity test passes against `scripts/mcp/temporal-versioning.mjs` | planned | 0 |
| TSK-PMR-02 | SPR-PMR-02 | task | Existing `msp_*` contract surface | SYSTEM-05 | P0 | unassigned | Future WP (post-WP-12) | TSK-PMR-01 | Contract-conformance tests pass against the real process for `msp_workspace_register`, `msp_context_resolve`, `msp_context_injection_record`, `msp_context_replay`, `msp_context_diff`, `msp_context_audit`, `msp_vault_status`, `msp_vault_mount`, `msp_evidence_record`, `msp_knowledge_promote`, `msp_memory_promote` | planned | 0 |
| TSK-PMR-03 | SPR-PMR-03 | task | Hybrid retrieval: FTS5, vector, RRF fusion | SYSTEM-05 | P1 | unassigned | Future WP (post-WP-12) | TSK-PMR-01 | `msp_memory_search` supports `hybrid`/`fts`/`vector` modes; graceful-degradation test proves `searchMode` flips to `fts_only` when Ollama is stopped mid-test | planned | 0 |
| TSK-PMR-04 | SPR-PMR-04 | task | Temporal decay lifecycle | SYSTEM-05 | P1 | unassigned | Future WP (post-WP-12) | TSK-PMR-01 | `msp_memory_decay_tick` (caller/cron-triggered, `dry_run` supported) drives the full `active -> decayed -> archived -> forgotten` transition deterministically under an injected clock | planned | 0 |
| TSK-PMR-05 | SPR-PMR-05 | task | Links, GoVibe-side bridge, Mission Control Domain E | SYSTEM-01; SYSTEM-05; SYSTEM-06 | P2 | unassigned | Future WP (post-WP-12) | TSK-PMR-02; TSK-PMR-03; TSK-PMR-04 | `domain/links` flat CRUD; `scripts/mcp/msp-memory-contracts.mjs` and `scripts/mcp/runtime/memory-service.mjs` wired into `runtime-core.mjs`/`mission-command-router.mjs`; `packages/mission-protocol/index.js` allow-lists `memory.snapshot`/`memory.entity.update`/`memory.*`; Domain E (E1/E2/E3) renders with explicit empty states | planned | 0 |

## Task definitions

### TSK-PMR-00: Package scaffold and transport parity

- **Definition of Done:** `packages/msp-runtime/server.mjs` starts as a child
  process; a newline-delimited JSON-RPC 2.0 request/response round trip
  succeeds against both the existing
  `packages/govibe-core/test/fixtures/reference-msp-server.mjs` fixture and a
  real spawned process via `createMspStdioCaller`; the wire format is
  confirmed to share no framing code path with
  `scripts/mcp/govibe-mcp-server.mjs`'s Content-Length/LSP transport.
- **Tests:** real-process transport test; fixture-parity test.
- **Evidence:** merged package scaffold, transport module, and their tests.
- **Governing work packet:** WP-12.
- **Not yet started:** `packages/msp-runtime` does not exist in the
  repository as of this backlog's authoring date.

### TSK-PMR-01: Storage foundation

- **Definition of Done:** `db/` applies migrations idempotently with a
  `schema_migrations` table, a checksum-drift guard, and a downgrade guard;
  `domain/entity-store` supports upsert/get/list/history/forget with
  `pragma foreign_keys=ON` enforced; `domain/temporal-engine` matches
  `scripts/mcp/temporal-versioning.mjs` on a shared parity test
  (`createTemporalVersion`, `isTemporalVisible`, `compareTemporalOrder`,
  `nextVersion`); `domain/ids` mints ids using the same sha256-based scheme as
  `packages/govibe-core/src/vaults.mjs`.
- **Tests:** migration guard tests (drift, downgrade); entity-store CRUD and
  foreign-key tests; temporal-engine parity test; dependency-boundary test
  mirroring `scripts/mcp/runtime/dependency-boundaries.test.mjs` for the
  modules that exist at this phase.
- **Evidence:** merged `db/` and `domain/` modules with tests.
- **Governing work packet:** WP-12.
- **Not yet started.**

### TSK-PMR-02: Existing `msp_*` contract surface

- **Definition of Done:** every tool in the frozen surface (see the Backlog
  Items acceptance column) responds correctly against the real running
  process, matching the behavior already assumed by
  `packages/govibe-core/src/msp-client.mjs` and
  `scripts/mcp/msp-vault-context-contracts.mjs`; `msp_context_resolve`'s
  `shared_vault_refs` is always an empty array; `msp_context_replay`'s
  `execution_reproducible`/`output_identical` are always `false` with a
  diagnostic reason; `msp_knowledge_promote` and `msp_memory_promote`
  (`target_scope=shared`) always deny with `gks_provider_unconfigured`;
  `msp_memory_promote` (`target_scope=global_private`) is fully functional.
- **Tests:** contract-conformance tests against the real process for every
  listed tool, including negative tests for the fail-closed promotion paths.
- **Evidence:** merged `contracts/` handlers and their tests.
- **Governing work packet:** none yet — proposed after WP-12 closes.
- **Not yet started.**

### TSK-PMR-03: Hybrid retrieval

- **Definition of Done:** `retrieval/fts.mjs` performs FTS5 keyword search;
  `retrieval/vector.mjs` calls Ollama for `bge-m3` embeddings with a timeout
  and circuit breaker and never throws, returning `{available:false}` on
  failure; `retrieval/fusion.mjs` performs Reciprocal Rank Fusion with
  `k=60`; `retrieval/retrieval-service.mjs` performs exact-match short-
  circuit -> FTS -> vector-if-healthy -> RRF fuse, with an explicit
  `fts_only` mode; every `msp_memory_search` response reports `matched_by`,
  `layers_used`, and `vector_available`.
- **Tests:** unit tests per retrieval layer; an end-to-end hybrid search
  test; a graceful-degradation test that stops Ollama mid-test and asserts
  `searchMode` flips to `fts_only` in the next response.
- **Evidence:** merged `retrieval/` modules and their tests.
- **Governing work packet:** none yet — proposed after WP-12 closes.
- **Not yet started.**

### TSK-PMR-04: Temporal decay lifecycle

- **Definition of Done:** `domain/decay-engine` computes Ebbinghaus-style
  decay scores and drives `active -> decayed -> archived -> forgotten`
  transitions only when `msp_memory_decay_tick` is invoked (no in-process
  scheduler); `dry_run: true` computes without persisting.
- **Tests:** deterministic transition test under an injected clock covering
  every lifecycle edge; `dry_run` non-persistence assertion.
- **Evidence:** merged `domain/decay-engine` module and its test.
- **Governing work packet:** none yet — proposed after WP-12 closes.
- **Not yet started.**

### TSK-PMR-05: Links, GoVibe-side bridge, Mission Control Domain E

- **Definition of Done:** `domain/links` stores typed edges with flat CRUD
  only (no traversal); `scripts/mcp/msp-memory-contracts.mjs` mirrors
  `scripts/mcp/msp-vault-context-contracts.mjs`'s typed-client shape;
  `scripts/mcp/runtime/memory-service.mjs` matches the
  `{snapshotStore, mspClient}` constructor shape of `roadmap-service.mjs` /
  `workspace-service.mjs` and is wired into `scripts/mcp/runtime-core.mjs`
  (`GovibeRuntime` constructor) and
  `scripts/mcp/runtime/mission-command-router.mjs`
  (`memory.search`/`memory.select`/`memory.forget`/`memory.decay.run`
  branches); `packages/mission-protocol/index.js` gains `isMissionEvent`/
  `isMissionCommand` cases for `memory.snapshot`, `memory.entity.update`, and
  `memory.*` commands; `src/mission/domain.ts` gains Domain `"E"`, View ids
  `"E1"`/`"E2"`/`"E3"`, and `MemorySnapshot`/`MemoryEntityRecord`/
  `MemorySearchHit` types; `src/mission/navigation.ts` registers
  `missionDomains.E`; `src/app/RenderView.tsx` routes E1/E2/E3;
  `src/features/memory/{MemoryBrowserView,MemoryTemporalView,MemoryVaultPromotionView}.tsx`
  render an `EmptyState` when `snapshot.memory.entities.length === 0` and
  never fabricate rows, modeled on
  `src/features/context/ContextOperationsView.tsx` and
  `src/features/symbols/SymbolExplorerView.tsx`.
- **Tests:** `memory-service.test.mjs`; mission-protocol allow-list test
  additions for the new event/command types; snapshot-reducer test
  additions; component tests asserting the empty-state behavior.
- **Evidence:** merged bridge modules, mission-protocol additions, and
  Domain E views with their tests.
- **Governing work packet:** none yet — proposed after WP-12 closes.
- **Not yet started.**

## Acceptance Criteria

- Each phase in `docs/roadmap/ROADMAP-persistent-memory-runtime.md` has
  exactly one backlog task.
- Each task states a Definition of Done that names both tests and evidence.
- No task is marked `done` before its own phase's tests pass and are
  reviewed.
- TSK-PMR-02 through TSK-PMR-05 explicitly record that their governing work
  packet does not exist yet, so no work against them is implicitly
  authorized by this backlog alone.

## Success Criteria

| Metric | Target |
|---|---:|
| Roadmap phases with a matching backlog task | 100% |
| Tasks with tests and evidence named in their DoD | 100% |
| Tasks marked `done` without their phase's evidence | 0 |
| Tasks whose governing work packet is misstated as authorized | 0 |

## Definition of Done

- `npm run docs:validate` passes with this backlog present.
- The registry row matches this document's frontmatter version and status.
- Every dependency reference resolves to a task inside this document.
- No task advances past `planned` until `packages/msp-runtime` has a merged
  artifact backing the claim.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-04 | LYRA | Initial governed backlog for the six-phase persistent-memory MSP runtime plan, with per-task Definition of Done, tests, and evidence expectations; every task recorded as `planned` and not yet started, with only TSK-PMR-00/TSK-PMR-01 governed by an authorized work packet (WP-12). |
