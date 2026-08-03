---
title: "ROADMAP: Provider Entitlement Runtime"
doc_id: "ROADMAP-PROVIDER-ENTITLEMENT-RUNTIME"
id: RM-provider-entitlement-runtime
version: "0.1.4+draft"
updated: "2026-08-04"
status: draft
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
related_docs:
  - "docs/change-control/change-requests/CR-2026-08-02-Multi-Provider-Entitlement-Routing.md"
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md"
  - "docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md"
  - "docs/roadmap/BACKLOG-provider-entitlement-runtime.md"
  - "docs/change-control/TODO-Execution-Binding-Lifecycle.md"
  - "docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md"
  - "docs/security/POLICY-Provider-Adapter-Enablement.md"
  - "docs/architecture/SDD-Execution-Routing-and-Failover.md"
---

# ROADMAP: Provider Entitlement Runtime

**Source CR:** docs/change-control/change-requests/CR-2026-08-02-Multi-Provider-Entitlement-Routing.md
**Authority:** docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md
**Contract:** docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md
**Owner:** LYRA
**Auditor:** ATHER
**Roadmap Source Path:** docs/roadmap/ROADMAP-provider-entitlement-runtime.md
**Tracking Issues:** #55 (parent), #58, #59, #60, #61, #62, #63, #64, #65, #68
**Closed prerequisites:** #66 (registry vertical slice), #67 (credential/session threat model)

## Purpose and non-claims

This roadmap sequences the provider-entitlement runtime work recorded in issues
#58–#64. It is a plan, not an implementation claim.

- `Status` and `Progress` columns describe **repository-observable state only**
  (merged code, merged tests, merged documents), never runtime conformance.
- No item in this roadmap may be reported as an implemented runtime capability
  until the #64 conformance gate passes with reviewed evidence. This restates
  the gate recorded in issue #68.
- Documented decisions (ADR-024, API-008, threat model, sharing policy) are
  authority records, not proof that the described runtime behavior exists.
- The parent contract lifecycle for the CR, ADR-024, API-007, and API-008
  remains blocked on the owner decision tracked as T-01 in
  `docs/change-control/TODO-Execution-Binding-Lifecycle.md`. Nothing in this
  roadmap promotes those artifacts.

## Product Goal

Deliver a vendor-neutral provider entitlement runtime in which every provider
execution is authorized against an owned entitlement, bound to persisted MSP
context, credential-isolated, usage-accounted without fabrication, and routed
with auditable failover — proven by an independent conformance gate.

## Phases

| Phase | Goal | PRD Systems | Required Docs | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| PHASE-PER-01 | Establish entitlement authority and credential/session security foundations | SYSTEM-06, SYSTEM-10 | ADR-024, API-008, threat model, sharing policy | Registry and credential/session boundaries exist with negative tests and no credential material outside the vault | review | 60 |
| PHASE-PER-02 | Add governed capability planning, execution binding, and non-fabricated usage accounting | SYSTEM-06, SYSTEM-09 | API-008 sections 5-11 | Planning and binding reject unauthorized or integrity-failed context, and usage records separate reported from estimated values | in-progress | 70 |
| PHASE-PER-03 | Add bounded provider adapters and quota-aware routing with governed failover | SYSTEM-06, SYSTEM-10 | API-008 sections 9-12, provider policy records | Adapters normalize results without GKS access and failover re-evaluates entitlement policy under a new binding id | in-progress | 70 |
| PHASE-PER-04 | Prove runtime conformance to ADR-024 and API-008 | SYSTEM-09, SYSTEM-10 | API-008, threat model, audit evidence | Conformance suite passes and is reviewed; only then may any runtime capability be reported as implemented | planned | 0 |

## Sprints

| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| SPRINT-PER-01 | PHASE-PER-01 | Provider capability and entitlement registry foundation | 1 | Descriptors and entitlements validate against their v1 schemas and ownerless records are rejected | review | 70 |
| SPRINT-PER-02 | PHASE-PER-01 | Credential vault and provider session isolation | 1 | Credential material is absent from context, ledger, logs and candidates; revoked credentials block dispatch | in-progress | 50 |
| SPRINT-PER-03 | PHASE-PER-02 | Governed capability planning and execution binding | 1 | Planning never selects knowledge or mutates MSP context; binding rejects unpersisted or integrity-failed context | review | 70 |
| SPRINT-PER-04 | PHASE-PER-02 | Entitlement usage ledger and quota visibility | 1 | Estimated values never populate provider-reported fields and unavailable telemetry stays unknown | review | 70 |
| SPRINT-PER-05 | PHASE-PER-03 | Provider adapter contract and first bounded adapters | 1 | Adapter output conforms to the run-result and candidate schemas with no direct GKS or GenesisBlockDB access | review | 70 |
| SPRINT-PER-06 | PHASE-PER-03 | Quota-aware sticky routing and governed failover | 1 | Routing cannot bypass authorization and failover creates a new binding id with re-evaluated policy | review | 70 |
| SPRINT-PER-07 | PHASE-PER-04 | Multi-provider entitlement runtime conformance gate | 1 | The full conformance suite passes and security/release review accepts the evidence | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-PER-58 | SPRINT-PER-01 | task | Provider capability and entitlement registry foundation (issue #58) | SYSTEM-06 | P0 | unassigned | Issue #58 | ADR-024; API-008 | Descriptors and entitlements conform to their v1 schemas, `cross_user_reuse` defaults false, ownerless entitlements are rejected, lifecycle states are enforced | review | 70 |
| TASK-PER-59 | SPRINT-PER-02 | task | Credential vault and provider session isolation (issue #59) | SYSTEM-10 | P0 | unassigned | Issue #59 | TASK-PER-58 | Raw credentials never enter MSP context, GKS, candidates, ledger or traces; revoked or expired credentials block dispatch; sessions are isolated per user and entitlement | in-progress | 50 |
| TASK-PER-60 | SPRINT-PER-03 | task | Governed execution planning and entitlement binding (issue #60) | SYSTEM-06 | P0 | unassigned | Issue #60 | TASK-PER-58; TASK-PER-59 | Planning selects no knowledge and mutates no context; binding rejects missing, unpersisted or integrity-failed context; `credential_ref` travels only on the protected runtime channel | review | 70 |
| TASK-PER-61 | SPRINT-PER-04 | task | Entitlement usage ledger and quota visibility (issue #61) | SYSTEM-09 | P1 | unassigned | Issue #61 | TASK-PER-58; TASK-PER-60 | Provider-reported, estimated and unknown values stay separate; unavailable telemetry stays null; raw events are not promoted to GKS | review | 70 |
| TASK-PER-63 | SPRINT-PER-05 | task | Provider adapter contract and first bounded adapters (issue #63) | SYSTEM-06 | P1 | unassigned | Issue #63 | TASK-PER-59; TASK-PER-60; TASK-PER-61 | Adapters reach no GKS or GenesisBlockDB path, results conform to `govibe-provider-run-result/v1`, output stays `govibe-provider-candidate/v1`, unsupported fields stay unknown | review | 70 |
| TASK-PER-62 | SPRINT-PER-06 | task | Quota-aware sticky routing and governed failover (issue #62) | SYSTEM-06 | P1 | unassigned | Issue #62 | TASK-PER-61; TASK-PER-63 | Routing cannot bypass authorization, affinity is never a memory-validity signal, failover creates a new binding id and re-evaluates entitlement policy | review | 70 |
| TASK-PER-64 | SPRINT-PER-07 | task | Multi-provider entitlement runtime conformance gate (issue #64) | SYSTEM-09 | P0 | unassigned | Issue #64 | TASK-PER-58; TASK-PER-59; TASK-PER-60; TASK-PER-61; TASK-PER-62; TASK-PER-63 | Contract, security, end-to-end, negative, failover and partial-telemetry tests pass and are reviewed; implementation status is propagated only after this gate | planned | 0 |
| TASK-PER-65 | SPRINT-PER-01 | task | Governed roadmap and backlog for the provider entitlement runtime (issue #65) | SYSTEM-02 | P0 | unassigned | Issue #65 | ADR-024; API-008 | This roadmap and its backlog are registered in the document registry and merged to main with one task per GitHub issue | done | 100 |
| TASK-PER-68 | SPRINT-PER-01 | task | Record the implementation sequence packet and its prerequisite closures (issue #68) | SYSTEM-02 | P0 | unassigned | Issue #68 | TASK-PER-65 | The #58-#64 order, the closed #66 and #67 prerequisites, and the #64 gate are recorded in this roadmap | done | 100 |

## Dependency and release-gate mapping

| Gate | Blocking items | Releasable claim once passed | Still not claimable |
|---|---|---|---|
| GATE-PER-A Authority foundation | TASK-PER-58, TASK-PER-59 | Entitlement records and credential/session boundaries exist in the repository with negative tests | Any statement that provider execution is governed end to end |
| GATE-PER-B Governed execution | TASK-PER-60, TASK-PER-61 | Planning and binding enforce authorization and context integrity in tests; usage accounting separates reported from estimated | Provider routing, failover behavior, or real provider usage fidelity |
| GATE-PER-C Provider surface | TASK-PER-63, TASK-PER-62 | Bounded adapters and routing exist behind explicit policy records | Runtime conformance, quota accuracy for unsupported providers |
| GATE-PER-D Conformance | TASK-PER-64 | The entitlement runtime conforms to ADR-024/API-008 for the tested provider scope | Conformance for providers outside the tested scope, or external-consumer compatibility (see T-02) |

Ordering rule from issue #68, retained here: **#58 → #59 → #60 → #61 → #63 → #62 → #64**.
Security and authority work (#58, #59) precedes routing and adapters (#62, #63);
no gate may be skipped by scheduling convenience.

## Implementation sequence packet (issue #68)

Issue #68 recorded the implementation order for this runtime, including two
prerequisite sub-issues that closed before this roadmap existed. They are
recorded here so the sequence stays traceable after #68 is closed.

| Step | Issue | Role in the sequence | Roadmap task | Issue state | Observed artifact |
|---|---|---|---|---|---|
| 1a | #66 | First executable registry vertical slice under #58 | TASK-PER-58 | closed 2026-08-02 | `packages/govibe-core/src/provider-entitlement-registry.mjs` and its test (PR #72) |
| 1b | #58 | Registry foundation and eligibility filtering | TASK-PER-58 | open, gated by #64 | same as above |
| 2a | #67 | Threat model required before credential-vault implementation | TASK-PER-59 | closed 2026-08-02 | `docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md` (PR #73) |
| 2b | #59 | Credential vault, revocation checks, session isolation | TASK-PER-59 | open, gated by #64 | `credential-vault.mjs`, `provider-session-registry.mjs` and their tests |
| 3 | #60 | Governed capability planning and execution binding | TASK-PER-60 | open, gated by #64 | `execution-capability-planner.mjs`, `execution-binding-service.mjs` and their tests (PR #88) |
| 4 | #61 | Entitlement usage ledger and quota visibility | TASK-PER-61 | open, gated by #64 | `entitlement-usage-ledger.mjs` and its test, plus the redaction/retention policy |
| 5 | #63 | Provider adapter contract and first bounded adapters | TASK-PER-63 | open, gated by #64 | `provider-adapter-host.mjs`, `provider-adapters.mjs` and their test, plus the adapter enablement policy |
| 6 | #62 | Quota-aware sticky routing and governed failover | TASK-PER-62 | open, gated by #64 | `execution-router.mjs` and its test, plus the routing and failover design |
| 7 | #64 | Runtime conformance gate | TASK-PER-64 | open | none |

Closing #66 and #67 satisfied their own deliverable scope only. Neither closure
advances the #64 gate, and the #67 exit criterion — every P0 threat mapped to an
implementation control and test — is verified under #59 and #64, not by the
existence of the threat-model document.

## Observed repository state (evidence, 2026-08-04)

| Item | Observed artifact on `main` | What it does not prove |
|---|---|---|
| TASK-PER-58 | `packages/govibe-core/src/provider-entitlement-registry.mjs` and its test (merged in PR #72) | Runtime authorization behavior under real providers |
| TASK-PER-59 | `packages/govibe-core/src/credential-vault.mjs`, `provider-session-registry.mjs` and their tests; `THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md` (PR #73) | Credential isolation under real adapter dispatch; issue #59 negative-test scope is incomplete |
| TASK-PER-60 | `packages/govibe-core/src/execution-capability-planner.mjs`, `execution-binding-service.mjs` and their tests (merged in PR #88) | Multi-provider conformance; issue #60 remains open pending #64 |
| TASK-PER-61 | `packages/govibe-core/src/entitlement-usage-ledger.mjs`, its test, and `docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md` | Durable storage, operator retention configuration, or accounting fidelity against a real provider; the ledger is process-memory only and is not wired into dispatch |
| TASK-PER-62 | `packages/govibe-core/src/execution-router.mjs`, its test, and `docs/architecture/SDD-Execution-Routing-and-Failover.md` | Live routing: the router is not wired into dispatch and no quota, reliability or queue signal source is operated |
| TASK-PER-63 | `packages/govibe-core/src/provider-adapter-host.mjs`, `provider-adapters.mjs`, their test, and `docs/security/POLICY-Provider-Adapter-Enablement.md` | Live provider dispatch: every provider record in the enablement policy is `pending`, so no adapter is approved for production use |
| TASK-PER-64 | none | — |

## Acceptance Criteria

- Every roadmap task maps to exactly one GitHub issue in #58–#65.
- P0 security and authority tasks (TASK-PER-58, TASK-PER-59) precede routing and
  adapter tasks (TASK-PER-62, TASK-PER-63) in both phase and gate ordering.
- Every task carries a Definition of Done that names tests and evidence, recorded
  in `docs/roadmap/BACKLOG-provider-entitlement-runtime.md`.
- No runtime capability is described as implemented before TASK-PER-64 passes.
- This document and its backlog are registered in `docs/DOC-VERSION-REGISTRY.md`.

## Success Criteria

| Metric | Target |
|---|---:|
| Roadmap tasks with a matching open or closed GitHub issue | 100% |
| Tasks with a written Definition of Done in the backlog | 100% |
| Status values backed by an observable repository artifact | 100% |
| Runtime-conformance claims made before #64 passes | 0 |

## Definition of Done

- `npm run docs:validate` passes with this roadmap and backlog present.
- Registry rows for both documents match their frontmatter version and status.
- The roadmap parser reads the Phases, Sprints and Backlog Items tables without
  broken parent references or duplicate node ids.
- Issue #65 is closed only after both documents are merged to `main`.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.4+draft | 2026-08-04 | LYRA | Recorded the observed routing and failover artifacts for TASK-PER-62 and moved it to review; the router is not wired into dispatch and the #64 gate is unchanged. |
| 0.1.3+draft | 2026-08-04 | LYRA | Recorded the observed provider-adapter artifacts for TASK-PER-63, moved it to review, and corrected its dependency list to include TASK-PER-61 per issue #63; every provider enablement record remains pending and the #64 gate is unchanged. |
| 0.1.2+draft | 2026-08-04 | LYRA | Recorded the observed usage-ledger artifacts for TASK-PER-61 and moved it to review; the #64 conformance gate is unchanged and no runtime capability is claimed. |
| 0.1.1+draft | 2026-08-04 | LYRA | Recorded the issue #68 implementation sequence packet, including the closed #66 and #67 prerequisites and their observed artifacts; marked the #65 planning task and the #68 sequence task done without advancing the #64 gate. |
| 0.1.0+draft | 2026-08-04 | LYRA | Initial governed roadmap for issues #58-#64 with dependency and release-gate mapping, observed-state evidence, and the #64 conformance gate retained as a non-claim boundary. |
