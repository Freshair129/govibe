---
doc_id: "ADR-026-MSP-EXTERNAL-RUNTIME-DEPLOYMENT"
title: "ADR-026: MSP external runtime deployment boundary"
status: "proposed"
version: "0.1.1+draft"
updated: "2026-08-04"
owner: "Boss (CEO)"
type: adr
related_issue: 75
related_adrs: ["ADR-023", "ADR-027"]
amended_by: ["ADR-027"]
---

# ADR-026: MSP external runtime deployment boundary

**Status:** Proposed  
**Date:** 2026-08-03  
**Owner:** Boss (CEO)

## Context

GoVibe already has an MCP stdio parent transport and an explicit authority
chain. It does not contain an MSP runtime, a GKS service, or a persistent
GenesisBlockDB provider. Treating a fixture or GoVibe process-local map as
either of those systems would violate ADR-023 and create false evidence that
knowledge survived a restart.

The deployment location and owning repository for the production MSP runtime
have not yet been selected. This ADR therefore fixes the GoVibe-side boundary
without inventing an owner, package name, endpoint, credential, or storage
implementation.

## Decision

For the first production vertical slice, GoVibe connects to an **external MSP
runtime through a configured MCP stdio adapter**:

```text
Executor -> GoVibe MCP -> external MSP process -> GKS -> GenesisBlockDB
```

- GoVibe configures only its single parent transport with `GOVIBE_MSP_COMMAND`,
  `GOVIBE_MSP_ARGS`, and optional `GOVIBE_MSP_CWD`.
- The MSP runtime owns its connection to GKS and the persistent backend.
- GKS/GenesisBlockDB references returned to GoVibe remain opaque. No
  `GOVIBE_GKS_*` configuration or direct client is added to GoVibe runtime.
- A valid GoVibe transport configuration is **not** a health result. Until a
  parent call succeeds, it is non-dispatchable; a failed/missing parent must
  block governed operations rather than falling back to local storage.
- The exact MSP runtime repository, release/version, deployment supervisor,
  credential mechanism, and GKS provider contract remain explicit release
  prerequisites. This ADR does not claim they exist today.

## Consequences

- (+) The existing stdio transport can be exercised against a real MSP without
  changing the authority boundary.
- (+) GoVibe can report `unconfigured`, `invalid`, and `configured but not
  probed` states without representing any as a healthy KB.
- (-) End-to-end persistence and retrieval stay blocked until the external MSP
  owner supplies a versioned runtime and health/promotion/context contracts.
- (-) Local development needs an approved MSP command; fixtures remain test
  evidence only.

**Amendment (ADR-027):** For the persistent-memory MSP runtime scoped by
`docs/srs/SRS-Persistent-Memory-MSP-Runtime.md`, ADR-027 resolves this ADR's
"MSP runtime repository ... not yet selected" finding: the repository is this
monorepo (`packages/msp-runtime`), launched as a separate OS process per the
`Executor -> GoVibe MCP -> external MSP process -> GKS -> GenesisBlockDB`
diagram above. This does not change this ADR's parent-child process boundary,
fail-closed requirements, or its refusal to claim GKS/restart evidence that
has not been proven by a real test. Other, future MSP-adjacent work is not
automatically covered by this amendment; it would need its own decision
record if it chooses a different repository or process model. This note is an
addition; the Decision text above is unchanged and remains the historical
record of what was decided on 2026-08-03.

## Required follow-up

- Owner approves or rejects this proposal and records the MSP runtime location.
- #76 adds configuration preflight and fail-closed operator guidance.
- #77 runs an E2E test against a non-fixture MSP/GKS provider across restart.
- #78 documents installation, health verification, recovery, and evidence
  collection for the selected runtime.

## Related

- Issue #75
- Issue #76
- Issue #77
- Issue #78
- ADR-023: GKS knowledge authority vs MSP context authority

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-08-04 | Claude (final-gate session) | Recorded that ADR-027 amends and resolves this ADR's unselected MSP runtime repository/process finding for the persistent-memory MSP runtime instance (`packages/msp-runtime`, in-repo, separate OS process). Appended an amendment note to Consequences; the Decision text and status are unchanged. |
| 0.1.0+draft | 2026-08-03 | Boss (CEO) | Proposed the external MSP stdio deployment boundary while leaving the production runtime owner/provider explicitly unresolved. |
