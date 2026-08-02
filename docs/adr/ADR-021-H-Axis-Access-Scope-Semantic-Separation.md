---
title: "ADR-021: H-Axis Access Scope and Semantic Separation"
doc_id: "ADR-021-H-AXIS-ACCESS-SCOPE-SEPARATION"
status: "accepted"
version: "1.0.0"
updated: "2026-08-01"
owner: "Boss (CEO)"
reviewers: ["ARCHON", "ATHER"]
source_of_truth: true
related_docs:
  - "docs/STD-Execution-Governance.md"
  - "docs/architecture/C4-GoVibe-Platform.md"
  - "docs/change-control/change-requests/work-packets/WP-02-H-Axis-Canonical-Propagation.md"
external_authority:
  repository: "Freshair129/RWANG-PROMAX"
  path: "skills/rwang/references/EXECUTION-GOVERNANCE.md"
  version: "2.3.0+ga"
---

# ADR-021: H-Axis Access Scope and Semantic Separation

## Status

Accepted by owner direction on 2026-08-01.

## Context

GoVibe documents historically used `H` for several incompatible meanings:

- executor capability or permission scope
- context tier
- graph retrieval depth
- graph hop radius
- context size or token budget

RWANG PROMAX is the canonical home of the Execution Governance Standard and defines `H` as **Access Scope**, an enforceable executor tool/permission ceiling with valid values `H0` through `H4`. It explicitly removes `H5/H6` and delegates retrieval distance to a separate measured concern.

Keeping the collision would make policy checks, architecture diagrams, APIs, and implementation symbols appear compatible while carrying different semantics.

## Decision

### 1. Canonical H definition

```text
H = Access Scope = executor tool/permission ceiling
Valid values = H0, H1, H2, H3, H4
```

| Tier | Maximum capability set |
|---|---|
| H0 | read one bounded file |
| H1 | H0 plus repository search |
| H2 | H1 plus multi-file write |
| H3 | H2 plus shell execution |
| H4 | H3 plus network/full configured capability set; explicit approval required before implementation |

H4 is not unlimited authority. Repository policy, task scope, risk controls, human approval, and deny rules still apply.

### 2. Retired meanings

The following are prohibited as active contract meanings:

```text
H = graph hop count
H = retrieval radius
H = token/context budget
H = risk class
H = operating mode
H5 or H6 = elevated access tiers
```

Historical changelog statements may remain when clearly marked historical.

### 3. Separate axes

| Concern | Canonical representation |
|---|---|
| Process complexity | `C-0..C-3` |
| Executor capability ceiling | `access_scope: H0..H4` |
| Fan-out / branching width | `W2..W4` |
| Retrieval breadth | `R0..R6`, `retrieval_radius`, `max_hops`, or an approved retrieval-policy object |
| Context allowance | `context_budget`, `max_tokens`, or an approved budget object |
| Operational/security impact | repository-defined risk field |
| Collaboration model | `CoVibe` or `CoDev` |

### 4. Default mapping

```yaml
complexity_access_mapping:
  C-0: H0
  C-1: H1
  C-2: H2
  C-3: H3
```

`C-3/H4` is an explicit upward override for architecture, cross-system, or platform work and requires owner approval before implementation.

### 5. Naming rules

Use:

```text
AccessScopeClassifier
resolveAccessScope(task, policy)
RetrievalRadiusPlanner
resolveGraphScope(target, retrievalPolicy)
ContextBudgetPlanner
```

Do not introduce new active symbols named:

```text
HLevelClassifier
classifyHLevel
GraphHopResolver under H-scale ownership
H6 full-network traversal
```

## Compatibility

Existing fields named `context_tier` must not be renamed blindly. Each occurrence must be classified by actual behavior:

| Actual behavior | Target |
|---|---|
| permission/tool ceiling | `access_scope` |
| graph retrieval breadth | `retrieval_radius` or retrieval policy |
| content/token allowance | `context_budget` |
| mixed semantics | split fields and version the contract |

Runtime/API schema changes are deferred to a separately approved implementation packet after this semantic classification.

## Consequences

Positive:

- policy decisions become enforceable and testable
- retrieval behavior can evolve independently of permissions
- diagrams and APIs no longer hide semantic collisions
- GoVibe mirrors the canonical RWANG standard

Costs:

- legacy documents and symbols require migration
- compatibility aliases may be needed temporarily
- C4 and SDD diagrams require deliberate correction rather than a global replacement

## Conformance rule

When any GoVibe document conflicts with this ADR on the meaning of H, this ADR and the canonical RWANG Execution Governance Standard govern until the conflicting document is revised.

## Changelog
| Version | Date | Status | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-01 | accepted | Defined H exclusively as Access Scope H0-H4 and separated retrieval, context, risk, fan-out, and operating mode. |
