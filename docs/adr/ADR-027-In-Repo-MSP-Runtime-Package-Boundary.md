---
doc_id: "ADR-027-IN-REPO-MSP-RUNTIME-PACKAGE-BOUNDARY"
title: "ADR-027: In-repo MSP runtime package boundary"
status: "accepted"
version: "0.2.0"
updated: "2026-08-05"
owner: "Boss (CEO)"
approval_owner: "Boss (CEO)"
approval_recorded_at: "2026-08-05"
source_of_truth: true
type: adr
amends: ["ADR-026"]
related_adrs: ["ADR-026", "ADR-020", "ADR-023", "ADR-025"]
related_docs:
  - "docs/adr/ADR-026-MSP-External-Runtime-Deployment.md"
  - "docs/adr/ADR-020-Per-Agent-Memory-Unit.md"
  - "docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md"
  - "docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md"
  - "docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md"
  - "docs/srs/SRS-Persistent-Memory-MSP-Runtime.md"
  - "docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md"
  - "docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
---

# ADR-027: In-repo MSP runtime package boundary

## Status

**Accepted 2026-08-05 by Boss (CEO).** This ADR amends
`docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`: it resolves ADR-026's
explicitly unresolved "MSP runtime repository, release/version, and deployment
supervisor" prerequisites for this one runtime instance. It does not rewrite
ADR-026's historical Decision text; ADR-026 keeps its own status and record,
and receives a Status/Consequences amendment note pointing here (see
"Amendment to ADR-026" below). Acceptance closes ADR-026's Required-follow-up
item "Owner approves or rejects this proposal and records the MSP runtime
location" (Issue #75) — see the matching update in
`docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`. This decision governs
the persistent-memory MSP runtime work sequenced in
`docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`.
Acceptance of this ADR does not itself authorize any specific work packet's
execution — each work packet (WP-12 through WP-17 and beyond) is authorized
separately per the governing CR's own gate.

## Context

ADR-026 fixed GoVibe's side of the MSP boundary — a single stdio parent
transport configured with `GOVIBE_MSP_COMMAND` / `GOVIBE_MSP_ARGS` /
`GOVIBE_MSP_CWD`, non-dispatchable until a real parent call succeeds, no
`GOVIBE_GKS_*` shortcut, no fallback to local storage — while explicitly
declining to name the MSP runtime's repository, release/version, deployment
supervisor, or credential mechanism. ADR-026 states plainly: "GoVibe ...
does not contain an MSP runtime" and lists those items as "explicit release
prerequisites" it does not claim exist.

`docs/adr/ADR-020-Per-Agent-Memory-Unit.md` separately decided the *shape* of
per-agent memory (tiered `T0`/`T1`/`T2` units, epistemic states, bitemporal
entries, Verify-Gate promotion, LCA conflict resolution) but likewise assumes
a persistence/retrieval backend exists without saying where that backend
lives or how it is deployed. Both ADRs therefore leave the same question
open: what process, in what repository, actually stores and serves this
memory across a restart?

Leaving that question open indefinitely blocks any real implementation of
ADR-020, and re-opening it ad hoc per feature risks exactly the failure mode
ADR-026 was written to prevent: a fixture, an in-process map, or an
unverified adapter being treated as if it were a persistent, restart-surviving
knowledge base. ADR-023 already draws a hard line between GKS knowledge
authority and MSP context authority; any runtime that blurs that line by
minting `gks:`-namespaced identity from inside the MSP process would violate
it. ADR-025 (if and when accepted) separately requires storage-backend
independence — the runtime's storage choice must not leak into GoVibe's own
process or become a hidden coupling.

This ADR selects an answer to ADR-026's open prerequisites for the specific
persistent-memory MSP runtime scoped by
`docs/srs/SRS-Persistent-Memory-MSP-Runtime.md`, without relitigating ADR-026's
external-process boundary or ADR-020's memory-unit shape. The architecture
decided here was made by the lead engineering session that authored the
governing CR; this ADR records that decision for owner review, it does not
originate it.

## Decision

**The MSP runtime's repository is this monorepo, as a standalone package
`packages/msp-runtime`, launched as a separate OS process — never imported as
a library into GoVibe's own server process.**

This resolves ADR-026's "repository not yet selected" prerequisite as
**in-repo, separate process**, and leaves ADR-026's core invariant untouched:

```text
Executor -> GoVibe MCP -> external MSP process -> GKS -> GenesisBlockDB
```

`packages/msp-runtime` *is* the "external MSP process" in that diagram. It is
external in the process-boundary sense ADR-026 requires (spawned via
`GOVIBE_MSP_COMMAND`/`GOVIBE_MSP_ARGS`, communicating only over the stdio
transport, no shared memory or direct function calls with GoVibe's server
process) even though its source lives in the same version-control repository
as GoVibe. Repository co-location is a build/release convenience; it does not
collapse the process boundary, and it does not authorize importing any
`packages/msp-runtime/**` module directly into GoVibe's own runtime code path.

### Scope of this decision

1. **Repository**: `packages/msp-runtime` in this monorepo. GoVibe's `npm
   run mcp:dev` / `mission:dev` entrypoints and the MCP server process do not
   depend on `packages/msp-runtime` at import time; the only sanctioned
   coupling is the `GOVIBE_MSP_COMMAND`/`GOVIBE_MSP_ARGS` process spawn
   defined by ADR-026.
2. **Process model**: a single composition root (`server.mjs`) spawned as a
   child process, speaking newline-delimited JSON-RPC 2.0 over stdio, matching
   the wire format `packages/govibe-core/src/msp-stdio-transport.mjs` already
   expects and that `packages/govibe-core/test/fixtures/reference-msp-server.mjs`
   already exercises. This is explicitly **not** the Content-Length/LSP framing
   used by `scripts/mcp/govibe-mcp-server.mjs`'s own inbound server; the two
   transports must not be conflated.
3. **Internal layering**: four strictly layered modules —
   `db/` (better-sqlite3, WAL, `pragma foreign_keys=ON`, migration runner),
   `domain/` (entity-store, temporal-engine, decay-engine, vault-registry,
   links, journal, state, ids, errors),
   `retrieval/` (FTS5, vector via Ollama, RRF fusion, retrieval-service),
   `contracts/` (typed request/response validators, fail-closed, enforcing
   `msp:*`/`gks:*` namespace rules) —
   with a dependency direction enforced by an automated test mirroring
   `scripts/mcp/runtime/dependency-boundaries.test.mjs`: `db <- domain <-
   retrieval`, `domain <- contracts`, `{db, domain, retrieval, contracts} <-
   transport`. `domain` never imports `retrieval` or `contracts`.
   `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` is the canonical
   design record for this layering; it is not repeated verbatim here.
4. **Storage**: a single SQLite file at `MSP_DB_PATH`. This is a concrete
   storage *choice*, not a claim of storage-backend independence — see
   "Relationship to ADR-025" below.
5. **What remains true from ADR-026, unchanged by this ADR**: the GoVibe-side
   parent transport is still a single stdio adapter; a valid transport
   configuration is still not a health result; a failed or missing parent
   still blocks governed operations rather than silently falling back to
   local storage; GKS/GenesisBlockDB references returned to GoVibe remain
   opaque; no `GOVIBE_GKS_*` configuration is added to GoVibe's runtime.
6. **What this ADR does not claim**: that the runtime implements a GKS
   provider, that shared-scope (`gks:`) knowledge promotion works, or that
   any capability listed as deferred in
   `docs/srs/SRS-Persistent-Memory-MSP-Runtime.md` §Explicit Exclusions
   exists. `msp_knowledge_promote` and `msp_memory_promote` with
   `target_scope=shared` remain fail-closed stubs that always deny with
   reason `gks_provider_unconfigured`, matching ADR-026's own refusal to
   claim a GKS provider exists. `msp_context_replay`'s
   `execution_reproducible`/`output_identical` fields remain hard-coded
   `false` with a diagnostic reason: the MSP runtime has no execution
   authority, and reporting `true` here would be exactly the "false evidence
   that knowledge survived a restart" ADR-026 was written to forbid.

### Relationship to ADR-020

This ADR implements the persistence/retrieval requirement ADR-020 assumes but
does not itself specify. `domain/temporal-engine` is a vendored port of the
bitemporal semantics already governed by `scripts/mcp/temporal-versioning.mjs`
(`createTemporalVersion`, `isTemporalVisible`, `compareTemporalOrder`,
`nextVersion`), so ADR-020's bitemporal entry fields (`valid_from`/`valid_to`,
`recorded_at`/`superseded_at`) have one canonical implementation instead of a
second, drifting one inside the runtime. This ADR does not decide ADR-020's
tiering (`T0`/`T1`/`T2`), 8-8-8 distillation cadence, or LCA conflict
resolution; those remain ADR-020's open implementation surface and are
explicitly deferred by the governing CR and SRS.

### Relationship to ADR-023

`contracts/` enforces the `msp:*`/`gks:*` namespace rule already codified in
`scripts/mcp/msp-vault-context-contracts.mjs`: the runtime never mints a
`gks:`-namespaced canonical id. `msp_context_resolve`'s
`shared_vault_refs` field is always an empty array in v1 because no GKS
provider exists to populate it — an empty array is the honest answer, not a
placeholder for one that will silently start returning fabricated `gks:`
references later without a separate, explicit decision.

### Relationship to ADR-025

If `docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md`
is accepted, its storage-backend-independence requirement applies to
GenesisBlockDB/GKS storage, not to this runtime's internal SQLite choice.
`packages/msp-runtime`'s SQLite file is this runtime's own private storage,
reachable only through its own `msp_memory_*`/`msp_*` tool surface — it is not
presented to GoVibe or to any other GoVibe subsystem as a swappable
GenesisBlockDB backend. A future GKS provider integration, if and when it
exists, is a separate decision and is explicitly out of scope here (see the
governing CR's exclusions).

## Service health states

The runtime reports its own operability through exactly one of four states.
This section defines the contract every `msp_*`/`msp_memory_*` caller can
rely on; it does not itself implement the reporting mechanism (see
"tracked by" below).

| State | Meaning | Permitted operations |
|---|---|---|
| `ready` | Storage and transport are both confirmed healthy. | All operations in this contract and API-009 are permitted. |
| `unavailable` | Storage (SQLite) or the stdio transport itself is down or unreachable. | None. Promotion, retrieval, and context resolution all refuse — every call returns a machine-actionable error code (e.g. `db_unavailable`, per API-009 §5) plus a user-visible `reason` string. The runtime never fabricates a success response to mask an unavailable dependency. |
| `degraded` | Storage and transport are healthy, but one or more optional capabilities are running in a reduced mode. | Operations backed by the degraded capability run in that reduced mode and must report it in-band (e.g. Phase-3 hybrid search falling back to `searchMode: "fts_only"` per API-009 §4.6). Promotion (`msp_memory_promote`, `msp_knowledge_promote`) is never permitted merely because the runtime is `ready`-for-writes while `degraded` elsewhere — promotion still requires full persistence evidence regardless of what else is degraded. Every degraded capability must be named explicitly in the status payload; degradation is never silent. |
| `blocked` | A policy or authorization boundary refuses the operation; this is not a storage or transport failure. | The specific blocked operation is refused with a machine-actionable code and reason; unrelated operations proceed normally. Example: `gks:`-namespace promotion (`msp_knowledge_promote`, `msp_memory_promote(target_scope=shared)`) is a **permanent v1 stub** — always `blocked` with reason `gks_provider_unconfigured` (API-009 §5), independent of storage/transport health, per this ADR's "What this ADR does not claim." |

Every response and every explicit status query surfaces a machine-actionable
`health_state` field carrying one of these four values, plus a user-visible
`reason` string explaining why a call was refused or degraded when it was not
`ready`. A valid transport configuration is not itself a health result (this
ADR's Decision, item 5, unchanged): `health_state` must reflect a real,
checked condition, not configuration presence.

Implementation of this contract (health checks, configuration validation,
and fail-closed status reporting for `packages/msp-runtime`'s transport and
storage layers) is tracked by GitHub issue #76 (MSP transport health,
configuration validation, fail-closed status). This ADR defines the
contract; it does not claim the implementation exists yet.

## Contract version and compatibility

The wire contract this ADR's runtime implements — the `msp_*`/`msp_memory_*`
request/response shapes, error codes, and the `health_state` reporting
contract defined above — is governed by
`docs/api/API-009-Persistent-Memory-Contract.md` (currently `0.1.1+draft`;
the frozen `msp_*` vault/context/promotion surface predating API-009 remains
governed by `docs/api/API-006-Vault-Context-and-Replay-Contracts.md`, per
API-009 §1). A breaking change to any request/response shape, error code, or
the health-state contract requires a version bump to API-009 plus a
Changelog row, following `docs/STD-Document-Versioning-Governance.md`; this
ADR's own `related_docs` includes API-009 so the two stay linked.

## Amendment to ADR-026

The following note is appended to `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`'s
Consequences section (ADR-026's own Decision text is not rewritten):

> **Amendment (ADR-027):** For the persistent-memory MSP runtime scoped by
> `docs/srs/SRS-Persistent-Memory-MSP-Runtime.md`, ADR-027 resolves this ADR's
> "MSP runtime repository ... not yet selected" finding: the repository is
> this monorepo (`packages/msp-runtime`), launched as a separate OS process
> per the diagram above. This does not change ADR-026's parent-child process
> boundary, fail-closed requirements, or its refusal to claim GKS/restart
> evidence that has not been proven by a real test. Other, future MSP-adjacent
> work is not automatically covered by this amendment; it would need its own
> decision record if it chooses a different repository or process model.

## Consequences

### Positive

- ADR-026's "unresolved prerequisite" blocker is answered for this runtime
  instance: implementation can proceed against a named package and a named
  wire contract instead of an indefinitely deferred external dependency.
- The existing stdio transport (`packages/govibe-core/src/msp-stdio-transport.mjs`)
  and its reference fixture can be exercised against a real, in-repo process
  instead of only a test double, closing part of the gap ADR-026 flagged
  under "Required follow-up" (#77).
- Monorepo co-location keeps the runtime's schema, contracts, and dependency
  boundaries under the same CI, code review, and documentation governance as
  the rest of GoVibe, rather than in an unaudited external dependency.
- The strict `db <- domain <- retrieval`/`contracts` layering, enforced by an
  automated boundary test, prevents the retrieval or contracts layers from
  reaching around the domain layer directly into storage.

### Negative

- Repository co-location can read as implying tighter coupling than actually
  exists; the process-boundary discipline (no library import, stdio-only)
  must be enforced by the dependency-boundary test and code review, not
  merely by convention.
- A single SQLite file at `MSP_DB_PATH` is a real single-point-of-failure and
  single-writer constraint; this ADR accepts that trade-off for v1 and does
  not specify a multi-writer or distributed storage path.
- Choosing "in-repo, separate process" now forecloses (without a further ADR)
  deploying this runtime as an independently versioned/released external
  service; that remains possible later but is not what this ADR authorizes.

### Neutral / Trade-offs

- This ADR is scoped to the persistent-memory MSP runtime only. It does not
  retroactively claim that every future MSP-shaped capability must live
  in-repo; a different runtime could make a different repository decision
  with its own ADR.
- Implementation is gated by the phased plan in the governing CR and WP-12;
  this ADR records the architecture decision, not that the phases are
  complete.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Leave ADR-026's runtime-repository question open and build against a fixture only | Repeats the exact anti-pattern ADR-026 was written to prevent: a fixture standing in for a persistent, restart-surviving knowledge base without a real test proving it. |
| Deploy the MSP runtime as a separate, independently released repository/service now | Adds real operational surface (separate release pipeline, separate versioning, separate deployment supervisor) with no current evidence it is needed; also directly contradicts nothing in ADR-026 but goes beyond what the lead decided for this vertical slice. Left as a future option, not adopted here. |
| Import `packages/msp-runtime` as a library into GoVibe's own server process | Violates ADR-026's parent-child process boundary outright; collapses the fail-closed transport boundary and risks the runtime's storage/retrieval failures taking down GoVibe's own process. |
| Let the runtime mint its own `gks:`-namespaced ids when no GKS provider is configured, to make `shared_vault_refs` non-empty | Violates ADR-023's knowledge/context authority boundary and reintroduces false evidence of shared-truth promotion that never actually happened. |

## Related Documents

- `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md`
- `docs/adr/ADR-020-Per-Agent-Memory-Unit.md`
- `docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md`
- `docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md`
- `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`
- `docs/srs/SRS-Persistent-Memory-MSP-Runtime.md`
- `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md`
- `docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md`
- `docs/api/API-009-Persistent-Memory-Contract.md`

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-05 | Boss (CEO) | **Accepted.** `status: proposed -> accepted`. Closes ADR-026's Required-follow-up item "Owner approves or rejects this proposal and records the MSP runtime location" (Issue #75). Recorded `approval_owner`/`approval_recorded_at`. Acceptance covers the architecture decision only; it does not itself authorize any specific work packet's execution — WP-12 and WP-13 were already independently authorized/executed/verified before this acceptance landed (see their own Execution closure sections), and WP-14 onward remain gated by the CR's own per-packet authorization step. |
| 0.1.1+draft | 2026-08-05 | Boss (CEO) / Claude (final-gate session) | Added two required sections (issue #75 acceptance criteria): "Service health states" (the `ready`/`unavailable`/`degraded`/`blocked` four-state contract, per-state permitted-operations table, `health_state` and `reason` fields; implementation tracked by issue #76, not claimed here) and "Contract version and compatibility" (the wire contract is governed by API-009, currently `0.1.1+draft`; breaking changes require an API-009 version bump plus Changelog row). Added `docs/api/API-009-Persistent-Memory-Contract.md` to `related_docs`. `status` remains `proposed`; not an owner acceptance of this ADR. |
| 0.1.0+draft | 2026-08-04 | Claude (final-gate session) | Proposed resolving ADR-026's unresolved MSP runtime repository/process prerequisite as in-repo `packages/msp-runtime`, spawned as a separate OS process; recorded relationship to ADR-020 (memory-unit shape), ADR-023 (knowledge/context authority boundary, no `gks:` minting), and ADR-025 (storage-backend independence scope); recorded the ADR-026 amendment note. Status remains proposed pending owner acceptance. |
