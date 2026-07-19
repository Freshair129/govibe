---
title: "STD: Execution Governance Standard"
doc_id: "STD-EXECUTION-GOVERNANCE"
status: "stable"
version: "2.3.1+ga"
updated: "2026-07-19"
owner: "GoVibe"
source_of_truth: true
related_adrs: ["ADR-015", "ADR-018", "ADR-019"]
---

> **MIRROR NOTICE (2026-07-19):** canonical home of this standard moved to
> **RWANG PROMAX** — `D:/rwang/RWANG-PROMAX-skills/skills/rwang/references/EXECUTION-GOVERNANCE.md`
> (unification Mechanical #1, see `G:/G-Maiden/docs/research/2026-07-19-govibe-gmaiden-governance-comparison.md`).
> This copy is kept for GoVibe-local reference and registry continuity; **edit the canonical, then sync here.**

# STD: Execution Governance Standard

**Title:** Execution Governance Standard
**Summary:** Minimum viable process selection for safe work execution, mapped to Access Scope H0-H4 (enforceable capability tiers) and W-Scale fan-out control.
**Version:** 2.3.1+ga
**Updated:** 2026-07-19
**Role:** Governance / Process Framework
**Legacy Alias:** R10, Complexity-Based Execution Path
**wikilink:** [[STD-Execution-Governance]]
**crosslink:** [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]

---

## 1. Core Principle
Choose the minimum process that preserves correctness, safety, and maintainability.

- Avoid under-engineering.
- Avoid over-engineering.
- Every non-trivial task must declare **Complexity Level** and **Access Scope** (H) before execution. Access Scope defaults from the Complexity Level; declare it explicitly only to override upward.
- When uncertainty exists, choose the higher level.

## 2. Complexity Levels
| Level | Name | Workflow | Use When | Recommended Context |
|---|---|---|---|---|
| **C-0** | Trivial | Text -> Code | Typo, copy, config, comment, or tiny isolated change | H0 |
| **C-1** | Direct | Text -> Code | Small task, clear bug fix, single-file low-risk change | H0-H1 |
| **C-2** | Doc-Driven | Text -> Doc -> Code | Feature work, multi-file work, medium-risk logic | H1-H2 |
| **C-3** | Architecture-Driven | Text -> Doc -> Diagram -> Code | Architecture, governance, security, cross-system, platform-level work | H3 (H4 by declaration) |

## 3. H-Scale: Access Scope (formerly Context Tier)
`H` is the executor's tool/permission ceiling — which capabilities an agent may use while executing its task. Each tier is an enforceable capability set. The graph-distance reading (retrieval radius in hops, with a derived ceiling) is a separate, measured concern owned by [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]] §3 — binding text here does not use hop language.

| H Tier | Capability set | Scope reading | Extra requirement |
|---|---|---|---|
| **H0** | read (single bounded file) | Subtask / PR | — |
| **H1** | + search (glob/grep) | Task / Component | — |
| **H2** | + write, multi-file | Story / Feature | — |
| **H3** | + shell | Epic / Module | — |
| **H4** | + network (full set) | Architecture / cross-system / platform | approval before implementation |

Default mapping:

```yaml
complexity_access_mapping:
  C-0: H0
  C-1: H1
  C-2: H2
  C-3: H3   # H4 by declaration + approval
```

Rules:

- H defaults from the Complexity Level; declare explicitly only to override upward.
- H4 requires approval before implementation; the grantor derives from complexity: C-2 scope — the lead/architect; C-3 scope — the owner.
- H is not retrieval relevance and not budget: relevance is a retrieval-scoring concern (measured hops with distance decay — see [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]), and spend is governed by cost caps. H never duplicates either.
- Do not downgrade complexity after approval without justification.

> H5/H6 removed in 2.3.0: as enforcement tiers they granted nothing H4 does not, and no downstream atom ever used them. Platform-level (masterplan/enterprise) work is C-3 at H4. Evidence base: RWANG `RFC--H-AXIS-0.6.0` (approved 2026-07-10).

## 4. W-Scale Fan-out Control
Access and breadth must be controlled separately. `H` governs the executor's capability ceiling; `W` governs fan-out or branching width.

| W Scale | Meaning | Rule |
|---|---|---|
| **W2** | Optimal | `3-5` sibling or peer connections; normal operation |
| **W3** | Warning | `6-8` connections; lead review required |
| **W4** | Super-hub danger | `9+` connections; block deployment until refactored |

Use W-Scale when evaluating:

- graph node degree
- roadmap branching width
- feature/task decomposition breadth
- context packets that risk token explosion

> Note (2.3.0): **W is the coupling detector.** Dense coupling *shortens* graph paths (more edges → shorter shortest-paths), so an over-wide required retrieval radius signals a missing hub/summary node or an oversized task — not "spaghetti". Spaghetti is high fan-out, and this section owns it.

## 5. Human-First Artifact Requirements
GoVibe uses normal SWE documents as the primary authoring format. Genesis atoms may be extracted after review, but agents and developers should not be required to author work directly as atom blocks.

| Access Scope | Required Human Artifact | Optional Supporting Artifact | Derived Atom Examples |
|---|---|---|---|
| **H0** | Change note or task comment | Test evidence | `PARAMS`, `HOOK` |
| **H1** | Task spec or LLD section | API snippet, component contract | `ALGO`, `API`, `PARAMS`, `SAFTY` |
| **H2** | SRD, Feature Spec, or Runbook | Data contract, Test Plan | `FEAT`, `RUNBOOK`, `ENTITY`, `GUARD` |
| **H3** | SDD for the module or integration | API/Event Contract, Integration Plan | `MOD`, `FLOW`, `API`, `PROTOCOL`, `AUDIT` |
| **H4** | SDD, ADR, Access Model, or Architecture Standard — platform-level (C-3) work: PRD, Vision, Roadmap, Operating Model, or a cross-system recovery brief | Threat Model, Migration Plan, Governance Model, coupling report, impact matrix | `FRAMEWORK`, `STACK`, `GUARD`, `MCP`, `CONCEPT`, `AUDIT` |

## 6. Docs to Code Gate
For C-2 and C-3 work, code generation, task generation, and agent assignment should reference an approved human-readable artifact.

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

The implementation task must preserve traceability:

```text
source document -> requirement/section -> task -> agent assignment -> artifact -> review -> test evidence
```

## 7. Diagram to Doc Gate
Diagrams are valid source inputs for architecture work, but they must be converted into reviewed documentation before implementation begins.

Supported diagram inputs:

- C4 context/container/component diagrams
- Sequence diagrams
- Flow diagrams
- ERD/data model diagrams
- Site maps
- Dependency graphs
- Agent workflow diagrams

Required flow:

```text
diagram -> draft doc -> human review -> approved doc -> docs to code
```

## 8. Canonical Source Rule
Human-readable SWE documents are canonical. Derived atoms support AI retrieval, graph linking, compaction, and visualization.

If a derived atom conflicts with its source document, the source document wins until the owner approves a new document revision.

## 9. Naming Rule
Use `Test Plan` for testing strategy and use `SDD` or `LLD` for design. Avoid using `TDD` to mean Technical Design Document because it conflicts with Test-Driven Development.

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
| **C-3** | Tests, documentation review, diagram review, impact analysis, and user/owner approval |

W-Scale checks are additionally required when work changes graph structure, decomposition breadth, routing topology, or roadmap branching behavior.

## 11. Required Output Format
Every non-trivial task response should include:

```markdown
**Complexity:** C-X
**Access Scope:** H-Y (H0-H4; omit when equal to the complexity default)
**W-Scale:** W2 / W3 / W4 or N/A
**Risk:** LOW / MEDIUM / HIGH
**Required Artifacts:** ...
**Plan:** ...
**Verification:** ...
```

## 12. Changelog
| Version | Date | Summary |
|---|---|---|
| **2.3.1+ga** | 2026-07-19 | Canonical home relocated to RWANG PROMAX references (unification Mechanical #1); this file becomes a mirror/pointer. No semantic changes to the standard. |
| **2.3.0+ga** | 2026-07-10 | H-scale redefined as Access Scope: five enforceable capability tiers H0-H4; H5/H6 removed (granted nothing H4 does not; platform-level work is C-3 at H4); H defaults from complexity with upward-only override; H4 approval grantor derives from complexity; hop/radius language delegated to FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS (measured concern); W confirmed as the coupling detector. Upstream alignment with RWANG RFC--H-AXIS-0.6.0 (approved 2026-07-10). Signed off by Boss (CEO) 2026-07-10 — `+ga`/`stable` restored. |
| **2.2.0+ga** | 2026-06-15 | Added canonical doc_id/version metadata and aligned the standard with the document versioning governance policy. |
| **2.2** | 2026-06-12 | Expanded H-scale to H6, formalized W-Scale fan-out control, aligned C-to-H mapping with GVDOC-1004 handover normalization, and updated required output format. |
| **2.1** | 2026-06-12 | Rewritten into readable UTF-8, added human-first artifacts, Docs to Code gate, Diagram to Doc gate, canonical source rule, and SDD/LLD naming guidance. |
| **2.0** | 2026-06-07 | Added C-0, mapped complexity to H-scale, and clarified enforcement to reduce over-engineering. |
| **1.0** | Previous | Initial three-level complexity model. |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 2.3.1+ga | 2026-07-19 | GoVibe | Mirror notice added — canonical moved to RWANG PROMAX (no semantic change). |
| 2.3.0+ga | 2026-07-10 | GoVibe / Boss (CEO) sign-off | Access Scope H0-H4 alignment per RWANG RFC--H-AXIS-0.6.0 — see section 12 row for detail. |
| 2.2.0+ga | 2026-06-20 | GoVibe | Normalized frontmatter (added title) and added changelog footer per STD-Document-Versioning-Governance. |
