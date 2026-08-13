---
title: "Evidence: Provider Entitlement Runtime Conformance"
doc_id: "EVIDENCE-PROVIDER-ENTITLEMENT-RUNTIME-CONFORMANCE"
status: "draft"
version: "0.6.0+draft"
updated: "2026-08-14"
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
  - 76
  - 109
  - 110
  - 111
  - 112
related_apis: ["API-008", "API-009"]
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
describe the full entitlement runtime as production or commercially ready.**
Repository-scoped slices may still be described with their exact implementation
and test evidence.

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

### 3.1 MSP health boundary evidence (#76)

`packages/msp-runtime/test/health.test.mjs` proves the MSP-owned
`govibe-msp-health/v1` response for ready, GKS-blocked/unavailable,
MSP/storage-unavailable, timeout, and malformed probe cases. The GoVibe
`MspClient.probeHealth()` tests prove invalid or unreachable parent responses
become bounded `unavailable` results. This is process/SQLite health evidence; it
does not prove a persistent external provider, a GKS provider, or restart E2E.

## 4. Not covered

This section exists so the gate reviewer is not asked to infer absence.

### 4.1 Not wired into the product

Eight of the nine entitlement runtime modules — the planner, router, execution
binding service, credential vault, provider session registry, usage ledger,
adapter host, and entitlement registry — are not reachable from the MCP
server, the sidecar, or `packages/govibe-core/src/index.mjs`. They stay
deliberately unexported, because exporting them would imply an available
capability before this gate.

One module is not in that set. `createExecutorRegistry`
(`executor-adapter.mjs`) **is exported** from
`packages/govibe-core/src/index.mjs` (line 20:
`export { createExecutorRegistry, ProviderUnavailableError } from "./executor-adapter.mjs";`)
and **is constructed in the production runtime**, in
`scripts/mcp/runtime-core.mjs` (line 76:
`this.executorRegistry = createExecutorRegistry(options.executorAdapters ?? {});`).
No second argument is passed, so `credentialVault`, `sessionRegistry`, and
`bindingService` all default to `null`. The only method the production
runtime calls on the resulting registry is `.inspect()`
(`scripts/mcp/runtime-core.mjs` line 80:
`this.snapshot.providers = this.executorRegistry.inspect();`); `.execute()`
is never called from production code.

**Implication:** no dispatch path is live today — with all three services
null, a call to `.execute()` from production code would fail closed on
`EXECUTION_BINDING_SERVICE_REQUIRED` (section 5.1) before it could reach a
provider. But this one module is production-reachable in a way the other
eight are not, and it is the fail-closed
`EXECUTION_BINDING_SERVICE_REQUIRED` guard — not the absence of an exported,
constructed registry — that is protecting it. Consequently there is **no
evidence of behavior under the real dispatch path**, only under the suite's
own wiring and under `.inspect()` in the production runtime.

### 4.2 No real provider

No live provider was contacted. Quota accuracy, rate-limit semantics, session
affinity behavior, prompt-cache behavior and adapter error taxonomy for any real
provider are unevidenced.

### 4.3 Issue #59 repository boundary: derived handoff implemented, production evidence open

`packages/govibe-core/src/credential-session-boundary.security.test.mjs`
and the credential handoff/vault/executor suites close the repository dispatch
boundary. PR #108 landed
alongside the section 5.1 binding-authenticity fix: it flipped four existing
`GAP:` characterization tests to assert rejection instead of demonstrating the
vulnerability, and added two new tests — a binding whose claimed entitlement
differs from the issued one, and dispatch with no binding service wired at
all — bringing the file from 28 to 30 tests. Every test asserts on a spy that
the provider was **never invoked**, not merely that a promise rejected:

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
  error detail, or inspection surface;
- explicit `derived_token` mode binds provider, adapter and binding IDs, passes
  raw bytes only to the adapter-owned deriver, gives `execute` an opaque
  `govibe-credential-handoff/v1`, wipes the vault bytes, and fails closed on
  missing deriver, mode substitution, invalid handoff, or raw-secret reuse.
- the provider-neutral encrypted vault backend stores AES-256-GCM ciphertext
  with a fresh nonce and authentication tag, exposes metadata-only inspection,
  and returns fresh plaintext bytes only for the protected vault callback;
- credential records and grants carry a generation; rotation replaces the
  protected record and stale grants fail closed before provider invocation;
  revocation increments the generation, invalidates grants, and purges the
  protected record.

The compatibility registry is now implemented and checked before dispatch;
missing, expired, product/plan/surface-mismatched, or adapter-mismatched
records fail closed. This repository slice is evidence for the corresponding
negative paths, not production provider evidence.

Still open and **not** covered:

- **real-provider/durable backend handoff is not implemented.** No external
  provider or durable credential backend was contacted, so provider-specific
  token exchange, durable key management, restart persistence, backup deletion,
  and provider-side revocation remain unevidenced. The encrypted backend proof
  is process-local repository evidence only.
- **full operational threat-model evidence remains open.** The repository
  fixture does not establish protected child-process environments, durable
  audit/retention behavior, or human security/release review.

### 4.4 No durable storage

The usage ledger and encrypted credential backend hold records in process
memory. The encrypted backend protects the record while held by that process,
but retention configuration, durable persistence, key recovery, backup deletion,
and behavior across process restart are unevidenced.

### 4.5 No performance, concurrency or load evidence

Concurrency limits, queue behavior under contention, and routing stability under
parallel dispatch are untested.

## 5. Recorded contract gap dispositions

The follow-up issue sweep resolved the three repository-observable contract gaps
without widening the provider-facing authority boundary. The final conformance
gate remains `not_passed` because the external-provider, durable-ledger, and human
security/release review evidence is still absent.

| Former gap | Evidence of disposition | Issue |
|---|---|---|
| The usage-event schema had no `not_applicable` telemetry classification | API-008 section 10 now defines `not_applicable_fields`; the ledger validates known, disjoint classifications and a local-compute fixture proves N/A versus unknown separation. | #110 |
| The scheduler decision record was not distinguished from the provider contract | SDD section 9.1 explicitly governs `govibe-scheduler-decision/v1` as internal GoVibe evidence, not API-008/provider surface. | #109 |
| Dispatch selected an adapter by `provider_id` | The executor resolves the exact binding `adapter_id`, verifies provider/compatibility alignment, and the two-adapter security test proves the selected adapter is the one bound. | #111 |
| Credential handoff had no derived-token boundary | `credential_mode` and `govibe-credential-handoff/v1` are now explicit; targeted vault/executor/security fixtures prove raw-secret isolation and fail-closed derivation. Real-provider and durable-backend evidence remain absent. | #59 |
| Credential lifecycle had no encrypted-at-rest or generation fixture | The provider-neutral AES-256-GCM backend, metadata-only inspection, generation-capturing grants, rotation stale-grant rejection, and revocation purge are covered by targeted vault/security tests. Durable key/storage and provider-side revocation remain absent. | #59 |

These dispositions do not close issue #64: the gate still requires evidence beyond
repository fixtures and local CI.

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
- [x] Which issues among #58 to #63 may close, and with what stated scope?
      Owner ruling (Boss, 2026-08-05, recorded by the final-gate session):
      #58, #60, #61 and #62 close on their own acceptance criteria, each with a
      scoped closure comment stating that runtime conformance remains gated on
      #64. #59 and #63 stay open pending the compatibility registry (#112) and
      the #59 scope items. Follow-up issues #109, #110, #111 and #112 were
      filed for the section 5 gaps and the compatibility registry before
      #61/#62 closed.
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

Recorded repository verification on this branch (2026-08-14):

- `npm run baseline:check`: PASS, including environment validation,
  `docs:validate`, `roadmap:validate`, TypeScript lint, full Vitest/security
  suites, and build;
- full Vitest: 77 test files, 663 tests passed, 1 skipped;
- security suite: 65 tests passed;
- `npm run mcp:smoke`: PASS;
- targeted credential-handoff/lifecycle suites: 6 files, 100 tests passed;
- `git diff --check`: PASS.

The Playwright landing-page matrix did not complete within 300 seconds. A
single-worker Chromium run completed 28 tests and exposed one existing landing
smooth-scroll viewport timeout in `e2e/landing-page.spec.ts`; this UI failure is
outside issue #59 and is not represented as credential-handoff evidence.

Historical main evidence: commit `b8604d7`
(full sha `b8604d701fc58d62a4de0ab72b35099bfa688c12`) is the merge commit for
PR #108 ("fix(security): verify binding authenticity at dispatch (#59)",
branch `fix/issue-59-binding-authenticity`). CI run for that commit: workflow
**"E2E Tests — CI Pipeline"**, conclusion `success`,
<https://github.com/Freshair129/govibe/actions/runs/30863047065> (run id
`30863047065`).

The current encrypted-backend and generation/rotation slice is on Draft PR
#135 and is not merged to `main`; its post-push CI result must be recorded
separately before any issue-closure decision.

## 8. Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.6.0+draft | 2026-08-14 | ATHER | Recorded encrypted-at-rest fixture and credential generation/rotation repository evidence for #59; durable/provider storage and human review gates remain open. |
| 0.5.0+draft | 2026-08-14 | ATHER | Recorded explicit derived-token handoff and compatibility-registry repository evidence for #59; real-provider, durable-storage, and human review gates remain open. |
| 0.4.0+draft | 2026-08-14 | ATHER | Dispositioned the #109, #110 and #111 contract gaps and recorded bounded #76 MSP health evidence; gate remains not passed for external-provider, durable-ledger, and human review requirements. |
| 0.3.2+draft | 2026-08-05 | Claude (final-gate session) | Recorded the owner's section 6 ruling: #58, #60, #61, #62 closed on their own acceptance criteria with scoped comments; #59/#63 stay open pending #112 and the #59 scope items; follow-up issues #109–#112 filed for the section 5 gaps. No change to review_state or gate_state. |
| 0.3.1+draft | 2026-08-05 | Claude (adversarial gate correction) | Factual corrections from adversarial gate review: section 4.1 boundary statement (createExecutorRegistry is exported and constructed in runtime-core.mjs with null services, inspect-only usage), test count 28→30 in section 4.3, and CI reference status in section 7 (merge commit b8604d7, run id 30863047065, success). No change to review_state or gate_state. |
| 0.3.0+draft | 2026-08-04 | ATHER | Section 5.1 fixed: dispatch now verifies binding authenticity, expiry and revocation against the issuing service, fail-closed, and emits the API-008 BINDING_EXPIRED code for the first time. Recorded the remaining entitlement-lifecycle recheck gap. Gate remains not passed. |
| 0.2.0+draft | 2026-08-04 | ATHER | Recorded the issue #59 dispatch-boundary negative matrix as closed, the two remaining #59 items as missing implementations rather than missing tests, and a new high-severity finding in section 5.1: binding authenticity is not verified at dispatch, so expired, revoked and never-issued bindings all reach the provider. Gate remains not passed. |
| 0.1.0+draft | 2026-08-04 | ATHER | Initial conformance evidence package for issue #64: suite coverage mapped to the acceptance criteria, explicit non-coverage, three recorded contract gaps, and a reviewer checklist. The gate is not passed and no implementation status is propagated. |
