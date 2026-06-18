---
title: "Document Version Registry"
doc_id: "DOC-VERSION-REGISTRY"
status: "draft"
version: "0.1.24+draft"
updated: "2026-06-18"
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
| Standard | `STD-DOCUMENT-VERSIONING-GOVERNANCE` | `0.1.1+draft` | draft | ATHER / THESEUS | `docs/STD-Document-Versioning-Governance.md` |
| Registry | `DOC-VERSION-REGISTRY` | `0.1.24+draft` | draft | ATHER / THESEUS | `docs/DOC-VERSION-REGISTRY.md` |

## 3. Product and Platform

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| PRD | `PRD-GOVIBE-PLATFORM-OVERVIEW` | `0.4.1+draft` | draft | Rwang (Senior Dev) | `docs/PRD-GoVibe-Platform-Overview.md` |
| PRD | `PRD-GOVIBE-MCP-ORCHESTRATION` | `0.1.0+draft` | draft | GoVibe | `docs/PRD-GoVibe-MCP-Orchestration.md` |

## 4. Roadmap and Planning

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Roadmap | `ROADMAP-GOVIBE-MCP-RUNTIME` | `0.4.7` | approved | LYRA | `docs/roadmap/ROADMAP-govibe-mcp-runtime.md` |
| Master Plan | `MASTERPLAN-GOVIBE-MVP-DEVELOPER-TRIAL` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md` |
| Backlog | `BACKLOG-P1-MVP-CORE` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/BACKLOG-p1-mvp-core.md` |
| Backlog | `IMP-GVMP01P05EP01` | `tracked-outside-registry` | pending-classification | LYRA | `.agents/.devlog/implement/IMP-GVMP01P05EP01.md` |

## 5. Agent Governance

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Feature | `FEAT-DOCUMENT-VERSION-GOVERNANCE` | `0.1.0+draft` | draft | ATHER / THESEUS | `docs/features/traceability-audit/FEAT-Document-Version-Governance.md` |
| Feature | `FEAT-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.0+draft` | draft | ATHER / KIN | `docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md` |
| Feature | `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION` | `0.1.0+draft` | draft | LYRA / ATHER | `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` |
| Feature | `FEAT-CODEV-COVIBE-TERMINOLOGY-DEFINITION` | `0.1.1+draft` | draft | THESEUS | `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md` |
| Feature | `FEAT-CODEV-MODULE` | `0.1.0+draft` | draft | THESEUS | `docs/features/agent-team/FEAT-CoDev-Module.md` |
| Feature | `FEAT-COVIBE-MODULE` | `0.1.0+draft` | draft | THESEUS | `docs/features/agent-team/FEAT-CoVibe-Module.md` |
| Feature | `FEAT-QWEN-CLI-MODEL-ROUTING` | `0.1.2+draft` | draft | KIN / LYRA / ATHER | `docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md` |
| Audit | `AUDIT-COGNITIVE-SYSTEM-INBOUND-TRIAGE-2026-06-16` | `0.1.1+draft` | draft | ATHER / LYRA | `docs/audit/AUDIT-Cognitive-System-Inbound-Triage-2026-06-16.md` |
| Feature | `FEAT-ROADMAP-PROMOTION-CONTRACT` | `0.1.0+draft` | draft | LYRA | `docs/features/project-roadmap/FEAT-Roadmap-Promotion-Contract.md` |
| Feature | `FEAT-visual-agent-fleet-system` | `0.1.0` | migration-needed | THESEUS | `docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md` |
| Architecture | `MSP-GKS-TAXONOMY-MAPPING` | `0.1.0+draft` | draft | THESEUS / KIN | `docs/architecture/MSP-GKS-Taxonomy-Mapping.md` |
| Architecture | `SDD-MSP-EXTERNAL-EVIDENCE-BOUNDARY` | `0.1.0+draft` | draft | ARCHON / KIN / ATHER | `docs/architecture/SDD-MSP-External-Evidence-Boundary.md` |
| Architecture | `SDD-SYMBOL-GRAPH-TRACEABILITY-BOUNDARY` | `0.1.0+draft` | draft | ARCHON / THESEUS / ATHER | `docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md` |
| Architecture | `SDD-visual-agent-fleet` | `0.1.0` | migration-needed | THESEUS / ARCHON | `docs/architecture/SDD-Visual-Agent-Fleet.md` |

## 6. Runbooks And Context Packets

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Runbook | `RUNBOOK-BOUNDED-EXTERNAL-EXECUTOR-WORKFLOW` | `0.2.2` | draft | LYRA | `docs/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md` |
| Runbook | `RUNBOOK-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.0+draft` | draft | JANUS / KIN | `docs/runbooks/RUNBOOK-MSP-Validate-Evidence-Adapter.md` |
| Context | `AGENT-BRIDGE-QWEN-COMPAT` | `1.2.0+draft` | draft | ATHER / THESEUS | `AGENT.md` |
| Context | `CONTEXT-BOUNDED-EXTERNAL-EXECUTOR` | `0.2.3` | draft | THESEUS | `.agents/context/CONTEXT-Bounded-External-Executor.md` |
| Context | `CONTEXT-GOVIBE-SHARED-EXTERNAL-AGENT` | `0.1.0+draft` | draft | ATHER / THESEUS | `.agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md` |
| Context | `CONTEXT-GOVIBE-GIT-HYGIENE` | `0.1.0+draft` | draft | JANUS / ATHER | `.agents/context/shared/CONTEXT-GoVibe-Git-Hygiene.md` |

## 7. Migration Notes

- `migration-needed` means the document exists but does not yet use the canonical versioning format required by the new standard.
- `proposed-migration` means the document is active but still needs metadata normalization in a later sweep.
- `unregistered` is a temporary placeholder for legacy files that still need normalized `doc_id` and `version`.
- `tracked-outside-registry` is used for implementation records that may later move into a dedicated implementation registry.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.17+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.3.1 after A5 verification. |
| 0.1.24+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.7 after final residual fake-state closure. |
| 0.1.23+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.6 for final residual fake-state tasks. |
| 0.1.22+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.5 after B1/B4/C2 verification closure. |
| 0.1.21+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.4 after B1/B4/C2 follow-on updates. |
| 0.1.20+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.3 after A4/B3 follow-on updates. |
| 0.1.19+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.1 after A3/D3 browser verification. |
| 0.1.18+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.0 after A3/D3 real-state migration updates. |
| 0.1.16+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.3.0 for A5 registered-agent migration. |
| 0.1.15+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.2.1 after A2 real-state migration verification. |
| 0.1.14+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.2.0 for the UI real-state migration and bounded Qwen assignments. |
| 0.1.13+draft | 2026-06-17 | ATHER / THESEUS | Registered separate CoDev and CoVibe module docs and linked them into the PRD and terminology note. |
| 0.1.12+draft | 2026-06-17 | ATHER / THESEUS | Registered shared external-agent context, git hygiene context, and qwen-compatible AGENT bridge. |
| 0.1.11+draft | 2026-06-17 | ATHER / THESEUS | Synced qwen-cli model routing after README inspection and local smoke verification. |
| 0.1.10+draft | 2026-06-17 | ATHER / THESEUS | Registered qwen-cli model routing policy and updated bounded external executor context version. |
| 0.1.9+draft | 2026-06-16 | ATHER / THESEUS | Registered symbol graph traceability boundary for doc-code drift and structural evidence. |
| 0.1.8+draft | 2026-06-16 | ATHER / THESEUS | Registered MSP external evidence boundary SDD derived from MSP architecture v2 source. |
| 0.1.7+draft | 2026-06-16 | ATHER / THESEUS | Synced cognitive-system inbound triage audit version after adding Git ignore enforcement for raw exports. |
| 0.1.6+draft | 2026-06-16 | ATHER / THESEUS | Registered cognitive-system inbound knowledge triage audit to control MSP/GKS derivation and block wholesale import. |
| 0.1.5+draft | 2026-06-16 | ATHER / THESEUS | Registered quota-aware local LLM decomposition feature for micro-task and atomic-task execution. |
| 0.1.4+draft | 2026-06-16 | ATHER / THESEUS | Registered the MSP validate evidence adapter feature, taxonomy mapping, and runbook. |
| 0.1.3+draft | 2026-06-16 | ATHER / THESEUS | Synced bounded external executor context and runbook versions after evidence-first and minimal-code rule updates. |
| 0.1.2+draft | 2026-06-16 | ATHER / THESEUS | Registered the roadmap promotion contract and normalized the active P1 MVP backlog source entry. |
| 0.1.2+draft | 2026-06-16 | ATHER / THESEUS | Registered the MVP developer trial master plan and bounded external executor active docs. |
| 0.1.1+draft | 2026-06-15 | ATHER / THESEUS | Synced registry entries with the updated document versioning governance standard and the diff gate automation note. |
| 0.1.0+draft | 2026-06-15 | ATHER / THESEUS | Initial audit registry for canonical document version tracking and migration visibility. |
