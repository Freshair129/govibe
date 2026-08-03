---
title: "WP-06: Context Authority Runtime Repair"
doc_id: "WP-06-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
status: "approved"
version: "0.2.3"
updated: "2026-08-03"
owner: "Boss"
approval_owner: "Boss"
approval_recorded_at: "2026-08-03"
execution_authorized: true
execution_complete: true
complexity: "C-3"
access_scope: "H3"
risk: "HIGH"
source_of_truth: false
parent_change_request: "FUTURE-CR-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
---

# WP-06: Context Authority Runtime Repair

## Objective

Under Boss approval recorded on 2026-08-03, repair the audited 11-test matrix without
synthesizing authority, weakening fail-closed controls, or widening MSP/GKS
access. This approved work packet authorizes only its bounded scope.

## Approval record

- D-01: Boss selected Option A: perform the smallest API-008-governed
  `actor_id` / `principal_id` contract-alignment slice with tests. API-008
  remains draft pending a separate lifecycle/promotion decision. The alignment
  passed the WP-06 exit gate; this work packet does not promote API-008.
- D-02: Boss selected caller-supplied valid authority propagation for legacy
  `resolveContext`; missing or invalid authority fails closed and is never
  synthesized.
- D-03: Boss authorized bounded WP-06 execution under the listed scope and
  gates. `execution_complete` is not implied by this authorization.

## Preconditions

- Boss approval of the parent CR and all three decisions is recorded above.
- Implementer reproduces 180 pass / 11 fail / 1 skip before mutation.
- ADR-023/API-007 remain governing; ADR-024/API-008 change only under approved
  contract alignment.

## Bounded execution scope

1. Align five executor-adapter fixtures only; do not change production for them.
2. Repair the capability-runtime propagation defect at
   `packages/govibe-core/src/continue.mjs:65` and
   `scripts/mcp/runtime/workspace-service.mjs:41`: forward/validate caller
   authority before context resolution.
3. Align the two remaining capability, one migration, and two MSP-live fixtures
   only; these are fixture-drift cases.
4. Implement only the selected legacy and identity-contract dispositions.
5. Add focused regression tests and keep strict security tests unchanged.

## Exit gate

- 192 current test cases: 0 fail; record skip count (target 191 pass/0 fail/1 skip).
- Security suite 35/35 pass without weakened fail-closed assertions.
- Focused tests, lint, build, MCP smoke, `npm run docs:validate`,
  `npm run diff:check`, and direct `git diff --check` pass.
- Bounded impact record, independent QA acceptance, evidence hashes, final diff,
  and commit hash are retained.
- No raw secret, unrestricted traversal, direct GKS, or direct GenesisBlockDB.

## Rollback

Capture pre-change hashes and inverse patches; revert in reverse dependency
order, rerun the baseline matrix, and never restore an authority bypass.

## Local verification and closure hold

- Independent implementation review: **APPROVED** for the approved WP-06
  boundary.
- `npm test`: PASS — 37 test files, **211 pass / 0 fail / 1 skip** (212 total).
- `npm run test:security`: PASS — **35/35**.
- `npm run lint`, `npm run build`, and `npm run mcp:smoke`: PASS.
- `npm run docs:validate`: PASS (baseline documentation warnings only).
- `npm run roadmap:validate`: PASS (0 errors; 14 baseline quality warnings).
- Final-diff gates remain `npm run diff:check` and `git diff --check`.

The 212-case inventory supersedes the original 192-case exit target because
the approved focused tests were added.

### Bounded impact disposition

`ADR-023/API-007 -> continuation, WorkspaceService, legacy resolve -> tests`
and `ADR-024/API-008 -> binding service, executor adapter -> tests` were
reviewed at bounded distances 1-3. Required repair actions are locally
verified; no additional `must_update` artifact was found within the approved
relation radius. Graph coverage outside this packet is unresolved and does not
support a completeness claim.

## Final execution closure

The approved WP-06 scope is complete: PR [#89](https://github.com/Freshair129/govibe/pull/89)
merged from head `80e4746b86fa3164a22cf732b63d6a27d835aa9b` as
`d34cf9c917a0bc4b002bd2970657f5dad30e08a6` at `2026-08-03T08:27:14Z`.
Remote E2E succeeded (run `30797326373`, job `91633754354`), remote P0 verify
succeeded (run `30797326425`, job `91633754461`), and Vercel succeeded.

The final local evidence is 211 pass / 0 fail / 1 skip (212 total), security
35/35, and passing lint, build, MCP smoke, docs validation, roadmap validation,
diff check, and whitespace check. Independent review approved the bounded
scope. This is execution closure only, not a deployment/release assertion and
not a promotion of draft API-008 or parent contracts.

The bounded impact disposition remains unchanged: all required actions within
the reviewed distance 1-3 chains were completed; graph coverage beyond that
radius is unresolved. Schema-less principal-only legacy binding remains a
governed compatibility residual under draft API-008, not a closed defect or
an authority bypass.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.3 | 2026-08-03 | ATHER | Corrected D-01 lifecycle wording: API-008 alignment passed WP-06 but remains draft pending a separate lifecycle/promotion decision. |
| 0.2.2 | 2026-08-03 | ATHER | Closed WP-06 execution with PR #89 merge, remote checks, Vercel, final local gates, approved review, bounded impact disposition, and governed legacy residual; API-008 remains draft. |
| 0.2.1 | 2026-08-03 | ATHER | Moved to verification pending; recorded 212-case local gate evidence, bounded impact disposition, and the remote-CI/merge closure hold. |
| 0.2.0 | 2026-08-03 | Boss | Recorded approval of the bounded WP-06 execution and explicit D-01/D-02 selections; API-008 remains draft pending validated alignment. |
| 0.1.1+draft | 2026-08-03 | THESEUS / ATHER | Corrected capability-runtime and MSP-live test mapping; added direct `git diff --check` to the exit gate. |
| 0.1.0+draft | 2026-08-03 | THESEUS / ATHER | Opened owner-gated proposal WP-06; implementation remains unauthorized. |
