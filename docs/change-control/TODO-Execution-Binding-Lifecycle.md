---
title: "TODO: Execution-Binding Lifecycle"
doc_id: "TODO-EXECUTION-BINDING-LIFECYCLE"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "Boss (CEO) / ATHER"
source_of_truth: true
parent_change_request: "CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING"
related_docs:
  - "docs/change-requests/CR-2026-08-03-Execution-Binding-v1-Lifecycle-and-Legacy-Sunset-Decision.md"
  - "docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md"
  - "docs/api/API-007-Knowledge-Context-Authority-Contract.md"
  - "docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md"
  - "docs/assurance/audit/EVIDENCE-WP-10-Execution-Binding-v1-Consumer-Discovery.md"
  - "docs/change-control/change-requests/work-packets/WP-11-Execution-Binding-Schemaless-Legacy-Removal.md"
risk: "HIGH"
---

# TODO: Execution-Binding Lifecycle

## Purpose and non-claims

This is the remaining-work register after the bounded execution closures below.
It is not a promotion decision, deployment claim, consumer inventory, runtime
conformance result, or assertion that the accepted HIGH risk is safe.

**Closed and not TODO:**

- WP-06 is closed for its approved context-authority runtime-repair scope.
- WP-10 is closed for its fixture migration and repository-only consumer
  discovery scope.
- WP-11 is closed for its owner-authorized schema-less legacy removal scope;
  D-07 accepted the remaining HIGH unknown-external-consumer risk and retained
  rollback. Its closure does not resolve the unknowns listed here.

Historical evidence only: PR [#93](https://github.com/Freshair129/govibe/pull/93)
merged as `d3f2b38bb8add90baaaf88b10de50370569c5de3`; PR
[#94](https://github.com/Freshair129/govibe/pull/94) merged as
`0b75d4ff15753d868a300d364e40a4906ab189e5`; PR
[#95](https://github.com/Freshair129/govibe/pull/95) merged as
`50a5acf165570434f73dcea4413ade4f5eec26a7`; and PR
[#96](https://github.com/Freshair129/govibe/pull/96) merged as
`8d8d5372d26c8a0c4b377c0c649bbb8f658e9fa1`. These merges are historical
execution evidence, not approval for any item below.

## Dependency map

| Open item | Depends on | Enables | Current status |
|---|---|---|---|
| T-01 lifecycle decision | Owner review of the bundled parent CR, ADR-024, API-007, and API-008 state | Any coordinated promotion posture | blocked on owner decision |
| T-02 external discovery | Named consumers, deployed versions, operators, and attestations | Evidence-based compatibility disposition | unknown |
| T-03 provider security/conformance | Provider compatibility evidence and issue-owned implementation/testing | Runtime conformance assessment | open; docs decisions are not proof of runtime conformance |
| T-04 MSP/GKS impact | Authorized MSP-scoped impact packet and relation resolution | Bounded backlink/impact disposition | unknown |
| T-05 rollback monitoring | Trigger, owner, telemetry/schema-version evidence | Operable post-removal rollback response | open |
| T-06 lifecycle normalization | Outcomes of T-01 through T-05 | Coherent contract lifecycle record | blocked; no promotion is implied |

```text
T-02 external discovery ----\
T-03 provider conformance ---+--> T-01 bundled owner lifecycle decision --> T-06 normalization
T-04 MSP/GKS impact ---------/
T-05 rollback monitoring ----> ongoing evidence and rollback readiness
```

## Remaining work

### T-01 — Decide the bundled lifecycle, not API-008 alone

- **Priority / risk / owner / dependency / status:** P0 / HIGH / Boss (CEO)
  with ATHER audit support / T-02, T-03, and T-04 evidence boundaries /
  blocked on owner decision.
- **Work:** make one explicit lifecycle decision for the parent
  `CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING`, ADR-024, API-007, and
  API-008, including their governing relations and unresolved evidence.
  **Standalone API-008 promotion remains forbidden.**
- **AC:** the decision names each artifact's lifecycle state, scope,
  prerequisites, and non-claims; it does not treat WP closure as promotion.
- **SC / DoD:** approved owner record is linked from the affected canonical
  artifacts; registry/navigation state agrees; no artifact claims runtime or
  external-consumer conformance without evidence.
- **Evidence gate:** owner approval plus a relation-first review of the parent
  CR, ADR-024, API-007, API-008, WP-10 evidence, and WP-11 closure.

### T-02 — Discover external consumers, versions, deployments, and operator attestations

- **Priority / risk / owner / dependency / status:** P0 / HIGH / named
  integration, package/distribution, deployment, and operator owners (unknown)
  / authorized access to each evidence source / unknown.
- **Work:** obtain dated, source-identifiable evidence for external package or
  local-entry consumers, provider/MCP clients, deployed callers, supported
  versions, binding-schema/version telemetry, and owner attestations.
- **AC:** each consumer class is recorded as confirmed, migrated, retained,
  unsupported, or still unknown, with source/version/date/owner; gaps remain
  explicitly unknown.
- **SC / DoD:** a reviewable inventory and telemetry capture can be traced to
  its authority and version; no repository-only search is presented as external
  coverage.
- **Evidence gate:** named owner attestations and actual artifact, deployment,
  or observability evidence. The WP-10 discovery record remains the baseline
  gap record, not completion proof.

### T-03 — Establish provider compatibility, security, and runtime-conformance gates

- **Priority / risk / owner / dependency / status:** P0 / HIGH / issue owners
  and security/release reviewers / provider evidence and approved work packets
  / open.
- **Work:** turn the documented provider/security decisions into separately
  evidenced runtime conformance work. Track the referenced issues **#59, #60,
  #61, #62, #63, #64, #69, and #70** against their actual issue state and
  owners; this TODO does not infer that any issue is implemented or closed.
- **AC:** provider compatibility records, threat-model controls, negative
  tests, release evidence, and issue dispositions are mutually traceable.
  Each result distinguishes **documented decision/contract** from **observed
  runtime conformance**.
- **SC / DoD:** security/release review approves the evidence for the stated
  runtime scope, unresolved providers remain fail-closed, and no completion
  claim exceeds provider-specific evidence.
- **Evidence gate:** the provider-entitlement policy and threat model,
  implementation/test artifacts, provider-owner evidence, and independent
  security/release review. Documentation alone is insufficient.

### T-04 — Obtain MSP-scoped GKS/backlink impact coverage and resolve authority gaps

- **Priority / risk / owner / dependency / status:** P0 / HIGH / MSP/GKS
  authority owner with ATHER audit support / authorized MSP-scoped context
  packet and relation policy / unknown.
- **Work:** request an MSP-scoped impact query for the execution-binding seeds;
  record direct and transitive backlinks, relation chains, graph distance,
  impact score, required actions, cycles/limits, and unresolved relations.
- **AC:** the result identifies `missing_relation`, `missing_authority`, or
  `missing_scope` where applicable and preserves source versions/hashes and
  packet lineage.
- **SC / DoD:** all `must_update` items are handled, each
  `review_and_update` item has a decision, and graph coverage limits remain
  explicit. No unrestricted GKS traversal or completeness claim is made.
- **Evidence gate:** MSP-issued scoped packet and GKS-backed response; grep or
  repository links remain discovery fallback only.

### T-05 — Monitor rollback after the accepted WP-11 HIGH-risk removal

- **Priority / risk / owner / dependency / status:** P0 / HIGH / designated
  release/operator owner (not yet named) / T-02 telemetry and an approved
  rollback trigger / open.
- **Work:** define the operational monitoring window, named accountable owner,
  trigger criteria, alert/triage path, evidence capture, exact inverse patch,
  and baseline rerun. Include schema/version telemetry so an affected external
  binding can be identified without weakening authority validation.
- **AC:** a trigger identifies what qualifies as an affected consumer or other
  approved rollback condition; owner and response evidence are recorded before
  declaring monitoring complete.
- **SC / DoD:** a simulated or actual approved trigger produces a dated record,
  preserves the full v1 authority checks, and uses the captured rollback path
  rather than an authority bypass.
- **Evidence gate:** approved trigger/owner record, telemetry capture, inverse
  patch reference, and baseline-suite result. The existing rollback prose is a
  retained requirement, not evidence that monitoring is operating.

### T-06 — Normalize remaining API/contract lifecycle records

- **Priority / risk / owner / dependency / status:** P1 / HIGH / Boss (CEO)
  and canonical artifact owners / T-01 decision and T-02–T-05 dispositions /
  blocked.
- **Work:** reconcile only the lifecycle/status/version/relationship wording
  that remains inconsistent across the parent CR, ADR-024, API-007, API-008,
  architecture/feature documents, registry, and navigation.
- **AC:** every changed record distinguishes implementation closure from
  contract promotion, accepted risk from resolved risk, and runtime evidence
  from documentation.
- **SC / DoD:** canonical references, frontmatter, changelogs, registry, and
  navigation agree; required backlink impact actions are addressed.
- **Evidence gate:** approved bundled lifecycle decision and reviewed impact
  disposition. This item does **not** create or imply a new promotion approval.

## Recommended next sequence

1. Name evidence owners and open T-02, T-04, and T-05 with their evidence
   boundaries; keep unknowns unknown until the sources are obtained.
2. Obtain provider issue/compatibility and threat-model conformance evidence
   for T-03; separate policy decisions from runtime proof.
3. Give Boss the bundled T-01 decision packet, including T-02–T-05 results and
   unresolved authority relations.
4. Only after that decision, perform the narrowly approved T-06 lifecycle
   normalization and its impact review.

## Owner decisions required

1. Who owns each external-consumer, distribution, deployment, and operator
   evidence source for T-02?
2. Which MSP/GKS authority owner may issue the bounded context packet for T-04?
3. Who owns rollback monitoring, which triggers are approved, and what
   schema/version telemetry source is authoritative for T-05?
4. After receiving that evidence, what single bundled lifecycle decision should
   govern the parent CR, ADR-024, API-007, and API-008?

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ATHER | Registered only remaining execution-binding lifecycle work after WP-06, WP-10, and WP-11 closure; retained unknown external, provider, graph, rollback, and bundled lifecycle gates without inferring promotion or safety. |
