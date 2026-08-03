---
title: "Evidence: Provider Entitlement Runtime Conformance"
doc_id: "EVIDENCE-PROVIDER-ENTITLEMENT-RUNTIME-CONFORMANCE"
status: "draft"
version: "0.3.0+draft"
updated: "2026-08-04"
owner: "ATHER"
source_of_truth: false
review_state: "pending"
gate_state: "not_passed"
related_issues:
  - 55
  - 58
  - 59
  - 60
  - 61
  - 62
  - 63
  - 64
related_apis: ["API-008"]
related_docs:
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/architecture/SDD-Execution-Routing-and-Failover.md"
  - "docs/security/POLICY-Provider-Adapter-Enablement.md"
  - "docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md"
  - "docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md"
  - "docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md"
  - "docs/roadmap/BACKLOG-provider-entitlement-runtime.md"
---

# Evidence: Provider Entitlement Runtime Conformance

## 1. Gate state

**The issue #64 conformance gate has NOT passed.**

`review_state: pending`, `gate_state: not_passed`.

This document is the repository-side evidence package for issue #64. It records
what the conformance suite proves, what it does not, and what remains before the
gate can be closed. Passing tests are a prerequisite for the gate, not the gate.

Per the `TSK-PER-64` Definition of Done, closing the gate requires all of:

| Requirement | State |
|---|---|
| conformance suite passes | **met** in this branch, see section 3 |
| CI run reference | pending merge to `main` |
| audit record | this document |
| security and release review approval naming the provider scope covered | **not met**, requires a human reviewer |

Until every row is met, issues #58 to #63 stay open and **no document may
describe the entitlement runtime as implemented.**

## 2. Scope covered

Provider scope exercised by the suite: **fixture providers only**. No real
provider is contacted. The two bounded adapters are driven by injected run
functions.

Every provider record in `docs/security/POLICY-Provider-Adapter-Enablement.md` is
`pending`, so no adapter is approved for live dispatch. The approved policy
records inside the suite are fixtures that exercise the enablement gate; they do
not authorize a provider.

## 3. What the suite proves

Suite: `packages/govibe-core/src/entitlement-runtime-conformance.test.mjs`
(22 tests). It wires planner, router, binding service, executor registry, adapter
host, credential vault and usage ledger into one dispatch chain rather than
testing modules in isolation.

Mapped to the issue #64 acceptance criteria:

| #64 acceptance criterion | Covered by | Result |
|---|---|---|
| no direct adapter path to GKS/GenesisBlockDB | source-level import assertion across all nine runtime modules, plus an assertion that no component exposes a promotion surface | pass |
| router cannot alter MSP context content/hash | context identity, cache id, hash, manifest hash, profile and tool-contract hash compared across route and rebind; the persisted context object is compared before and after | pass |
| credential material absent from logs, context and candidate artifacts | the secret is asserted absent from binding, run result, candidate, usage event, scheduler decision, vault inspection and grant; the secret buffer is asserted zeroed after the adapter returns | pass |
| reported and estimated usage never merge | aggregation keeps separate totals with independent coverage counts; partial and rate-limit-only providers keep telemetry null and named | pass |
| failover preserves context identity and creates a new binding | rebind produces a new binding id on a different provider, preserves all six context fields, and the resulting binding dispatches successfully | pass |
| contract tests for API-008 schemas | exact field-set assertions for `govibe-provider-run-result/v1`, `govibe-provider-candidate/v1`, `govibe-entitlement-usage-event/v1` and `govibe-entitlement-quota-snapshot/v1` | pass |
| end-to-end run from persisted context to candidate result | one identity chain from planning through binding, dispatch and accounting | pass |
| negative tests for unauthorized/revoked entitlements | revoked entitlement, wrong principal against an owner-only entitlement, unpersisted context, unapproved adapter policy, denied policy decision | pass |
| partial/unknown quota telemetry | rate-limit-only provider keeps every reported field null and named; a remaining-quota figure is rejected | pass |
| implementation status propagated only after tests pass | no status propagation is performed by this branch; see section 1 | held |

## 4. Not covered

This section exists so the gate reviewer is not asked to infer absence.

### 4.1 Not wired into the product

None of the entitlement runtime is reachable from the MCP server, the sidecar, or
`packages/govibe-core/src/index.mjs`. The modules are deliberately unexported,
because exporting them would imply an available capability before this gate.
Consequently there is **no evidence of behavior under the real dispatch path**,
only under the suite's own wiring.

### 4.2 No real provider

No live provider was contacted. Quota accuracy, rate-limit semantics, session
affinity behavior, prompt-cache behavior and adapter error taxonomy for any real
provider are unevidenced.

### 4.3 Issue #59 negative-test matrix: mostly closed, two items still open

`packages/govibe-core/src/credential-session-boundary.security.test.mjs`
(28 tests) closes the dispatch-boundary part of the matrix. Every test asserts on
a spy that the provider was **never invoked**, not merely that a promise
rejected:

- revoked credential, expired credential, expired grant, explicitly revoked
  grant, unknown grant, and replay of a consumed one-time grant;
- grant issued for another entitlement, run, or binding;
- binding whose principal is not the dispatch actor, whose actor and principal
  disagree, or which points at another provider;
- session belonging to another user or entitlement, cross-run reuse, revoked
  session, entitlement-wide session revocation, and expired session;
- fail-closed when a grant or session is presented but no vault or session
  registry is configured;
- the adapter request carries no credential-shaped field and no grant id, and
  the adapter gets a handle to no other credential or session;
- no secret or external session handle appears in any rejection message, stack,
  error detail, or inspection surface.

Still open and **not** covered:

- **compatibility records do not exist as code.** Sharing policy section 14
  requires that missing or expired compatibility records and product/plan/surface
  mismatches fail closed. No compatibility registry is implemented, so these
  cannot be tested. This is a missing implementation, not a missing test.
- **derived-token handoff is not implemented.** Issue #59 scope names it; the
  vault hands raw secret bytes to the adapter inside `withCredential`. The bytes
  are wiped afterwards, but no token derivation exists.

### 4.4 No durable storage

The usage ledger holds records in process memory. Retention configuration,
durable persistence, and behavior across process restart are unevidenced.

### 4.5 No performance, concurrency or load evidence

Concurrency limits, queue behavior under contention, and routing stability under
parallel dispatch are untested.

## 5. Recorded contract gaps

Three gaps were found while implementing issues #61 to #63. None is resolved by
inventing a field or schema outside the contract, and each needs an owner
decision before or with this gate.

| Gap | Where recorded | Effect |
|---|---|---|
| the `v1` usage-event schema has no `not_applicable` telemetry classification, so the sharing policy's four-way classification is three-way in practice | `POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md` section 4.1 | a field that cannot apply to an entitlement type is recorded as unknown |
| `govibe-scheduler-decision/v1` is not defined in API-008, although issue #62 requires scheduler decision evidence | `SDD-Execution-Routing-and-Failover.md` section 9.1 | the record is GoVibe-internal evidence, exchanged with no provider |
| dispatch selects an adapter by `provider_id`, not by `binding.adapter_id` as the target contract requires | `RECONCILIATION-API-005-006-008-Executor-Router.md` section 6 | the section 7 target dispatch path is not fully realized |

Each requires an API-008 or reconciliation change. They are listed here so the
gate reviewer dispositions them explicitly rather than discovering them later.

## 5.1 Security finding: binding authenticity was not verified at dispatch

**Severity: high. Found while building the issue #59 negative matrix.
Status: FIXED.**

### Resolution

`createExecutorRegistry` now takes a `bindingService` and calls
`assertUsable(binding.binding_id, ...)` before any adapter invocation, correlating
actor, principal, workspace, task, agent, run, session, turn, context, cache,
provider and entitlement against the issued record. The check is **fail-closed**:
dispatch without a binding service raises
`EXECUTION_BINDING_SERVICE_REQUIRED`.

Emitted codes at the dispatch boundary:

| Condition | Code |
|---|---|
| binding never issued | `EXECUTION_BINDING_NOT_ISSUED` |
| binding expired | `BINDING_EXPIRED` (API-008 section 13) |
| binding revoked | `EXECUTION_BINDING_REVOKED` |
| claimed field differs from the issued record | `EXECUTION_BINDING_SCOPE_MISMATCH` |
| no binding service wired | `EXECUTION_BINDING_SERVICE_REQUIRED` |

The four `GAP:` characterization tests were flipped to assert rejection, and two
were added for entitlement substitution and the unwired-service case. API-008
section 13's `BINDING_EXPIRED` is now reachable for the first time.

Blast radius was limited to tests: `runtime-core.mjs` only calls
`executorRegistry.inspect()`, so no production dispatch path existed to break.
Five test files were updated to issue bindings through a service instead of
hand-writing literals.

### Original finding, retained for the record

`createExecutorRegistry` validates that an execution binding is *internally
consistent* and *correlates with the context authority*. It never checks that the
binding was actually issued by the binding service:
`executionBindingService.assertUsable` is called nowhere on the dispatch path,
while `providerSessionRegistry.assertUsable` is.

Demonstrated consequences, each pinned by a characterization test named `GAP:` in
`credential-session-boundary.security.test.mjs`:

| Consequence | Effect |
|---|---|
| a binding object the service never issued dispatches successfully | an arbitrary `entitlement_id` can be asserted at dispatch |
| an expired binding dispatches successfully | `EXECUTION_BINDING_EXPIRED` exists in the service but is unreachable from dispatch, so the API-008 section 13 `BINDING_EXPIRED` code is never emitted |
| a revoked binding dispatches successfully | binding revocation has no effect on execution |
| omitting `credential_grant_id` skips the vault entirely | no credential is demanded |

The last item is only exploitable because of the first: if bindings were verified
against the issuing service, a caller could not choose to omit the grant.

The last item was only exploitable because of the first: with bindings verified,
a caller can no longer choose to omit the grant.

Remaining related gap: the dispatch boundary now rechecks the **binding**
lifecycle, but still does not recheck the **entitlement** lifecycle. An
entitlement revoked after its binding was issued is not caught at dispatch while
the binding remains live. That is tracked against issues #59 and #64 and is not
closed by this fix.

## 6. Reviewer checklist

For the accountable security and release reviewer. This document does not
pre-answer any of these.

- [ ] Is the fixture-only provider scope acceptable for the claim being made, and
      what exact wording may the implementation documents use?
- [ ] Are the section 4 exclusions acceptable, or must any be closed first?
- [ ] What is the disposition of each section 5 contract gap?
- [ ] **Section 5.1 is fixed. Confirm the fail-closed dispatch behavior change is
      acceptable, and decide whether the remaining entitlement-lifecycle recheck
      must land before this gate.**
- [ ] Is the issue #59 negative-test matrix required before this gate, or tracked
      as a follow-up with a named owner?
- [ ] Which issues among #58 to #63 may close, and with what stated scope?
- [ ] Does the parent lifecycle decision T-01 in
      `docs/change-control/TODO-Execution-Binding-Lifecycle.md` need to land
      first? T-01 remains blocked on the owner, and this gate does not resolve it.

## 7. Reproduction

```bash
npx vitest run packages/govibe-core/src/entitlement-runtime-conformance.test.mjs
```

Full baseline, which includes this suite:

```bash
npm run baseline:check
```

Recorded run on this branch: 44 test files, 334 tests passed, 1 skipped;
`docs:validate` PASS; build clean. A CI run reference is added when this branch
merges to `main`.

## 8. Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.0+draft | 2026-08-04 | ATHER | Section 5.1 fixed: dispatch now verifies binding authenticity, expiry and revocation against the issuing service, fail-closed, and emits the API-008 BINDING_EXPIRED code for the first time. Recorded the remaining entitlement-lifecycle recheck gap. Gate remains not passed. |
| 0.2.0+draft | 2026-08-04 | ATHER | Recorded the issue #59 dispatch-boundary negative matrix as closed, the two remaining #59 items as missing implementations rather than missing tests, and a new high-severity finding in section 5.1: binding authenticity is not verified at dispatch, so expired, revoked and never-issued bindings all reach the provider. Gate remains not passed. |
| 0.1.0+draft | 2026-08-04 | ATHER | Initial conformance evidence package for issue #64: suite coverage mapped to the acceptance criteria, explicit non-coverage, three recorded contract gaps, and a reviewer checklist. The gate is not passed and no implementation status is propagated. |
