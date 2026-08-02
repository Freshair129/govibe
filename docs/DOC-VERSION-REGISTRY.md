---
title: "Document Version Registry"
doc_id: "DOC-VERSION-REGISTRY"
status: "draft"
version: "0.1.76+draft"
updated: "2026-08-02"
owner: "ATHER / THESEUS"
source_of_truth: true
related_docs:
  - "docs/STD-Document-Versioning-Governance.md"
  - "docs/features/traceability-audit/FEAT-Document-Version-Governance.md"
---

# Document Version Registry

This registry is the audit sitemap for active canonical and registered conformance Markdown documents in GoVibe.

## 1. Registry Rules

- One row per active canonical document or explicitly registered conformance document.
- `Doc ID` must match frontmatter `doc_id`.
- `Version` must match frontmatter `version`.
- `Path` must point to the active file.
- `source_of_truth: false` alignment documents are conformance mappings, not competing canonical authorities.
- Cross-repository mirrors must declare `source_of_truth: false`, identify canonical repository/path/version/hash, and must not appear as competing canonical rows.
- For `STD-EXECUTION-GOVERNANCE`, GoVibe is canonical and RWANG-PROMAX is a distribution mirror.
- Superseded or archived documents should not remain active.

## 2. Core Governance

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Standard / Canonical SOT | `STD-EXECUTION-GOVERNANCE` | `2.4.0+ga` | stable | GoVibe | `docs/STD-Execution-Governance.md` |
| Standard | `STD-DOCUMENT-VERSIONING-GOVERNANCE` | `0.1.2+draft` | draft | ATHER / THESEUS | `docs/STD-Document-Versioning-Governance.md` |
| Registry | `DOC-VERSION-REGISTRY` | `0.1.76+draft` | draft | ATHER / THESEUS | `docs/DOC-VERSION-REGISTRY.md` |

## 3. Product and Platform

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| BRD | `BRD-GOVIBE-PLATFORM` | `0.2.0+draft` | draft | Boss (CEO) | `docs/BRD-GoVibe-Platform.md` |
| API | `API-004-TASK-SCOPED-CONTEXT-PACKET-SCHEMA` | `0.3.0` | approved | ARCHON / ATHER | `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md` |
| API | `API-005-GOVIBE-CAPABILITY-CONTRACTS` | `3.1.0` | approved | Boss / ATHER | `docs/api/API-005-GoVibe-Capability-Contracts.md` |
| API | `API-006-VAULT-CONTEXT-REPLAY-CONTRACTS` | `1.1.0` | approved | Boss / ATHER | `docs/api/API-006-Vault-Context-and-Replay-Contracts.md` |
| API | `API-007-KNOWLEDGE-CONTEXT-AUTHORITY-CONTRACT` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/api/API-007-Knowledge-Context-Authority-Contract.md` |
| Change Request | `CR-2026-07-26-govibe-rwang-capability-absorption` | `1.0.0` | approved | Boss (Product Authority) | `docs/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md` |
| PRD | `PRD-GOVIBE-PLATFORM-OVERVIEW` | `0.5.0+draft` | draft | Rwang (Senior Dev) | `docs/PRD-GoVibe-Platform-Overview.md` |
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

## 5. Agent Governance and Architecture

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Feature | `FEAT-DOCUMENT-VERSION-GOVERNANCE` | `0.1.0` | approved | ATHER / THESEUS | `docs/features/traceability-audit/FEAT-Document-Version-Governance.md` |
| Feature | `FEAT-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.1` | approved | ATHER / KIN | `docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md` |
| Feature | `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION` | `0.1.1` | approved | LYRA / ATHER | `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` |
| Feature | `FEAT-PER-AGENT-MEMORY-UNIT` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md` |
| Feature | `FEAT-TIERED-REVIEW` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Tiered-Review.md` |
| Feature | `FEAT-CODEV-COVIBE-TERMINOLOGY-DEFINITION` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md` |
| Feature | `FEAT-CODEV-MODULE` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-Module.md` |
| Feature | `FEAT-COVIBE-MODULE` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoVibe-Module.md` |
| Feature | `FEAT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md` |
| Feature | `FEAT-QWEN-CLI-MODEL-ROUTING` | `0.1.3` | approved | KIN / LYRA / ATHER | `docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md` |
| Audit | `AUDIT-COGNITIVE-SYSTEM-INBOUND-TRIAGE-2026-06-16` | `0.1.1` | approved | ATHER / LYRA | `docs/audit/AUDIT-Cognitive-System-Inbound-Triage-2026-06-16.md` |
| Audit | `POC-5-AXIS-COVERAGE` | `0.1.0+draft` | draft | Boss (CEO) | `docs/audit/POC-5-Axis-Coverage.md` |
| Audit | `POC-H6-BUDGET-SUFFICIENCY` | `0.2.0` | approved | Boss (CEO) | `docs/audit/POC-H6-Budget-Sufficiency.md` |
| Audit | `AUDIT-USER-FLOW-RUNTIME-GAPS-2026-06-22` | `0.1.0+draft` | draft | Boss (CEO) | `docs/audit/AUDIT-User-Flow-Runtime-Gaps-2026-06-22.md` |
| Audit | `AUDIT-GOVIBE-RWANG-CUTOVER-READINESS-2026-07-30` | `1.0.2` | under review | ATHER | `docs/audit/AUDIT-GoVibe-RWANG-Cutover-Readiness-2026-07-30.md` |
| Feature | `FEAT-ROADMAP-PROMOTION-CONTRACT` | `0.1.0` | approved | LYRA | `docs/features/project-roadmap/FEAT-Roadmap-Promotion-Contract.md` |
| Feature | `FEAT-VISUAL-AGENT-FLEET-SYSTEM` | `0.1.0` | approved | THESEUS | `docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md` |
| Feature | `FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION` | `0.1.0+draft` | draft | Boss (CEO) | `docs/features/genesis-knowledge-system/FEAT-Doc-Format-Template-Extraction.md` |
| ADR | `ADR-013-task-scoped-context-injection` | `0.1.0` | accepted | ARCHON / ATHER | `docs/adr/ADR-013-Task-Scoped-Context-Injection.md` |
| ADR | `ADR-014-msp-gks-traceability-gate` | `0.1.0` | accepted | ARCHON / ATHER | `docs/adr/ADR-014-MSP-GKS-Traceability-Gate.md` |
| ADR | `ADR-015-MASTER-ESSENCE-VS-GOV-POLICY` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-015-Master-Essence-vs-GOV-Policy.md` |
| ADR | `ADR-016-FULL-STACK-MANDATORY-SWAPPABLE-BACKEND` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-016-Full-Stack-Mandatory-Swappable-Backend.md` |
| ADR | `ADR-017-GOVIBE-GOVERNANCE-TRANSLATOR-GKS-INTERLINGUA` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-017-GoVibe-Governance-Translator-GKS-Interlingua.md` |
| ADR | `ADR-018-STRUCTURAL-DECOMPOSITION-CONTAINMENT-WIKILINK` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-018-Structural-Decomposition-Containment-Wikilink.md` |
| ADR | `ADR-019-UNIVERSAL-CODE-IN-MCP-OUT` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-019-Universal-Code-In-MCP-Out.md` |
| ADR | `ADR-020-PER-AGENT-MEMORY-UNIT` | `0.1.1+draft` | proposed | ARCHON / ATHER | `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` |
| ADR | `ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE` | `1.0.0` | approved | Boss / ATHER | `docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md` |
| ADR | `ADR-023-KNOWLEDGE-AUTHORITY-CONTEXT-AUTHORITY-BOUNDARY` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md` |
| Architecture | `BLUEPRINT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.1` | approved | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md` |
| Architecture | `BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE` | `3.1.0` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md` |
| Architecture | `BLUEPRINT-MISSION-GATEWAY-RUNTIME-SPLIT` | `0.1.1` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-Mission-Gateway-Runtime-Responsibility-Split.md` |
| Architecture | `ARCH-VAULT-CONTEXT-MODEL` | `1.0.1` | approved | Boss / ATHER | `docs/architecture/ARCH-Vault-and-Context-Model.md` |
| Architecture / Conformance | `C4-KNOWLEDGE-CONTEXT-AUTHORITY-OVERLAY` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/C4-Knowledge-Context-Authority-Overlay.md` |
| Architecture | `BLUEPRINT-TRANSLATOR-CORE-SLICE` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Translator-Core-Slice.md` |
| LLD | `LLD-TASK-SCOPED-CONTEXT-INJECTION-CORE` | `0.1.1` | approved | ARCHON / ATHER | `docs/lld/LLD-Task-Scoped-Context-Injection-Core.md` |
| Architecture | `MSP-GKS-TAXONOMY-MAPPING` | `0.1.0` | approved | THESEUS / KIN | `docs/architecture/MSP-GKS-Taxonomy-Mapping.md` |
| Architecture | `SDD-MSP-EXTERNAL-EVIDENCE-BOUNDARY` | `0.1.1` | approved | ARCHON / KIN / ATHER | `docs/architecture/SDD-MSP-External-Evidence-Boundary.md` |
| Architecture | `SDD-SYMBOL-GRAPH-TRACEABILITY-BOUNDARY` | `0.1.1` | approved | ARCHON / THESEUS / ATHER | `docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md` |
| Architecture | `SDD-VISUAL-AGENT-FLEET` | `0.1.0` | approved | THESEUS / ARCHON | `docs/architecture/SDD-Visual-Agent-Fleet.md` |
| Architecture | `SDD-GOVIBE-MSP-GKS-INTEGRATION` | `0.1.2+draft` | draft | Boss (CEO) | `docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md` |

## 6. Alignment Conformance Documents

These files map historical or cross-document terminology into canonical owners. They are registered for traceability but have `source_of_truth: false`.

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Alignment | `ALIGNMENT-01-SYSTEM-AUTHORITY-COMMAND-BOUNDARY` | `1.0.0` | approved | Boss / ATHER | `docs/alignment/ALIGNMENT-01-System-Authority-and-Command-Boundary.md` |
| Alignment | `ALIGNMENT-04-12-STAGE-DECOMPOSITION-CONTRACT` | `1.0.0` | approved | Boss / ATHER | `docs/alignment/ALIGNMENT-04-12-Stage-Decomposition-Contract.md` |
| Alignment | `ALIGNMENT-06-CONTEXT-VAULT-MEMORY-ASSEMBLY` | `1.0.0` | approved | Boss / ATHER | `docs/alignment/ALIGNMENT-06-Context-Vault-and-Memory-Assembly.md` |
| Alignment | `ALIGNMENT-12-MISSION-CONTROL-CONTEXT-IMPACT-SURFACE` | `1.0.0` | approved | Boss / ATHER | `docs/alignment/ALIGNMENT-12-Mission-Control-Context-and-Impact-Surface.md` |

## 7. Runbooks And Context Packets

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Runbook | `RUNBOOK-BOUNDED-EXTERNAL-EXECUTOR-WORKFLOW` | `0.2.4` | approved | LYRA | `docs/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md` |
| Runbook | `RUNBOOK-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.0+draft` | draft | JANUS / KIN | `docs/runbooks/RUNBOOK-MSP-Validate-Evidence-Adapter.md` |
| Runbook | `RUNBOOK-GOVIBE-FIRST-USE` | `0.1.1+draft` | draft | GoVibe | `docs/runbooks/RUNBOOK-GoVibe-First-Use.md` |
| SRS | `SRS-GOVIBE-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md` |
| SRS | `SRS-GOVIBE-MCP-SERVER` | `0.2.1` | approved | GoVibe | `docs/srs/SRS-GoVibe-MCP-Server.md` |
| SRS | `SRS-OLLAMA-SIDECAR-EXECUTION` | `0.2.1` | approved | THESEUS | `docs/srs/SRS-Ollama-Sidecar-Execution.md` |
| SRS | `SRS-GKS-RETRIEVAL-LAYER` | `0.1.1+draft` | draft | Boss (CEO) | `docs/srs/SRS-GKS-Retrieval-Layer.md` |
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

## 8. Migration Notes

- Status values for canonical documents are defined in `docs/STD-Document-Versioning-Governance.md` Section 13.
- Change-request and feedback artifacts under `docs/change-requests/**` remain review artifacts and are not required in this registry.
- Alignment files are registered conformance artifacts and must declare canonical owners through `conforms_to`.
- When an alignment document conflicts with a canonical API, ADR, architecture or Blueprint, the canonical document wins and the alignment document must be revised.
- Cross-repository mirrors are distribution copies only; authority, semantic versioning, and conflict resolution remain with the registered GoVibe canonical document.
- Older registry changelog entries remain available in Git history; the active file retains the current audit-relevant history below.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.76+draft | 2026-08-02 | Boss / ATHER / THESEUS | Registered issue #52 BRD/PRD alignment, ADR-023, ADR-017/018/019 revisions, API-007, C4 authority overlay, and CoVibe/CoDev v0.2.0. |
| 0.1.75+draft | 2026-08-02 | Boss / ATHER | Restored GoVibe as canonical SOT for Execution Governance and registered v2.4.0+ga. |
| 0.1.74+draft | 2026-08-02 | ATHER | Synced issue #27 implementation and architecture-review evidence. |
| 0.1.73+draft | 2026-08-02 | Boss / ATHER | Promoted the Mission Gateway and runtime responsibility split blueprint. |
| 0.1.72+draft | 2026-08-02 | ATHER | Registered the candidate Mission Gateway blueprint. |
| 0.1.71+draft | 2026-08-02 | ATHER | Synced the first-use runbook. |
| 0.1.70+draft | 2026-08-02 | ATHER | Restored registry parity for six governed documents. |
| 0.1.69+draft | 2026-08-01 | Boss / ATHER | Synced ARCH-VAULT-CONTEXT-MODEL v1.0.1. |
| 0.1.68+draft | 2026-08-01 | Boss / ATHER | Registered alignment conformance mappings. |
| 0.1.67+draft | 2026-08-01 | Boss / ATHER | Registered link/backlink/impact schemas. |
| 0.1.66+draft | 2026-08-01 | Boss / ATHER | Registered API-004/005/006, ADR-022, and vault/context architecture. |
| 0.1.65+draft | 2026-07-30 | ATHER / THESEUS | Registered the GoVibe first-use runbook. |
| 0.1.64+draft | 2026-07-30 | ATHER | Recorded legacy-alias rollback rehearsal. |
| 0.1.63+draft | 2026-07-30 | ATHER | Synced JSONL stdio transport contract. |
| 0.1.62+draft | 2026-07-30 | ATHER | Registered T13 cutover readiness. |
| 0.1.61+draft | 2026-07-30 | ATHER | Synced capability migration CR and contracts. |
| 0.1.58+draft | 2026-07-29 | Boss / ATHER | Registered approved capability contracts and blueprint. |
| 0.1.0+draft | 2026-06-15 | ATHER / THESEUS | Initial registry. |
