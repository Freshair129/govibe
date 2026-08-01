---
title: "RCA: Open Issues Blocked by Main Baseline Drift"
doc_id: "RCA-2026-08-02-open-issues-and-main-baseline-drift"
status: "candidate"
version: "0.1.0b"
created_at: "2026-08-02T02:45:00+07:00,ATHER"
last_update: "2026-08-02T03:10:00+07:00,ATHER"
owner: "Boss (Product Authority)"
auditor: "ATHER"
attributes:
  domain: "issue-clearance"
  doc_type: "root-cause-analysis"
  scope: "GoVibe open issues and origin/main baseline"
---

# RCA: Open Issues Blocked by Main Baseline Drift

## Symptom

On `origin/main` commit `324268e`, `npm run docs:validate` failed with six
registry mismatches and `npm test` failed 11 of 104 tests. The failures blocked
verified integration of security issues #20-#23. Lint and build were not enough
to establish a green baseline.

## Evidence

- Six governed documents had versions newer than their rows in
  `docs/DOC-VERSION-REGISTRY.md`.
- Commits `eabda07`, `7581850`, and `57948d4` routed knowledge and workspace
  lifecycle through MSP and disabled direct GKS access, but the existing test
  doubles still expected the previous direct-GKS contract.
- The MissionGateway test named `supports explicit HTTP-only re-bootstrap`
  omitted `wsUrl: ""`, so the gateway correctly derived a WebSocket URL and
  remained in `connecting` state.
- Fetch mocks and a snapshot fixture lost the literal/function types required
  by the current TypeScript compiler.
- Draft PR #42 passed its focused sidecar suite, but could not satisfy the full
  repository Definition of Done while main remained red.

## Root Cause

Runtime ownership and governed-document versions were merged without atomic
updates to their tests and registry. The pull-request checks did not require the
complete repository baseline, allowing contract drift to accumulate on main.

## Why the Issue Escaped Detection

- The ownership commits changed implementation files without their owning
  tests.
- Governed version bumps were not gated on registry parity.
- Security PR checks were narrower than `baseline:check`.
- The HTTP-only test name obscured that its fixture still enabled derived
  WebSocket behavior.

## Corrective Action

1. Synchronize the six registry entries and registry self-version.
2. Update test doubles to model MSP workspace registration, context resolution,
   context-injection recording, knowledge promotion, and evidence recording.
3. Verify direct GKS remains fail-closed rather than restoring the deprecated
   transport.
4. Make HTTP-only MissionGateway behavior explicit and restore strict mock
   typing.
5. Run `npm run baseline:check` from the isolated worktree before integration.

## Proposed Prevention

- Require `baseline:check` for runtime-contract, governed-doc, and security PRs.
- Require tests in the same PR as ownership-contract changes.
- Require registry parity in the same commit as governed version bumps.
- Keep security issue closure dependent on integrated-main evidence.

## Verification

- `npm run docs:validate`: pass.
- Focused contract tests: 24/24 pass.
- `npm run baseline:check`: pass; 17 files and 104 tests pass.
- Dependency audit remains a separate security work packet and is not hidden in
  this baseline-repair patch.

## CHANGELOG

| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 0.1.0b | 2026-08-02 | candidate | Initial RCA and verified WP-0 corrective action. | uncommitted | ATHER |
