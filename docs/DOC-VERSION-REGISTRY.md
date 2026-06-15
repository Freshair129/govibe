---
title: "Document Version Registry"
doc_id: "DOC-VERSION-REGISTRY"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-15"
owner: "ATHER / THESEUS"
source_of_truth: true
related_docs:
  - "docs/STD-Document-Versioning-Governance.md"
  - "docs/features/traceability-audit/FEAT-Document-Version-Governance.md"
---

# Document Version Registry

This registry is the audit sitemap for active canonical Markdown documents in GoVibe.

## 1. Registry Rules

- One row per active canonical document.
- `Doc ID` must match frontmatter `doc_id`.
- `Version` must match frontmatter `version`.
- `Path` must point to the canonical active file.
- Superseded or archived documents should not remain marked as active.

## 2. Core Governance

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Standard | `STD-EXECUTION-GOVERNANCE` | `2.2.0+ga` | stable | GoVibe | `docs/STD-Execution-Governance.md` |
| Standard | `STD-DOCUMENT-VERSIONING-GOVERNANCE` | `0.1.0+draft` | draft | ATHER / THESEUS | `docs/STD-Document-Versioning-Governance.md` |
| Registry | `DOC-VERSION-REGISTRY` | `0.1.0+draft` | draft | ATHER / THESEUS | `docs/DOC-VERSION-REGISTRY.md` |

## 3. Product and Platform

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| PRD | `PRD-GOVIBE-PLATFORM-OVERVIEW` | `0.1.0+draft` | draft | Rwang (Senior Dev) | `docs/PRD-GoVibe-Platform-Overview.md` |
| PRD | `PRD-GOVIBE-MCP-ORCHESTRATION` | `0.1.0+draft` | draft | GoVibe | `docs/PRD-GoVibe-MCP-Orchestration.md` |

## 4. Roadmap and Planning

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Roadmap | `ROADMAP-GOVIBE-MCP-RUNTIME` | `0.1.0+draft` | approved | LYRA | `docs/roadmap/ROADMAP-govibe-mcp-runtime.md` |
| Backlog | `IMP-GVMP01P05EP01` | `tracked-outside-registry` | pending-classification | LYRA | `.agents/.devlog/implement/IMP-GVMP01P05EP01.md` |

## 5. Agent Governance

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Feature | `FEAT-DOCUMENT-VERSION-GOVERNANCE` | `0.1.0+draft` | draft | ATHER / THESEUS | `docs/features/traceability-audit/FEAT-Document-Version-Governance.md` |
| Feature | `FEAT-visual-agent-fleet-system` | `0.1.0` | migration-needed | THESEUS | `docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md` |
| Architecture | `SDD-visual-agent-fleet` | `0.1.0` | migration-needed | THESEUS / ARCHON | `docs/architecture/SDD-Visual-Agent-Fleet.md` |

## 6. Migration Notes

- `migration-needed` means the document exists but does not yet use the canonical versioning format required by the new standard.
- `proposed-migration` means the document is active but still needs metadata normalization in a later sweep.
- `unregistered` is a temporary placeholder for legacy files that still need normalized `doc_id` and `version`.
- `tracked-outside-registry` is used for implementation records that may later move into a dedicated implementation registry.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-15 | ATHER / THESEUS | Initial audit registry for canonical document version tracking and migration visibility. |
