---
doc_id: "ADR-028-BOUNDED-GKS-PROVIDER-VERTICAL-SLICE"
title: "ADR-028: Bounded GKS Provider Vertical Slice"
status: proposed
version: "0.1.0+draft"
updated: "2026-08-15"
owner: "Boss / Engineering"
source_of_truth: true
type: adr
related_issues: [74, 77, 78]
related_adrs:
  - "ADR-023"
  - "ADR-025"
  - "ADR-027"
---

# ADR-028: Bounded GKS Provider Vertical Slice

## Status

**Proposed.** This ADR is intentionally not marked accepted by implementation alone.
Approval is part of review of the #74 vertical-slice change.

## Context

ADR-027 selected `packages/msp-runtime` as an in-repository but separately
spawned MSP process and deliberately left GKS knowledge promotion blocked while
no provider existed. That fail-closed default is correct and must remain the
default behavior.

Issue #74 now requires a runnable vertical slice that proves durable canonical
knowledge promotion and MSP-mediated retrieval across a process restart. The
slice must preserve ADR-023's authority split and must not create a direct
GoVibe or executor path to GKS or GenesisBlockDB.

ADR-025 proposes storage-backend independence and treats GenesisBlockDB as an
adapter behind canonical semantic authority rather than as the owner of GoVibe
semantics. This implementation follows that boundary without claiming that the
GenesisBlockDB adapter is complete.

## Decision

Add an explicit, opt-in GKS provider seam to `packages/msp-runtime`.

```text
Executor
  -> GoVibe MCP
  -> stdio MSP process (`packages/msp-runtime`)
  -> MSP policy / context authority validation
  -> GKS provider port
  -> persistent backend
```

For the first executable slice, the provider implementation is
`src/gks/sqlite-provider.mjs`, backed by provider-owned tables in the MSP SQLite
database. It exists to prove canonical identity, durability, provenance, policy
scoping, restart behavior, and provider substitution. It is not a declaration
that SQLite is the long-term GKS storage engine.

A future GenesisBlockDB adapter implements the same provider responsibility and
may replace this provider without changing the GoVibe-to-MSP transport or the
MSP transport-handler contract.

### Activation

The provider is disabled by default.

```text
MSP_GKS_PROVIDER=unconfigured   # default; preserve ADR-027 fail-closed behavior
MSP_GKS_PROVIDER=sqlite         # explicit first-slice provider
```

An unknown provider value is a startup error. No implicit in-memory or local
success fallback is permitted.

### Authority and namespace rules

1. GoVibe and executors do not import, open, or query the GKS provider or its
   storage directly.
2. `server.mjs`, as the composition root, injects the provider into MSP
   transport handlers. Transport handlers do not import a concrete provider.
3. Only the GKS provider may mint canonical `gks:` knowledge identity.
4. MSP owns authorization and bounded-context policy evaluation before provider
   retrieval.
5. Provider queries receive the already-authorized workspace and source hashes
   and re-apply those source constraints in the storage query.
6. A policy/identity/radius/source rejection occurs before GKS storage traversal
   and produces no retrieval-success evidence.
7. Promotion and retrieval return opaque canonical references and evidence;
   provider schema and database identifiers are not exposed as GoVibe runtime
   configuration.

### Persistence contract

Migration `0008_gks_knowledge.sql` adds:

- `gks_knowledge` for canonical records, source hash/version, atom/source
  provenance, and idempotent promotion;
- `gks_retrieval_evidence` for bounded retrieval evidence and correlation.

Canonical identity is deterministic for the normalized candidate payload and
uses the `gks:knowledge/<sha256>` namespace. Promotion is idempotent by the
candidate idempotency key.

### Health semantics

When `MSP_GKS_PROVIDER=sqlite` is selected and the provider tables are
reachable, the existing `msp_health` boundary reports the GKS component ready.
If the provider is not selected, ADR-027's existing
`gks_provider_unconfigured` blocked result remains unchanged.

No configured-provider failure may be converted into a successful promotion or
retrieval result.

## Verification boundary

The #74 implementation test proves the provider foundation:

- promotion returns an opaque `gks:` reference and `msp:promotion/` evidence;
- the MSP runtime closes and reopens the same persistent database;
- a fresh runtime retrieves the canonical record with source and atom
  provenance;
- same-workspace records from a non-authorized source are not returned;
- authority/workspace mismatch produces no GKS retrieval evidence;
- provider-unconfigured mode remains fail-closed.

Issue #77 remains the production-shaped GoVibe E2E gate. It must additionally
prove deterministic Markdown + TS/JS ingestion through the GoVibe client,
process restart, policy rejection, provider-unavailable failure behavior,
evidence linkage, CI outcome semantics, and the stated latency target.

Issue #78 remains the evidence-backed operational runbook and must be completed
after the #77 E2E path is running.

## Consequences

### Positive

- #74 gains a real persistence/retrieval seam without adding a GoVibe storage
  shortcut.
- The accepted ADR-027 default remains safe until the provider is explicitly
  enabled.
- Provider replacement is localized to the GKS provider boundary.
- Source constraints are enforced both at MSP authorization and in the provider
  query, reducing cross-source disclosure risk within one workspace.

### Negative

- The first-slice provider uses SQLite and is therefore not evidence that the
  GenesisBlockDB adapter is implemented.
- The first slice is bounded to source-scoped record retrieval; richer graph
  traversal semantics remain a later provider capability.
- The opt-in capability must not be described as production-complete until #77
  passes its process-level E2E gate.

## Rejected alternatives

### Enable GKS implicitly when the runtime starts

Rejected because it would silently change ADR-027's fail-closed behavior and
could turn configuration presence into a false readiness claim.

### Let GoVibe access SQLite or GenesisBlockDB directly

Rejected because it bypasses MSP context authority and violates the
GoVibe -> MSP -> GKS ownership boundary.

### Make GenesisBlockDB structs the canonical knowledge contract

Rejected because it would couple GoVibe semantic identity to one storage engine
and contradict the backend-independence direction recorded by ADR-025.

## Acceptance mapping

| Requirement | Mechanism |
|---|---|
| Explicit provider activation | `MSP_GKS_PROVIDER` |
| Default fail-closed | `unconfigured` retains existing lifecycle stub |
| Durable canonical records | migration `0008_gks_knowledge.sql` |
| GKS-only canonical identity | `src/gks/sqlite-provider.mjs` |
| MSP-mediated retrieval | `transport/handlers/knowledge-handlers.mjs` |
| Source/radius/budget gate | bounded authority validation before provider call |
| Source isolation in storage | provider SQL includes authorized source hashes |
| Restart evidence | `test/gks-persistent-vertical-slice.test.mjs` |
| Full GoVibe fixture E2E | tracked by #77 |
| Operations/runbook | tracked by #78 |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-15 | Boss / Engineering | Proposed explicit bounded GKS provider seam for #74 while preserving ADR-027 default fail-closed behavior. |
