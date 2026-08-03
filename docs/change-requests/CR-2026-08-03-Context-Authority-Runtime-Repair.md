---
title: "CR: Context Authority Runtime Repair and Execution-Binding Contract Gate"
doc_id: "FUTURE-CR-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
status: "verification_pending"
version: "0.2.1"
updated: "2026-08-03"
owner: "Boss"
decision_owner: "Boss"
approval_owner: "Boss"
approval_recorded_at: "2026-08-03"
execution_authorized: true
execution_complete: false
complexity: "C-3"
access_scope: "H3"
context_profiles: ["T-ctx", "W-ctx"]
risk: "HIGH"
source_of_truth: true
related_adrs: ["ADR-023", "ADR-024"]
related_apis: ["API-007", "API-008"]
related_documents:
  - "docs/change-requests/CR-2026-08-03-Phase2-Semantic-Authority-Decision-Packet.md"
  - "docs/change-control/change-requests/CR-2026-08-02-Knowledge-Context-Product-Alignment.md"
  - "docs/change-control/change-requests/CR-2026-08-02-Multi-Provider-Entitlement-Routing.md"
  - "docs/rca/RCA-2026-08-03-Context-Authority-Runtime-Repair.md"
  - "docs/change-control/change-requests/work-packets/WP-06-Context-Authority-Runtime-Repair.md"
---

# CR: Context Authority Runtime Repair and Execution-Binding Contract Gate

## 1. Decision boundary

Boss approved this bounded repair on 2026-08-03. It records an audited baseline
of 11 failing Vitest cases and the smallest authorized repair. Execution is now
permitted only within Sections 4, 5, 6, and the explicit D-01/D-02 selections
in Section 7; `execution_complete: false` remains controlling until the exit
gates and independent QA evidence are satisfied.

The higher of the two audit classifications governs: `C-3` / `H3` / `HIGH`, not
the prior `C-2` / `MEDIUM` conclusion. The repair crosses public authority
contract, MSP/context propagation, WorkspaceService, executor adapter, and the
draft API-008 schema boundary.

### [ASSUMPTIONS]

1. The audited baseline is clean `origin/main` commit
   `a5c8d2cc9173c99888ffe1c3580ee5f198924f07`.
2. The reported failure classifications must be reproduced before mutation.
3. ADR-023/API-007 govern context authority; draft ADR-024/API-008 cannot be
   silently completed by a repair patch.
4. The 35/35 strict fail-closed security baseline is intentional and immutable
   within this CR.

If any assumption is false, stop, refresh the RCA/impact record, and obtain
owner direction.

## 2. Authority chain

```text
audited evidence -> this CR/RCA -> ADR-023/API-007 -> ADR-024/API-008 decision
  -> approved WP-06 -> bounded change/tests -> independent QA evidence
```

```text
Executor/Agent -> GoVibe validation -> MSP context authority
  -> GKS canonical knowledge authority -> GenesisBlockDB
```

No repair may synthesize `govibe-context-authority/v1`, infer an allow policy,
invent lineage, widen MSP retrieval, introduce direct GKS/GenesisBlockDB access,
or disclose raw secrets. Provider output remains candidate-only until the
existing GoVibe -> MSP -> GKS promotion flow accepts it.

## 3. Audited baseline

| Matrix | Baseline | Disposition |
|---|---:|---|
| Executor-adapter | 5 fail | Fixture drift: governed requests lack full `govibe-context-authority/v1`, `policyDecision: allow`, and `contextLineage`. No production change for these five. |
| Capability | 3 fail | One failure exposes the continuation production defect: `packages/govibe-core/src/continue.mjs:65` calls without authority and `scripts/mcp/runtime/workspace-service.mjs:41` drops `args.contextAuthority`; the other capability fixtures are drift. |
| Migration | 1 fail | Context/MSP fixture drift; retain migration semantics and provide valid authority evidence. |
| MSP live | 2 fail | Fixture drift only; align complete governed requests without changing production behavior for these cases. |
| Full suite | 180 pass, 11 fail, 1 skip | 192 current test cases; baseline only. |
| Security | 35/35 pass | Strict fail-closed controls remain unchanged. |

The canonical RCA records evidence, root cause, escape path, and prevention.
The `.brain` record is only a governed pointer, never a duplicate authority.

## 4. Scope after approval

1. Align the five executor-adapter fixtures only with complete caller-supplied
   authority, allow policy, and lineage.
2. Repair continuation authority propagation: `continue.mjs` accepts only
   caller-supplied authority; WorkspaceService forwards and validates it before
   `resolveContext`; no callee convenience default is allowed.
3. Repair the capability-runtime continuation defect at the approved boundary,
   then align the remaining capability, migration, and MSP-live fixtures when
   evidence proves drift, without changing fail-closed behavior.
4. Select an explicit disposition for legacy vault-context-surface
   `resolveContext`, which lacks authority: valid propagation, rejection of
   authority-less governed requests, or approved deprecation/removal.
5. Resolve the execution-binding identity decision in Section 7 before claiming
   runtime completion.
6. Add focused positive and fail-closed tests; preserve strict security tests.

## 5. Out of scope

- broad MSP, GKS, router, adapter, or provider refactors;
- synthetic authority, fallback-to-allow, context-policy widening, raw secret,
  unrestricted traversal, or direct GKS/GenesisBlockDB runtime capability;
- validation reordering merely to accommodate fixtures;
- weakened security assertions;
- a new ADR unless the owner decision changes architecture beyond ADR-024/API-008;
- closure claims for unrelated document, roadmap, or legacy queues.

## 6. Validation-order constraint

Authority currently validates before binding. API-008 does not specify
invalid-multi-gate precedence. Positive fixtures must satisfy unrelated
prerequisites to reach their target assertion. Do not reorder production unless
an owner-approved contract decision defines a public precedence rule.

## 7. Required owner decisions

### D-01: Execution-binding identity mismatch (blocking)

The binding service emits `actor_id`, the adapter requires `principal_id`, and
API-008 defines neither mapping nor correlation. This is a HIGH-risk
service/adapter contract mismatch, not fixture-only work.

| Option | Bounded consequence |
|---|---|
| A. Approve contract-alignment slice | Amend API-008 with identity/correlation semantics; implement the smallest compatible mapping and tests. No ADR unless authority architecture changes. |
| B. Defer alignment | Preserve fail-closed adapter behavior and mark runtime completion incomplete; the 11-test repair cannot claim full runtime conformance. |

Recommended posture: **A**, narrowly approved; otherwise a truthful
runtime-completion claim is blocked.

**Approved selection (Boss, 2026-08-03): Option A.** The bounded
contract-alignment slice may define and implement the smallest compatible
`actor_id` / `principal_id` identity-correlation rule with focused tests.
API-008 remains `draft` until that implementation alignment is validated by the
approved exit gate; this authorization does not promote API-008.

### D-02: Legacy `resolveContext` disposition (blocking)

Approve valid authority propagation, authority-less governed-request rejection,
or formal deprecation/removal. No implicit authority or silent downgrade.

**Approved selection (Boss, 2026-08-03):** propagate only caller-supplied valid
authority through the legacy `resolveContext` surface. Missing or invalid
authority must fail closed; no synthetic authority is permitted.

### D-03: Repair authorization

Approve exact files, owner, test scope, and QA gate in WP-06; state the D-01
and D-02 selections explicitly.

**Approved selection (Boss, 2026-08-03):** execute the bounded WP-06 scope,
subject to every acceptance, security, validation, impact, rollback, and
independent-QA gate in this CR and WP-06.

## 8. Acceptance criteria

- AC-01: reproduce the audited 11-failure matrix and retain command output.
- AC-02: fix all five executor-adapter failures by fixture alignment only.
- AC-03: the capability-runtime continuation path forwards and validates
  caller-supplied authority at `continue.mjs:65` and WorkspaceService:41;
  absent or invalid authority fails closed.
- AC-03a: both MSP-live failures and the migration failure are repaired by
  fixture alignment only; they introduce no production behavior change.
- AC-04: legacy route has the selected explicit disposition and no bypass.
- AC-05: D-01 is implemented under approved API-008 alignment or deferred with
  incomplete runtime closure stated everywhere.
- AC-06: strict fail-closed security tests remain unchanged and 35/35 pass.
- AC-07: all 192 current test cases have 0 failures; the skip count is explicit
  (target inventory: 191 pass, 0 fail, 1 skip unless approved inventory changes).
- AC-08: focused tests, lint, build, MCP smoke, docs validation, diff check,
  and independent QA pass.

## 9. Success criteria and Definition of Done

Success is governed enforcement without invented authority, weakened security,
or widened MSP/GKS boundaries. DoD requires all ACs; owner selections; parent
and peer review; bounded impact analysis; independent QA; exact commands and
results; evidence/source hashes; final commit hash; and clean `git diff --check`.
State final pass/fail/skip counts and any deferred D-01 closure. No raw secret,
unrestricted traversal, direct GKS, or direct GenesisBlockDB capability may
appear in code or evidence.

## 10. Pending approved-execution plan

1. Reconfirm base/docs and the 11-failure matrix. Verify captured output/hashes.
2. Implement only D-01/D-02 selections and smallest fixture/propagation changes.
   Verify focused positive and fail-closed tests.
3. Review direct and bounded transitive impact across services, adapters, tests,
   MCP, docs, and operations. Record unresolved links.
4. Run security, full suite, lint, build, MCP smoke, docs validation, and diff.
5. Obtain independent QA acceptance; commit only approved scope with evidence.

## 11. Impact/backlink limits and rollback

Bounded discovery chain:

```text
ADR-023/API-007 -> context authority -> continue/WorkspaceService/legacy surface
ADR-024/API-008 -> execution binding -> binding service/provider adapter
  -> affected Vitest/security/MCP evidence
```

Record relation chain, graph distance, impact score, required action, cycle
handling, and unresolved links. Grep may discover candidates but cannot prove
coverage or widen retrieval. Before mutation, capture hashes and inverse patches
for every approved file; rollback in reverse dependency order, rerun baseline,
and never restore an authority bypass.

## 12. Review-gate disposition

Independent review returned **REQUEST CHANGES** on the initial proposal. This
revision accepts the P1 corrections: the production propagation defect belongs
to the capability-runtime matrix, both MSP-live failures are fixture drift, and
the authoritative RCA is registered outside the non-SOT registry section. It
also records the direct `git diff --check` completion gate in WP-06. No runtime
or test mutation was made while applying this documentation correction.

## 13. Implementation verification record (local only)

### Current disposition

The approved WP-06 implementation is locally verified and independently
reviewed **APPROVED** for the bounded scope. This is not a CI, merge, or
release claim: `execution_complete: false` remains controlling while remote CI
and PR merge evidence are pending.

### Base, head, and inventory

- Audited baseline / merge base: `a5c8d2cc9173c99888ffe1c3580ee5f198924f07`.
- Implementation worktree head before this commit: `3d4cdaef6b918b81cf159997d752c67bb6a566e2`
  (`docs: authorize context authority runtime repair`).
- Local inventory: 212 Vitest cases = **211 pass, 0 fail, 1 skip**; the
  previous 192-case target was superseded by the approved focused regressions.
- Security inventory: **35/35 pass**; strict fail-closed assertions remain in
  place.
- Selected post-repair source blob IDs: `authority-enforcement.mjs`
  `28eccaffd55c8aaf83c3efaa4b7343a39204502b`, `continue.mjs`
  `82af5f8b0019ef64d665b1e843fd96a04a31aac4`,
  `execution-binding-service.mjs` `9414d19261454a85244dd41591926cfd1702d4ef`,
  `executor-adapter.mjs` `ff24d3a141e95db9061d4f91438ae34e7e2bb4ce`,
  `workspace-service.mjs` `5797ff314f23be2ec31aa7b96f1596680fad8f28`, and
  `vault-context-surface.mjs` `4058c80bb28bb610929b50e83bcd1f53f9724c67`.

### Local evidence commands and results

| Command | Result |
|---|---|
| `npm test` | PASS — 37 files, 211 pass / 1 skip / 0 fail; its included security gate passed 35/35. |
| `npm run test:security` | PASS — 35/35. |
| `npm run lint` | PASS — `tsc --noEmit`. |
| `npm run build` | PASS — `tsc && vite build`. |
| `npm run mcp:smoke` | PASS — 15 tools, 90 roadmap nodes, launcher exit 0. |
| `npm run docs:validate` | PASS — 357 Markdown files, 191 document IDs, 819 path references; only pre-existing baseline warnings. |
| `npm run roadmap:validate` | PASS — 7 sources, 0 errors; 14 pre-existing quality warnings. |

The commit gate still requires `npm run diff:check` and direct
`git diff --check` against the final closure-doc diff.

### Bounded impact disposition

| Changed seed | Relation chain / distance | Required action | Disposition |
|---|---|---|---|
| Context-authority validation | `ADR-023/API-007 -> continuation / WorkspaceService / legacy resolve -> focused tests` (1-3) | Forward only caller authority; fail closed before MSP. | Implemented and locally verified. |
| D-01 binding identity correlation | `ADR-024/API-008 -> binding service -> executor adapter -> focused tests` (1-3) | Require the bounded actor/principal and scope tuple; retain only schema-absent principal-only legacy compatibility. | Implemented and locally verified; API-008 remains draft. |
| Runtime command surface | `WorkspaceService / vault-context surface -> MCP smoke / security controls` (1-2) | Preserve parent-only MSP boundary and no retrieval widening. | Implemented and locally verified. |

Traversal was bounded to the approved CR/WP relations. No canonical graph query
was available for a completeness claim; no additional `must_update` relation
was identified in this bounded review. The timestamp-only dirty
`scripts/mcp/graph-dispatch-authority.security.mjs` has the same blob ID as
`HEAD` and is explicitly excluded from the commit.

### Remaining gates

- Remote CI evidence has not been obtained.
- The PR has not been merged.
- No release, deployment, or final completion claim is authorized.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.1 | 2026-08-03 | ATHER | Recorded local 212-case and 35/35 security evidence, bounded impact disposition, and independent-review approval; status is verification pending while remote CI and merge remain outstanding. |
| 0.2.0 | 2026-08-03 | Boss | Approved D-01 Option A, D-02 caller-supplied valid authority propagation, and D-03 bounded WP-06 execution; API-008 remains draft pending validated implementation alignment. |
| 0.1.1+draft | 2026-08-03 | THESEUS / ATHER | Corrected capability-runtime versus MSP-live failure attribution and recorded the review-gate disposition. |
| 0.1.0+draft | 2026-08-03 | THESEUS / ATHER | Created proposal-only C-3/H3/HIGH repair boundary for the audited 11 Vitest failures, including authority, legacy-surface, and binding-contract owner decisions. |
