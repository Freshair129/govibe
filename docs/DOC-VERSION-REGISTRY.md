---
title: "Document Version Registry"
doc_id: "DOC-VERSION-REGISTRY"
status: "draft"
version: "0.3.9+draft"
updated: "2026-08-05"
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
| Standard | `STD-DOCUMENT-VERSIONING-GOVERNANCE` | `0.2.1+draft` | draft | ATHER / THESEUS | `docs/STD-Document-Versioning-Governance.md` |
| Registry | `DOC-VERSION-REGISTRY` | `0.3.9+draft` | draft | ATHER / THESEUS | `docs/DOC-VERSION-REGISTRY.md` |

## 3. Product and Platform

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| BRD | `BRD-GOVIBE-PLATFORM` | `0.3.0+draft` | draft | Boss (CEO) | `docs/BRD-GoVibe-Platform.md` |
| PRD | `PRD-GOVIBE-PLATFORM-OVERVIEW` | `0.6.0+draft` | draft | Rwang (Senior Dev) | `docs/PRD-GoVibe-Platform-Overview.md` |
| SRS | `SRS-CANONICAL-SEMANTIC-IR` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/srs/SRS-Canonical-Semantic-IR.md` |
| Integration Contract | `CONTRACT-GOVIBE-GENESISBLOCKDB-ADAPTER` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/integration/CONTRACT-GenesisBlockDB-Adapter.md` |
| API | `API-004-TASK-SCOPED-CONTEXT-PACKET-SCHEMA` | `0.3.0` | approved | ARCHON / ATHER | `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md` |
| API | `API-005-GOVIBE-CAPABILITY-CONTRACTS` | `3.1.0` | approved | Boss / ATHER | `docs/api/API-005-GoVibe-Capability-Contracts.md` |
| API | `API-006-VAULT-CONTEXT-REPLAY-CONTRACTS` | `1.1.0` | approved | Boss / ATHER | `docs/api/API-006-Vault-Context-and-Replay-Contracts.md` |
| API | `API-007-KNOWLEDGE-CONTEXT-AUTHORITY-CONTRACT` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/api/API-007-Knowledge-Context-Authority-Contract.md` |
| API | `API-008-PROVIDER-ENTITLEMENT-ROUTING-USAGE-CONTRACT` | `0.3.0+draft` | draft | ARCHON / ATHER | `docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md` |
| API | `API-009-PERSISTENT-MEMORY-CONTRACT` | `0.1.1+draft` | draft | Boss (CEO) | `docs/api/API-009-Persistent-Memory-Contract.md` |
| Change Request | `CR-2026-07-26-govibe-rwang-capability-absorption` | `1.0.0` | approved | Boss (Product Authority) | `docs/change-control/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md` |
| Change Request | `CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-02-Multi-Provider-Entitlement-Routing.md` |
| Change Request | `CR-2026-08-04-DOC-GOVERNANCE-REFINEMENT` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-04-Doc-Governance-Refinement.md` |
| Change Request | `CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md` |
| Work Packet | `WP-12-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-0-1` | `0.1.2+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md` |
| Work Packet | `WP-13-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-2` | `0.1.2+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-13-Persistent-Memory-MSP-Runtime-Phase-2.md` |
| Work Packet | `WP-14-VAULT-SCOPING-MSP-RUNTIME-ENTITIES` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-14-Vault-Scoping-Msp-Runtime-Entities.md` |
| Change Request | `CR-2026-08-03-DOCUMENT-IA-KNOWLEDGE-GRAPH-READINESS` | `0.3.0+draft` | draft | Boss (Product Authority) | `docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md` |
| Change Request | `CR-2026-08-03-PHASE1B-METADATA-DECISION-PACKET` | `0.2.0` | approved | Boss (Product Authority) | `docs/change-requests/CR-2026-08-03-Phase1B-Metadata-Decision-Packet.md` |
| Change Request | `CR-2026-08-03-PHASE2-SEMANTIC-AUTHORITY-DECISION-PACKET` | `0.2.0` | approved | Boss (Product Authority) | `docs/change-requests/CR-2026-08-03-Phase2-Semantic-Authority-Decision-Packet.md` |
| Change Request | `FUTURE-CR-CONTEXT-AUTHORITY-RUNTIME-REPAIR` | `0.2.3` | approved | Boss | `docs/change-requests/CR-2026-08-03-Context-Authority-Runtime-Repair.md` |
| Change Request | `CR-2026-08-03-EXECUTION-BINDING-V1-LIFECYCLE-DECISION` | `0.2.6` | approved | Boss (CEO) | `docs/change-requests/CR-2026-08-03-Execution-Binding-v1-Lifecycle-and-Legacy-Sunset-Decision.md` |
| Evidence | `EVIDENCE-WP-10-EXECUTION-BINDING-V1-CONSUMER-DISCOVERY` | `0.2.2` | approved | ATHER | `docs/assurance/audit/EVIDENCE-WP-10-Execution-Binding-v1-Consumer-Discovery.md` |
| Evidence | `EVIDENCE-PROVIDER-ENTITLEMENT-RUNTIME-CONFORMANCE` | `0.3.0+draft` | draft | ATHER | `docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md` |
| TODO | `TODO-EXECUTION-BINDING-LIFECYCLE` | `0.1.0+draft` | draft | Boss (CEO) / ATHER | `docs/change-control/TODO-Execution-Binding-Lifecycle.md` |
| Blueprint | `BLUEPRINT-DOCUMENT-IA-GRAPH-CONTRACT` | `0.1.0+draft` | draft | ARCHON / THESEUS / ATHER | `docs/blueprints/BLUEPRINT-Document-Information-Architecture-and-Graph-Contract.md` |
| Migration | `MIGRATION-DOCUMENT-IA-GRAPH-READINESS` | `0.3.0+draft` | draft | LYRA / ATHER | `docs/migration/MIGRATION-Document-IA-and-Graph-Readiness.md` |
| Rollback | `ROLLBACK-DOCUMENT-IA-CLEANSING-PHASE1` | `0.3.0+draft` | draft | ATHER | `docs/change-requests/ROLLBACK-Document-IA-Cleansing-Phase1.md` |
| Navigation | `DOCS-NAVIGATION-HUB` | `0.3.1+draft` | draft | THESEUS / ATHER | `docs/README.md` |
| PRD | `PRD-GOVIBE-MCP-ORCHESTRATION` | `0.2.1+draft` | draft | GoVibe | `docs/PRD-GoVibe-MCP-Orchestration.md` |
| Design | `DESIGN-GOVIBE-DOCUMENT-HIERARCHY` | `0.2.0+draft` | draft | ARCHON / THESEUS / ATHER | `docs/design/GoVibe-Document-Hierarchy.md` |
| Design | `DESIGN-WIREFRAME-A2-ROADMAP-BOARD` | `0.1.1+draft` | draft | THESEUS / VIBE | `docs/design/WIREFRAME-A2-Roadmap-Board.md` |
| Design | `DESIGN-SITE-MAP` | `1.1.0` | approved | Boss (CEO) | `docs/design/SITE_MAP.md` |
| Design | `DESIGN-DOMAIN-DETAILS` | `1.1.0` | approved | Boss (CEO) | `docs/design/DOMAIN_DETAILS.md` |

## 4. Roadmap and Planning

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Roadmap | `ROADMAP-GOVIBE-MCP-RUNTIME` | `0.4.8` | approved | LYRA | `docs/roadmap/ROADMAP-govibe-mcp-runtime.md` |
| Master Plan | `MASTERPLAN-GOVIBE-MVP-DEVELOPER-TRIAL` | `0.2.0` | approved | LYRA | `docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md` |
| Roadmap | `ROADMAP-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | LYRA | `docs/roadmap/ROADMAP-task-scoped-context-injection.md` |
| Roadmap | `ROADMAP-TRANSLATOR-CORE` | `0.1.0` | approved | LYRA | `docs/roadmap/ROADMAP-translator-core.md` |
| Roadmap | `ROADMAP-PROVIDER-ENTITLEMENT-RUNTIME` | `0.1.6+draft` | draft | LYRA | `docs/roadmap/ROADMAP-provider-entitlement-runtime.md` |
| Backlog | `BACKLOG-P1-MVP-CORE` | `0.1.1+draft` | draft | LYRA | `docs/roadmap/BACKLOG-p1-mvp-core.md` |
| Backlog | `BACKLOG-PROVIDER-ENTITLEMENT-RUNTIME` | `0.1.6+draft` | draft | LYRA | `docs/roadmap/BACKLOG-provider-entitlement-runtime.md` |
| Backlog | `BACKLOG-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | LYRA | `docs/roadmap/BACKLOG-task-scoped-context-injection.md` |
| Roadmap | `ROADMAP-PERSISTENT-MEMORY-RUNTIME` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/ROADMAP-persistent-memory-runtime.md` |
| Backlog | `BACKLOG-PERSISTENT-MEMORY-RUNTIME` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/BACKLOG-persistent-memory-runtime.md` |
| Implementation Plan | `IMP-SYSTEM05-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.2` | approved | LYRA / ARCHON / ATHER | `docs/roadmap/IMP-SYSTEM05-Task-Scoped-Context-Injection.md` |
| Backlog | `IMP-GVMP01P05EP01` | `n/a` | tracked-outside-registry | LYRA | `.agents/.devlog/implement/IMP-GVMP01P05EP01.md` |

## 5. Agent Governance and Architecture

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Feature | `FEAT-DOCUMENT-VERSION-GOVERNANCE` | `0.1.0` | approved | ATHER / THESEUS | `docs/features/traceability-audit/FEAT-Document-Version-Governance.md` |
| Feature | `FEAT-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.1` | approved | ATHER / KIN | `docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md` |
| Feature | `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION` | `0.1.1` | approved | LYRA / ATHER | `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` |
| Feature | `FEAT-PER-AGENT-MEMORY-UNIT` | `0.2.0+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md` |
| Feature | `FEAT-TIERED-REVIEW` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Tiered-Review.md` |
| Feature | `FEAT-CODEV-COVIBE-TERMINOLOGY-DEFINITION` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md` |
| Feature | `FEAT-CODEV-MODULE` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-Module.md` |
| Feature | `FEAT-COVIBE-MODULE` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoVibe-Module.md` |
| Feature | `FEAT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md` |
| Feature | `FEAT-QWEN-CLI-MODEL-ROUTING` | `0.1.3` | approved | KIN / LYRA / ATHER | `docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md` |
| Feature | `FEAT-MULTI-PROVIDER-ENTITLEMENT-ROUTING` | `0.1.0+draft` | draft | LYRA / ARCHON / ATHER | `docs/features/integration-bridge/FEAT-Multi-Provider-Entitlement-Routing.md` |
| Audit | `AUDIT-COGNITIVE-SYSTEM-INBOUND-TRIAGE-2026-06-16` | `0.1.1` | approved | ATHER / LYRA | `docs/assurance/audit/AUDIT-Cognitive-System-Inbound-Triage-2026-06-16.md` |
| Audit | `POC-5-AXIS-COVERAGE` | `0.1.0+draft` | draft | Boss (CEO) | `docs/assurance/audit/POC-5-Axis-Coverage.md` |
| Audit | `POC-H6-BUDGET-SUFFICIENCY` | `0.2.0` | approved | Boss (CEO) | `docs/assurance/audit/POC-H6-Budget-Sufficiency.md` |
| Audit | `AUDIT-USER-FLOW-RUNTIME-GAPS-2026-06-22` | `0.1.0+draft` | draft | Boss (CEO) | `docs/assurance/audit/AUDIT-User-Flow-Runtime-Gaps-2026-06-22.md` |
| Audit | `AUDIT-GOVIBE-RWANG-CUTOVER-READINESS-2026-07-30` | `1.0.2` | draft | ATHER | `docs/audit/AUDIT-GoVibe-RWANG-Cutover-Readiness-2026-07-30.md` |
| Audit | `AUDIT-2026-08-01-H-AXIS-STD-INVENTORY` | `0.1.2` | under-review | ATHER | `docs/assurance/audit/AUDIT-2026-08-01-H-Axis-and-STD-Inventory.md` |
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
| ADR | `ADR-020-PER-AGENT-MEMORY-UNIT` | `0.1.2+draft` | proposed | ARCHON / ATHER | `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` |
| ADR | `ADR-027-IN-REPO-MSP-RUNTIME-PACKAGE-BOUNDARY` | `0.1.1+draft` | proposed | Boss (CEO) | `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` |
| ADR | `ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE` | `1.0.0` | approved | Boss / ATHER | `docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md` |
| ADR | `ADR-023-KNOWLEDGE-AUTHORITY-CONTEXT-AUTHORITY-BOUNDARY` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md` |
| ADR | `ADR-024-PROVIDER-ENTITLEMENT-EXECUTION-AUTHORITY-BOUNDARY` | `0.1.1+draft` | draft | Boss (CEO) | `docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md` |
| ADR | `ADR-025-STORAGE-BACKEND-INDEPENDENCE` | `0.1.0+draft` | proposed | Boss / ARCHON / ATHER | `docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md` |
| ADR | `ADR-026-MSP-EXTERNAL-RUNTIME-DEPLOYMENT` | `0.1.1+draft` | proposed | Boss (CEO) | `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md` |
| Architecture | `BLUEPRINT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.1` | approved | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md` |
| Architecture | `BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE` | `3.1.0` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md` |
| Architecture | `BLUEPRINT-MISSION-GATEWAY-RUNTIME-SPLIT` | `0.1.1` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-Mission-Gateway-Runtime-Responsibility-Split.md` |
| Architecture | `ARCH-VAULT-CONTEXT-MODEL` | `1.0.1` | approved | Boss / ATHER | `docs/architecture/ARCH-Vault-and-Context-Model.md` |
| Architecture | `TDD-POC-CANONICAL-LOOP` | `1.0.0` | approved | Boss / ATHER | `docs/architecture/TDD-POC-Canonical-Loop.md` |
| Architecture / Conformance | `C4-KNOWLEDGE-CONTEXT-AUTHORITY-OVERLAY` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/C4-Knowledge-Context-Authority-Overlay.md` |
| Architecture / Conformance | `C4-PROVIDER-ENTITLEMENT-EXECUTION-ROUTING-OVERLAY` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/C4-Provider-Entitlement-Execution-Routing-Overlay.md` |
| Architecture | `BLUEPRINT-TRANSLATOR-CORE-SLICE` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Translator-Core-Slice.md` |
| LLD | `LLD-TASK-SCOPED-CONTEXT-INJECTION-CORE` | `0.1.1` | approved | ARCHON / ATHER | `docs/lld/LLD-Task-Scoped-Context-Injection-Core.md` |
| Architecture | `MSP-GKS-TAXONOMY-MAPPING` | `0.1.0` | approved | THESEUS / KIN | `docs/architecture/MSP-GKS-Taxonomy-Mapping.md` |
| Architecture | `SDD-MSP-EXTERNAL-EVIDENCE-BOUNDARY` | `0.1.1` | approved | ARCHON / KIN / ATHER | `docs/architecture/SDD-MSP-External-Evidence-Boundary.md` |
| Architecture | `SDD-EXECUTION-ROUTING-AND-FAILOVER` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/SDD-Execution-Routing-and-Failover.md` |
| Architecture | `SDD-SYMBOL-GRAPH-TRACEABILITY-BOUNDARY` | `0.1.1` | approved | ARCHON / THESEUS / ATHER | `docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md` |
| Architecture | `SDD-VISUAL-AGENT-FLEET` | `0.1.0` | approved | THESEUS / ARCHON | `docs/architecture/SDD-Visual-Agent-Fleet.md` |
| Architecture | `SDD-GOVIBE-MSP-GKS-INTEGRATION` | `0.1.2+draft` | draft | Boss (CEO) | `docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md` |
| Architecture | `SDD-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.1.0+draft` | draft | Boss (CEO) | `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` |
| Policy | `POLICY-PROVIDER-ENTITLEMENT-SHARING-COMPATIBILITY` | `0.1.1+draft` | draft | Boss / ATHER | `docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md` |
| Policy | `POLICY-PROVIDER-ENTITLEMENT-USAGE-LEDGER-REDACTION-AND-RETENTION` | `0.1.0+draft` | draft | Boss / ATHER | `docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md` |
| Policy | `POLICY-PROVIDER-ADAPTER-ENABLEMENT` | `0.1.0+draft` | draft | Boss / ATHER | `docs/security/POLICY-Provider-Adapter-Enablement.md` |
| RCA | `RCA-2026-08-03-CONTEXT-AUTHORITY-RUNTIME-REPAIR` | `0.1.2+draft` | draft | ATHER / THESEUS | `docs/rca/RCA-2026-08-03-Context-Authority-Runtime-Repair.md` |

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
| Runbook | `RUNBOOK-BOUNDED-EXTERNAL-EXECUTOR-WORKFLOW` | `0.2.4` | approved | LYRA | `docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md` |
| Runbook | `RUNBOOK-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.0+draft` | draft | JANUS / KIN | `docs/operations/runbooks/RUNBOOK-MSP-Validate-Evidence-Adapter.md` |
| Runbook | `RUNBOOK-GOVIBE-FIRST-USE` | `0.1.3+draft` | draft | GoVibe | `docs/operations/runbooks/RUNBOOK-GoVibe-First-Use.md` |
| Runbook | `RUNBOOK-GOVIBE-MULTI-AGENT` | `0.2.0+draft` | draft | GoVibe | `docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md` |
| Runbook | `RUNBOOK-PERSISTENT-MEMORY-RUNTIME` | `0.1.0+draft` | draft | Boss (CEO) | `docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md` |
| Handover | `GVDOC-1004` | `2.3.0+draft` | draft | THESEUS | `docs/handover/GVDOC-1004-Handover Specification.md` |
| SRS | `SRS-GOVIBE-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md` |
| SRS | `SRS-GOVIBE-MCP-SERVER` | `0.2.1` | approved | GoVibe | `docs/srs/SRS-GoVibe-MCP-Server.md` |
| SRS | `SRS-OLLAMA-SIDECAR-EXECUTION` | `0.2.1` | approved | THESEUS | `docs/srs/SRS-Ollama-Sidecar-Execution.md` |
| SRS | `SRS-GKS-RETRIEVAL-LAYER` | `0.1.1+draft` | draft | Boss (CEO) | `docs/srs/SRS-GKS-Retrieval-Layer.md` |
| SRS | `SRS-GOVIBE-TRANSLATOR-CORE-SLICE` | `0.1.1+draft` | draft | Boss (CEO) | `docs/srs/SRS-GoVibe-Translator-Core-Slice.md` |
| SRS | `SRS-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.1.0+draft` | draft | Boss (CEO) | `docs/srs/SRS-Persistent-Memory-MSP-Runtime.md` |
| Architecture | `SEQ-OLLAMA-SIDECAR-FLOW` | `0.1.2` | approved | THESEUS | `docs/architecture/SEQ-Ollama-Sidecar-Flow.md` |
| LLD | `LLD-GOVIBE-MCP-TOOLS` | `0.3.0` | approved | GoVibe | `docs/lld/LLD-GoVibe-MCP-Tools.md` |
| LLD | `LLD-TRANSLATOR-CORE-SLICE` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/lld/LLD-Translator-Core-Slice.md` |
| LLD | `LLD-AGENT-LAUNCHER-EXECUTION-ROUTER` | `0.1.2` | approved | THESEUS | `docs/lld/LLD-Agent-Launcher-Execution-Router.md` |
| Context | `AGENT-BRIDGE-QWEN-COMPAT` | `1.2.1+draft` | draft | ATHER / THESEUS | `AGENT.md` |
| Context | `CONTEXT-BOUNDED-EXTERNAL-EXECUTOR` | `0.2.3` | draft | THESEUS | `.agents/context/CONTEXT-Bounded-External-Executor.md` |
| Context | `CONTEXT-GOVIBE-SHARED-EXTERNAL-AGENT` | `0.1.2+draft` | draft | ATHER / THESEUS | `.agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md` |
| Context | `CONTEXT-GOVIBE-GIT-HYGIENE` | `0.1.0+draft` | draft | JANUS / ATHER | `.agents/context/shared/CONTEXT-GoVibe-Git-Hygiene.md` |
| Context | `CONTEXT-MISSION-CONTROL-FRONTEND-STRUCTURE-REFACTOR` | `0.1.1+draft` | draft | LYRA / ARCHON / ATHER | `.agents/context/shared/CONTEXT-Mission-Control-Frontend-Structure-Refactor.md` |

## 8. Cleansing-Conformant Non-SOT Records

These records were deliberately registered by the owner-approved Phase 1B / Phase 2
integration for frontmatter and lifecycle parity. They are draft, non-SOT evidence
or guidance only; registration does not mint canonical GKS identities or promote
them into product authority.

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Audit | `IMPACT-ANALYSIS-PHASE4` | `0.1.0+draft` | draft | ATHER | `docs/audit/IMPACT-ANALYSIS-PHASE4.md` |
| Audit | `UAT-PLAN-GOVIBE-PHASE-3-4` | `0.1.0+draft` | draft | GHOST | `docs/audit/UAT-Plan.md` |
| Change Request | `CR-2026-06-15-CODEV-COVIBE-POSITIONING-REVIEW` | `0.1.1-beta` | draft | Boss (Product Authority) | `docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md` |
| Migration | `MIG-001-MISSION-CONTROL-REACT` | `0.1.0+draft` | draft | LYRA | `docs/migration/MIG-001-Mission-Control-React.md` |
| RCA | `RCA-2026-06-14-VISUAL-AGENT-FLEET-GOVERNANCE-FAILURE` | `0.1.0+draft` | draft | ATHER | `docs/rca/RCA-2026-06-14-Visual-Agent-Fleet-Governance-Failure.md` |
| Security | `PATH-CONTAINMENT` | `0.1.0+draft` | draft | ATHER | `docs/security/PATH-CONTAINMENT.md` |
| Copy template | `LANDING-COPY-TEMPLATE-GOVIBE-DRAFT1` | `0.2.0+draft` | draft | GoVibe | `docs/design/LANDING-Copy-Template-GoVibe-Draft1.md` |

## 9. Migration Notes

- Status values for canonical documents are defined in `docs/STD-Document-Versioning-Governance.md` Section 13.
- Change requests carrying decision authority (a recorded owner decision, approval, or authorization) are registered in this registry, matching the Section 3 practice for CR entries. Feedback and work-packet artifacts under `docs/change-requests/**` and `docs/change-control/change-requests/**` remain optional to register.
- Alignment files are registered conformance artifacts and must declare canonical owners through `conforms_to`.
- When an alignment document conflicts with a canonical API, ADR, architecture or Blueprint, the canonical document wins and the alignment document must be revised.
- Cross-repository mirrors are distribution copies only; authority, semantic versioning, and conflict resolution remain with the registered GoVibe canonical document.
- Older registry changelog entries remain available in Git history; the active file retains the current audit-relevant history below.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.9+draft | 2026-08-05 | Claude (final-gate session) | Owner-approved governance correction pass on the persistent-memory MSP runtime doc set. Synchronized WP-12-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-0-1 to 0.1.2+draft (honest execution-closure record; false "no tool implemented"/"32/32 tests" claims removed; true root-vitest-failure cause and Gate-0 remediation recorded; Deviations section added), WP-13-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-2 to 0.1.2+draft (removed a stray NUL byte that made the file appear binary to git; corrected `proposal_author` and `approval_recorded_at`; honest execution-closure record that implementation preceded authorization and the executing session self-flipped its own authorization flags; AC-09 marked "met retroactively, out of sequence"; Deviations section added, including the cross-agent Global-Private disclosure risk from a globally-unique `promotions.idempotency_key`), API-009-PERSISTENT-MEMORY-CONTRACT to 0.1.1+draft (§4.1 upsert no-op/`changed` field corrected; §6 vault-scope-enforcement-not-yet-implemented amendment note added), and ADR-027-IN-REPO-MSP-RUNTIME-PACKAGE-BOUNDARY to 0.1.1+draft (added required "Service health states" and "Contract version and compatibility" sections per issue #75; `status` remains `proposed`). Registered new Work Packet WP-14-VAULT-SCOPING-MSP-RUNTIME-ENTITIES (0.1.0+draft, draft, blocking gate before multi-agent `msp_memory_promote` use). No document status changed to approved/accepted/candidate by this row. |
| 0.3.8+draft | 2026-08-04 | Claude (final-gate session) | Synchronized WP-13-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-2 to 0.1.1+draft after independent verification and closure of its Phase 2 (eleven-tool `msp_*` contract surface) execution in `packages/msp-runtime`: AC-01 through AC-08 re-run and spot-checked directly by the final-gate session (68/68 tests reproduced), including resolving one flagged concern as a false positive (`domain/ids.mjs` NUL-byte separator, verified correct via direct source inspection). No document status changed to approved/accepted/candidate by this row. |
| 0.3.7+draft | 2026-08-04 | Claude (final-gate session) | Registered WP-13-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-2 (Phase 2: existing eleven-tool `msp_*` contract surface), depending on WP-12's execution-complete Phase 0+1 foundation. No document status changed to approved/accepted/candidate by this row. |
| 0.3.6+draft | 2026-08-04 | Claude (final-gate session) | Synchronized WP-12-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-0-1 to 0.1.1+draft after independent verification and closure of its Phase 0 (transport parity) + Phase 1 (storage foundation) execution in `packages/msp-runtime`: AC-01 through AC-07 re-run and spot-checked directly by the final-gate session, not only accepted from the executing agent's report. No document status changed to approved/accepted/candidate by this row. |
| 0.3.5+draft | 2026-08-04 | Claude (final-gate session) | Registered the persistent-memory MSP runtime documentation set (CR-2026-08-04-Persistent-Memory-MSP-Runtime): ADR-027, the governing CR, WP-12, API-009, SDD-Persistent-Memory-MSP-Runtime, SRS-Persistent-Memory-MSP-Runtime, RUNBOOK-Persistent-Memory-Runtime, ROADMAP/BACKLOG-persistent-memory-runtime. Synchronized ADR-026 to 0.1.1+draft (ADR-027 amendment note), FEAT-PER-AGENT-MEMORY-UNIT to 0.2.0+draft, LLD-GOVIBE-MCP-TOOLS to 0.3.0, and DESIGN-SITE-MAP/DESIGN-DOMAIN-DETAILS to 1.1.0 (planned Domain E). No document was set to approved/accepted/candidate by this change. |
| 0.3.4+draft | 2026-08-04 | Claude (final-gate session) | Doc-governance refinement (CR-2026-08-04-Doc-Governance-Refinement): synchronized STD-DOCUMENT-VERSIONING-GOVERNANCE to 0.2.1+draft and ADR-020 to 0.1.2+draft, registered DESIGN-SITE-MAP and DESIGN-DOMAIN-DETAILS at 1.0.0 (approved) and the CR-2026-08-04-DOC-GOVERNANCE-REFINEMENT decision packet itself, and amended Section 9 so change requests carrying decision authority are registered while feedback/work-packet artifacts remain optional. |
| 0.3.3+draft | 2026-08-04 | ATHER | Synchronized the conformance evidence to 0.3.0+draft and the backlog to 0.1.6+draft after fixing the binding-authenticity finding at the dispatch boundary. |
| 0.3.2+draft | 2026-08-04 | ATHER | Synchronized the conformance evidence package to 0.2.0+draft after recording the issue #59 dispatch-boundary negative matrix and the unfixed binding-authenticity finding. |
| 0.3.1+draft | 2026-08-04 | ATHER | Registered the provider entitlement runtime conformance evidence package for issue #64. The gate is not passed: the record carries review_state pending and no implementation status was propagated. |
| 0.3.0+draft | 2026-08-04 | ATHER | Registered the execution routing and governed failover design delivered under issue #62, including its scheduler decision evidence record and the recorded API-008 gap for that schema. |
| 0.2.9+draft | 2026-08-04 | ATHER | Registered the provider adapter enablement policy delivered under issue #63; every provider record remains pending and no runtime-conformance claim is advanced before issue #64. |
| 0.2.8+draft | 2026-08-04 | ATHER | Registered the entitlement usage ledger redaction and retention policy delivered under issue #61; no runtime-conformance claim is advanced before issue #64. |
| 0.2.7+draft | 2026-08-04 | LYRA | Synchronized the provider-entitlement roadmap to 0.1.1+draft after recording the issue #68 implementation sequence packet. |
| 0.2.6+draft | 2026-08-04 | ATHER | Registered TDD-POC-CANONICAL-LOOP v1.0.0 (approved) for the canonical graph-to-view POC. |
| 0.2.5+draft | 2026-08-04 | LYRA / ATHER | Registered the provider-entitlement runtime roadmap and backlog for issue #65; both remain draft and make no runtime-conformance claim before issue #64. |
| 0.2.4+draft | 2026-08-04 | GoVibe | Recorded the Boss-approved MVP Master Plan promotion and the approved-Master-Plan activation path in the first-use runbook. |
| 0.2.3+draft | 2026-08-04 | GoVibe | Registered ADR-026 for the external MSP runtime deployment boundary and the MSP configuration preflight runbook update. |
| 0.2.2+draft | 2026-08-03 | ATHER | Registered the execution-binding lifecycle remaining-work register and synchronized the navigation entry after the Canonical Semantic IR registration. |
| 0.2.1+draft | 2026-08-03 | ATHER / THESEUS | Registered merged PR #92 BRD/PRD updates, Canonical Semantic IR SRS, ADR-025, GenesisBlockDB adapter contract, and navigation v0.3.0 while preserving WP-11 closure records. |
| 0.2.0+draft | 2026-08-03 | ATHER | Synchronized WP-11 PR #95 closure and the governing CR version; API-007/API-008 and the parent multi-provider CR remain draft with promotion unauthorized. |
| 0.1.99+draft | 2026-08-03 | ATHER | Synchronized the WP-11 v1-only API compatibility contract, historical WP-10 evidence framing, navigation, and canonical D-07 lifecycle correction; API-008 remains draft. |
| 0.1.98+draft | 2026-08-03 | ATHER | Synchronized D-07 WP-11 authorization, accepted-risk evidence interpretation, and related registry versions; API/parent drafts and promotion prohibition remain unchanged. |
| 0.1.97+draft | 2026-08-03 | ATHER | Synchronized the WP-10 authorized-scope closure: PR #93 merge, complete evidence, and approved status; API promotion and WP-11 removal remain blocked. |
| 0.1.96+draft | 2026-08-03 | ATHER | Synchronized WP-10 local-verification and independent-review evidence versions without advancing remote completion gates. |
| 0.1.95+draft | 2026-08-03 | ATHER | Synchronized the WP-10 evidence hash-correction patch version. |
| 0.1.94+draft | 2026-08-03 | ATHER | Registered WP-10 commit-pinned consumer evidence and synchronized the verification-pending execution boundary. |
| 0.1.93+draft | 2026-08-03 | Boss / ATHER | Recorded approval of the execution-binding decision and WP-10 only; synchronized ADR-024 draft normalization and the policy threat-model reference correction. |
| 0.1.92+draft | 2026-08-03 | ATHER | Registered the owner-gated execution-binding v1 lifecycle and schema-less sunset decision; no API promotion or execution is authorized. |
| 0.1.91+draft | 2026-08-03 | ATHER | Synchronized WP-06 closure-review correction: completed CR wording and API-008 draft lifecycle remain distinct. |
| 0.1.90+draft | 2026-08-03 | ATHER | Registered final WP-06/CR closure state and canonical RCA evidence version after merged PR #89; draft API-008 and parent contracts remain unpromoted. |
| 0.1.89+draft | 2026-08-03 | ATHER | Registered the WP-06 local verification record and verification-pending closure hold; remote CI and PR merge remain open. |
| 0.1.88+draft | 2026-08-03 | ATHER | Synchronized API-008 v0.2.1+draft mandatory v1 execution-binding scope correlation and bounded schema-less legacy compatibility. |
| 0.1.87+draft | 2026-08-03 | ATHER | Synchronized API-008 v0.2.0+draft D-01 actor/principal execution-binding correlation semantics; API-008 remains draft. |
| 0.1.86+draft | 2026-08-03 | Boss / ATHER / THESEUS | Recorded Boss approval of the bounded runtime-repair CR and synchronized the CR/index authorization state; API-008 remains draft. |
| 0.1.85+draft | 2026-08-03 | ATHER / THESEUS | Moved the authoritative runtime-repair RCA from the non-SOT record group to the canonical governance/architecture group and synchronized corrected proposal versions. |
| 0.1.84+draft | 2026-08-03 | ATHER / THESEUS | Registered the owner-gated context-authority runtime repair CR and canonical RCA. |
| 0.1.83+draft | 2026-08-03 | Boss / ATHER | Reconciled Phase 1B and Phase 2 registered records: all eight metadata candidates, GVDOC-1004, the moved multi-agent runbook, LANDING template, approval-state decision packets, and current control documents. |
| 0.1.82+draft | 2026-08-03 | ATHER | Corrected the H-axis audit authority direction and final B04 rollback content-state evidence. |
| 0.1.81+draft | 2026-08-03 | ATHER | Registered the two owner-gated cleansing decision packets and synchronized the Phase 1-A factual correction and H-axis audit reference normalization. |
| 0.1.80+draft | 2026-08-03 | Boss / ATHER / THESEUS | Reconciled active Phase 1-A paths and registered owner-approved execution status for the CR, migration, and rollback packet. |
| 0.1.79+draft | 2026-08-03 | Boss / ATHER / THESEUS | Synchronized the deterministic cleansing-manifest verifier and migration/rollback evidence contract. |
| 0.1.78+draft | 2026-08-03 | Boss / ATHER / THESEUS | Registered the document IA cleansing CR, blueprint, migration, rollback and navigation packet; synchronized versioning and hierarchy standards. |
| 0.1.77+draft | 2026-08-02 | Boss / ATHER / THESEUS | Registered issue #55 CR, ADR-024, API-008, provider entitlement C4 overlay, and multi-provider entitlement routing feature. |
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
