---
title: "SDD: Execution Routing and Governed Failover"
doc_id: "SDD-EXECUTION-ROUTING-AND-FAILOVER"
status: "draft"
version: "0.3.0+draft"
updated: "2026-08-14"
owner: "ARCHON / ATHER"
source_of_truth: true
prd_system: "SYSTEM-06::MCP-Runtime-System"
related_issues:
  - 55
  - 59
  - 60
  - 61
  - 62
  - 64
  - 109
related_docs:
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/architecture/RECONCILIATION-API-005-006-008-Executor-Router.md"
  - "docs/security/POLICY-Provider-Adapter-Enablement.md"
  - "docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md"
  - "docs/roadmap/BACKLOG-provider-entitlement-runtime.md"
---

# SDD: Execution Routing and Governed Failover

## 1. Purpose and non-claims

This document specifies the routing and failover behavior delivered under issue
#62 and defines the scheduler decision evidence record it emits.

It is not a runtime conformance claim. The router is repository-observable code
with unit tests and is not wired into dispatch. Issue #64 remains the only gate
that may report the entitlement runtime as implemented.

## 2. Position in the dispatch chain

```text
API-006 persisted context
  -> API-008 capability planning        (authorization decided here)
  -> execution routing                  (preference decided here)
  -> API-008 execution binding
  -> adapter enablement gate
  -> provider adapter dispatch
```

Routing sits **between** planning and binding. It is a preference layer over an
authorization decision that has already been made.

## 3. Canonical rule: authorization first

The router scores only targets the planner already returned in
`eligible_targets`. It has no path to:

- add a target the planner did not authorize;
- resurrect a target the planner rejected;
- alter an eligibility reason;
- convert a score into an authorization.

Exclusions are subtractive only. `exclude_targets` can remove a candidate; it can
never introduce one. When every candidate is excluded, routing fails closed with
`NO_AUTHORIZED_ENTITLEMENT` and still writes a decision record.

Least-load, random, or reliability-weighted selection therefore cannot bypass
authorization by construction, not by convention: the unauthorized target is
never in the array being scored.

## 4. Score inputs

| Component | Weight | Source |
|---|---:|---|
| capability fit | 0.35 | required capabilities matched by the resolved target |
| quota | 0.25 | quota snapshot, see section 5 |
| reliability | 0.20 | caller-supplied observation, neutral when absent |
| queue delay | 0.10 | caller-supplied depth, neutral when absent |
| affinity | 0.10 | sticky-routing bonus, see section 6 |

Every component is bounded to `[0,1]`. An absent signal is **neutral (0.5)**, not
zero and not one: absence of a measurement is not a measurement.

## 5. Quota is a preference signal, never a capacity number

| Snapshot state | Score | Recorded signal |
|---|---:|---|
| `observed_rate_limit.limited: true` | 0 | `observed_rate_limit` |
| `detailed` visibility with reported remaining > 0 | 1 | `provider_reported` |
| `detailed` visibility with reported remaining = 0 | 0 | `provider_reported` |
| scheduler capacity estimate, source ≠ `provider` | estimate | `scheduler_estimated` |
| `unknown` or `rate-limit-only` visibility, or no snapshot | 0.5 | `unknown` |

A provider whose limit semantics are unknown is **never** converted into an exact
token capacity, which API-008 section 14 prohibits. The recorded `quota_signal`
makes the distinction auditable: a reader can tell a provider-reported figure
from a scheduler estimate from an unknown, without re-deriving it.

An observed rate limit is a real observation and scores zero. That is a
measurement of throttling, not an inferred capacity.

## 6. Affinity is an optimization, never a memory-validity signal

Sticky routing keys on workspace, project, agent, workflow, provider and model
family. The affinity target receives a **bonus of at most 0.10** and nothing else.

Specifically, affinity:

- does not make an ineligible target eligible;
- does not survive re-authorization — a sticky target whose entitlement is
  revoked is simply absent from the next candidate set and is dropped without
  error;
- does not imply that provider-side session or prompt-cache state is still valid;
- never substitutes for context lineage.

Every decision record restates `affinity_is_optimization_only: true` so an
evidence reader never has to infer it.

## 7. Failover and rebind

A rebind consumes `govibe-execution-rebind-request/v1` (API-008 section 12) and
enforces:

| Rule | Failure code |
|---|---|
| the request must name the supplied previous binding | `PREVIOUS_BINDING_MISMATCH` |
| `context_id` and `context_hash` must equal the previous binding's | `CONTEXT_LINEAGE_CHANGED` |
| the failed target is excluded from the new candidate set | — |
| planning re-runs, so entitlement policy is re-evaluated | `NO_AUTHORIZED_ENTITLEMENT` |
| the result must carry a new `binding_id` | `REBIND_BINDING_NOT_NEW` |
| the result must preserve context identity and hash | `CONTEXT_LINEAGE_CHANGED` |

**A context change is not a rebind.** Changed context is a context-lineage event
requiring a new MSP context packet. Attempting to carry changed context through
an execution rebind fails closed.

Because planning re-runs rather than being cached, a fallback entitlement that was
revoked between the original binding and the failover is rejected at failover
time.

Credential lifecycle is rechecked at the same boundary. A run-scoped grant
captures the credential generation at issuance; rotation changes that generation
and makes older grants invalid before adapter invocation. Rebind/failover must
obtain a new grant and must never inherit credential material or provider-session
state from the failed binding. This repository evidence is provider-neutral and
process-local; durable key management and provider-side revocation remain open.

## 8. Downgrade reporting

When failover selects a target weaker than the previous one, the decision record
names each downgrade explicitly rather than silently accepting it:

- `model` — a different model id;
- `provider` — a different provider;
- `context_limit` — a smaller context window;
- `usage_visibility` — losing `detailed` telemetry.

This satisfies the API-008 section 14 prohibition on silently downgrading tools,
model capability, privacy, residency, or context semantics. Reporting a downgrade
is not approving it; an operator or the #64 gate decides whether it is acceptable.

## 9. Scheduler decision evidence

Schema identifier: `govibe-scheduler-decision/v1`

```yaml
schema: govibe-scheduler-decision/v1
decision_id: string
reason: INITIAL_ROUTE|FAILOVER_REBIND
failure_code: string|null
previous_binding_id: string|null
affinity_key: string|null
affinity_target_key: string|null
affinity_target_still_eligible: boolean
excluded_targets: [string]
candidates:
  - target_key: string
    provider_id: string
    entitlement_id: string
    model_id: string
    score: number
    components: {capability_fit, quota, reliability, queue, affinity}
    quota_signal: provider_reported|scheduler_estimated|observed_rate_limit|unknown
    quota_reason: string
    affinity_hit: boolean
selected_target_key: string|null
downgrades: [{kind, from, to}]
outcome: SELECTED|NO_ELIGIBLE_TARGET
affinity_is_optimization_only: true
quota_signals_are_not_capacity: true
decided_at: string
```

The decision id is written into the resulting binding's
`policy_decision_refs` as `scheduler:<decision_id>`, so a binding can be traced
back to the scoring that produced it.

### 9.1 Internal evidence boundary

`govibe-scheduler-decision/v1` is intentionally governed by this SDD as
GoVibe-internal execution evidence. It is not an API-008/provider contract and
is not exchanged with any provider. The decision record is carried through
`policy_decision_refs` as an opaque internal reference.

This boundary resolves the issue #109 acceptance question: the scheduler schema
does not need to be added to API-008 unless a future owner decision promotes it
to a provider-facing surface.

## 10. Required tests

- an unauthorized entitlement is never selected regardless of score;
- exclusion of every candidate fails closed and still records a decision;
- an incompatible tool contract is rejected before routing runs;
- observed rate limit, unknown semantics and scheduler estimates score and are
  labelled distinctly;
- a sticky target that loses authorization is dropped, not honoured;
- failover produces a new binding id, excludes the failed target and preserves
  context identity and hash;
- a revoked fallback entitlement is rejected at failover time;
- a rotated credential's stale grant is rejected before adapter invocation;
- a changed context id or hash is rejected;
- downgrades are reported;
- one decision record exists per routing attempt, including failures.

## 11. Completion gate

This design is satisfied for repository scope when the tests in section 10 pass
on `main`. Wiring the router into dispatch, operating the quota/reliability/queue
signal sources, and the final runtime conformance gate remain open under issues
#62 and #64.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.0+draft | 2026-08-14 | ATHER | Added the credential-generation rule for rotation/rebind and recorded the provider-neutral, process-local evidence boundary for issue #59. |
| 0.2.0+draft | 2026-08-14 | ATHER | Clarified that `govibe-scheduler-decision/v1` is SDD-governed internal evidence, not an API-008/provider contract, resolving the issue #109 contract-boundary acceptance. |
| 0.1.0+draft | 2026-08-04 | ARCHON / ATHER | Initial routing and governed failover design with the scheduler decision evidence record delivered under issue #62; records the API-008 gap for the decision schema and claims no runtime conformance. |
