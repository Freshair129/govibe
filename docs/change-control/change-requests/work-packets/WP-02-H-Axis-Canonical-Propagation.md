---
doc_id: "WP-02-H-AXIS-CANONICAL-PROPAGATION"
title: "Work Packet: H-Axis Canonical Propagation"
status: "active"
version: "0.1.0"
updated: "2026-08-01"
owner: "ATHER"
reviewers: ["ARCHON", "GHOST"]
parent_cr: "CR-2026-08-01-GOVIBE-ARCHITECTURE-ALIGNMENT-IMPLEMENTATION"
complexity: "C-3"
access_scope: "H4"
w_scale: "W2"
risk: "HIGH"
source_of_truth: false
canonical_external_source:
  repository: "Freshair129/RWANG-PROMAX"
  path: "skills/rwang/references/EXECUTION-GOVERNANCE.md"
  version: "2.3.0+ga"
---

# WP-02: H-Axis Canonical Propagation

## 1. Objective

Propagate the approved RWANG H-axis definition through GoVibe documents and contracts without changing the meaning of retrieval, context budgeting, risk, or fan-out.

Canonical rule:

```text
H = Access Scope = executor tool/permission ceiling
Valid values = H0, H1, H2, H3, H4
```

`H5` and `H6` are retired and must not be used as active enforcement tiers.

## 2. Canonical Definitions

| Axis | Meaning | Values / representation |
|---|---|---|
| C | process complexity | C-0..C-3 |
| H | enforceable tool/permission ceiling | H0..H4 |
| W | fan-out / branching width | W2..W4 |
| Retrieval radius | graph search distance | explicit hop/radius field, not H |
| Context budget | content/token allowance | explicit numeric/budget field, not H |
| Risk | operational/security impact | repository risk class, not H |
| Operating mode | collaboration model | CoVibe / CoDev |

## 3. H-Tier Contract

| H | Capability ceiling | Typical scope | Approval rule |
|---|---|---|---|
| H0 | read one bounded file | subtask / PR | default for C-0 |
| H1 | H0 + repository search | task / component | default for C-1 |
| H2 | H1 + multi-file write | story / feature | default for C-2 |
| H3 | H2 + shell execution | epic / module | default for C-3 |
| H4 | H3 + network/full capability set | architecture / cross-system / platform | explicit approval before implementation |

Default mapping:

```yaml
complexity_access_mapping:
  C-0: H0
  C-1: H1
  C-2: H2
  C-3: H3
```

`C-3/H4` is an explicit upward override for platform or cross-system work.

## 4. Required Document Corrections

### 4.1 `docs/architecture/C4-GoVibe-Platform.md`

Correct all active uses where H means retrieval depth or context expansion.

Required changes:

- replace claims that H spans `H0-H6` with `H0-H4` only when discussing Access Scope
- remove `H6 reserved for full-network traversal`
- replace `HLevelClassifier` with either:
  - `AccessScopeClassifier` for permission/capability selection, or
  - `RetrievalRadiusPlanner` for graph search depth
- replace `GraphHopResolver` ownership under H with an explicit retrieval component
- replace `classifyHLevel(task, sourceDoc)` with `resolveAccessScope(task, policy)`
- replace `resolveGraphScope(targetNode, hLevel)` with `resolveGraphScope(targetNode, retrievalPolicy)`
- separate access authorization from context retrieval in diagrams and component responsibilities

### 4.2 Parent CR and work packets

Verify all metadata uses:

```yaml
complexity: "C-3"
access_scope: "H4"
```

Do not use `context_tier` as an alias for H.

### 4.3 SRS and PRD documents

Where requirements mention `context tier`, determine which concept is intended:

- tool/permission ceiling -> `access_scope`
- retrieval breadth -> `retrieval_radius` or repository-approved retrieval-policy field
- token/content allowance -> `context_budget`

No blind string replacement is allowed.

### 4.4 MCP contracts

Requests that currently accept `context tier` must be audited before schema changes.

Required decision table:

| Existing field | Actual behavior | Target field | Compatibility action |
|---|---|---|---|
| `context_tier` | access control | `access_scope` | migrate + deprecate alias |
| `context_tier` | retrieval breadth | `retrieval_radius` | semantic migration |
| `context_tier` | token limit | `context_budget` | semantic migration |
| mixed/unclear | multiple meanings | split fields | requires ADR/API versioning |

## 5. Repository Audit Queries

Search for at least:

```text
H5
H6
H0-H6
H0..H6
context_tier
context tier
HLevel
H-level
GraphHopResolver
classifyHLevel
resolveGraphScope
full-network traversal
```

Each match must be classified:

```text
active-contract
active-documentation
historical-changelog
example
superseded
false-positive
```

Historical changelog entries may remain when clearly marked as historical.

## 6. Prohibited Changes

- do not reinterpret W as retrieval breadth
- do not encode risk into H
- do not remove context limits merely because they are no longer called H
- do not change runtime schemas without an API compatibility decision
- do not edit the RWANG canonical file from this GoVibe work packet
- do not describe H4 as unlimited authority; H4 remains policy- and approval-bounded

## 7. Deliverables

1. H-axis occurrence inventory
2. corrected C4 architecture document
3. corrected affected PRD/SRS/SDD/FEAT references
4. schema compatibility decision for any `context_tier` field
5. document validation evidence
6. changelog and registry updates
7. residual-debt list for code symbols requiring later refactor

## 8. Acceptance Criteria

- no active GoVibe contract uses H5 or H6
- H is defined only as Access Scope
- graph hops use an explicit retrieval concept
- token/content limits use an explicit context-budget concept
- W remains the fan-out axis
- C/H defaults and H4 approval match RWANG canonical governance
- examples, diagrams, and implementation names do not reintroduce the old collision
- historical references remain clearly historical

## 9. Execution Order

```text
inventory
-> semantic classification
-> architecture/document correction
-> schema compatibility decision
-> validation
-> review
-> merge
```

## 10. Review Gate

ARCHON confirms architecture separation.

ATHER confirms canonical compliance and provenance.

GHOST confirms searches, document validation, and residual active matches.

## Changelog

| Version | Date | Status | Summary |
|---|---|---|---|
| 0.1.0 | 2026-08-01 | active | Created bounded propagation packet for the RWANG H0-H4 Access Scope definition. |
