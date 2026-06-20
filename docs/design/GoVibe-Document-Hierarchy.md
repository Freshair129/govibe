---
title: "GoVibe Document Hierarchy"
doc_id: "DESIGN-GOVIBE-DOCUMENT-HIERARCHY"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-19"
owner: "ARCHON / THESEUS / ATHER"
source_of_truth: true
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/STD-Execution-Governance.md"
  - "docs/STD-Document-Versioning-Governance.md"
  - "docs/DOC-VERSION-REGISTRY.md"
---

# GoVibe Document Hierarchy

## 1. Purpose

Define the recommended document hierarchy for GoVibe from the highest product and governance layer down to execution, change control, and evidence.

This hierarchy exists to prevent three recurring problems:

- creating multiple product-level PRDs for module work
- mixing product intent, technical requirements, design, and runbooks in one file
- making change-request or audit artifacts act like canonical system design

## 2. Ordering Principle

GoVibe should organize documents from large to small in this order:

```text
Platform Vision
  -> Product System Map
  -> System / Module Feature Contract
  -> Technical Requirements
  -> Architecture / Design
  -> Interface / Event / Data Contract
  -> Runbook / Operating Procedure
  -> Plan / Roadmap / Task Container
  -> Change Request / ADR / RCA
  -> Verification / Audit / Evidence
```

Two rules govern this order:

1. Higher documents define why and what.
2. Lower documents define how, operate, change, and verify.

## 3. Canonical Hierarchy

| Level | Doc Type | Role | Typical Count |
|---|---|---|---|
| L1 | `PRD` | Product vision and platform/system map | Usually one platform PRD, optionally one PRD per truly separate product |
| L2 | `FEAT` | System, module, or feature contract | Many |
| L3 | `SRS` / `TRD` / `SRD` | Technical requirements and software behavior | Many |
| L4 | `ADR` / `SDD` / `LLD` / `Blueprint` / `C4` / `CTX` / `ERD` / `SEQ` | Architecture and design decisions | Many |
| L5 | `API` / event contract / schema contract | Integration and runtime interface detail | Many |
| L6 | `RUNBOOK` | Operational procedure | Many |
| L7 | roadmap / master plan / backlog / task container | Planned execution inventory | Many |
| L8 | `CR` / `RCA` | Change and failure control | Many |
| L9 | audit / UAT / evidence / feedback | Verification and proof | Many |

## 4. Recommended Interpretation

### 4.1 PRD

- Use one platform PRD for GoVibe.
- Do not create a new PRD for every module or feature.
- Create an additional PRD only when a truly separate product boundary exists.

### 4.2 FEAT

- Use `FEAT` when defining one system module or one major feature contract.
- A module may contain several feature behaviors.
- If the unit has clear ownership, boundary, inputs, outputs, and success criteria, it usually belongs here.

### 4.3 SRS / TRD / SRD

- Use these when the feature or module needs formal functional and non-functional requirements.
- These docs translate intent into implementable obligations.

### 4.4 Architecture / Design Docs

- Use `ADR` for irreversible or governance-significant decisions.
- Use `SDD`, `LLD`, `Blueprint`, `C4`, `CTX`, `ERD`, or `SEQ` for design and structure.
- These should not replace feature intent or requirements.

### 4.5 Runbooks, Change, and Evidence

- Runbooks explain how to operate.
- Change requests explain what change is proposed.
- RCA explains failure cause and prevention.
- Audit and evidence docs prove what happened.

None of these should become the canonical place for module intent.

## 5. Recommended Structure For One GoVibe System

```text
PRD-GoVibe-Platform-Overview.md
  -> FEAT-System-or-Module.md
    -> SRS-System-or-Module.md
      -> ADR / SDD / Blueprint / API / CTX / ERD / SEQ
        -> RUNBOOK
        -> roadmap / tasks
        -> CR / RCA
        -> audit / feedback / evidence
```

## 6. Module And Feature Rule

GoVibe should prefer this relationship:

```text
System
  -> Module
    -> Feature behaviors
```

Interpretation:

- one `system` contains several modules
- one `module` may contain several feature behaviors
- one `feature` should not become a fake top-level architecture boundary unless it truly owns state, policy, interfaces, and review flow of its own

## 7. Practical Skeleton For Future Docs

When adding a new capability, use this skeleton:

1. Check whether it belongs under an existing PRD system.
2. Write one `FEAT` doc for the module or major feature contract.
3. Add `SRS` only if implementation-facing requirements need formalization.
4. Add `ADR` only when cross-system trade-offs or irreversible design choices exist.
5. Add `SDD` or `Blueprint` only after feature intent and requirements are stable.
6. Add `API`, `CTX`, `ERD`, or `SEQ` only when that interface or design slice needs its own contract.
7. Keep `CR`, `RCA`, `audit`, and `feedback` as supporting control artifacts, not as the feature source of truth.

## 8. Acceptance Criteria

- The hierarchy distinguishes product intent from technical requirements and evidence.
- The hierarchy keeps GoVibe on one platform PRD by default.
- The hierarchy treats module-level work as `FEAT` before `SRS` and design docs.
- The hierarchy gives a repeatable skeleton for future document creation.

## 9. Success Criteria

- Fewer duplicate PRD-like docs appear for module work.
- Teams can tell whether a new idea belongs in PRD, FEAT, SRS, ADR, or runbook before writing.
- Source-of-truth ownership becomes easier to audit.

## 10. Definition Of Done

- Document is registered in `docs/DOC-VERSION-REGISTRY.md`.
- `docs:validate` passes.
- Future taxonomy discussions can cite this file instead of re-deciding the hierarchy every time.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-19 | ARCHON / THESEUS / ATHER | Added recommended document hierarchy and skeleton for GoVibe from platform PRD down to evidence. |
