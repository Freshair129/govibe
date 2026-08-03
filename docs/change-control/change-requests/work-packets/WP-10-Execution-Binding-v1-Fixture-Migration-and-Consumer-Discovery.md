---
title: "WP-10: Execution-Binding v1 Fixture Migration and Consumer Discovery"
doc_id: "WP-10-EXECUTION-BINDING-V1-FIXTURE-MIGRATION-AND-CONSUMER-DISCOVERY"
status: "approved"
version: "0.2.0"
updated: "2026-08-03"
owner: "Boss (CEO)"
proposal_author: "ATHER"
approval_owner: "Boss (CEO)"
source_of_truth: false
approval_recorded_at: "2026-08-03"
execution_authorized: true
execution_complete: false
complexity: "C-3"
access_scope: "H3"
risk: "HIGH"
parent_change_request: "CR-2026-08-03-EXECUTION-BINDING-V1-LIFECYCLE-DECISION"
related_adrs: ["ADR-023", "ADR-024"]
related_apis: ["API-007", "API-008"]
---

# WP-10: Execution-Binding v1 Fixture Migration and Consumer Discovery

## Objective

Under Boss approval recorded on 2026-08-03, replace the three tracked schema-less test/helper
producers with complete v1 execution-binding fixtures and produce bounded
consumer evidence. This work packet does not change production dispatch
behavior, remove compatibility, promote API-008, or claim runtime conformance.

## Preconditions

- Boss selected D-01 and D-06 and separately authorized this packet on
  2026-08-03.
- The exact baseline, source hashes, and three producer paths are reconfirmed.
- API-008, parent CR, and API-007 lifecycle remains as recorded by the owner;
  a fixture migration does not promote any of them.

## Bounded scope

1. Migrate only these schema-less producers to complete v1 fixtures:
   - `packages/govibe-core/src/executor-adapter.test.mjs`
   - `packages/govibe-core/src/migration-capabilities.test.mjs`
   - `scripts/mcp/graph-dispatch-authority.security.mjs`
2. Confirm the service output remains v1 and identify tracked call sites.
3. Produce a consumer-evidence report that labels external consumers as
   evidenced, not applicable with evidence, retained, or unknown.
4. Add only focused tests needed to prove the fixture migration and retain
   fail-closed assertions.

## Explicit exclusions

- production executor, adapter, binding-service, registry, vault, or routing
  behavior changes;
- removal or weakening of the schema-less branch;
- an external integration change, compatibility approval, or API promotion;
- direct GKS/GenesisBlockDB access or MSP scope widening.

## Acceptance and exit gate

- AC-01: each named producer emits a complete v1 binding with required identity,
  context, cache, policy, and lineage fields.
- AC-02: the diff demonstrates no production behavior change outside approved
  fixture/helper and focused-test paths.
- AC-03: missing or mismatched v1 fields remain fail closed.
- AC-04: the consumer-evidence report records source hashes, reviewed surfaces,
  owner/operation evidence, and every unresolved external consumer.
- AC-05: `npm test`, `npm run test:security`, lint, build, MCP smoke,
  docs/roadmap validation, diff check, and direct `git diff --check` pass.
- AC-06: independent QA accepts the bounded result; all unknown consumers remain
  explicit and block compatibility removal by default.

## Rollback

Capture pre-change hashes and inverse patches for every authorized file. Revert
only the fixture/helper changes, rerun the baseline suite, and never restore a
context-authority bypass. Consumer evidence remains historical evidence, not a
license to remove compatibility.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-03 | Boss / ATHER | Approved the bounded fixture-only v1 migration and consumer-discovery scope; no compatibility removal or API promotion is authorized. |
| 0.1.0+draft | 2026-08-03 | ATHER | Proposed future fixture-only v1 migration and consumer discovery; execution remains unauthorized. |
