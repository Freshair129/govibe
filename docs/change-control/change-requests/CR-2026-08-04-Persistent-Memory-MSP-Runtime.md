---
title: "CR: Persistent-Memory MSP Runtime"
doc_id: "CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME"
status: "draft"
version: "0.2.1+draft"
updated: "2026-08-05"
owner: "Boss (CEO)"
source_of_truth: true
proposal_author: "Claude (final-gate session)"
decision_owner: "Boss (CEO)"
approval_owner: "Boss (CEO)"
approval_recorded_at: ""
decision_authorized: false
execution_authorized: false
execution_complete: false
promotion_authorized: false
complexity: "C-4"
access_scope: "H3"
risk: "HIGH"
baseline_commit: ""
parent_change_request: "none"
related_adrs: ["ADR-027", "ADR-020", "ADR-023", "ADR-026"]
related_apis: ["API-009"]
proposed_work_packets: ["WP-12"]
---

# CR: Persistent-Memory MSP Runtime

## Context

`docs/adr/ADR-026-MSP-External-Runtime-Deployment.md` fixed GoVibe's side of
the MSP boundary (a single stdio parent transport, fail-closed, no local
fallback) but left the MSP runtime's own repository, release mechanism, and
deployment supervisor as explicit, unresolved release prerequisites.
`docs/adr/ADR-020-Per-Agent-Memory-Unit.md` separately decided the shape of
per-agent memory (tiered units, epistemic states, bitemporal entries,
Verify-Gate promotion, LCA conflict resolution) but assumes a
persistence/retrieval backend that does not yet exist.

This CR is the governance record for the architecture the lead engineering
session already decided: build the persistent-memory MSP runtime in-repo as
`packages/msp-runtime`, formalized as `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md`,
implementing the requirements captured in
`docs/srs/SRS-Persistent-Memory-MSP-Runtime.md` and
`docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md`, and exposed to
callers through `docs/api/API-009-Persistent-Memory-Contract.md`. This
document does not relitigate that architecture; it records it for owner
review, sequences the work, and states exactly what remains excluded from
this vertical slice.

This is a large, multi-week feature (four internal runtime layers, a new
SQLite schema, a hybrid FTS5/vector retrieval stack, a bitemporal
decay/lifecycle engine, a frozen existing MCP tool surface plus new
`msp_memory_*` tools, a GoVibe-side bridge, and a new Mission Control Domain
E), not a small refinement. It is scoped and phased accordingly.

## Decision Requested

Approve, for planning purposes only, the persistent-memory MSP runtime
architecture recorded in ADR-027/SRS/SDD/API-009 and the phased delivery plan
below, and authorize `docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md`
(Phase 0 transport parity + Phase 1 storage foundation only) as the first
execution-authorized slice. This CR itself does not request execution
authorization beyond WP-12; later phases (Phase 2 through Phase 5) each get
their own work packet, proposed and authorized only after the prior phase
closes with reviewed evidence. No runtime, code, or MCP-tool-facing change is
made by this CR — it is documentation-governance and planning only.

## Scope & Bounded Changes

This CR governs the full persistent-memory MSP runtime described in ADR-027,
delivered across the following phases (each independently testable; `vitest`
for `*.test.mjs`, `node --test` for `*.security.mjs` per repository
convention):

1. **Phase 0 — package scaffold + transport parity.** `packages/msp-runtime`
   composition root and a newline-delimited JSON-RPC 2.0 stdio server
   matching `packages/govibe-core/src/msp-stdio-transport.mjs`'s expected wire
   format, verified against both the existing
   `packages/govibe-core/test/fixtures/reference-msp-server.mjs` and a real
   child process exercised through `createMspStdioCaller`.
2. **Phase 1 — storage foundation.** `db/` (better-sqlite3, WAL,
   `pragma foreign_keys=ON`, migration runner with a `schema_migrations`
   table, checksum-drift guard, downgrade guard) and `domain/entity-store` +
   `domain/temporal-engine` (a vendored port of
   `scripts/mcp/temporal-versioning.mjs` semantics), with a parity test
   against that source module.
3. **Phase 2 — existing `msp_*` contract surface.** Vault registry, context
   tools (`msp_workspace_register`, `msp_context_resolve`,
   `msp_context_injection_record`, `msp_context_replay`, `msp_context_diff`,
   `msp_context_audit`, `msp_vault_status`, `msp_vault_mount`,
   `msp_evidence_record`), and promotion tools (`msp_knowledge_promote`,
   `msp_memory_promote`), implemented as already frozen by
   `packages/govibe-core/src/msp-client.mjs` and
   `scripts/mcp/msp-vault-context-contracts.mjs` — contract-conformance
   tests run against the real running process, not only fixtures.
4. **Phase 3 — hybrid retrieval.** `retrieval/fts.mjs` (FTS5 keyword),
   `retrieval/vector.mjs` (bge-m3 via Ollama HTTP `localhost:11434`,
   1024-dim, timeout + circuit breaker, never throws), `retrieval/fusion.mjs`
   (Reciprocal Rank Fusion, `k=60`), and `retrieval/retrieval-service.mjs`
   (façade: exact-match short-circuit -> FTS -> vector if healthy -> RRF
   fuse; explicit `fts_only` mode). Includes a graceful-degradation test that
   stops Ollama mid-test and asserts `searchMode` flips to `fts_only`.
5. **Phase 4 — temporal + decay lifecycle.** Ebbinghaus decay scoring and the
   `active -> decayed -> archived -> forgotten` lifecycle, deterministic
   under an injected clock, with a full transition test.
6. **Phase 5 — links + GoVibe-side bridge + Domain E dashboard.**
   `domain/links` (typed graph edges, table + flat CRUD only, no traversal in
   v1), `scripts/mcp/msp-memory-contracts.mjs`,
   `scripts/mcp/runtime/memory-service.mjs`, wiring into
   `scripts/mcp/runtime-core.mjs` and
   `scripts/mcp/runtime/mission-command-router.mjs`, the
   `isMissionEvent`/`isMissionCommand` allow-list additions in
   `packages/mission-protocol/index.js` for `memory.snapshot`,
   `memory.entity.update`, and `memory.*` commands, and new Mission Control
   Domain E (Memory) views.

`docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md`
is the only work packet this CR proposes and authorizes review of right now,
scoped to Phase 0 + Phase 1 — the foundational, highest-risk-if-wrong phases
(wire-framing mismatch risk, schema/migration correctness). Phases 2 through
5 each receive their own work packet (not yet written) once WP-12 closes with
reviewed evidence; this CR records that sequencing but does not pre-author or
pre-authorize WP-13 through WP-17.

### Work packet index (added 2026-08-05)

The sequencing above has since been realized. This table is the entry point
for any session picking up this feature:

| Packet (under `work-packets/`) | Covers | State |
|---|---|---|
| `WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md` | Phase 0 (transport parity) + Phase 1 (storage foundation) | Execution complete, independently verified |
| `WP-13-Persistent-Memory-MSP-Runtime-Phase-2.md` | Phase 2 (the eleven existing `msp_*` contract tools) | Execution complete, independently verified; a HIGH-severity technical deviation found at its gate review is remediated by WP-14 |
| `WP-14-Vault-Scoping-Msp-Runtime-Entities.md` | Unplanned remediation: `entities.vault_id`, vault-scoped uniqueness, `vault_scope_denied` enforcement — closes a confirmed cross-agent Global-Private disclosure | Execution complete, independently verified |
| `WP-15-Persistent-Memory-MSP-Runtime-Phase-3.md` | Phase 3 (hybrid retrieval) **plus** API-009 §4.1-4.6 entity CRUD and search — see that packet's recorded scope decision amending a forward guess in WP-13 | Proposed, **not authorized** |
| `WP-16-Persistent-Memory-MSP-Runtime-Phase-4.md` | Phase 4 (Ebbinghaus decay lifecycle, caller-triggered only) | Proposed, **not authorized** |
| `WP-17-Persistent-Memory-MSP-Runtime-Phase-5-Stage-A.md` | Phase 5 **Stage A** — data only: runtime links, the GoVibe-side bridge (typed client, memory-service, command routing, `govibe.memory.*` tools), the mission-protocol allow-list, and the `MissionSnapshot` memory slice with its reducer wiring. No UI. | Proposed, **not authorized** |
| `WP-18-Persistent-Memory-MSP-Runtime-Phase-5-Stage-B.md` | Phase 5 **Stage B** — presentation only: Mission Control Domain E registration, views under `src/features/memory/`, styling, and reconciling SITE_MAP / DOMAIN_DETAILS from planned to delivered. Consumes Stage A's snapshot slice; adds no data path. | Proposed, **not authorized** |

Two process points a resuming session must honor, both learned in this series
and restated inside the packets themselves:

1. **Authorization precedes execution.** WP-13's gate review found that its
   implementing session executed first and then set its own
   `execution_authorized` / `execution_complete` flags. WP-14 corrected the
   sequence; WP-15 through WP-17 each restate the rule. An executing session
   must never set its own authorization flags — owner authorization goes into
   the packet's frontmatter *before* implementation is dispatched.
2. **Packet number is not phase number.** WP-14 was spent on unplanned
   security remediation and Phase 5 was split across WP-17 and WP-18, so the
   two diverged in both directions. Read each packet's title and
   `depends_on`, not its number.

## Explicit Exclusions

This CR does not authorize, and no work packet under it may claim, any of the
following (also recorded as exclusions in the SRS and as scope notes in
ADR-027):

- A real GKS provider for shared-scope promotion. `msp_knowledge_promote` and
  `msp_memory_promote` with `target_scope=shared` remain fail-closed stubs
  that always deny with reason `gks_provider_unconfigured`.
- LCA (Latched Contextual Anchor) conflict resolution from ADR-020.
- The 8-8-8 Memory Distillation cadence from ADR-020.
- `T0`/`T1`/`T2` per-agent memory tiering from ADR-020.
- Graph traversal or backlink materialization for `domain/links` — v1 ships
  table storage and flat CRUD only.
- Impact-engine integration.
- An ACL/RBAC policy engine beyond the fixed allow/deny/shadow function
  documented as an honest gap, not a fake allow-everything default.
- Background cron scheduling for `msp_memory_decay_tick` — it is
  caller/cron-triggered from outside the runtime, never self-scheduling.
- Bulk import/export, webhooks, or an admin console.
- Any filesystem-path tool argument anywhere in the `msp_*`/`msp_memory_*`
  surface, beyond the single launch-time `MSP_DB_PATH`.
- Any code, `.mjs`, `.ts`, or `.tsx` change. This CR and its currently
  authorized work packet (WP-12) are documentation-governance and planning
  only; the architecture is implemented in a later, separate execution pass
  against WP-12 and its successors.
- Any status promotion beyond `draft`/`proposed` for any document this CR
  governs. Acceptance of ADR-027, approval of this CR, and authorization of
  each work packet remain the named owners' calls (Boss (CEO) for the CR/ADR,
  LYRA for roadmap promotion), not something this CR or its author can grant
  itself.

Perseus Vault's broader tool inspiration (55+ tools) is deliberately not
ported in full. Specifically excluded and why:

- No graph traversal or community detection — GoVibe already has a separate,
  bounded graph-query mechanism at the context layer; duplicating it inside
  the memory runtime would create two divergent graph engines.
- No multi-tenant ACL/RBAC — the fixed allow/deny/shadow policy function is
  an honest, documented gap for v1, not a fake allow-everything policy
  dressed up as security.
- No historical-version embedding or search — v1 is current-state-only;
  historical entity_history rows are retrievable by bitemporal point read,
  not by full-text or vector search.
- No filesystem-path tool arguments anywhere in the surface — this shrinks
  the path-traversal attack surface to the single launch-time `MSP_DB_PATH`
  configuration value.

## Acceptance Criteria

- AC-01: `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` exists,
  status `proposed`, explicitly amends ADR-026, and cross-references ADR-020,
  ADR-023, and ADR-025.
- AC-02: `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md` carries an
  amendment note in its Consequences section pointing to ADR-027, a version
  bump, and a Changelog row, with its own historical Decision text unchanged.
- AC-03: `docs/srs/SRS-Persistent-Memory-MSP-Runtime.md`,
  `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md`, and
  `docs/api/API-009-Persistent-Memory-Contract.md` exist, are internally
  consistent with ADR-027 and with each other, and are registered in
  `docs/DOC-VERSION-REGISTRY.md`.
- AC-04: `docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md`
  exists and covers process start/stop, configuration, degraded-search
  detection, manual decay-tick operation, backup guidance, and explicit
  "never do this" operator guidance.
- AC-05: `docs/roadmap/ROADMAP-persistent-memory-runtime.md` and
  `docs/roadmap/BACKLOG-persistent-memory-runtime.md` exist, `owner: LYRA`,
  `status: draft`, and pass the roadmap temporal-integrity and promotion-
  contract rules in `scripts/docs/validate-docs.mjs`.
- AC-06: `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md` is updated
  (not duplicated) to point at ADR-027/`packages/msp-runtime` as the concrete
  persistence/retrieval realization, with all of its existing Acceptance
  Criteria, Success Criteria, and Definition of Done content preserved.
- AC-07: `docs/lld/LLD-GoVibe-MCP-Tools.md` is updated (not duplicated) with
  entries for every new `govibe.memory.*` and `msp_memory_*` tool, following
  its existing table/entry format.
- AC-08: `docs/design/SITE_MAP.md` and `docs/design/DOMAIN_DETAILS.md` are
  updated with Domain E (Memory) and its three sub-modules, following each
  file's existing entry/verification-matrix format, with version bumps and
  Changelog rows.
- AC-09: `docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md`
  exists, scoped to Phase 0 + Phase 1 only, and states that Phase 2 through
  Phase 5 get their own future work packets rather than being pre-authored.
- AC-10: every new document set `status` to `draft` or `proposed` only; none
  is set to `approved`, `accepted`, or `candidate` by this CR or its author.
- AC-11: `node scripts/docs/validate-docs.mjs` exits 0 (errors: 0) after this
  CR's changes.
- AC-12: no `.mjs`, `.ts`, or `.tsx` file is created or modified by this CR.

## Rollback

Every change under this CR is a Markdown addition or a bounded Markdown edit
to an existing governed document (ADR-026, FEAT-Per-Agent-Memory-Unit,
LLD-GoVibe-MCP-Tools, SITE_MAP, DOMAIN_DETAILS, DOC-VERSION-REGISTRY). There
is no runtime or code behavior to roll back because none was changed.

- Revert this CR's commit(s) to remove every new document
  (`ADR-027`, this CR, `WP-12`, `SRS-`, `SDD-`, `API-009`, the runbook, the
  roadmap and backlog).
- Revert the amendment note, version bump, and Changelog row added to
  `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`.
- Revert the added subsection and version bump in
  `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md`, confirming its
  pre-existing Acceptance/Success/Definition-of-Done sections are restored
  unchanged.
- Revert the added tool entries and version bump in
  `docs/lld/LLD-GoVibe-MCP-Tools.md`.
- Revert the Domain E additions and version bumps in
  `docs/design/SITE_MAP.md` and `docs/design/DOMAIN_DETAILS.md`.
- Remove the new document rows and revert the touched-document version rows
  in `docs/DOC-VERSION-REGISTRY.md`.
- Re-run `node scripts/docs/validate-docs.mjs` after any rollback step to
  confirm it still exits 0.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.1+draft | 2026-08-05 | Boss (CEO) | Recorded the owner-directed split of Phase 5 into WP-17 (Stage A, data: links, bridge, protocol, snapshot slice) and WP-18 (Stage B, presentation: Mission Control Domain E). Work packet index updated accordingly; the combined Phase 5 packet authored earlier the same day was removed, having never been authorized or executed. This row records the split only; it authorizes nothing. |
| 0.2.0+draft | 2026-08-05 | Claude (final-gate session) | Added a Work packet index recording every packet under this CR and its real state: WP-12, WP-13, and WP-14 execution-complete and independently verified; WP-15, WP-16, and WP-17 proposed and awaiting owner authorization. Recorded the two process points a resuming session must honor (authorization precedes execution — the correction WP-14 made after WP-13's gate review; and packet number no longer equals phase number after WP-14 was spent on unplanned security remediation). This row records sequencing and state only; it authorizes nothing. |
| 0.1.0+draft | 2026-08-04 | Claude (final-gate session) | Initial governance record for the persistent-memory MSP runtime: recorded the lead-decided architecture (ADR-027), scoped the six-phase delivery plan, authorized WP-12 (Phase 0 + Phase 1 only) as the first reviewable work packet, and recorded explicit exclusions including the cut Perseus Vault surface (graph traversal, multi-tenant ACL/RBAC, historical-version search, filesystem-path tool arguments). |
