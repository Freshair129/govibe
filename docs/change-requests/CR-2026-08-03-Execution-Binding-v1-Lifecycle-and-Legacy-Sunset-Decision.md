---
title: "CR: Execution-Binding v1 Lifecycle and Schema-Less Legacy Sunset Decision"
doc_id: "CR-2026-08-03-EXECUTION-BINDING-V1-LIFECYCLE-DECISION"
status: "approved"
version: "0.2.0"
updated: "2026-08-03"
owner: "Boss (CEO)"
proposal_author: "ATHER"
decision_owner: "Boss (CEO)"
approval_owner: "Boss (CEO)"
source_of_truth: true
approval_recorded_at: "2026-08-03"
decision_authorized: true
execution_authorized: false
promotion_authorized: false
complexity: "C-3"
access_scope: "H3"
risk: "HIGH"
baseline_commit: "da8eb37e8a86f092b725b33bd881c766bd22f194"
parent_change_request: "CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING"
related_adrs: ["ADR-023", "ADR-024"]
related_apis: ["API-007", "API-008"]
related_docs:
  - "docs/change-requests/CR-2026-08-03-Context-Authority-Runtime-Repair.md"
  - "docs/rca/RCA-2026-08-03-Context-Authority-Runtime-Repair.md"
  - "docs/change-control/change-requests/work-packets/WP-06-Context-Authority-Runtime-Repair.md"
  - "docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md"
  - "docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md"
proposed_work_packets:
  - "WP-10-EXECUTION-BINDING-V1-FIXTURE-MIGRATION-AND-CONSUMER-DISCOVERY"
  - "WP-11-EXECUTION-BINDING-SCHEMALESS-LEGACY-REMOVAL"
---

# CR: Execution-Binding v1 Lifecycle and Schema-Less Legacy Sunset Decision

## 1. Decision requested

Boss (CEO) approved the selections recorded in Section 6. This decision CR
authorizes no runtime or test change, no API/ADR promotion, and no
runtime-conformance claim. It authorizes only WP-10's bounded future scope;
WP-11 remains unauthorized.

**Recommended selection:** do **not** promote API-008 at this time. Keep the
parent multi-provider CR, API-007, and API-008 in `draft`. Keep ADR-024 out of
accepted use until its lifecycle is resolved by the owner. WP-06 proved a
bounded repair and D-01 contract-alignment slice only; it did not authorize a
parent-contract promotion or a schema-less compatibility removal.

The requested future sequence is:

```text
owner lifecycle decision
  -> separately approved WP-A: fixture migration and consumer evidence
  -> owner review of consumer evidence and breaking risk
  -> separately approved WP-B: remove schema-less branch, or retain it
  -> separate parent-contract promotion decision, if all its gates are met
```

## 2. Classification and authority chain

This is `C-3 / H3 / HIGH`: it changes the lifecycle posture of a public
execution-binding contract, crosses context, entitlement, credential, adapter,
and security boundaries, and has an unresolved external breaking-risk surface.
Boss (CEO) is the required decision and approval owner. H3 is sufficient for
the bounded repository evidence and future test execution; H4 is not granted.

The governing chain is:

```text
Issue #52 -> ADR-023 (accepted) -> API-007 (draft)
Issue #55 -> parent multi-provider CR (draft) -> ADR-024 (draft lifecycle)
  -> API-008 (draft) -> execution binding -> adapter -> candidate output

Executor / Agent -> GoVibe validation -> MSP context authority
  -> GKS canonical knowledge authority -> persisted context packet
  -> GoVibe Entitlement Runtime -> Provider Adapter -> External Executor
  -> candidate -> GoVibe -> MSP -> GKS promotion mediation
```

ADR-023/API-007 govern context authority. ADR-024/API-008 define only the
execution-resource binding boundary; neither authorizes context mutation,
direct GKS access, credential disclosure, or canonical promotion.

## 3. Evidence baseline and findings

At `da8eb37e8a86f092b725b33bd881c766bd22f194`, WP-06 is execution-complete
through merged PR #89, but it explicitly retains API-008 and parent contracts
at their then-current lifecycle states. Its approved D-01 slice added v1
`actor_id` / `principal_id` and identity-lineage correlation with fail-closed
handling; it is not evidence of whole-feature conformance.

The legacy audit found:

1. No tracked runtime caller invokes `executorRegistry.execute`.
2. The execution-binding service emits v1 bindings.
3. The only tracked schema-less producers are fixtures in
   `packages/govibe-core/src/executor-adapter.test.mjs`,
   `packages/govibe-core/src/migration-capabilities.test.mjs`, and the graph-security helper
   `scripts/mcp/graph-dispatch-authority.security.mjs`.
4. External consumers, deployment integrations, and versioned clients are
   unknown. Absence of a tracked runtime caller is not evidence that no
   external caller depends on the schema-less branch.

Therefore a schema-less-branch removal remains a HIGH security and breaking
change. The branch must not be removed based only on the fixture inventory.

Two documentation conformance findings are also open:

- ADR-024 had `status: proposed`, while the documented lifecycle vocabulary
  uses `draft` for an unsigned document and `accepted` for an ADR decision.
  Boss approved its normalization to `draft` as a documentation-only
  correction; it is not ADR acceptance.
- `POLICY-Provider-Entitlement-Sharing-Compatibility.md` points to a
  non-existent legacy threat-model filename in its `related_docs` metadata.
  The tracked threat model is
  `docs/assurance/security/THREAT-MODEL-Provider-Entitlement-Credential-and-Session-Boundary.md`.
  The approved correction changes only the reference; it must not be described
  as security implementation or provider compatibility approval.

## 4. Assumptions and unresolved authority

[ASSUMPTIONS]

1. The legacy audit is limited to tracked content at the baseline commit; it
   cannot identify untracked, deployed, third-party, or future consumers.
2. A v1 emission by the binding service does not establish that all consumers
   parse or require v1.
3. The current document-version standard is the applicable conformance guide
   for the ADR-024 status finding. If the owner considers its draft status to
   limit that authority, ADR-024 status normalization remains an explicit
   owner decision.
4. No canonical GKS backlink query was available. The impact record below is
   bounded discovery evidence, not a graph-completeness claim.

Unresolved items are `external_consumer_inventory`, `external_version_support`,
`provider_compatibility_evidence`, and `canonical_graph_coverage`. They require
escalation; they must not be filled from repository silence or model prior.

## 5. Scope and exclusions

### In scope

1. Decide the lifecycle posture of the parent CR, ADR-024, API-007, and API-008.
2. Decide whether the two stated documentation conformance corrections may be
   made after approval.
3. Define two staged, separately authorized work packets for v1 fixture
   migration/consumer discovery and possible schema-less removal.
4. Record the exact evidence, risks, acceptance gates, rollback, and bounded
   impact disposition for those future packets.

### Out of scope

- runtime, adapter, registry, credential-vault, or test mutation;
- API-008, API-007, ADR-024, parent-CR, feature, C4, threat-model, policy, or
  provider-compatibility promotion;
- any claim that #59, #60, #61, #62, #63, #64, #69, or #70 is complete;
- provider entitlement sharing, credential reuse, or external-consumer
  discovery beyond an approved evidence-gathering packet;
- direct MSP, GKS, GenesisBlockDB, or provider access; and
- an assertion that the bounded impact review is complete.

## 6. Owner decisions

| ID | Owner option | Consequence | Recommendation |
|---|---|---|---|
| D-01 | Keep parent CR, API-007, API-008 `draft`; defer API-008 promotion. | Preserves the explicit WP-06 boundary and prevents a child contract from outrunning its parents. | **Selected, Boss, 2026-08-03.** |
| D-02 | Promote API-008 alone. | Conflicts with its draft parent CR/ADR-024 and draft API-007 predecessor; no whole-contract evidence supports it. | **Rejected, Boss, 2026-08-03.** |
| D-03 | Authorize a later bundled lifecycle-review packet for parent CR, ADR-024, API-007, and API-008. | Allows promotion only after parent, security, compatibility, and enforcement evidence is resolved. | **Deferred, Boss, 2026-08-03.** |
| D-04 | Treat ADR-024 `proposed` -> `draft` as a documentation-only conformance correction. | Does not accept ADR-024 or authorize code; changelog and registry parity are required. | **Selected and applied, Boss, 2026-08-03.** |
| D-05 | Correct the policy threat-model path as a documentation-only correction. | Restores navigability only; no runtime/security/compatibility claim changes. | **Selected and applied, Boss, 2026-08-03.** |
| D-06 | Approve WP-10 after its own review. | Migrates only the three tracked schema-less fixtures to full v1 and gathers consumer evidence. | **Selected; WP-10 authorized, Boss, 2026-08-03.** |
| D-07 | Approve WP-11 before consumer evidence is complete. | Removes compatibility under unknown external breaking risk. | **Rejected, Boss, 2026-08-03.** |

Approval of this packet is not API/ADR promotion. WP-10 alone is approved with
`execution_authorized: true`; WP-11 remains `draft` with
`execution_authorized: false` until a separate owner authorization is recorded.

## 7. Proposed staged sunset

### WP-A: internal fixture migration and consumer evidence

WP-10 may migrate only the three tracked schema-less fixture/helper producers
to complete `govibe-execution-binding/v1` data. It must preserve production
behavior, execute the defined validation suite, and produce a consumer-evidence
record that distinguishes tracked evidence from unknown external consumers.

### Consumer-evidence gate

Before any removal proposal, the owner must receive a bounded report containing:

- exact tracked callers/producers and their source hashes;
- exported/public entry points and versioned artifact review;
- deployment, integration, and operator-owner attestations, each with scope and
  date; and
- an explicit result for every potential external consumer: migrated, not
  applicable with evidence, retained under compatibility, or unknown.

Any `unknown` consumer blocks schema-less removal unless the owner explicitly
accepts the documented breaking risk and authorizes WP-11.

### WP-B: remove schema-less compatibility only after owner acceptance

WP-11 may remove the absent-schema principal-only branch only after WP-10's
exit evidence and an owner decision that accepts the remaining external risk.
It must not turn an unknown consumer into an assertion of safety. If evidence
is incomplete, the approved outcome is to retain the branch and record the
residual rather than force removal.

## 8. Acceptance criteria

- AC-01: this packet records that API-008 is not promoted and preserves the
  parent CR/API-007/API-008 draft lifecycle in the owner decision.
- AC-02: it distinguishes WP-06 bounded closure from parent-contract,
  feature, security, and runtime-conformance completion.
- AC-03: ADR-024 status normalization and the broken policy reference are
  applied as owner-approved documentation-only corrections, not implied
  acceptance or runtime change.
- AC-04: WP-10 is limited to the three named fixture/helper producers and has
  no production behavior-change authority.
- AC-05: WP-11 is blocked by incomplete consumer evidence unless the owner
  explicitly accepts the residual HIGH breaking risk.
- AC-06: all authority, security, provider-compatibility, and graph-coverage
  gaps are stated rather than inferred away.
- AC-07: WP-10 is approved and authorized only for its stated fixture/consumer
  evidence scope; WP-11 remains draft and `execution_authorized: false`.

## 9. Success criteria and Definition of Done

Success is a reviewable, fail-closed decision boundary: it makes the next
owner choice explicit without changing a runtime contract or overstating WP-06
evidence.

This proposal is done when:

1. Boss's D-01 through D-07 selections are recorded, with only D-06/WP-10
   execution authorized;
2. any approved documentation-only correction has a narrow diff, a changelog,
   registry/index parity where required, and `npm run docs:validate` evidence;
3. any WP-10/WP-11 authorization records exact files, test commands, evidence
   hashes, rollback, independent review, and owner approval;
4. a later promotion packet demonstrates its own parent/peer review, approved
   ADR/API lifecycle, security/compatibility gates, impact record, and source
   hashes; and
5. no artifact claims API-008 promotion, provider runtime conformance, or
   external-consumer safety until corresponding evidence exists.

## 10. Bounded impact and backlink disposition

| Changed seed / candidate | Relation chain and distance | Impact score | Required action | Status |
|---|---|---:|---|---|
| API-008 v1 binding / schema-less branch | API-008 -> binding service -> executor adapter -> three fixture/helper producers (1-3) | HIGH | Migrate fixtures only in authorized WP-10; retain branch pending evidence. | authorized |
| Parent CR / ADR-024 / API-007 lifecycle | parent CR -> ADR/API authority -> API-008 binding contract (1-2) | HIGH | Owner lifecycle decision; no independent child promotion. | unresolved |
| Compatibility-policy threat-model link | policy -> threat model (1) | MEDIUM | Correct path under D-05; validate references. | corrected |
| External consumers | API-008 public/adapter surface -> untracked or deployed callers (unknown) | HIGH | Consumer discovery and owner risk decision before WP-11. | unresolved |
| Canonical relations beyond inspected documents | changed seed -> unknown GKS backlinks | unknown | Escalate; do not claim coverage completeness. | unresolved |

The relation chains are repository-discovery candidates at the pinned baseline.
They are not canonical GKS relations, and the listed distances do not authorize
retrieval widening.

## 11. Verification and rollback

This proposal makes only Markdown, registry, and navigation changes. Verify it
with `npm run docs:validate`, `npm run roadmap:validate`, `npm run diff:check`,
and `git diff --check`; review the final diff before commit.

Rollback for this proposal is a revert of its documentation commit. A future
WP-10 or WP-11 must capture pre-change hashes and inverse patches, roll back in
reverse dependency order, rerun the approved baseline, and never restore an
authority bypass or silently reintroduce schema-less interpretation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-03 | Boss / ATHER | Recorded Boss approval: retain parent/API drafts, reject standalone API-008 promotion and WP-11, normalize ADR-024 and policy metadata, and authorize WP-10 only. |
| 0.1.0+draft | 2026-08-03 | ATHER | Opened owner-gated C-3/H3/HIGH lifecycle and schema-less legacy-sunset decision; no promotion or execution is authorized. |
