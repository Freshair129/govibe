---
title: "WP-11: Execution-Binding Schema-Less Legacy Removal"
doc_id: "WP-11-EXECUTION-BINDING-SCHEMALESS-LEGACY-REMOVAL"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "Boss (CEO)"
proposal_author: "ATHER"
approval_owner: "Boss (CEO)"
source_of_truth: false
execution_authorized: false
execution_complete: false
complexity: "C-3"
access_scope: "H3"
risk: "HIGH"
parent_change_request: "CR-2026-08-03-EXECUTION-BINDING-V1-LIFECYCLE-DECISION"
depends_on: "WP-10-EXECUTION-BINDING-V1-FIXTURE-MIGRATION-AND-CONSUMER-DISCOVERY"
related_adrs: ["ADR-023", "ADR-024"]
related_apis: ["API-007", "API-008"]
---

# WP-11: Execution-Binding Schema-Less Legacy Removal

## Objective

If separately approved after WP-10, remove the schema-absent principal-only
execution-binding compatibility branch. This is a HIGH-risk breaking change;
the current packet grants no execution authority and makes no claim that it is
safe to remove the branch.

## Preconditions

- WP-10 is complete with independently reviewed consumer evidence.
- Every potential external consumer is migrated, explicitly retained under a
  documented compatibility plan, or evidenced as not applicable; unresolved
  consumers remain visible.
- Boss explicitly accepts any remaining external breaking risk and authorizes
  the exact removal scope, rollout, rollback, and communication plan.
- The governing lifecycle decision still preserves approved context authority
  and does not use legacy removal to imply API-008 promotion.

## Bounded scope

1. Remove only the absent-schema principal-only compatibility interpretation
   identified in the approved implementation review.
2. Update affected v1-only fixtures, negative tests, API compatibility text,
   consumer migration notes, and rollback records within the approved file list.
3. Preserve all context-authority, policy-decision, lineage, and identity
   validation; any missing or mismatched v1 field must fail closed.

## Explicit exclusions

- entitlement-policy changes, provider sharing approval, credential/session
  policy changes, or context authority changes;
- API-008 or parent-contract promotion;
- silent removal when external-consumer evidence is incomplete.

## Acceptance and exit gate

- AC-01: no accepted execution-binding path treats an absent schema as a legacy
  success path.
- AC-02: all known consumers submit full v1 bindings or have an owner-approved
  migration/retention disposition.
- AC-03: focused positive and fail-closed tests, full test/security suites,
  lint, build, MCP smoke, docs/roadmap validation, diff check, and direct
  `git diff --check` pass.
- AC-04: the final impact report distinguishes tracked proof from any remaining
  external uncertainty and includes an owner risk-acceptance record.
- AC-05: independent QA and Boss approve the final diff; no runtime-conformance
  or API-promotion claim is made beyond evidence actually obtained.

## Rollback

Capture pre-removal source hashes, migration communication, and inverse patches.
If an approved rollback trigger occurs, restore the exact prior compatibility
branch, rerun the baseline suite, and record the affected consumer without
weakening authority validation or widening scope.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ATHER | Proposed owner-gated schema-less compatibility removal after consumer proof; execution remains unauthorized. |
