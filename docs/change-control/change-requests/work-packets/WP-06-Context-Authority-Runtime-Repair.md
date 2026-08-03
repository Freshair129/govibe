---
title: "WP-06: Context Authority Runtime Repair"
doc_id: "WP-06-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
status: "verification_pending"
version: "0.2.1"
updated: "2026-08-03"
owner: "Boss"
approval_owner: "Boss"
approval_recorded_at: "2026-08-03"
execution_authorized: true
execution_complete: false
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
  remains draft until implementation alignment passes the exit gate.
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
the approved focused tests were added. The implementation has not completed
execution: `execution_complete: false` remains controlling until remote CI and
PR merge evidence exist. No deployment, release, or final completion is
claimed by this work packet.

### Bounded impact disposition

`ADR-023/API-007 -> continuation, WorkspaceService, legacy resolve -> tests`
and `ADR-024/API-008 -> binding service, executor adapter -> tests` were
reviewed at bounded distances 1-3. Required repair actions are locally
verified; no additional `must_update` artifact was found within the approved
relation radius. Graph coverage outside this packet is unresolved and does not
support a completeness claim.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.1 | 2026-08-03 | ATHER | Moved to verification pending; recorded 212-case local gate evidence, bounded impact disposition, and the remote-CI/merge closure hold. |
| 0.2.0 | 2026-08-03 | Boss | Recorded approval of the bounded WP-06 execution and explicit D-01/D-02 selections; API-008 remains draft pending validated alignment. |
| 0.1.1+draft | 2026-08-03 | THESEUS / ATHER | Corrected capability-runtime and MSP-live test mapping; added direct `git diff --check` to the exit gate. |
| 0.1.0+draft | 2026-08-03 | THESEUS / ATHER | Opened owner-gated proposal WP-06; implementation remains unauthorized. |
