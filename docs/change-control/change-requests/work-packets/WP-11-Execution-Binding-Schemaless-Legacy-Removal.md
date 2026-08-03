---
title: "WP-11: Execution-Binding Schema-Less Legacy Removal"
doc_id: "WP-11-EXECUTION-BINDING-SCHEMALESS-LEGACY-REMOVAL"
status: "approved"
version: "0.3.0"
updated: "2026-08-03"
owner: "Boss (CEO)"
proposal_author: "ATHER"
approval_owner: "Boss (CEO)"
source_of_truth: false
approval_recorded_at: "2026-08-03"
execution_authorized: true
execution_complete: true
pr_url: "https://github.com/Freshair129/govibe/pull/95"
pr_head_commit: "d8f457927af936194086c0659882ae16e9b4c14e"
merge_commit: "50a5acf165570434f73dcea4413ade4f5eec26a7"
merged_at: "2026-08-03T13:55:29Z"
external_breaking_risk: "accepted-by-owner"
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

Under Boss approval recorded on 2026-08-03, remove the schema-absent
principal-only execution-binding compatibility branch. This remains a HIGH-risk
breaking change: the owner has accepted the documented unknown-external-consumer
risk, not asserted that removal is safe for any unknown consumer.

## Preconditions

- WP-10 is complete with independently reviewed consumer evidence.
- The WP-10 consumer-evidence record and its unresolved consumer classes are
  retained as the governing evidence boundary.
- Boss explicitly accepted the remaining HIGH external breaking risk and
  authorized this packet on 2026-08-03. This authorization does not convert an
  unknown consumer into a safe, absent, or migrated consumer.
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
- any assertion that incomplete external-consumer evidence proves removal safe.

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

## Owner accepted-risk record

Boss (CEO) authorized WP-11 on 2026-08-03 and accepted the residual HIGH
breaking risk from unknown external consumers, external version support,
provider compatibility, deployment telemetry, and canonical GKS coverage. This
approval is limited to the bounded removal scope and rollback process in this
packet. It does not promote API-007, API-008, ADR-024, or the parent
multi-provider CR.

## Execution closure and retained rollback boundary

WP-11 completed through merged PR [#95](https://github.com/Freshair129/govibe/pull/95)
from head `d8f457927af936194086c0659882ae16e9b4c14e` as merge commit
`50a5acf165570434f73dcea4413ade4f5eec26a7` at `2026-08-03T13:55:29Z`.
The removal completed despite the accepted unknown-external-consumer risk; it
does not establish that those consumers are absent, safe, migrated, or covered
by repository evidence.

| Evidence | Recorded result |
|---|---|
| Remote E2E | success: run `30820067825`, job `91707457705` |
| Vercel | success |
| Final local suite | 215 total: 214 pass, 0 fail, 1 skip |
| Security | 35/35 pass |
| Other local gates | lint, build, MCP smoke, docs validation, roadmap validation, diff check, and whitespace check passed |
| Independent reviews | security and release reviews approved |

The D-07 HIGH risk acceptance remains in force. If an affected external
consumer or approved rollback trigger is identified, restore the exact prior
compatibility branch using the captured inverse patch, rerun the approved
baseline suite, and record the consumer. This retained rollback path does not
restore an authority bypass, widen scope, or promote API-007, API-008, ADR-024,
or the parent multi-provider CR.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.0 | 2026-08-03 | Boss / ATHER | Closed WP-11 with merged PR #95, successful remote E2E/Vercel and local gates, approved independent security/release reviews, and retained D-07 accepted HIGH external-consumer risk plus rollback; API/parent promotion remains out of scope. |
| 0.2.0 | 2026-08-03 | Boss / ATHER | Approved and authorized WP-11 under D-07 with explicit acceptance of documented HIGH unknown-external-consumer breaking risk and mandatory rollback; API/parent promotion remains out of scope. |
| 0.1.0+draft | 2026-08-03 | ATHER | Proposed owner-gated schema-less compatibility removal after consumer proof; execution remains unauthorized. |
