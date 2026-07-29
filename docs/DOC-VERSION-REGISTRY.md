---
title: "Document Version Registry"
doc_id: "DOC-VERSION-REGISTRY"
status: "draft"
version: "0.1.58+draft"
updated: "2026-07-29"
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
| Standard | `STD-EXECUTION-GOVERNANCE` | `2.3.1+ga` | stable | GoVibe | `docs/STD-Execution-Governance.md` |
| Standard | `STD-DOCUMENT-VERSIONING-GOVERNANCE` | `0.1.2+draft` | draft | ATHER / THESEUS | `docs/STD-Document-Versioning-Governance.md` |
| Registry | `DOC-VERSION-REGISTRY` | `0.1.58+draft` | draft | ATHER / THESEUS | `docs/DOC-VERSION-REGISTRY.md` |

## 3. Product and Platform

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| BRD | `BRD-GOVIBE-PLATFORM` | `0.1.1+draft` | draft | Boss (CEO) | `docs/BRD-GoVibe-Platform.md` |
| API | `API-004-TASK-SCOPED-CONTEXT-PACKET-SCHEMA` | `0.2.0` | approved | ARCHON / ATHER | `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md` |
| API | `API-005-GOVIBE-CAPABILITY-CONTRACTS` | `1.0.0` | approved | Boss / ATHER | `docs/api/API-005-GoVibe-Capability-Contracts.md` |
| Change Request | `CR-2026-07-26-govibe-rwang-capability-absorption` | `0.2.0` | approved | Boss (Product Authority) | `docs/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md` |
| PRD | `PRD-GOVIBE-PLATFORM-OVERVIEW` | `0.4.3+draft` | draft | Rwang (Senior Dev) | `docs/PRD-GoVibe-Platform-Overview.md` |
| PRD | `PRD-GOVIBE-MCP-ORCHESTRATION` | `0.2.1+draft` | draft | GoVibe | `docs/PRD-GoVibe-MCP-Orchestration.md` |
| Design | `DESIGN-GOVIBE-DOCUMENT-HIERARCHY` | `0.1.0+draft` | draft | ARCHON / THESEUS / ATHER | `docs/design/GoVibe-Document-Hierarchy.md` |
| Design | `DESIGN-WIREFRAME-A2-ROADMAP-BOARD` | `0.1.1+draft` | draft | THESEUS / VIBE | `docs/design/WIREFRAME-A2-Roadmap-Board.md` |

## 4. Roadmap and Planning

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Roadmap | `ROADMAP-GOVIBE-MCP-RUNTIME` | `0.4.8` | approved | LYRA | `docs/roadmap/ROADMAP-govibe-mcp-runtime.md` |
| Master Plan | `MASTERPLAN-GOVIBE-MVP-DEVELOPER-TRIAL` | `0.1.1+draft` | draft | LYRA | `docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md` |
| Roadmap | `ROADMAP-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | LYRA | `docs/roadmap/ROADMAP-task-scoped-context-injection.md` |
| Roadmap | `ROADMAP-TRANSLATOR-CORE` | `0.1.0` | approved | LYRA | `docs/roadmap/ROADMAP-translator-core.md` |
| Backlog | `BACKLOG-P1-MVP-CORE` | `0.1.1+draft` | draft | LYRA | `docs/roadmap/BACKLOG-p1-mvp-core.md` |
| Backlog | `BACKLOG-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | LYRA | `docs/roadmap/BACKLOG-task-scoped-context-injection.md` |
| Implementation Plan | `IMP-SYSTEM05-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.2` | approved | LYRA / ARCHON / ATHER | `docs/roadmap/IMP-SYSTEM05-Task-Scoped-Context-Injection.md` |
| Backlog | `IMP-GVMP01P05EP01` | `n/a` | tracked-outside-registry | LYRA | `.agents/.devlog/implement/IMP-GVMP01P05EP01.md` |

## 5. Agent Governance

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Feature | `FEAT-DOCUMENT-VERSION-GOVERNANCE` | `0.1.0` | approved | ATHER / THESEUS | `docs/features/traceability-audit/FEAT-Document-Version-Governance.md` |
| Feature | `FEAT-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.1` | approved | ATHER / KIN | `docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md` |
| Feature | `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION` | `0.1.1` | approved | LYRA / ATHER | `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` |
| Feature | `FEAT-PER-AGENT-MEMORY-UNIT` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md` |
| Feature | `FEAT-TIERED-REVIEW` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Tiered-Review.md` |
| Feature | `FEAT-CODEV-COVIBE-TERMINOLOGY-DEFINITION` | `0.1.1` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md` |
| Feature | `FEAT-CODEV-MODULE` | `0.1.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-Module.md` |
| Feature | `FEAT-COVIBE-MODULE` | `0.1.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoVibe-Module.md` |
| Feature | `FEAT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md` |
| Feature | `FEAT-QWEN-CLI-MODEL-ROUTING` | `0.1.3` | approved | KIN / LYRA / ATHER | `docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md` |
| Audit | `AUDIT-COGNITIVE-SYSTEM-INBOUND-TRIAGE-2026-06-16` | `0.1.1` | approved | ATHER / LYRA | `docs/audit/AUDIT-Cognitive-System-Inbound-Triage-2026-06-16.md` |
| Audit | `POC-5-AXIS-COVERAGE` | `0.1.0+draft` | draft | Boss (CEO) | `docs/audit/POC-5-Axis-Coverage.md` |
| Audit | `POC-H6-BUDGET-SUFFICIENCY` | `0.1.1` | approved | Boss (CEO) | `docs/audit/POC-H6-Budget-Sufficiency.md` |
| Audit | `AUDIT-USER-FLOW-RUNTIME-GAPS-2026-06-22` | `0.1.0+draft` | draft | Boss (CEO) | `docs/audit/AUDIT-User-Flow-Runtime-Gaps-2026-06-22.md` |
| Feature | `FEAT-ROADMAP-PROMOTION-CONTRACT` | `0.1.0` | approved | LYRA | `docs/features/project-roadmap/FEAT-Roadmap-Promotion-Contract.md` |
| Feature | `FEAT-VISUAL-AGENT-FLEET-SYSTEM` | `0.1.0` | approved | THESEUS | `docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md` |
| Feature | `FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION` | `0.1.0+draft` | draft | Boss (CEO) | `docs/features/genesis-knowledge-system/FEAT-Doc-Format-Template-Extraction.md` |
| ADR | `ADR-013-task-scoped-context-injection` | `0.1.0` | accepted | ARCHON / ATHER | `docs/adr/ADR-013-Task-Scoped-Context-Injection.md` |
| ADR | `ADR-014-msp-gks-traceability-gate` | `0.1.0` | accepted | ARCHON / ATHER | `docs/adr/ADR-014-MSP-GKS-Traceability-Gate.md` |
| ADR | `ADR-015-MASTER-ESSENCE-VS-GOV-POLICY` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-015-Master-Essence-vs-GOV-Policy.md` |
| ADR | `ADR-016-FULL-STACK-MANDATORY-SWAPPABLE-BACKEND` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-016-Full-Stack-Mandatory-Swappable-Backend.md` |
| ADR | `ADR-017-GOVIBE-GOVERNANCE-TRANSLATOR-GKS-INTERLINGUA` | `0.1.1` | accepted | Boss (CEO) | `docs/adr/ADR-017-GoVibe-Governance-Translator-GKS-Interlingua.md` |
| ADR | `ADR-018-STRUCTURAL-DECOMPOSITION-CONTAINMENT-WIKILINK` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-018-Structural-Decomposition-Containment-Wikilink.md` |
| ADR | `ADR-019-UNIVERSAL-CODE-IN-MCP-OUT` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-019-Universal-Code-In-MCP-Out.md` |
| ADR | `ADR-020-PER-AGENT-MEMORY-UNIT` | `0.1.0+draft` | proposed | ARCHON / ATHER | `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` |
| Architecture | `BLUEPRINT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.1` | approved | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md` |
| Architecture | `BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE` | `1.0.0` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md` |
| Architecture | `BLUEPRINT-TRANSLATOR-CORE-SLICE` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Translator-Core-Slice.md` |
| LLD | `LLD-TASK-SCOPED-CONTEXT-INJECTION-CORE` | `0.1.1` | approved | ARCHON / ATHER | `docs/lld/LLD-Task-Scoped-Context-Injection-Core.md` |
| Architecture | `MSP-GKS-TAXONOMY-MAPPING` | `0.1.0` | approved | THESEUS / KIN | `docs/architecture/MSP-GKS-Taxonomy-Mapping.md` |
| Architecture | `SDD-MSP-EXTERNAL-EVIDENCE-BOUNDARY` | `0.1.1` | approved | ARCHON / KIN / ATHER | `docs/architecture/SDD-MSP-External-Evidence-Boundary.md` |
| Architecture | `SDD-SYMBOL-GRAPH-TRACEABILITY-BOUNDARY` | `0.1.1` | approved | ARCHON / THESEUS / ATHER | `docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md` |
| Architecture | `SDD-VISUAL-AGENT-FLEET` | `0.1.0` | approved | THESEUS / ARCHON | `docs/architecture/SDD-Visual-Agent-Fleet.md` |
| Architecture | `SDD-GOVIBE-MSP-GKS-INTEGRATION` | `0.1.2+draft` | draft | Boss (CEO) | `docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md` |

## 6. Runbooks And Context Packets

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Runbook | `RUNBOOK-BOUNDED-EXTERNAL-EXECUTOR-WORKFLOW` | `0.2.4` | approved | LYRA | `docs/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md` |
| Runbook | `RUNBOOK-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.0+draft` | draft | JANUS / KIN | `docs/runbooks/RUNBOOK-MSP-Validate-Evidence-Adapter.md` |
| SRS | `SRS-GOVIBE-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md` |
| SRS | `SRS-GOVIBE-MCP-SERVER` | `0.2.1` | approved | GoVibe | `docs/srs/SRS-GoVibe-MCP-Server.md` |
| SRS | `SRS-OLLAMA-SIDECAR-EXECUTION` | `0.2.1` | approved | THESEUS | `docs/srs/SRS-Ollama-Sidecar-Execution.md` |
| SRS | `SRS-GKS-RETRIEVAL-LAYER` | `0.1.0+draft` | draft | Boss (CEO) | `docs/srs/SRS-GKS-Retrieval-Layer.md` |
| SRS | `SRS-GOVIBE-TRANSLATOR-CORE-SLICE` | `0.1.1+draft` | draft | Boss (CEO) | `docs/srs/SRS-GoVibe-Translator-Core-Slice.md` |
| Architecture | `SEQ-OLLAMA-SIDECAR-FLOW` | `0.1.2` | approved | THESEUS | `docs/architecture/SEQ-Ollama-Sidecar-Flow.md` |
| LLD | `LLD-GOVIBE-MCP-TOOLS` | `0.2.1` | approved | GoVibe | `docs/lld/LLD-GoVibe-MCP-Tools.md` |
| LLD | `LLD-TRANSLATOR-CORE-SLICE` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/lld/LLD-Translator-Core-Slice.md` |
| LLD | `LLD-AGENT-LAUNCHER-EXECUTION-ROUTER` | `0.1.2` | approved | THESEUS | `docs/lld/LLD-Agent-Launcher-Execution-Router.md` |
| Context | `AGENT-BRIDGE-QWEN-COMPAT` | `1.2.1+draft` | draft | ATHER / THESEUS | `AGENT.md` |
| Context | `CONTEXT-BOUNDED-EXTERNAL-EXECUTOR` | `0.2.3` | draft | THESEUS | `.agents/context/CONTEXT-Bounded-External-Executor.md` |
| Context | `CONTEXT-GOVIBE-SHARED-EXTERNAL-AGENT` | `0.1.2+draft` | draft | ATHER / THESEUS | `.agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md` |
| Context | `CONTEXT-GOVIBE-GIT-HYGIENE` | `0.1.0+draft` | draft | JANUS / ATHER | `.agents/context/shared/CONTEXT-GoVibe-Git-Hygiene.md` |
| Context | `CONTEXT-MISSION-CONTROL-FRONTEND-STRUCTURE-REFACTOR` | `0.1.1+draft` | draft | LYRA / ARCHON / ATHER | `.agents/context/shared/CONTEXT-Mission-Control-Frontend-Structure-Refactor.md` |

## 7. Migration Notes

- `migration-needed` means the document exists but does not yet use the canonical versioning format required by the new standard.
- `proposed-migration` means the document is active but still needs metadata normalization in a later sweep.
- `unregistered` is a temporary placeholder for legacy files that still need normalized `doc_id` and `version`.
- `tracked-outside-registry` is used for implementation records that may later move into a dedicated implementation registry. Such rows carry `n/a` in the Version column until the file adopts canonical frontmatter.
- Status values for canonical documents are defined in `docs/STD-Document-Versioning-Governance.md` Section 13; the markers above are registry bookkeeping states only.
- MSP/GKS cluster now approved: `CR-2026-06-14-MSP-GKS-GoVibe-Integration` was closed (decision recorded in accepted `ADR-014-msp-gks-traceability-gate`), unblocking `FEAT-MSP-VALIDATE-EVIDENCE-ADAPTER`, `SDD-MSP-EXTERNAL-EVIDENCE-BOUNDARY`, `SDD-SYMBOL-GRAPH-TRACEABILITY-BOUNDARY`, `AUDIT-COGNITIVE-SYSTEM-INBOUND-TRIAGE-2026-06-16`, `MSP-GKS-TAXONOMY-MAPPING`, `FEAT-DOCUMENT-VERSION-GOVERNANCE`, and `FEAT-ROADMAP-PROMOTION-CONTRACT`. The MSP/GKS adapter implementation + POC remain a follow-up gated by the ADR-014 validation plan.
- Still held `draft`: `PRD-GOVIBE-MCP-ORCHESTRATION` (body now authored — awaiting human-owner review before PRD sign-off); `BACKLOG-P1-MVP-CORE` / `MASTERPLAN-GOVIBE-MVP-DEVELOPER-TRIAL` (legacy import fixture, pending MVP scope confirmation); `STD-DOCUMENT-VERSIONING-GOVERNANCE` and this registry remain `draft` as the living governance authority.
- Known coverage gap (to register in a later sweep): per-role agent context packets under `.agents/**/context/` (e.g. `CONTEXT-BA-PO-REQUIREMENT-GUIDANCE`, `CONTEXT-VISUAL-AGENT-FLEET-SCOPE`, `CONTEXT-ATHER-SCOPE-AUDIT`, `CONTEXT-THESEUS-REQUIREMENT-DOC`, `CONTEXT-RKOI-FEASIBILITY-RISK`, `CONTEXT-GHOST-AC-UAT`, `CONTEXT-LYRA-SCOPE-CONTROL`) now carry normalized uppercase `doc_id`s and changelog footers but are not yet listed above. Change-request and feedback artifacts under `docs/change-requests/**` are intentionally treated as review artifacts and are not registered.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.58+draft | 2026-07-29 | Boss / ATHER | Registered the approved GoVibe capability contracts, vertical-slice blueprint, API-004 v0.2.0, and capability-absorption CR. |
| 0.1.57+draft | 2026-07-19 | ClaudeFable (per Boss unification order) | STD-EXECUTION-GOVERNANCE 2.3.0+ga -> 2.3.1+ga: canonical home relocated to RWANG PROMAX references; GoVibe copy marked mirror (unification Mechanical #1). |
| 0.1.51+draft | 2026-06-22 | LYRA | Promoted `ROADMAP-TRANSLATOR-CORE` draft → approved (0.1.0, dropped +draft per STD §6). |
| 0.1.50+draft | 2026-06-22 | LYRA | Registered `ROADMAP-TRANSLATOR-CORE` (draft) — Now/Next/Later phases for the translator-core epic mapped to audit findings #1–#8. |
| 0.1.49+draft | 2026-06-22 | Boss (CEO) | Resolved SRS-Translator-Core open questions (0.1.1+draft); registered `BLUEPRINT-TRANSLATOR-CORE-SLICE` + `LLD-TRANSLATOR-CORE-SLICE` (govibe.ingest.code/render tool contracts, both-metric fidelity, local-jsonl provenance). |
| 0.1.48+draft | 2026-06-22 | Boss (CEO) | Registered `AUDIT-USER-FLOW-RUNTIME-GAPS-2026-06-22` (translator core = 0% runtime; 8 findings) + `SRS-GOVIBE-TRANSLATOR-CORE-SLICE` (ingest→render→fidelity-gate slice for audit #1–#3). |
| 0.1.47+draft | 2026-06-22 | Boss (CEO) | Adopted ADR-016 Option B (0.2.0 — GoVibe+MSP core mandatory, full eco optional/tiered); repositioned PRD-Platform-Overview (0.4.2+draft, governance+translator identity); fixed BRD (0.1.1+draft, hidden→internal GKS, CoDev no-bridge wording). |
| 0.1.46+draft | 2026-06-22 | Boss (CEO) | Synced AGENT.md (1.2.1+draft, AGENTS.md-standard refactor), PRD-MCP-Orchestration (0.2.1+draft, +`orchestrate.step`), ADR-017 (0.1.1, GKS-not-hidden + language-pack=doc-format-template); registered new `FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION` (format-adaptive JIT). |
| 0.1.45+draft | 2026-06-22 | Boss (CEO) | Drained §8 Auto-Registered into curated sections (BRD→§3; ADR-015..019, PoC-1/2, SDD-Integration→§5; SRS-Retrieval→§6); dropped `+draft` from the 5 accepted ADRs per STD §6 (frontmatter + footer) to match the ADR-013/014 precedent. |
| 0.1.44+draft | 2026-06-22 | Boss (CEO) | Added §8 Auto-Registered (ADR-015..019 accepted, BRD, PoC-1/2, SRS-Retrieval, SDD-Integration); operationalized ADR-007 via `docs:register` + `docs:ratify`; added governance CI + H→D rename note. |
| 0.1.56+draft | 2026-07-10 | Boss (CEO) | Sign-off sync: STD-EXECUTION-GOVERNANCE 2.3.0+ga (stable), POC-H6-BUDGET-SUFFICIENCY 0.1.1 (approved). |
| 0.1.55+draft | 2026-07-10 | ClaudeFable (pending Boss sign-off) | Registered STD-EXECUTION-GOVERNANCE 2.3.0+draft (Access Scope H0-H4 proposal per RWANG RFC--H-AXIS-0.6.0) and POC-H6-BUDGET-SUFFICIENCY 0.1.1+draft (terminology cross-reference). |
| 0.1.43+draft | 2026-06-21 | ATHER / THESEUS | Closed CR-2026-06-14 via accepted ADR-014 (MSP/GKS adapter as traceability gate) and signed off the now-unblocked MSP/governance cluster: FEAT-MSP, SDD-MSP, SDD-Symbol-Graph, AUDIT, MSP-GKS-Taxonomy (0.1.1/0.1.0), plus FEAT-Document-Version-Governance and FEAT-Roadmap-Promotion-Contract (0.1.0); registered ADR-014; synced PRD-GoVibe-MCP-Orchestration to 0.2.0+draft after authoring its body (held draft for owner review). |
| 0.1.42+draft | 2026-06-20 | ATHER / THESEUS | Recorded sign-off: promoted three conflict-free chains to approved — TSCI (FEAT/SRS 0.1.0, BLUEPRINT/LLD 0.1.1, API-004 0.1.0, IMP 0.1.2), agent-team (Terminology/Quota 0.1.1, CoDev/CoVibe/Visual-Fleet FEAT 0.1.0, Qwen 0.1.3, SDD-Visual-Fleet 0.1.0), and runtime/MCP as-built (SRS-MCP/SRS-Ollama/LLD-Tools 0.2.1, SEQ/LLD-Launcher 0.1.2, RUNBOOK 0.2.4). MSP/GKS + governance-feature cluster held draft pending CR-2026-06-14. |
| 0.1.41+draft | 2026-06-20 | ATHER / THESEUS | Synced registry after the draft-document conflict-refinement pass: bumped TSCI, MSP/governance, agent-team, and product rows; resolved both Visual Agent Fleet docs from migration-needed to draft with normalized uppercase doc_ids; registered SRS-GoVibe-MCP-Server, SRS-Ollama-Sidecar-Execution, SEQ-Ollama-Sidecar-Flow, LLD-GoVibe-MCP-Tools, LLD-Agent-Launcher-Execution-Router; normalized the IMP-GVMP01P05EP01 version cell to n/a. |
| 0.1.40+draft | 2026-06-20 | ATHER / THESEUS | Registered the first dedicated A2 roadmap board wireframe derived from the legacy Mission Control template. |
| 0.1.39+draft | 2026-06-20 | ATHER / THESEUS | Synced the A2 roadmap board documentation contract after approving source-tab switching and template-aligned detail layout behavior. |
| 0.1.38+draft | 2026-06-19 | ATHER / THESEUS | Promoted the Task-Scoped Context Injection roadmap and backlog sources to approved board-visible status and synced registry state. |
| 0.1.37+draft | 2026-06-19 | ATHER / THESEUS | Registered the system-level roadmap entry for Task-Scoped Context Injection and linked it into the MVP master plan chain. |
| 0.1.36+draft | 2026-06-19 | ATHER / THESEUS | Registered the Task-Scoped Context Injection backlog source and task containers for Mission Control roadmap consumption. |
| 0.1.35+draft | 2026-06-19 | ATHER / THESEUS | Synced the task-scoped context injection implementation plan to version 0.1.1 after adding full bounded packet coverage and explicit task assignments. |
| 0.1.34+draft | 2026-06-19 | ATHER / THESEUS | Registered the canonical implementation plan for task-scoped context injection under the L7 roadmap and task layer. |
| 0.1.33+draft | 2026-06-19 | ATHER / THESEUS | Registered the core LLD for task-scoped context injection beneath the FEAT, SRS, blueprint, and API contract stack. |
| 0.1.32+draft | 2026-06-19 | ATHER / THESEUS | Registered API-004 for the task-scoped context packet and result payload schema. |
| 0.1.31+draft | 2026-06-19 | ATHER / THESEUS | Registered the first blueprint for task-scoped context injection and aligned it under the FEAT plus SRS hierarchy. |
| 0.1.30+draft | 2026-06-19 | ATHER / THESEUS | Refactored task-scoped context injection from PRD-level doc to FEAT-level doc, registered the GoVibe document hierarchy note, and synced shared external-agent context taxonomy guidance. |
| 0.1.29+draft | 2026-06-19 | ATHER / THESEUS | Registered the task-scoped context injection PRD and SRS for pre-blueprint review. |
| 0.1.28+draft | 2026-06-19 | ATHER / THESEUS | Registered ADR-013 for task-scoped context injection and refine-from-existing context assembly policy. |
| 0.1.27+draft | 2026-06-19 | ATHER / THESEUS | Synced the frontend structure refactor shared context to version 0.1.1 and kept registry alignment current. |
| 0.1.26+draft | 2026-06-19 | ATHER / THESEUS | Registered the Mission Control frontend structure refactor shared context and synced the shared external-agent context version. |
| 0.1.25+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.8 after residual semantic cleanup. |
| 0.1.24+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.7 after final residual fake-state closure. |
| 0.1.23+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.6 for final residual fake-state tasks. |
| 0.1.22+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.5 after B1/B4/C2 verification closure. |
| 0.1.21+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.4 after B1/B4/C2 follow-on updates. |
| 0.1.20+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.3 after A4/B3 follow-on updates. |
| 0.1.19+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.1 after A3/D3 browser verification. |
| 0.1.18+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.4.0 after A3/D3 real-state migration updates. |
| 0.1.17+draft | 2026-06-18 | ATHER / THESEUS | Synced the approved MCP runtime roadmap to version 0.3.1 after A5 verification. |
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
| 0.1.1+draft | 2026-06-15 | ATHER / THESEUS | Synced registry entries with the updated document versioning governance standard and the diff gate automation note. |
| 0.1.0+draft | 2026-06-15 | ATHER / THESEUS | Initial audit registry for canonical document version tracking and migration visibility. |
</content>
