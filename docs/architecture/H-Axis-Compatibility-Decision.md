---
title: "H-Axis Compatibility Decision"
doc_id: "H-AXIS-COMPATIBILITY-DECISION"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "ATHER"
source_of_truth: true
related_adrs: ["ADR-020"]
---

# H-Axis Compatibility Decision

## 1. Purpose

Define how existing GoVibe fields and terms are interpreted during migration to the canonical RWANG H-axis model.

## 2. Binding rule

`H` means Access Scope only. Valid active values are `H0` through `H4`.

No existing field is renamed until its runtime behavior is classified.

## 3. Compatibility matrix

| Existing term/field | Observed or documented meaning | Target concept | Migration rule |
|---|---|---|---|
| `access_scope` | executor capability ceiling | `access_scope` | keep |
| `context_tier` used for tool permission | executor capability ceiling | `access_scope` | deprecate alias, preserve read compatibility for one contract version |
| `context_tier` used for graph breadth | retrieval depth | `retrieval_policy.max_hops` or `retrieval_radius` | semantic migration; do not map values mechanically |
| `context_tier` used for token/content allowance | context size | `context_budget` | semantic migration |
| `HLevelClassifier` selecting permissions | access scope | `AccessScopeResolver` | rename in bounded implementation PR |
| `HLevelClassifier` selecting graph depth | retrieval policy | `RetrievalRadiusPlanner` | split responsibility |
| `GraphHopResolver` under H-scale | graph scope | `GraphScopeResolver` | move under retrieval policy |
| `H5` / `H6` active values | retired access tiers or retrieval aliases | none | reject for new writes; classify legacy reads |
| `H5` / `H6` in changelog | historical record | historical text | retain when explicitly historical |

## 4. API strategy

For a future versioned runtime contract:

```yaml
access_scope: H0 | H1 | H2 | H3 | H4
retrieval_policy:
  max_hops: integer
  relation_allowlist: [string]
  include_backlinks: boolean
context_budget:
  max_tokens: integer
  max_documents: integer
```

Temporary compatibility behavior may accept `context_tier`, but responses must expose a deprecation warning and the resolved target concept. Mixed semantics must fail closed rather than guessing.

## 5. Validation rules

- reject new `H5` and `H6` metadata
- reject H values outside `H0-H4`
- do not infer graph hops from H
- do not infer token budget from H
- require explicit approval for H4 implementation work
- require retrieval and context fields when behavior depends on them

## 6. Residual debt

The following remain implementation work, not completed by this documentation PR:

- runtime schema inventory
- code-symbol refactor
- compatibility parser
- deprecation warnings
- validation tests
- direct revision of the full C4 base document

## Changelog

| Version | Date | Status | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-01 | approved | Defined compatibility handling for legacy H and context-tier semantics. |
