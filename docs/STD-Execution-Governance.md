---
doc_id: "STD-EXECUTION-GOVERNANCE"
status: "stable"
version: "2.2.0+ga"
updated: "2026-06-15"
owner: "GoVibe"
source_of_truth: true
---

# STD: Execution Governance Standard

**Title:** Execution Governance Standard
**Summary:** Minimum viable process selection for safe work execution, mapped to Context Scaling Tier H0-H6 and W-Scale fan-out control.
**Version:** 2.2.0+ga
**Updated:** 2026-06-15
**Role:** Governance / Process Framework
**Legacy Alias:** R10, Complexity-Based Execution Path
**wikilink:** [[STD-Execution-Governance]]
**crosslink:** [[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]

---

## 1. Core Principle
Choose the minimum process that preserves correctness, safety, and maintainability.

- Avoid under-engineering.
- Avoid over-engineering.
- Every non-trivial task must declare **Complexity Level** and **Context Tier** before execution.
- When uncertainty exists, choose the higher level.

## 2. Complexity Levels
| Level | Name | Workflow | Use When | Recommended Context |
|---|---|---|---|---|
| **C-0** | Trivial | Text -> Code | Typo, copy, config, comment, or tiny isolated change | H0 |
| **C-1** | Direct | Text -> Code | Small task, clear bug fix, single-file low-risk change | H0-H1 |
| **C-2** | Doc-Driven | Text -> Doc -> Code | Feature work, multi-file work, medium-risk logic | H1-H2 |
| **C-3** | Architecture-Driven | Text -> Doc -> Diagram -> Code | Architecture, governance, security, cross-system, platform-level work | H3-H6 |

## 3. H-Scale Mapping
| H Tier | Scope | Typical Work |
|---|---|---|
| **H0** | Subtask / PR | Local change, no broad context required |
| **H1** | Task / Component | Component assembly, local imports/exports |
| **H2** | Story / Feature | Feature folder, nearby types, data contracts |
| **H3** | Epic / Module | Module integration, API/event contracts |
| **H4** | Phase / Architecture | System architecture, governance, security model |
| **H5** | Masterplan / Roadmap | Platform vision, operating model, enterprise-wide context |
| **H6** | Full Network / Enterprise Ceiling | Rare full-network traversal, systemic coupling analysis, final escalation ceiling |

Default mapping:

```yaml
complexity_hop_mapping:
  C-0: H0
  C-1: H1
  C-2: H2
  C-3: H3-H6
```

Rules:

- Use H3 for C-3 work that affects one module.
- Use H4 for architecture, governance, security, and access-control changes.
- Use H5 for product vision, roadmap, operating model, or platform-wide direction.
- Use H6 only as the hard ceiling for full-network traversal or enterprise-wide coupling analysis.
- Do not downgrade complexity after approval without justification.

## 4. W-Scale Fan-out Control
Depth and breadth must be controlled separately. `H` governs hop depth; `W` governs fan-out or branching width.

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

## 5. Human-First Artifact Requirements
GoVibe uses normal SWE documents as the primary authoring format. Genesis atoms may be extracted after review, but agents and developers should not be required to author work directly as atom blocks.

| Context Tier | Required Human Artifact | Optional Supporting Artifact | Derived Atom Examples |
|---|---|---|---|
| **H0** | Change note or task comment | Test evidence | `PARAMS`, `HOOK` |
| **H1** | Task spec or LLD section | API snippet, component contract | `ALGO`, `API`, `PARAMS`, `SAFTY` |
| **H2** | SRD, Feature Spec, or Runbook | Data contract, Test Plan | `FEAT`, `RUNBOOK`, `ENTITY`, `GUARD` |
| **H3** | SDD for the module or integration | API/Event Contract, Integration Plan | `MOD`, `FLOW`, `API`, `PROTOCOL`, `AUDIT` |
| **H4** | SDD, ADR, Access Model, or Architecture Standard | Threat Model, Migration Plan | `FRAMEWORK`, `STACK`, `GUARD`, `MCP` |
| **H5** | PRD, Vision, Roadmap, or Operating Model | Governance Model | `CONCEPT`, `MCP`, `FRAMEWORK` |
| **H6** | Enterprise architecture investigation or cross-system recovery brief | Coupling report, impact matrix | `FRAMEWORK`, `AUDIT`, `STACK`, `MCP` |

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
**Context Tier:** H-Y
**W-Scale:** W2 / W3 / W4 or N/A
**Risk:** LOW / MEDIUM / HIGH
**Required Artifacts:** ...
**Plan:** ...
**Verification:** ...
```

## 12. Changelog
| Version | Date | Summary |
|---|---|---|
| **2.2.0+ga** | 2026-06-15 | Added canonical doc_id/version metadata and aligned the standard with the document versioning governance policy. |
| **2.2** | 2026-06-12 | Expanded H-scale to H6, formalized W-Scale fan-out control, aligned C-to-H mapping with GVDOC-1004 handover normalization, and updated required output format. |
| **2.1** | 2026-06-12 | Rewritten into readable UTF-8, added human-first artifacts, Docs to Code gate, Diagram to Doc gate, canonical source rule, and SDD/LLD naming guidance. |
| **2.0** | 2026-06-07 | Added C-0, mapped complexity to H-scale, and clarified enforcement to reduce over-engineering. |
| **1.0** | Previous | Initial three-level complexity model. |
