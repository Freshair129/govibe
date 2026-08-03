---
title: "BACKLOG: Provider Entitlement Runtime"
doc_id: "BACKLOG-PROVIDER-ENTITLEMENT-RUNTIME"
status: "draft"
version: "0.1.2+draft"
updated: "2026-08-04"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-06::MCP-Runtime-System"
related_docs:
  - "docs/roadmap/ROADMAP-provider-entitlement-runtime.md"
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md"
  - "docs/security/POLICY-Provider-Adapter-Enablement.md"
  - "docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md"
  - "docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md"
  - "docs/change-control/TODO-Execution-Binding-Lifecycle.md"
---

# BACKLOG: Provider Entitlement Runtime

**Roadmap Source Path:** `docs/roadmap/ROADMAP-provider-entitlement-runtime.md`
**Backlog Source Path:** `docs/roadmap/BACKLOG-provider-entitlement-runtime.md`
**Parent Issue:** `#55`
**Planning Issue:** `#65`
**Sequence Packet:** `#68`
**Planning PIC:** `LYRA`
**Architecture PIC:** `ARCHON`
**Security PIC:** `ATHER`
**Status:** `draft`

## Purpose and non-claims

This backlog records the Definition of Done, tests, and evidence required for
issues #58â€“#64. Recording a DoD is not evidence that it is met. Every
implementation status here reflects merged repository artifacts only; runtime
conformance is claimable solely through issue #64.

## Goal

Give each provider-entitlement runtime issue an executable work definition with
explicit dependencies, tests, evidence, and a gate that prevents premature
implementation claims.

## Phases

| Phase | Parent ID | Goal | Status | Progress |
|---|---|---|---|---:|
| PHA-PER-01 | | Entitlement authority and credential/session security foundation | review | 60 |
| PHA-PER-02 | | Governed planning, binding, and usage accounting | in-progress | 70 |
| PHA-PER-03 | | Bounded adapters and quota-aware routing | in-progress | 35 |
| PHA-PER-04 | | Runtime conformance verification | planned | 0 |

## Sprints

| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---:|
| SPR-PER-01 | PHA-PER-01 | Registry and credential/session foundation | 2 | Ownership, lifecycle, and credential-isolation rules are enforced with negative tests | in-progress | 55 |
| SPR-PER-02 | PHA-PER-02 | Planning, binding, and usage ledger | 2 | Authorization-first planning and non-fabricated usage accounting | in-progress | 70 |
| SPR-PER-03 | PHA-PER-03 | Adapters and governed routing | 2 | Bounded adapters and auditable failover behind explicit policy | in-progress | 35 |
| SPR-PER-04 | PHA-PER-04 | Conformance gate | 1 | Reviewed conformance evidence for the stated provider scope | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TSK-PER-58 | SPR-PER-01 | task | Registry foundation for capability descriptors and entitlements | SYSTEM-06 | P0 | unassigned | Issue #58 | ADR-024; API-008 sections 3-4 | Schema conformance, ownerless rejection, lifecycle enforcement, inspection API | review | 70 |
| TSK-PER-59 | SPR-PER-01 | task | Credential vault, revocation checks, and provider session isolation | SYSTEM-10 | P0 | unassigned | Issue #59 | TSK-PER-58 | No credential material outside the vault boundary; revoked or expired credentials block dispatch | in-progress | 50 |
| TSK-PER-60 | SPR-PER-02 | task | Two-phase capability planning and immutable-context execution binding | SYSTEM-06 | P0 | unassigned | Issue #60 | TSK-PER-58; TSK-PER-59 | Typed rejection codes, persisted-context binding, protected credential channel | review | 70 |
| TSK-PER-61 | SPR-PER-02 | task | Usage ledger with reported, estimated, and unknown separation | SYSTEM-09 | P1 | unassigned | Issue #61 | TSK-PER-58; TSK-PER-60 | Unit separation, null-on-unknown, no automatic GKS promotion, aggregation by entitlement and workspace | review | 70 |
| TSK-PER-63 | SPR-PER-03 | task | Provider adapter interface and first bounded adapters | SYSTEM-06 | P1 | unassigned | Issue #63 | TSK-PER-59; TSK-PER-60; TSK-PER-61 | Normalized inspect, execute, cancel; candidate-only output; no direct GKS access | review | 70 |
| TSK-PER-62 | SPR-PER-03 | task | Quota-aware sticky routing with governed failover and rebind | SYSTEM-06 | P1 | unassigned | Issue #62 | TSK-PER-61; TSK-PER-63 | Authorization-first scoring, new binding id on failover, unchanged MSP lineage | planned | 0 |
| TSK-PER-64 | SPR-PER-04 | task | Multi-provider entitlement runtime conformance gate | SYSTEM-09 | P0 | unassigned | Issue #64 | TSK-PER-58; TSK-PER-59; TSK-PER-60; TSK-PER-61; TSK-PER-62; TSK-PER-63 | Contract, security, end-to-end, negative, failover, and telemetry tests reviewed and passing | planned | 0 |

## Task definitions

### TSK-PER-58: Registry foundation (issue #58)

- **Definition of Done:** descriptors validate against
  `govibe-provider-capability-descriptor/v1`; entitlements validate against
  `govibe-provider-entitlement/v1`; `cross_user_reuse` defaults to false;
  anonymous or ownerless entitlements are rejected; `active`, `suspended`,
  `revoked`, and `expired` lifecycle states are enforced; registry records store
  only an opaque `credential_ref`.
- **Tests:** unit tests for schema validation, ownership rejection, lifecycle
  transitions, and eligibility evaluation.
- **Evidence:** merged module and test files plus their PR reference.
- **Observed on `main`:** `packages/govibe-core/src/provider-entitlement-registry.mjs`
  and `provider-entitlement-registry.test.mjs` (merged in PR #72).
- **Remaining:** confirm every issue #58 acceptance bullet has a matching
  assertion; the #64 gate still blocks any implemented claim.

### TSK-PER-59: Credential vault and session isolation (issue #59)

- **Definition of Done:** raw credential material never enters MSP context, GKS,
  candidate output, the usage ledger, logs, or user-visible traces; adapter
  access is limited to the bound entitlement and run; revoked or expired
  credentials block execution before dispatch; provider sessions are isolated per
  user and per entitlement; log and error redaction is enforced.
- **Tests:** negative security tests for revoked and expired credentials, cross-user
  session access attempts, and redaction of error paths.
- **Evidence:** merged vault and session modules, security tests, and the threat
  model reference.
- **Observed on `main`:** `credential-vault.mjs`, `provider-session-registry.mjs`
  with tests, and `THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md`
  (merged in PR #73).
- **Remaining:** derived-token handoff to adapters and the full negative-test
  matrix are not yet evidenced; security review has not signed off.

### TSK-PER-60: Planning and execution binding (issue #60)

- **Definition of Done:** planning never selects knowledge and never mutates MSP
  context; binding rejects missing, unpersisted, or integrity-failed context;
  `credential_ref` is delivered only through a protected runtime channel; typed
  rejection codes are emitted; binding expiry and revocation are rechecked; the
  authorization decision is auditable.
- **Tests:** `NO_AUTHORIZED_ENTITLEMENT`, `CONTEXT_BUDGET_UNSATISFIED`,
  `TOOL_CONTRACT_INCOMPATIBLE`, `CONTEXT_INTEGRITY_FAILED`, and planner-to-binding
  integration.
- **Evidence:** merged planner and binding modules with tests.
- **Observed on `main`:** `execution-capability-planner.mjs` and
  `execution-binding-service.mjs` with tests (merged in PR #88).
- **Remaining:** issue #60 was reopened because the #68 gate ties its closure to
  #64; expiry and revocation recheck under real adapters is unproven.

### TSK-PER-61: Usage ledger (issue #61)

- **Definition of Done:** estimates never populate provider-reported fields;
  unavailable telemetry stays null or unknown rather than fabricated; API
  cached-token reporting stays distinct from subscription request quota; raw
  operational events are not automatically promoted to GKS knowledge; aggregation
  reports by entitlement, user, workspace, and outcome.
- **Tests:** partial-telemetry and rate-limit-only provider cases; estimation
  metadata retention; aggregation correctness.
- **Evidence:** merged ledger module, tests, and a redaction/retention note.
- **Observed on this branch:** `packages/govibe-core/src/entitlement-usage-ledger.mjs`
  with `entitlement-usage-ledger.test.mjs` (22 tests) and
  `docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md`.
  A provider capability descriptor is the only authority for accepting a reported
  value, so a provider with no descriptor yields unknown telemetry rather than
  zero. Aggregation keeps reported and estimated totals in separate buckets with
  per-field coverage counts.
- **Remaining:** the ledger holds records in process memory and is not wired into
  dispatch or the sidecar; durable storage, operator retention configuration, and
  accounting fidelity against a real provider are unevidenced. The `v1` usage-event
  schema also has no `not_applicable` telemetry classification, so the sharing
  policy's four-way classification is only three-way in practice; closing that
  requires an API-008 change. The #64 gate still blocks any implemented-capability
  claim.

### TSK-PER-63: Provider adapters (issue #63)

- **Definition of Done:** adapter interface covers inspect, execute, and cancel;
  adapters cannot reach GKS or GenesisBlockDB; results conform to
  `govibe-provider-run-result/v1`; provider output stays
  `govibe-provider-candidate/v1`; unsupported usage or cache fields remain
  unknown; cancellation, timeout, rate-limit, and unavailable states normalize;
  a provider-specific policy record exists before enabling an adapter.
- **Tests:** normalization tests per terminal state; boundary test proving no GKS
  path; schema conformance tests.
- **Evidence:** merged adapter modules, policy record, and tests.
- **Observed on this branch:** `packages/govibe-core/src/provider-adapter-host.mjs`
  and `provider-adapters.mjs` with `provider-adapter-host.test.mjs` (24 tests),
  plus `docs/security/POLICY-Provider-Adapter-Enablement.md`. The host wraps the
  existing `createExecutorRegistry` rather than replacing it, so authority checks,
  binding validation, session assertion and credential handoff stay in one place.
  Dispatch fails closed on a missing or unapproved adapter policy record and on a
  missing capability descriptor. Two bounded adapters exist: local compute
  (`second`) and subscription CLI (`request`); neither derives token counts.
- **Remaining:** every provider record in the enablement policy is `pending`, so
  no adapter is approved for live dispatch. The issue #59 and #64 items from
  sharing-policy section 14 â€” expired compatibility records, product/plan/surface
  mismatch, owner-only cross-user authorization, workspace crossing, revocation
  before invocation â€” are not covered here. The #64 gate still blocks any
  implemented-capability claim.

### TSK-PER-62: Routing and failover (issue #62)

- **Definition of Done:** least-load or random routing cannot bypass
  authorization; session and cache affinity is an optimization only, never a
  memory-validity signal; failover creates a new binding id and re-evaluates
  entitlement policy; context changes require new MSP lineage rather than a
  rebind; provider limits with unknown semantics are not converted into exact
  token capacity; scheduler decisions are recorded as evidence.
- **Tests:** rate-limit, provider-outage, and downgrade-reporting cases; lineage
  preservation across failover.
- **Evidence:** merged router module, decision evidence records, and tests.
- **Observed on `main`:** none.

### TSK-PER-64: Conformance gate (issue #64)

- **Definition of Done:** contract tests for API-008 schemas; security tests for
  credential and session isolation; an end-to-end run from persisted MSP context
  to candidate result; negative tests for unauthorized and revoked entitlements;
  failover and rebind lineage tests; partial and unknown quota telemetry tests;
  audit evidence recorded and implementation status propagated **only** after the
  suite passes.
- **Tests:** the full conformance suite above, executed in CI.
- **Evidence:** CI run reference, audit record, and security/release review
  approval naming the provider scope covered.
- **Observed on `main`:** none.
- **Gate effect:** until this item passes, issues #58â€“#63 stay open and no
  document may describe the entitlement runtime as implemented.

## Acceptance Criteria

- Each of issues #58, #59, #60, #61, #62, #63, #64 has exactly one backlog task.
- Each task states a Definition of Done that names both tests and evidence.
- Each task records observed repository state separately from required work.
- No task is marked `done` before the #64 conformance gate passes.

## Success Criteria

| Metric | Target |
|---|---:|
| Issues #58-#64 with a matching backlog task | 100% |
| Tasks with tests and evidence named in their DoD | 100% |
| Tasks marked `done` without #64 evidence | 0 |
| Observed-state claims without a merged artifact reference | 0 |

## Definition of Done

- `npm run docs:validate` passes with this backlog present.
- The registry row matches this document's frontmatter version and status.
- Every dependency reference resolves to a task inside this document.
- Issue #65 is closed only after this document and the roadmap are merged.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.2+draft | 2026-08-04 | LYRA | Recorded the observed provider-adapter modules, tests, and enablement policy for TSK-PER-63, moved it to review, and corrected its dependency list to include TSK-PER-61 per issue #63; every provider record stays pending and the #64 gate is unchanged. |
| 0.1.1+draft | 2026-08-04 | LYRA | Recorded the observed usage-ledger module, tests, and redaction/retention policy for TSK-PER-61 and moved it to review; process-memory storage and dispatch wiring remain unevidenced and the #64 gate is unchanged. |
| 0.1.0+draft | 2026-08-04 | LYRA | Initial governed backlog for issues #58-#64 with per-task Definition of Done, tests, evidence, observed repository state, and the #64 conformance gate. |
