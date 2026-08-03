---
title: "CR: Execution-Binding v1 Lifecycle and Schema-Less Legacy Sunset Decision"
doc_id: "CR-2026-08-03-EXECUTION-BINDING-V1-LIFECYCLE-DECISION"
status: "approved"
version: "0.2.6"
updated: "2026-08-03"
owner: "Boss (CEO)"
proposal_author: "ATHER"
decision_owner: "Boss (CEO)"
approval_owner: "Boss (CEO)"
source_of_truth: true
approval_recorded_at: "2026-08-03"
decision_authorized: true
execution_authorized: true
execution_complete: true
promotion_authorized: false
wp_10_evidence_status: "complete"
wp_10_execution_complete: true
wp_11_execution_authorized: true
wp_11_execution_complete: true
wp_11_external_breaking_risk: "accepted-by-owner"
wp_10_consumer_evidence: "docs/assurance/audit/EVIDENCE-WP-10-Execution-Binding-v1-Consumer-Discovery.md"
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

Boss (CEO) approved the selections recorded in Section 6. D-07 authorizes
WP-11's bounded schema-less compatibility removal under the explicit accepted
HIGH external-consumer breaking risk and mandatory rollback. This decision CR
does not promote any API/ADR or authorize a runtime-conformance claim. The
parent multi-provider CR, API-007, and API-008 remain `draft`; WP-10 and WP-11
are execution-complete only within their separately authorized scopes.

**Recommended selection:** do **not** promote API-008 at this time. Keep the
parent multi-provider CR, API-007, and API-008 in `draft`. Keep ADR-024 out of
accepted use until its lifecycle is resolved by the owner. WP-06 proved a
bounded repair and D-01 contract-alignment slice only; it did not authorize a
parent-contract promotion or a schema-less compatibility removal.

The pre-approval requested sequence was:

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
| D-07 | Approve WP-11 with explicit acceptance of incomplete consumer evidence. | Removes compatibility under documented unknown external breaking risk; rollback remains mandatory. | **Selected; Boss accepted the remaining HIGH external-consumer breaking risk and authorized WP-11, 2026-08-03.** |

Approval of this packet is not API/ADR promotion. WP-10 and WP-11 are complete
within their separately authorized scopes. WP-11 completed under D-07's
explicit owner risk acceptance; the parent multi-provider CR, API-007, and
API-008 remain `draft`, and promotion remains unauthorized.

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
accepts the documented breaking risk and authorizes WP-11. Boss recorded that
acceptance and authorization under D-07 on 2026-08-03; it is a risk acceptance,
not evidence that unknown consumers are safe or absent.

### WP-10 evidence state

The commit-pinned repository discovery is recorded in
`docs/assurance/audit/EVIDENCE-WP-10-Execution-Binding-v1-Consumer-Discovery.md`.
Its evidence state is `complete` for the authorized WP-10 scope: PR #93 has
merged and its remote E2E, P0 verify, Vercel, local-gate, and independent-review
evidence are recorded. The artifact still records unknown external-consumer,
deployment, telemetry, attestation, and canonical-graph surfaces. Boss has
accepted the resulting HIGH external-consumer breaking risk and authorized
WP-11 under D-07; the gaps remain unresolved and do not promote API-008/ADR-024.

### WP-B: remove schema-less compatibility only after owner acceptance

WP-11 may remove the absent-schema principal-only branch under the D-07 owner
authorization recorded on 2026-08-03. The acceptance of remaining external risk
does not turn an unknown consumer into an assertion of safety. The executing
packet must retain the residual and use the approved rollback path if an
affected consumer is identified.

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
- AC-07: WP-10 is complete for its stated fixture/consumer evidence scope.
  WP-11 is complete for its separately authorized removal scope with D-07's
  explicitly accepted HIGH external-consumer breaking risk and retained
  rollback path; neither completion promotes the parent/API lifecycle.

## 9. Success criteria and Definition of Done

Success is a reviewable, fail-closed decision boundary: it makes the next
owner choice explicit without changing a runtime contract or overstating WP-06
evidence.

This proposal is done when:

1. Boss's D-01 through D-07 selections are recorded, with D-06/WP-10 and
   D-07/WP-11 complete within their separately authorized scopes;
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

## 12. Authorized WP-10 execution closure

The decision CR is execution-complete only for its authorized WP-10 fixture
migration and consumer-discovery scope. PR [#93](https://github.com/Freshair129/govibe/pull/93)
merged from head `152161edd9de816eb47eea02dfd17e257239fe6d` as
`d3f2b38bb8add90baaaf88b10de50370569c5de3` at `2026-08-03T09:35:52Z`.

| Evidence | Recorded result |
|---|---|
| Remote E2E | success: run `30801950051`, job `91648318474` |
| Remote P0 verify | success: run `30801949933`, job `91648317503` |
| Vercel | success |
| Final local suite | 213 total: 212 pass, 0 fail, 1 skip |
| Security | 35/35 pass |
| Other local gates | lint, build, MCP smoke, docs validation, roadmap validation, diff check, and whitespace check passed |
| Independent review | approved |

This WP-10 closure did not itself authorize WP-11. The subsequent D-07 owner
decision authorizes WP-11 while retaining the parent multi-provider CR,
API-007, and API-008 as `draft` and API promotion as unauthorized. External
consumers and GKS coverage remain unknown; the authorization is an explicit
acceptance of that breaking risk, not a removal-readiness assertion.

## 13. D-07 accepted-risk authorization and rollback

Boss (CEO) authorized WP-11 on 2026-08-03 and explicitly accepted the remaining
HIGH breaking risk from unknown external consumers, external version support,
provider compatibility, deployment telemetry, and canonical GKS coverage.
This decision permits the bounded WP-11 removal scope; it does not assert that
any unknown consumer is migrated, absent, safe, or covered by repository
discovery.

Before any runtime or test mutation, WP-11 must capture pre-removal source
hashes, inverse patches, and the affected consumer communication record. If an
affected consumer or approved rollback trigger is identified, restore the exact
prior compatibility branch, rerun the approved baseline, record the consumer,
and preserve authority validation without widening scope. This authorization
does not promote the parent CR, API-007, API-008, or ADR-024.

## 14. Authorized WP-11 execution closure

WP-11 is execution-complete for its bounded schema-less compatibility-removal
scope through merged PR [#95](https://github.com/Freshair129/govibe/pull/95).
Head `d8f457927af936194086c0659882ae16e9b4c14e` merged as
`50a5acf165570434f73dcea4413ade4f5eec26a7` at `2026-08-03T13:55:29Z`.

| Evidence | Recorded result |
|---|---|
| Remote E2E | success: run `30820067825`, job `91707457705` |
| Vercel | success |
| Final local suite | 215 total: 214 pass, 0 fail, 1 skip |
| Security | 35/35 pass |
| Other local gates | lint, build, MCP smoke, docs validation, roadmap validation, diff check, and whitespace check passed |
| Independent reviews | security and release reviews approved |

The CR is execution-complete for its two authorized child scopes: WP-10
fixture migration/consumer discovery and WP-11 schema-less removal. This is
not completion or promotion of the parent multi-provider CR, API-007, API-008,
or ADR-024: each remains `draft`, and `promotion_authorized: false` remains
unchanged. D-07's accepted HIGH unknown-external-consumer risk remains
unresolved; the removal was completed under that acceptance, with the rollback
path in Section 13 preserved.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.6 | 2026-08-03 | Boss / ATHER | Closed WP-11 with PR #95 CI/Vercel/local-gate and approved independent security/release review evidence; the CR/WP-10/WP-11 scopes are complete, while parent/API drafts and promotion prohibition remain unchanged. |
| 0.2.5 | 2026-08-03 | Boss / ATHER | Corrected the canonical D-07 lifecycle state: WP-11 is execution-authorized under accepted HIGH external-consumer risk and mandatory rollback, but remains execution-incomplete; parent/API drafts and promotion prohibition remain unchanged. |
| 0.2.4 | 2026-08-03 | Boss / ATHER | Recorded D-07 selection: Boss authorized WP-11 and accepted the documented HIGH unknown-external-consumer breaking risk with mandatory rollback; parent/API drafts and promotion prohibition remain unchanged. |
| 0.2.3 | 2026-08-03 | ATHER | Closed the authorized WP-10 scope with merged PR #93, remote E2E/P0/Vercel evidence, final local gates, and independent approval; parent/API drafts, unknown consumer/GKS coverage, and the WP-11 removal block remain unchanged. |
| 0.2.2 | 2026-08-03 | ATHER | Linked WP-10 local-gate and independent-review evidence; remote CI/merge and all promotion/removal gates remain pending. |
| 0.2.1 | 2026-08-03 | ATHER | Linked WP-10 commit-pinned consumer evidence as verification-pending; execution completion, API/ADR promotion, and WP-11 remain blocked. |
| 0.2.0 | 2026-08-03 | Boss / ATHER | Recorded Boss approval: retain parent/API drafts, reject standalone API-008 promotion and WP-11, normalize ADR-024 and policy metadata, and authorize WP-10 only. |
| 0.1.0+draft | 2026-08-03 | ATHER | Opened owner-gated C-3/H3/HIGH lifecycle and schema-less legacy-sunset decision; no promotion or execution is authorized. |
