---
title: "STD: Execution Governance Standard"
doc_id: "STD-EXECUTION-GOVERNANCE"
status: "stable"
version: "2.4.0+ga"
updated: "2026-08-02"
owner: "GoVibe"
source_of_truth: true
distribution_role: "canonical"
canonical_repository: "Freshair129/govibe"
canonical_path: "docs/STD-Execution-Governance.md"
normative_payload_sha256: "d72f3f6d0e9a711d25c689f9ddee13468cbdd10a34a336451112e0c41ae3b3f4"
mirror_targets:
  - repository: "Freshair129/RWANG-PROMAX"
    path: "skills/rwang/references/EXECUTION-GOVERNANCE.md"
sync_policy:
  semantic_version_lock: "exact"
  integrity_scope: "normative_payload"
  conflict_resolution: "canonical_wins"
related_adrs: ["ADR-015", "ADR-018", "ADR-019"]
---

> **AUTHORITY NOTICE (2026-08-02):** This GoVibe file is the canonical single source of truth
> for the Execution Governance Standard. RWANG-PROMAX distributes a read-only mirror.
> Semantic changes are approved and versioned here first; mirrors follow.

# STD: Execution Governance Standard

**Title:** Execution Governance Standard  
**Summary:** Minimum viable process selection for safe work execution, mapped to Access Scope H0-H4 (enforceable capability tiers) and W-Scale fan-out control.  
**Version:** 2.4.0+ga  
**Updated:** 2026-08-02  
**Role:** Governance / Process Framework  
**Legacy Alias:** R10, Complexity-Based Execution Path  
**wikilink:** [[STD-Execution-Governance]]  
**crosslink:** [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]

---

## 1. Core Principle

Choose the minimum process that preserves correctness, safety, and maintainability.

- Avoid under-engineering.
- Avoid over-engineering.
- Every non-trivial task must declare **Complexity Level** and **Access Scope** (H) before execution.
- Access Scope defaults from the Complexity Level; declare it explicitly only to override upward.
- When uncertainty exists, choose the higher level.
- Authority uncertainty must fail closed: resolve the canonical source before using a conflicting copy for approval, implementation, or audit.

## 2. Complexity Levels

| Level | Name | Workflow | Use When | Recommended Context |
|---|---|---|---|---|
| **C-0** | Trivial | Text -> Code | Typo, copy, config, comment, or tiny isolated change | H0 |
| **C-1** | Direct | Text -> Code | Small task, clear bug fix, single-file low-risk change | H0-H1 |
| **C-2** | Doc-Driven | Text -> Doc -> Code | Feature work, multi-file work, medium-risk logic | H1-H2 |
| **C-3** | Architecture-Driven | Text -> Doc -> Diagram -> Code | Architecture, governance, security, cross-system, platform-level work | H3 (H4 by declaration) |

## 3. H-Scale: Access Scope

`H` is the executor's tool and permission ceiling. It is not graph distance, retrieval radius, token budget, risk, or context profile.

| H Tier | Capability set | Scope reading | Extra requirement |
|---|---|---|---|
| **H0** | read one bounded file | Subtask / PR | — |
| **H1** | + search (glob/grep) | Task / Component | — |
| **H2** | + write and multi-file edit | Story / Feature | — |
| **H3** | + shell execution | Epic / Module | — |
| **H4** | + network and full configured capabilities | Architecture / cross-system / platform | approval before implementation |

Default mapping:

```yaml
complexity_access_mapping:
  C-0: H0
  C-1: H1
  C-2: H2
  C-3: H3   # H4 only by declaration + approval
```

Rules:

- H defaults from Complexity; declare it only to override upward.
- H4 requires approval before implementation.
- For C-2 scope, the grantor is the lead or architect.
- For C-3 scope, the grantor is the owner.
- Do not downgrade complexity or access after approval without recorded justification.
- H5/H6 are abolished. Platform-level work is C-3 at H4.

## 4. W-Scale: Fan-out Control

`H` controls capability. `W` controls fan-out or branching width.

| W Scale | Meaning | Rule |
|---|---|---|
| **W2** | Optimal | `3-5` sibling or peer connections; normal operation |
| **W3** | Warning | `6-8` connections; lead review required |
| **W4** | Super-hub danger | `9+` connections; block deployment until refactored |

Use W-Scale when evaluating:

- graph node degree
- roadmap branching width
- feature or task decomposition breadth
- context packets at risk of token explosion

Dense coupling can shorten graph paths. Therefore, a wide retrieval radius can indicate a missing hub or an oversized task, while high fan-out is the direct coupling warning owned by W-Scale.

## 5. Human-First Artifact Requirements

GoVibe uses normal SWE documents as the primary authoring format. Genesis atoms may be derived after review, but agents and developers are not required to author work directly as atom blocks.

| Access Scope | Required Human Artifact | Optional Supporting Artifact | Derived Atom Examples |
|---|---|---|---|
| **H0** | Change note or task comment | Test evidence | `PARAMS`, `HOOK` |
| **H1** | Task spec or LLD section | API snippet, component contract | `ALGO`, `API`, `PARAMS`, `SAFTY` |
| **H2** | SRD, Feature Spec, or Runbook | Data contract, Test Plan | `FEAT`, `RUNBOOK`, `ENTITY`, `GUARD` |
| **H3** | SDD for the module or integration | API/Event Contract, Integration Plan | `MOD`, `FLOW`, `API`, `PROTOCOL`, `AUDIT` |
| **H4** | SDD, ADR, Access Model, Architecture Standard, PRD, Vision, Roadmap, Operating Model, or cross-system recovery brief | Threat Model, Migration Plan, Governance Model, coupling report, impact matrix | `FRAMEWORK`, `STACK`, `GUARD`, `MCP`, `CONCEPT`, `AUDIT` |

## 6. Docs-to-Code Gate

For C-2 and C-3 work, code generation, task generation, and agent assignment must reference an approved human-readable artifact.

Allowed source artifacts:

- PRD
- SRD
- SDD
- LLD
- API Contract
- Event Contract
- MCP Contract
- Runbook
- Test Plan

Required traceability:

```text
source document
-> requirement or section
-> task
-> agent assignment
-> artifact
-> review
-> test evidence
```

## 7. Diagram-to-Doc Gate

Diagrams are valid architecture inputs, but must be converted into reviewed documentation before implementation.

Supported inputs include:

- C4 context, container, and component diagrams
- sequence diagrams
- flow diagrams
- ERD or data-model diagrams
- site maps
- dependency graphs
- agent workflow diagrams

Required flow:

```text
diagram -> draft doc -> human review -> approved doc -> docs to code
```

## 8. Canonical Source Rule

Human-readable SWE documents are canonical for their governed subject. Derived atoms support retrieval, graph linking, compaction, and visualization.

If a derived atom conflicts with its canonical source document, the canonical source wins until the owner approves a new revision.

A mirror is not a second authority. A mirror distributes an exact governed payload and must identify its canonical source.

## 9. Naming Rule

Use `Test Plan` for testing strategy. Use `SDD` or `LLD` for design. Do not use `TDD` to mean Technical Design Document because it conflicts with Test-Driven Development.

Recommended terms:

```text
PRD = Product Requirements Document
SRD = Software Requirements Document
SDD = Software/System Design Document
LLD = Low-Level Design
TRD = Technical Requirements Document
Test Plan = Testing and verification strategy
```

## 10. Verification Requirements

| Complexity | Required Verification |
|---|---|
| **C-0** | Basic validation |
| **C-1** | Basic test and manual check |
| **C-2** | Tests, spec review, and lead approval |
| **C-3** | Tests, documentation review, diagram review, impact analysis, and owner approval |

W-Scale checks are additionally required when work changes graph structure, decomposition breadth, routing topology, or roadmap branching behavior.

Authority and mirror checks are additionally required when a governed standard is copied across repositories.

## 11. Required Output Format

Every non-trivial task response should include:

```markdown
**Complexity:** C-X
**Access Scope:** H-Y
**W-Scale:** W2 / W3 / W4 or N/A
**Risk:** LOW / MEDIUM / HIGH
**Required Artifacts:** ...
**Plan:** ...
**Verification:** ...
```

Access Scope may be omitted only when it equals the declared Complexity default and the omission cannot create ambiguity.

## 12. Authority and Mirror Distribution Contract

### 12.1 Canonical authority

The single source of truth for this standard is:

```text
repository: Freshair129/govibe
path: docs/STD-Execution-Governance.md
```

GoVibe owns approval, semantic versioning, changelog, and normative content.

The RWANG-PROMAX copy is a distribution mirror:

```text
repository: Freshair129/RWANG-PROMAX
path: skills/rwang/references/EXECUTION-GOVERNANCE.md
```

If any copy conflicts with the GoVibe canonical file, the GoVibe file wins.

### 12.2 One semantic version

The standard has one semantic version across all copies.

- Canonical and synced mirrors must expose the same `version`.
- A mirror must not create a higher or independent semantic version.
- Mirror-wrapper changes use `mirror_revision`, not the standard's semantic version.
- `MAJOR` changes incompatible obligations or authority boundaries.
- `MINOR` adds enforceable rules, fields, gates, or verification duties.
- `PATCH` clarifies wording without changing obligations.

Version `2.4.0+ga` is a MINOR change because it adds a normative authority, integrity, and drift-control contract while preserving the C/H/W model.

### 12.3 Required mirror metadata

Every mirror must declare:

```yaml
source_of_truth: false
distribution_role: mirror
canonical_repository: Freshair129/govibe
canonical_path: docs/STD-Execution-Governance.md
canonical_version: 2.4.0+ga
canonical_normative_payload_sha256: <sha256>
mirror_revision: <integer>
mirror_status: synced | pending | drifted | unknown
last_synced_at: <YYYY-MM-DD>
```

The canonical file must declare `source_of_truth: true`, `distribution_role: canonical`, its own repository/path, mirror targets, and the same normative payload hash.

### 12.4 Normative payload and integrity

The normative payload is the Markdown body beginning at the first `# STD: Execution Governance Standard` heading and ending at the final changelog row.

Canonical and mirror wrappers may have different frontmatter and authority notices, but their normative payload must be byte-identical after LF newline normalization.

Integrity is valid only when all are true:

1. semantic versions match
2. normative payload hashes match
3. mirror metadata points to the declared canonical repository and path
4. mirror status is `synced`
5. the mirror contains no local normative edits

### 12.5 Drift handling

Mirror states mean:

- `synced`: version and payload hash match the canonical release
- `pending`: canonical changed and mirror synchronization is in progress
- `drifted`: known semantic or payload mismatch
- `unknown`: canonical identity or integrity has not been verified

For `drifted` or `unknown`:

- do not use the mirror for approval, implementation authorization, audit conclusions, or policy enforcement
- load and verify the GoVibe canonical file
- record the mismatch as governance drift
- do not silently merge both copies
- do not fix the mirror first; submit the semantic change upstream to GoVibe

This is a fail-closed rule.

### 12.6 Change and synchronization flow

```text
proposal
-> GoVibe canonical review
-> owner approval
-> canonical version/changelog update
-> registry update
-> canonical validation
-> mirror synchronization
-> cross-repository integrity validation
-> mirror marked synced
```

Direct semantic edits in RWANG-PROMAX are prohibited. A proposed improvement discovered in RWANG must be submitted upstream to GoVibe, then distributed back after approval.

### 12.7 Registry and automation requirements

GoVibe's document registry must record the canonical version and path. Mirrors must not appear as competing canonical rows.

Automation should fail when:

- more than one file declares `source_of_truth: true` for this `doc_id`
- canonical and mirror versions differ
- payload hashes differ
- a mirror omits canonical identity metadata
- a mirror contains a semantic change not present in GoVibe
- a canonical change is merged without registry and mirror-impact evidence

Offline mirror use is read-only and allowed only when the mirror was previously `synced`; the consumer must report the last verified canonical version and hash.

## 13. Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| **2.4.0+ga** | 2026-08-02 | GoVibe / Boss | Restored GoVibe as canonical SOT; designated RWANG-PROMAX as mirror; added one-version policy, normative payload hashing, mirror states, fail-closed drift resolution, upstream-only semantic edits, registry duties, and cross-repository validation. Consolidated duplicate changelog structures. |
| **2.3.1+ga** | 2026-07-19 | GoVibe | Recorded the earlier authority relocation. Superseded by the 2.4.0 authority decision. No C/H/W semantic change. |
| **2.3.0+ga** | 2026-07-10 | GoVibe / Boss | Redefined H as Access Scope H0-H4; abolished H5/H6; separated retrieval radius and W fan-out; required approval for H4. |
| **2.2.0+ga** | 2026-06-20 | GoVibe | Normalized frontmatter and changelog metadata. |
| **2.2.0** | 2026-06-12 | GoVibe | Expanded execution governance, artifact requirements, and W-Scale controls. |
| **2.1.0** | 2026-06-12 | GoVibe | Added human-first artifacts, Docs-to-Code, Diagram-to-Doc, and canonical-source rules. |
| **2.0.0** | 2026-06-07 | GoVibe | Added C-0 and complexity-to-access mapping. |
| **1.0.0** | Previous | GoVibe | Initial complexity governance model. |
