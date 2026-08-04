---
title: "SRS: Persistent-Memory MSP Runtime"
doc_id: "SRS-PERSISTENT-MEMORY-MSP-RUNTIME"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-04"
owner: "Boss (CEO)"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
  - "docs/adr/ADR-026-MSP-External-Runtime-Deployment.md"
  - "docs/adr/ADR-020-Per-Agent-Memory-Unit.md"
  - "docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md"
  - "docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md"
  - "docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
  - "docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md"
---

# SRS: Persistent-Memory MSP Runtime

## 1. Introduction

This SRS defines the software requirements for `packages/msp-runtime`, the
in-repo, separate-process MSP runtime decided in
`docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md`. It implements the
persistence/retrieval requirement `docs/adr/ADR-020-Per-Agent-Memory-Unit.md`
assumes, within the process boundary `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`
fixed. It is the requirements source for
`docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` (design) and
`docs/api/API-009-Persistent-Memory-Contract.md` (wire contract). This
document records requirements only; it does not authorize implementation
beyond what `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`
and its work packets separately authorize.

**Definitions:**

- **MSP** — the memory/context service process this repository spawns as a
  child process per ADR-026.
- **Entity** — a `vault_id`-scoped, `(category, key)`-unique record with a
  bi-temporal history, stored in `entities` with its full version ledger in
  `entity_history`.
- **Epistemic state** — one of `hypothesis`, `confirmed`, `contested`,
  `deprecated`, carried on every entity.
- **Lifecycle state** — one of `active`, `decayed`, `archived`, `forgotten`,
  driven by the decay engine.

## 2. Product/System Context

- PRD system: `SYSTEM-05::Agent-Team-Management-System`
- Primary users: GoVibe MCP tool callers (agents, Mission Control operators
  through `govibe.memory.*`), and the runtime's own operators (via
  `docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md`).
- External dependencies: `better-sqlite3` (storage), Ollama HTTP endpoint at
  `localhost:11434` serving the `bge-m3` embedding model (optional — vector
  search degrades gracefully if unreachable), the newline-delimited JSON-RPC
  2.0 stdio transport already expected by
  `packages/govibe-core/src/msp-stdio-transport.mjs`.

## 3. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-001 | The runtime starts as a child process spawned via `GOVIBE_MSP_COMMAND`/`GOVIBE_MSP_ARGS` and communicates only over newline-delimited JSON-RPC 2.0 stdio, one JSON object per line. | MUST | A real-process test using `createMspStdioCaller` completes at least one round trip; the wire format is never Content-Length/LSP-framed. |
| FR-002 | The runtime persists all entity, history, embedding, journal, and state data in a single SQLite file at `MSP_DB_PATH`, in WAL mode with `pragma foreign_keys=ON`. | MUST | A restart against the same `MSP_DB_PATH` returns previously stored entities unchanged; a foreign-key violation is rejected, not silently accepted. |
| FR-003 | Schema changes apply through a migration runner tracked in a `schema_migrations` table, with a checksum-drift guard and a downgrade guard. | MUST | Applying a modified already-applied migration file fails closed; applying a lower schema version than currently recorded fails closed. |
| FR-004 | `domain/temporal-engine` implements bitemporal versioning (`valid_from`/`valid_to`, `recorded_at`/`superseded_at`) equivalent to `scripts/mcp/temporal-versioning.mjs`. | MUST | A parity test asserts equivalent `createTemporalVersion`/`isTemporalVisible`/`compareTemporalOrder`/`nextVersion` behavior on shared inputs. |
| FR-005 | `msp_memory_upsert` creates or updates an entity, incrementing `current_version` and recording an immutable `entity_history` row. | MUST | Two sequential upserts to the same `(vault_id, category, key)` produce two `entity_history` rows and one current `entities` row. |
| FR-006 | `msp_memory_get` supports bitemporal point reads via `as_of_valid_at` and `as_of_recorded_at`. | MUST | A point read at a timestamp before a later supersession returns the entity state valid at that point, not the current state. |
| FR-007 | `msp_memory_list` returns a paginated, vault-scoped entity listing. | MUST | Pagination parameters bound the returned page; no unbounded full-table scan is exposed to a caller. |
| FR-008 | `msp_memory_history` returns the full bi-temporal version ledger for one entity. | MUST | Every `entity_history` row for the entity is returned in version order. |
| FR-009 | `msp_memory_forget` performs a soft delete only, setting `lifecycle_state=forgotten`; it never issues a hard `DELETE` against `entities` or `entity_history`. | MUST | After `msp_memory_forget`, the entity row still exists with `lifecycle_state=forgotten`; `entity_history` is untouched; a direct `DELETE` code path does not exist for these tables outside migrations. |
| FR-010 | `msp_memory_search` performs hybrid retrieval: exact-match short-circuit, then FTS5, then vector search if the embedding backend is healthy, fused by Reciprocal Rank Fusion (`k=60`); an explicit `fts_only` mode bypasses vector search. | MUST | Each hit reports `matched_by`, and the response reports `layers_used` and `vector_available`. |
| FR-011 | `msp_memory_search` never throws or blocks on a vector-backend failure; it returns FTS-only results and reports degraded state instead. | MUST | Stopping Ollama mid-test causes `searchMode` to flip to `fts_only` in the next search response, observably, not silently. |
| FR-012 | `msp_memory_decay_tick` applies Ebbinghaus-style decay scoring and advances lifecycle state (`active -> decayed -> archived -> forgotten`) only when invoked by a caller or external cron; it never self-schedules. | MUST | No background timer exists inside the runtime process; `dry_run=true` computes but does not persist lifecycle transitions. |
| FR-013 | `domain/links` stores typed entity-graph edges with table storage and flat CRUD (`msp_memory_links_list`, `msp_memory_links_create`) only; no traversal query is exposed in v1. | MUST | No API-009 endpoint accepts a traversal depth or path-query parameter. |
| FR-014 | The existing frozen `msp_*` tool surface (`msp_workspace_register`, `msp_context_resolve`, `msp_context_injection_record`, `msp_context_replay`, `msp_context_diff`, `msp_context_audit`, `msp_vault_status`, `msp_vault_mount`, `msp_evidence_record`) is implemented as already called by `packages/govibe-core/src/msp-client.mjs` and `scripts/mcp/msp-vault-context-contracts.mjs`. | MUST | Contract-conformance tests run against the real running process pass for each of these tools. |
| FR-015 | `msp_context_resolve`'s `shared_vault_refs` field is always an empty array in v1; the runtime never mints a `gks:`-namespaced canonical id. | MUST | No code path constructs a `gks:`-prefixed identifier; a static/contract test asserts this. |
| FR-016 | `msp_context_replay`'s `context_reproducible` field reflects a real hash check; `execution_reproducible` and `output_identical` are always `false`, accompanied by a diagnostic reason stating the runtime has no execution authority. | MUST | No test or code path can make `execution_reproducible`/`output_identical` return `true`. |
| FR-017 | `msp_knowledge_promote` and `msp_memory_promote` with `target_scope=shared` always deny with reason `gks_provider_unconfigured`; `msp_memory_promote` with `target_scope=global_private` is fully implemented. | MUST | Every shared-scope promotion call is denied with that exact reason string; a global-private promotion call succeeds when preconditions are met. |
| FR-018 | `contracts/` validates every request/response in a fail-closed style mirroring `scripts/mcp/context-authority-contract.mjs`, and enforces the `msp:*`/`gks:*` namespace rules from `scripts/mcp/msp-vault-context-contracts.mjs`. | MUST | A malformed or namespace-violating request is rejected before reaching `domain/`. |
| FR-019 | GoVibe exposes the new tools as `govibe.memory.*` MCP tools via `scripts/mcp/memory-surface.mjs`, matching the Pattern A/B hybrid shape of `scripts/mcp/vault-context-surface-v2.mjs`; `govibe.memory.promote` is reused, not duplicated. | MUST | `scripts/mcp/memory-surface.mjs` does not redefine a tool that already exists under a different name in the registry. |
| FR-020 | `packages/mission-protocol/index.js` recognizes `memory.snapshot`/`memory.entity.update` as valid mission events and `memory.*` as valid mission commands. | MUST | Without this addition, memory events are silently dropped (logged warning, no error) at the wire-level security boundary enforced by both `sidecar-server.mjs` and the browser gateway; the requirement is that this addition exists so they are not. |
| FR-021 | Mission Control exposes Domain E (Memory) with three sub-modules (E1 Memory Browser, E2 Temporal & Decay, E3 Vault & Promotion), rendering an explicit empty state when `snapshot.memory.entities.length === 0` rather than fabricating rows. | MUST | E1/E2/E3 render without data and never display invented entity rows. |

## 4. Acceptance Criteria

- Every functional requirement above has at least one automated test
  (`vitest` `*.test.mjs`, or `node --test` `*.security.mjs` where the
  requirement is security-relevant).
- The internal dependency direction (`db <- domain <- retrieval`, `domain <-
  contracts`, `{db, domain, retrieval, contracts} <- transport`, `domain`
  never imports `retrieval` or `contracts`) is enforced by an automated test
  mirroring `scripts/mcp/runtime/dependency-boundaries.test.mjs`.
- No requirement in this document is satisfied by a fixture standing in for
  the real process once the corresponding phase (see the governing CR) has
  landed; fixtures remain acceptable only for phases not yet built.
- `node scripts/docs/validate-docs.mjs` passes with this document present.

## 5. Success Criteria

- The runtime survives a process restart against the same `MSP_DB_PATH` with
  no data loss for `active` and `decayed` entities.
- A caller can distinguish "no search results" from "vector search
  unavailable, FTS-only results returned" without inspecting logs — the
  distinction is a response field (`searchMode`/`vector_available`), not a
  side channel.
- No document, log line, or API response ever claims
  `execution_reproducible: true` or fabricates a `gks:` reference.
- Mission Control Domain E never displays fabricated memory data when no
  runtime is connected.

## 6. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-001 | Fail-closed behavior | Every contract validator and every promotion/authority check rejects on ambiguous or missing input rather than defaulting to allow. |
| NFR-002 | No false restart-survival claims | `msp_context_replay` never reports `execution_reproducible`/`output_identical` as `true`; this is a hard-coded, test-enforced invariant, not a default that could silently flip. |
| NFR-003 | Observable graceful degradation | Vector-backend unavailability is surfaced in every affected `msp_memory_search` response (`vector_available: false`, `searchMode: "fts_only"`), never only in a log line. |
| NFR-004 | Transport isolation | The stdio JSON-RPC transport and the Content-Length/LSP transport used by `scripts/mcp/govibe-mcp-server.mjs` share no framing code path. |
| NFR-005 | Storage locality | All persistent state lives in one SQLite file at `MSP_DB_PATH`; no other persistent storage location is introduced without a separate ADR. |
| NFR-006 | Namespace integrity | No code path in `packages/msp-runtime` constructs a `gks:`-prefixed identifier. |
| NFR-007 | No self-scheduling | `msp_memory_decay_tick` runs only when invoked; no in-process timer or scheduler exists. |
| NFR-008 | Path-argument minimization | No `msp_*`/`msp_memory_*` tool accepts a filesystem-path argument; the only path-shaped configuration is the launch-time `MSP_DB_PATH`. |

## 7. Data Requirements

- Inputs: `msp_memory_upsert` payloads (`category`, `key`, `body_json`,
  `epistemic_state`, `confidence`, vault scope), search queries, decay-tick
  invocations, context resolution requests.
- Outputs: entity records (current-state and historical), search hits with
  provenance (`matched_by`, `layers_used`, `vector_available`), audit/replay
  records, vault status.
- Persistence: SQLite at `MSP_DB_PATH` — tables `vaults`, `vault_mounts`,
  `entities`, `entity_history`, `embeddings`, `entities_fts`, `journal`,
  `state`, `links`, `schema_migrations`, as detailed in
  `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §5.

## 8. Interface Requirements

- UI: Mission Control Domain E (Memory Browser, Temporal & Decay, Vault &
  Promotion), read-only against `snapshot.memory.*` in this v1.
- API/MCP: the full `msp_*`/`msp_memory_*` wire contract in
  `docs/api/API-009-Persistent-Memory-Contract.md`, plus the GoVibe-side
  `govibe.memory.*` MCP surface.
- File/document: none — no tool accepts a filesystem-path argument beyond the
  single launch-time `MSP_DB_PATH` environment value.

## 9. Security and Governance Requirements

- RBAC: not introduced by this runtime beyond the existing fixed
  allow/deny/shadow policy function; a full ACL/RBAC engine is an explicit,
  documented exclusion, not an implicit allow-everything default.
- ABAC: vault-scoped access (Shared / Workspace-Private / Global-Private per
  `docs/architecture/ARCH-Vault-and-Context-Model.md`) is enforced by
  `domain/vault-registry` before any entity read/write is permitted.
- Audit: every mutating call is recorded in the append-only `journal` table,
  immutability enforced by `BEFORE UPDATE`/`BEFORE DELETE` triggers that
  `RAISE(ABORT)`.

## 10. Traceability Matrix

| Requirement | PRD Goal/System | Design Doc | Test Evidence |
|---|---|---|---|
| FR-001, FR-002, FR-003 | SYSTEM-05, `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` | `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §3-4 | Phase 0/1 tests under `docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md` |
| FR-004 | `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` | `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §3 | temporal-engine parity test (WP-12) |
| FR-005 through FR-013 | SYSTEM-05, `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md` | `docs/api/API-009-Persistent-Memory-Contract.md` | Phase 3/4/5 tests (future work packets) |
| FR-014 through FR-018 | `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`, `docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md` | `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` §6-7 | Phase 2 contract-conformance tests (future work packet) |
| FR-019, FR-020 | SYSTEM-06::Integration-Bridge-System | `docs/lld/LLD-GoVibe-MCP-Tools.md` | Phase 5 mission-protocol allow-list test additions (future work packet) |
| FR-021 | SYSTEM-01::Mission-Control-Dashboard-System | `docs/design/SITE_MAP.md`, `docs/design/DOMAIN_DETAILS.md` | Phase 5 snapshot-reducer test additions (future work packet) |

## 11. Definition of Done

- This SRS, ADR-027, `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md`,
  and `docs/api/API-009-Persistent-Memory-Contract.md` are registered in
  `docs/DOC-VERSION-REGISTRY.md`.
- `npm run docs:validate` passes with this document present.
- Every functional requirement above is either implemented with passing
  tests, or explicitly deferred by the governing CR's exclusions list — no
  requirement is left silently unaddressed.

## 12. Open Questions

- When a real GKS provider is eventually integrated, does `msp_context_resolve`
  gain a new response shape, or does `shared_vault_refs` simply start being
  populated under the existing schema? Deferred to that future decision.
- Should `msp_memory_decay_tick` eventually gain an opt-in scheduling mode, or
  should scheduling remain permanently external? Deferred; v1 is caller/cron-
  triggered only.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-04 | Claude (final-gate session) | Initial requirements for the persistent-memory MSP runtime: 21 functional requirements covering transport, storage, temporal engine, the new `msp_memory_*` surface, the frozen existing `msp_*` surface, the GoVibe-side bridge, and Mission Control Domain E; 8 non-functional requirements covering fail-closed behavior, no false restart-survival claims, and observable degradation; full traceability matrix to ADR-027, the governing CR, FEAT-Per-Agent-Memory-Unit, and API-009. |
