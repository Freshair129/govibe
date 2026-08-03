---
title: "Evidence: WP-10 Execution-Binding v1 Consumer Discovery"
doc_id: "EVIDENCE-WP-10-EXECUTION-BINDING-V1-CONSUMER-DISCOVERY"
status: "approved"
version: "0.2.0"
updated: "2026-08-03"
owner: "ATHER"
source_of_truth: false
parent_change_request: "CR-2026-08-03-EXECUTION-BINDING-V1-LIFECYCLE-DECISION"
work_packet: "WP-10-EXECUTION-BINDING-V1-FIXTURE-MIGRATION-AND-CONSUMER-DISCOVERY"
related_apis: ["API-008"]
evidence_source_commit: "d3f2b38bb8add90baaaf88b10de50370569c5de3"
baseline_evidence_commit: "e8a756dc6c0681fed55d257087601a81f2e55505"
pr_head_commit: "152161edd9de816eb47eea02dfd17e257239fe6d"
merge_commit: "d3f2b38bb8add90baaaf88b10de50370569c5de3"
merged_at: "2026-08-03T09:35:52Z"
evidence_status: "complete"
execution_complete: true
complexity: "C-3"
access_scope: "H3"
risk: "HIGH"
---

# Evidence: WP-10 Execution-Binding v1 Consumer Discovery

## 1. Decision boundary

This is a commit-pinned, repository-only consumer-discovery record for WP-10.
It records the authorized fixture-migration completion, but not runtime
conformance.
`API-008` remains `draft`; no API/ADR promotion is implied. WP-11 remains
unauthorized, and this record does not authorize compatibility removal.

**Evidence state: complete for the authorized WP-10 scope.** PR #93 merged and
the remote CI, Vercel, local validation, and independent-review evidence is
recorded in Section 8. This does not clear external-consumer, deployment,
telemetry, attestation, or canonical-graph gaps.

## 2. Scope, method, and evidence limits

The pre-migration discovery boundary is commit
`e8a756dc6c0681fed55d257087601a81f2e55505` (`docs(governance): authorize
binding v1 fixture migration`); closure is pinned to merge commit
`d3f2b38bb8add90baaaf88b10de50370569c5de3`. Discovery inspected tracked files only. It did
not contact package registries, deployed systems, providers, MSP/GKS, users,
or operator owners.

Commands executed against the pinned commit:

```text
git ls-tree <commit> -- <binding, adapter, registry, producer, and manifest paths>
git grep -n -E 'executorRegistry[[:space:]]*\\.[[:space:]]*execute|\\.executorRegistry[[:space:]]*\\.[[:space:]]*execute' <commit> -- ':!docs/**' ':!**/*.test.mjs' ':!scripts/mcp/*.security.mjs'
git grep -n 'createExecutorRegistry' <commit> -- ':!docs/**'
git grep -n -E 'executionBinding[[:space:]]*:[[:space:]]*\\{|delete[[:space:]]+.*schema|schema[[:space:]]*:[[:space:]]*undefined|schema[[:space:]]*:[[:space:]]*null' <commit> -- ':!docs/**'
git ls-tree -r --name-only <commit> -- .github package.json packages/govibe-core/package.json vercel.json Dockerfile docker-compose.yml .npmrc
git grep -n -i -E 'telemetry|observability|metrics|operator|runbook|vercel|deploy' <commit> -- ':!docs/**' ':!node_modules/**'
git log --all -S'executorRegistry.execute' --; git log --all -S'createExecutorRegistry' --
```

The first runtime-caller command returned no tracked production invocation.
That result is **not** proof that no consumer exists outside this repository,
in an untracked deployment, or in a future revision. No canonical GKS backlink
query was available, so relation chains below are bounded repository-discovery
candidates, not a completeness claim.

## 3. Commit-pinned source hashes

| Surface | Role | Git blob SHA-1 | Classification |
|---|---|---|---|
| `packages/govibe-core/src/executor-adapter.mjs` | validates v1 and schema-absent legacy bindings; implements registry | `ff24d3a141e95db9061d4f91438ae34e7e2bb4ce` | production compatibility consumer and public implementation |
| `packages/govibe-core/src/execution-binding-service.mjs` | emits `govibe-execution-binding/v1` | `9414d19261454a85244dd41591926cfd1702d4ef` | confirmed v1 producer |
| `packages/govibe-core/src/index.mjs` | re-exports `createExecutorRegistry` | `685e7c15d66638ada466b7a4bc9ac4cf391ed32a` | public export surface |
| `packages/govibe-core/package.json` | package entrypoint and distribution metadata | `d04c9ccd0e8f1c2d3fab97e4d6ea7f339154b2be` | package surface; `private: true` |
| `scripts/mcp/runtime-core.mjs` | constructs registry and publishes `inspect()` snapshot | `41682fa021fa9d87d4922539794852a317d2f223` | runtime constructor only; no confirmed dispatch caller |
| `packages/govibe-core/src/executor-adapter.test.mjs` | test fixture producer | `888f22d3c46f0af863760a7d4d1f6563e58a9450` | schema-less fixture producer |
| `packages/govibe-core/src/migration-capabilities.test.mjs` | test fixture producer | `b60942971bd72f7b7b4a4d1d1bb2134cda602515` | schema-less fixture producer |
| `scripts/mcp/graph-dispatch-authority.security.mjs` | security-helper fixture producer | `7f2b9778a8103a34b42e1f0ad5426f27d819ba99` | schema-less fixture producer |
| root `package.json` | repository scripts and private app metadata | `063f832f727dfc0ac0feb0bf8996a40327c30843` | validation/distribution context |

## 4. Confirmed in-repository callers and producers

| Artifact | Observed relation | Distance from API-008 binding/legacy seed | Impact score | Required action |
|---|---|---:|---|---|
| `execution-binding-service.mjs` | emits complete v1 binding with equal `actor_id` / `principal_id` | 1 | HIGH | Preserve v1 output; no WP-10 production edit authority. |
| `executor-adapter.mjs` | accepts v1; retains the absent-schema principal-only compatibility branch | 1 | HIGH | Retain unchanged. It is the removal target only for separately authorized WP-11. |
| `index.mjs` and `@govibe/core` package export | exposes `createExecutorRegistry` through package entrypoint | 2 | HIGH | Treat as a public in-repository export risk despite `private: true`; obtain distribution/client attestation before removal. |
| `runtime-core.mjs` | imports and constructs the registry, then uses `inspect()` for snapshot state | 2 | MEDIUM | Recheck in implementation review. No `executorRegistry.execute` invocation was found in tracked runtime code. |
| `executor-adapter.test.mjs` | builds a schema-less binding in `governedRequest()` | 2 | HIGH | Migrate only this fixture to complete v1 under WP-10; retain explicit legacy-negative coverage if implementation review approves it. |
| `migration-capabilities.test.mjs` | builds a schema-less `executionBinding` fixture | 2 | HIGH | Migrate only this fixture to complete v1 under WP-10. |
| `graph-dispatch-authority.security.mjs` | builds a schema-less dispatch helper fixture | 2 | HIGH | Migrate only this helper fixture to complete v1 under WP-10. |
| tracked non-test runtime callers | exact static search returned no `executorRegistry.execute` / `.executorRegistry.execute` invocation | unknown | HIGH | Do not infer external safety. Re-run the pinned query after implementation. |

The three named files are the confirmed schema-less producers at the pinned
source boundary. Test calls and the security helper exercise the registry but
are not production callers. The production adapter remains a consumer of both
v1 and legacy shapes because it contains the compatibility interpretation.

## 5. Public, deployment, telemetry, and operator evidence

### 5.1 Public and versioned artifact review

`packages/govibe-core/src/index.mjs` exports `createExecutorRegistry`, and
`packages/govibe-core/package.json` exposes that entrypoint. The package is
marked `private: true` at the pinned commit; no tracked publish configuration,
release artifact, package registry record, or versioned-client inventory was
found. Private package metadata reduces neither local-path consumption nor
untracked/private-registry distribution risk.

### 5.2 Deployment and integration review

Tracked CI contains only `.github/workflows/e2e-ci.yml`,
`.github/workflows/e2e-tests.yml`, and `.github/workflows/p0-security-ci.yml`.
No tracked `vercel.json`, Dockerfile, compose file, Helm/Kubernetes/Terraform
manifest, or deployment integration referencing this binding surface was found.
The existing Vercel-oriented MCP operation is documented as a scaffold, not
evidence of an execution-binding deployment. This repository result is a gap,
not a "not applicable" conclusion for external deployments.

### 5.3 Telemetry and operator-owner review

The tracked telemetry/mission UI surfaces and generic deployment guidance do
not supply binding-schema version telemetry, a binding-consumer inventory, or
an operator attestation. No dated owner attestation was available for provider
adapters, MCP integrations, package consumers, or deployed callers. Those
evidence classes remain unknown.

## 6. External consumer disposition

| Potential consumer class | Disposition | Evidence / gap | Removal effect |
|---|---|---|---|
| Tracked fixture/helper producers | migration-required | Three commit-pinned producers identified above. | Must migrate and verify under WP-10. |
| Tracked registry construction | retained under compatibility | `runtime-core.mjs` constructs but does not dispatch. | Recheck after migration; does not prove absence of callers. |
| Public package/local-entry consumers | unknown | Export exists; package is private, but no consumption or release inventory is available. | Blocks removal. |
| External provider adapters and MCP clients | unknown | No external integration query or dated owner attestation in scope. | Blocks removal. |
| Deployed environments and versioned clients | unknown | No deployment manifests or binding-version telemetry found in tracked content. | Blocks removal. |
| Canonical graph/backlinks | unknown | No authorized GKS query was available. | Blocks a completeness claim and must be escalated. |

## 7. Removal gate and rollback

**WP-11 removal gate: BLOCKED.** The three tracked fixtures may be migrated by
WP-10, but all unknown rows in Section 6 must become either `migrated`,
`not_applicable` with dated evidence, or `retained under compatibility` with
explicit owner acceptance. The owner must then separately authorize WP-11 and
accept any remaining HIGH breaking risk. Repository silence alone cannot clear
the gate.

For WP-10, capture the before/after blob hashes and inverse patch for each of
the three authorized producer files, review the diff to prove no production
behavior change, then run the WP-10 acceptance suite and obtain independent
QA. If migration fails, revert only those fixture/helper edits, rerun the
approved baseline, and retain the schema-less compatibility branch. This
evidence file remains historical and is not a removal authorization.

## 8. Post-migration local verification

The bounded WP-10 review found exactly seven intended changed files: the three
authorized fixture/helper producers and this evidence record, WP-10, the parent
CR, and the document registry. No production implementation file changed.
`dist/` and `node_modules/` are ignored and were not staged.

The after-migration source hashes are:

| Producer | Before blob SHA-1 | After working-tree blob SHA-1 | Result |
|---|---|---|---|
| `packages/govibe-core/src/executor-adapter.test.mjs` | `888f22d3c46f0af863760a7d4d1f6563e58a9450` | `60aaf8010b5be4374967135bbc7a748bf6d11113` | complete v1 positive fixture; explicit legacy-negative fixture retained |
| `packages/govibe-core/src/migration-capabilities.test.mjs` | `b60942971bd72f7b7b4a4d1d1bb2134cda602515` | `01ed6e99594921ae00b924c643a3b74ee2c7a339` | complete v1 fixture |
| `scripts/mcp/graph-dispatch-authority.security.mjs` | `7f2b9778a8103a34b42e1f0ad5426f27d819ba99` | `08599f08dc79c96db395308d41bd44939d975c76` | complete v1 helper fixture |

The current tracked static inventory found no production
`executorRegistry.execute` invocation. The three named producer definitions
now carry `schema: "govibe-execution-binding/v1"`. The sole schema-less binding
construction is `principalOnlyLegacyBinding()` in
`executor-adapter.test.mjs`, intentionally consumed by the
`allows only principal-only schema-less legacy bindings` negative-coverage
test. `executor-adapter.mjs` retains its schema-absent compatibility branch
unchanged; neither result authorizes WP-11.

Local gates passed:

| Gate | Result |
|---|---|
| `npm test` | PASS: 37 files, 212 passed, 0 failed, 1 skipped (213 total); included security suite |
| `npm run test:security` | PASS: 35 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run mcp:smoke` | PASS: 15 tools, 90 roadmap nodes, launcher exit 0 |
| `npm run docs:validate` | PASS: 361 Markdown files, 195 document IDs, 832 path references; baseline warnings only |
| `npm run roadmap:validate` | PASS: 7 sources, 0 errors; existing plan-quality warnings only |
| `npm run diff:check` and `git diff --check` | PASS |

The assigned independent reviewer outcome for the combined bounded diff was
`APPROVE`. PR [#93](https://github.com/Freshair129/govibe/pull/93) merged from
head `152161edd9de816eb47eea02dfd17e257239fe6d` as
`d3f2b38bb8add90baaaf88b10de50370569c5de3` at `2026-08-03T09:35:52Z`.
Remote E2E succeeded (run `30801950051`, job `91648318474`), remote P0 verify
succeeded (run `30801949933`, job `91648317503`), and Vercel succeeded.

## 9. Unresolved items and escalation

1. `external_consumer_inventory`: unknown; requires named client/integration owner attestations.
2. `external_version_support`: unknown; requires artifact, package, and deployed-version evidence.
3. `provider_compatibility_evidence`: unknown; requires provider-adapter owner evidence.
4. `deployment_binding_telemetry`: unknown; requires a binding-schema/version observability source and dated capture.
5. `canonical_graph_coverage`: unknown; requires an authorized MSP-scoped GKS impact query.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-03 | ATHER | Closed authorized WP-10 evidence with PR #93 merge, remote E2E/P0/Vercel success, 212 pass/0 fail/1 skip local suite, 35/35 security, all listed local gates, and independent approval; consumer/GKS gaps still block WP-11 removal. |
| 0.1.2+draft | 2026-08-03 | ATHER | Recorded the bounded after-migration inventory, local gate results, and independent `APPROVE` review; remote CI/merge and execution completion remain pending. |
| 0.1.1+draft | 2026-08-03 | ATHER | Corrected the `index.mjs` commit-pinned blob hash after independent HEAD verification. |
| 0.1.0+draft | 2026-08-03 | ATHER | Recorded commit-pinned WP-10 consumer discovery, source hashes, public-export risk, unknown external evidence, and a blocked WP-11 removal gate. |
