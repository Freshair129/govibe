---
title: "BACKLOG: Provider Entitlement Runtime"
doc_id: "BACKLOG-PROVIDER-ENTITLEMENT-RUNTIME"
status: "draft"
version: "0.1.5+draft"
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
  - "docs/architecture/SDD-Execution-Routing-and-Failover.md"
  - "docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md"
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
issues #58–#64. Recording a DoD is not evidence that it is met. Every
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
| PHA-PER-03 | | Bounded adapters and quota-aware routing | in-progress | 70 |
| PHA-PER-04 | | Runtime conformance verification | review | 50 |

## Sprints

| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---:|
| SPR-PER-01 | PHA-PER-01 | Registry and credential/session foundation | 2 | Ownership, lifecycle, and credential-isolation rules are enforced with negative tests | in-progress | 55 |
| SPR-PER-02 | PHA-PER-02 | Planning, binding, and usage ledger | 2 | Authorization-first planning and non-fabricated usage accounting | in-progress | 70 |
| SPR-PER-03 | PHA-PER-03 | Adapters and governed routing | 2 | Bounded adapters and auditable failover behind explicit policy | in-progress | 70 |
| SPR-PER-04 | PHA-PER-04 | Conformance gate | 1 | Reviewed conformance evidence for the stated provider scope | review | 50 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TSK-PER-58 | SPR-PER-01 | task | Registry foundation for capability descriptors and entitlements | SYSTEM-06 | P0 | unassigned | Issue #58 | ADR-024; API-008 sections 3-4 | Schema conformance, ownerless rejection, lifecycle enforcement, inspection API | review | 70 |
| TSK-PER-59 | SPR-PER-01 | task | Credential vault, revocation checks, and provider session isolation | SYSTEM-10 | P0 | unassigned | Issue #59 | TSK-PER-58 | No credential material outside the vault boundary; revoked or expired credentials block dispatch | in-progress | 70 |
| TSK-PER-60 | SPR-PER-02 | task | Two-phase capability planning and immutable-context execution binding | SYSTEM-06 | P0 | unassigned | Issue #60 | TSK-PER-58; TSK-PER-59 | Typed rejection codes, persisted-context binding, protected credential channel | review | 70 |
| TSK-PER-61 | SPR-PER-02 | task | Usage ledger with reported, estimated, and unknown separation | SYSTEM-09 | P1 | unassigned | Issue #61 | TSK-PER-58; TSK-PER-60 | Unit separation, null-on-unknown, no automatic GKS promotion, aggregation by entitlement and workspace | review | 70 |
| TSK-PER-63 | SPR-PER-03 | task | Provider adapter interface and first bounded adapters | SYSTEM-06 | P1 | unassigned | Issue #63 | TSK-PER-59; TSK-PER-60; TSK-PER-61 | Normalized inspect, execute, cancel; candidate-only output; no direct GKS access | review | 70 |
| TSK-PER-62 | SPR-PER-03 | task | Quota-aware sticky routing with governed failover and rebind | SYSTEM-06 | P1 | unassigned | Issue #62 | TSK-PER-61; TSK-PER-63 | Authorization-first scoring, new binding id on failover, unchanged MSP lineage | review | 70 |
| TSK-PER-64 | SPR-PER-04 | task | Multi-provider entitlement runtime conformance gate | SYSTEM-09 | P0 | unassigned | Issue #64 | TSK-PER-58; TSK-PER-59; TSK-PER-60; TSK-PER-61; TSK-PER-62; TSK-PER-63 | Contract, security, end-to-end, negative, failover, and telemetry tests reviewed and passing | review | 50 |

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
- **Observed on this branch:**
  `packages/govibe-core/src/credential-session-boundary.security.test.mjs`
  (28 tests) closes the dispatch-boundary negative matrix. Every case asserts on a
  spy that the provider was never invoked, not merely that a promise rejected:
  revoked and expired credentials, expired and revoked and replayed grants,
  cross-entitlement and cross-run and cross-binding grants, principal and actor
  mismatch, provider mismatch, cross-user and cross-entitlement and cross-run and
  revoked and expired sessions, fail-closed with no vault or session registry, and
  no credential material in any rejection message, stack, detail or inspection
  surface.
- **Remaining:** two items are missing *implementations*, not missing tests.
  Compatibility records do not exist as code, so the sharing-policy section 14
  cases for missing or expired compatibility records and product/plan/surface
  mismatch cannot be tested. Derived-token handoff is not implemented; the vault
  hands raw secret bytes to the adapter and wipes them afterwards.
- **Finding, not fixed here:** binding authenticity is not verified at dispatch.
  `executionBindingService.assertUsable` is called nowhere on the dispatch path,
  so a never-issued, expired, or revoked binding reaches the provider and the
  API-008 `BINDING_EXPIRED` code is unreachable. Four characterization tests named
  `GAP:` pin the current wrong behavior so it fails when fixed. Recorded in
  section 5.1 of
  `docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md`.
  Security review has not signed off.

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
  sharing-policy section 14, namely expired compatibility records,
  product/plan/surface mismatch, owner-only cross-user authorization, workspace
  crossing, and revocation before invocation, are not covered here. The #64 gate
  still blocks any implemented-capability claim.

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
- **Observed on this branch:** `packages/govibe-core/src/execution-router.mjs`
  with `execution-router.test.mjs` (21 tests) and
  `docs/architecture/SDD-Execution-Routing-and-Failover.md`. Routing scores only
  targets the planner already authorized, so bypass is prevented by construction
  rather than by convention. Affinity is capped at a 0.10 bonus and a sticky
  target that loses authorization is dropped. Quota contributes a preference
  signal labelled `provider_reported`, `scheduler_estimated`,
  `observed_rate_limit` or `unknown`, never a token capacity. Rebind re-runs
  planning, so a fallback entitlement revoked after the original binding is
  rejected at failover time.
- **Remaining:** the router is not wired into dispatch and no quota, reliability
  or queue signal source is operated. `govibe-scheduler-decision/v1` is not
  defined in API-008 and is treated as GoVibe-internal evidence pending a
  contract change. The #64 gate still blocks any implemented-capability claim.

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
- **Observed on this branch:**
  `packages/govibe-core/src/entitlement-runtime-conformance.test.mjs` (22 tests)
  wiring planner, router, binding service, executor registry, adapter host,
  credential vault and usage ledger into one dispatch chain, and
  `docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md`.
  The suite passes and covers every issue #64 acceptance criterion for a
  fixture-only provider scope.
- **Gate state: NOT PASSED.** The evidence package carries
  `review_state: pending` and `gate_state: not_passed`. A passing suite is a
  prerequisite for the gate, not the gate. Closing it additionally requires a CI
  run reference on `main` and security/release review approval naming the
  provider scope, which no test can supply.
- **Remaining before the gate can close:** no part of the runtime is reachable
  from the MCP server, the sidecar, or `index.mjs`, so there is no evidence under
  the real dispatch path; no real provider was contacted; the issue #59
  negative-test matrix is incomplete; the ledger has no durable storage; there is
  no concurrency or load evidence; and three recorded contract gaps need an owner
  disposition. All are enumerated in sections 4 and 5 of the evidence package.
- **Gate effect:** unchanged. Issues #58 to #63 stay open and no document may
  describe the entitlement runtime as implemented.
- **Gate effect:** until this item passes, issues #58–#63 stay open and no
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
| 0.1.5+draft | 2026-08-04 | ATHER | Recorded the TSK-PER-59 dispatch-boundary negative matrix as closed and the two remaining items as missing implementations. Recorded a high-severity finding: binding authenticity is not verified at dispatch, so never-issued, expired and revoked bindings reach the provider. Not fixed here; it needs owner approval and blocks the #64 gate. |
| 0.1.4+draft | 2026-08-04 | ATHER | Recorded the conformance suite and evidence package for TSK-PER-64 and moved it to review. The gate is NOT passed: review_state is pending and security/release approval is outstanding. No task was promoted to done and no implementation status was propagated. |
| 0.1.3+draft | 2026-08-04 | LYRA | Recorded the observed routing and failover module, tests, and design document for TSK-PER-62 and moved it to review; the router is not wired into dispatch, the decision-record schema is not in API-008, and the #64 gate is unchanged. |
| 0.1.2+draft | 2026-08-04 | LYRA | Recorded the observed provider-adapter modules, tests, and enablement policy for TSK-PER-63, moved it to review, and corrected its dependency list to include TSK-PER-61 per issue #63; every provider record stays pending and the #64 gate is unchanged. |
| 0.1.1+draft | 2026-08-04 | LYRA | Recorded the observed usage-ledger module, tests, and redaction/retention policy for TSK-PER-61 and moved it to review; process-memory storage and dispatch wiring remain unevidenced and the #64 gate is unchanged. |
| 0.1.0+draft | 2026-08-04 | LYRA | Initial governed backlog for issues #58-#64 with per-task Definition of Done, tests, evidence, observed repository state, and the #64 conformance gate. |
