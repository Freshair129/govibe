---
title: "RCA: Context Authority Runtime Repair and Execution-Binding Contract Mismatch"
doc_id: "RCA-2026-08-03-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "ATHER / THESEUS"
source_of_truth: true
classification: "C-3/H3/HIGH"
related_change_request: "FUTURE-CR-CONTEXT-AUTHORITY-RUNTIME-REPAIR"
related_adrs: ["ADR-023", "ADR-024"]
related_apis: ["API-007", "API-008"]
---

# RCA: Context Authority Runtime Repair and Execution-Binding Contract Mismatch

## Symptom

At clean baseline `a5c8d2cc9173c99888ffe1c3580ee5f198924f07`, Vitest reports
180 pass, 11 fail, and 1 skip (192 current test cases). The security suite is
separately green at 35/35. The failures are five executor-adapter, three
capability, one migration, and two MSP live tests.

## Evidence

1. Five executor-adapter fixtures omit full `govibe-context-authority/v1`, an
   allow policy decision, and context lineage. They are fixture drift, not a
   production defect.
2. One MSP continuation path is a production defect: `continue.mjs` invokes
   `resolveContext` without caller-supplied authority, so WorkspaceService
   cannot forward and validate it at the required boundary.
3. The remaining capability, direct/live, and migration failures are fixture
   drift. Positive fixtures must meet unrelated validation prerequisites.
4. Legacy vault-context-surface `resolveContext` lacks authority and has no
   recorded compatibility disposition.
5. The binding service emits `actor_id`, while the provider adapter requires
   `principal_id`; API-008 defines neither mapping nor correlation.
6. Authority validates before binding. API-008 does not specify invalid-
   multi-gate precedence; no evidence supports production reordering.

## Root Cause

Two causes must remain separate:

1. **Fixture contract drift:** ten failures model a pre-authority or incomplete
   governed request and lack authority, policy, lineage, or prerequisites.
2. **Continuation authority propagation defect:** caller authority is lost
   before `resolveContext`, violating ADR-023/API-007's explicit,
   forward-and-validate authority requirement.

The `actor_id`/`principal_id` mismatch is a HIGH-risk contract-decision gate;
it cannot be hidden by a fixture patch or weakened adapter validation.

## Why the Issue Escaped Detection

- Strengthened authority enforcement lacked a complete positive-fixture matrix.
- Continuation and legacy paths lacked end-to-end authority propagation tests.
- Draft API-008 omitted service-to-adapter identity-correlation semantics.
- Green security evidence and full-suite baseline debt were tracked separately,
  allowing debt to remain isolated rather than incorrectly closed.

## Proposed Prevention

1. Require complete authority, allow policy, lineage, and prerequisites in
   positive governed-request fixtures.
2. Test caller-supplied, forwarded, validated, and fail-closed authority for
   continuation and legacy routes.
3. Define `actor_id`/`principal_id` semantics in API-008 before claiming
   service/adapter runtime conformance.
4. Preserve validation order unless an approved API defines public precedence.
5. Run full governed gates, including 35/35 security tests, after contract work.

## Corrective Boundary

`docs/change-requests/CR-2026-08-03-Context-Authority-Runtime-Repair.md`
defines the owner-gated repair. This RCA authorizes no mutation. Its `.brain`
companion is a workspace-continuity pointer only; this file is canonical.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ATHER / THESEUS | Recorded audited fixture drift, continuation propagation defect, legacy-path gap, and separate binding-contract decision gate. |
