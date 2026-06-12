# DOCS: Human-First SWE Documents and Atom Extraction

**Status:** `DRAFT`
**Author:** ATHER
**Date:** 2026-06-12
**Scope:** GoVibe documentation governance, Docs to Code, Diagram to Doc, and Genesis atom extraction

## 1. Principle
GoVibe documentation is written for humans first.

Developers, tech leads, architects, and product owners should write normal SWE documents such as PRD, SRD, SDD, LLD, API Contract, Runbook, and Test Plan. GoVibe may then extract Genesis atoms from those documents for AI-native retrieval, graph linking, progress tracking, and Mission Control visualization.

Atom authoring is an internal knowledge operation, not a required writing style for every developer.

## 2. Source of Truth
The canonical source is the approved human-readable document.

```text
Human SWE document -> derived atoms -> AI knowledge graph -> Mission Control views
```

If a derived atom disagrees with its source document, the source document wins until a human owner approves a new revision.

## 3. Docs to Code
Docs to Code is the workflow where approved SWE documents drive implementation.

```text
PRD / SRD / SDD / LLD / API Contract / Runbook / Test Plan
        -> requirements and acceptance criteria
        -> tasks and agent assignments
        -> implementation artifacts
        -> review and verification evidence
```

Required behavior:

- C-2 and C-3 work should reference an approved source document.
- Generated tasks must keep a backlink to the source document and section.
- Agent assignments must preserve the expected owner, scope, acceptance criteria, and verification method.
- Progress tracking should come from document-derived state where possible, not hardcoded dashboard data.

## 4. Diagram to Doc
Diagram to Doc is the workflow where a diagram becomes reviewed documentation before implementation.

```text
diagram -> draft SWE doc -> human review -> approved doc -> docs to code
```

Supported source diagrams:

- C4 context/container/component diagrams
- Sequence diagrams
- Flow diagrams
- ERD/data model diagrams
- Site maps
- Dependency graphs
- Agent workflow diagrams

Diagrams are allowed to start architecture work, but code should not be generated from an unreviewed diagram for C-3 work.

## 5. Atom Extraction Mapping
| Human Doc Section | Derived Atom Examples | Usage |
|---|---|---|
| Vision, goals, non-goals | `CONCEPT` | Product intent and retrieval context |
| Feature requirements | `FEAT`, `RUNBOOK` | Task creation and progress tracking |
| System architecture | `MOD`, `FLOW`, `STACK` | Module graph and architecture context |
| API and integration | `API`, `PROTOCOL`, `HOOK`, `MCP` | Interface contracts and agent bridges |
| Data model | `ENTITY`, `PARAMS` | Schema, DTO, and storage context |
| Access control | `GUARD`, `SAFTY` | RBAC/ABAC policy and risk control |
| Audit and compliance | `AUDIT` | Traceability and evidence |
| Algorithms and component logic | `ALGO`, `PARAMS` | LLD and implementation context |

## 6. GoVibe Product Rule
GoVibe is a project management and CoDev coordination layer. It should track work, progress, artifacts, agent status, permissions, and review state.

GoVibe should not manage third-party provider billing, package quotas, token subscriptions, or runtime ownership for external tools such as Claude Code, Gemini CLI, OpenClaw, or Hermes.

## 7. Recommended Document Set
Minimum platform-level set:

```text
PRD-GoVibe-Platform-Overview.md
SDD-System-Design.md
R10-Complexity-Based.md
DOCS-Human-First-Atom-Extraction.md
```

Module or feature work can add:

```text
SRD-<Feature>.md
SDD-<Module>.md
LLD-<Component>.md
API-<Contract>.md
TEST-PLAN-<Feature>.md
ADR-<Decision>.md
```

Avoid using `TDD` to mean Technical Design Document. Use `SDD`, `LLD`, or `Test Plan` instead.

## 8. Acceptance Criteria
- A human developer can understand the requirement without learning Genesis atom syntax.
- An AI agent can extract atoms from the document without inventing missing product intent.
- Mission Control can trace UI state back to approved source documents.
- Implementation tasks can cite the source document, section, acceptance criteria, and verification method.
