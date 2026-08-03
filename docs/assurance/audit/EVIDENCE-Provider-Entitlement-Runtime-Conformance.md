---
title: "Evidence: Provider Entitlement Runtime Conformance"
doc_id: "EVIDENCE-PROVIDER-ENTITLEMENT-RUNTIME-CONFORMANCE"
status: "draft"
version: "0.1.0+draft"
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

### 4.3 Issue #59 negative-test matrix incomplete

The sharing policy section 14 list is only partly covered here. Not covered:
expired compatibility records, product/plan/surface mismatch, cross-workspace
authorization crossing, cross-user session reuse attempts, and revocation
occurring between authorization and invocation. Derived-token handoff to adapters
is also unevidenced. These belong to issue #59 and must be closed before or with
this gate.

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

## 6. Reviewer checklist

For the accountable security and release reviewer. This document does not
pre-answer any of these.

- [ ] Is the fixture-only provider scope acceptable for the claim being made, and
      what exact wording may the implementation documents use?
- [ ] Are the section 4 exclusions acceptable, or must any be closed first?
- [ ] What is the disposition of each section 5 contract gap?
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
| 0.1.0+draft | 2026-08-04 | ATHER | Initial conformance evidence package for issue #64: suite coverage mapped to the acceptance criteria, explicit non-coverage, three recorded contract gaps, and a reviewer checklist. The gate is not passed and no implementation status is propagated. |
