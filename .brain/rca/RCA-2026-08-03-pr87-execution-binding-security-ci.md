---
title: "RCA: PR #87 Security CI Execution-Binding Fixture Drift"
doc_id: "RCA-2026-08-03-pr87-execution-binding-security-ci"
status: "candidate"
version: "0.1.0b"
created_at: "2026-08-03T00:02:34+00:00,ATHER"
last_update: "2026-08-03T00:02:34+00:00,ATHER"
owner: "Boss (Product Authority)"
auditor: "ATHER"
attributes:
  domain: "security-ci"
  doc_type: "root-cause-analysis"
  scope: "PR #87 governed executor dispatch fixture"
  classification: "C-2/H2/LOW"
---

# RCA: PR #87 Security CI Execution-Binding Fixture Drift

## Symptom

PR #87 (`codex/docs-cleansing-ia`, head
`f88723bb2ce98a63b0042160acceac7f19f47636`) failed P0 Security CI run
`30773512405`, job `verify`. The only failed security test was
`dispatches only after bounded authority, allow policy, and lineage validation`
at `scripts/mcp/graph-dispatch-authority.security.mjs:112`; 34 of 35 tests
passed.

## Evidence

- The CI failure is `ExecutionBindingError` with code
  `EXECUTION_BINDING_REQUIRED` from
  `packages/govibe-core/src/executor-adapter.mjs:35-37`.
- The stack reaches the positive fixture's `registry.execute("local",
  dispatchRequest())` call at
  `scripts/mcp/graph-dispatch-authority.security.mjs:115`.
- `validateBinding()` requires `executionBinding` and validates its provider,
  run, and principal against the dispatch request.
- The fixture had bounded authority, an allow policy, and matching lineage,
  but no `actor_id`, request `run_id`, or `executionBinding`.
- The same failure reproduces against clean `origin/main`; it is contract
  drift, not a change introduced by the document-cleansing implementation.

## Root Cause

The positive graph-dispatch authority security fixture was not updated when
`executor-adapter` began requiring a governed `executionBinding`. The runtime
correctly rejects unbound dispatch; the stale fixture still modeled the former
direct-dispatch contract.

## Why the Issue Escaped Detection

The document-cleansing branch merged the current runtime contract, but the PR
security check caught this integration-only fixture mismatch after the branch
head was created. Earlier evidence recorded the resulting 34/35 post-sync
failure as baseline debt instead of applying a runtime or fixture follow-up.

## Proposed Prevention

1. Require positive executor-dispatch fixtures to carry a valid, no-secret
   governed binding whenever executor-adapter binding enforcement changes.
2. Run `npm run test:security` after merges that update dispatch authority or
   execution-binding contracts.
3. Keep full-test baseline failures separately enumerated so a targeted CI
   repair does not conceal unrelated contract-test debt.

## Corrective Scope and Verification

Classification: `C-2/H2/LOW`.

The approved correction adds only a local governed binding to the positive
fixture: matching `actor_id`/`principal_id`, matching request/binding `run_id`,
`provider_id: "local"`, a local entitlement and binding identifier, and null
credential/session references. It does not change runtime code or weaken the
authority, policy, or lineage assertions.

Required verification: targeted failing test, `npm run test:security`, lint,
build, documentation validation, diff checks, and `npm test`; remaining
full-test baseline failures must be reported unchanged.

## CHANGELOG

| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 0.1.0b | 2026-08-03 | candidate | Initial RCA for PR #87 security-CI fixture drift. | pending | ATHER |
