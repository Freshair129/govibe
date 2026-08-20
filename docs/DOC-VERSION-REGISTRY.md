---
title: "Document Version Registry"
doc_id: "DOC-VERSION-REGISTRY"
status: "draft"
version: "0.3.74+draft"
updated: "2026-08-20"
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
| Standard / Canonical SOT | `STD-SLM-TIERED-ROUTING` | `0.1.0+draft` | draft | GoVibe | `docs/STD-SLM-Tiered-Routing.md` |
| Standard | `STD-DOCUMENT-VERSIONING-GOVERNANCE` | `0.2.1+draft` | draft | ATHER / THESEUS | `docs/STD-Document-Versioning-Governance.md` |
| Registry | `DOC-VERSION-REGISTRY` | `0.3.74+draft` | draft | ATHER / THESEUS | `docs/DOC-VERSION-REGISTRY.md` |

## 3. Product and Platform

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| BRD | `BRD-GOVIBE-PLATFORM` | `0.3.0+draft` | draft | Boss (CEO) | `docs/BRD-GoVibe-Platform.md` |
| PRD | `PRD-GOVIBE-PLATFORM-OVERVIEW` | `0.6.1+draft` | draft | Rwang (Senior Dev) | `docs/PRD-GoVibe-Platform-Overview.md` |
| SRS | `SRS-CANONICAL-SEMANTIC-IR` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/srs/SRS-Canonical-Semantic-IR.md` |
| Integration Contract | `CONTRACT-GOVIBE-GENESISBLOCKDB-ADAPTER` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/integration/CONTRACT-GenesisBlockDB-Adapter.md` |
| Reference | `REFERENCE-NOTION-JIRA-CONNECTOR-REQUIREMENTS` | `0.1.0+draft` | draft | ARCHON | `docs/integration/REFERENCE-Notion-Jira-Connector-Requirements.md` |
| Integration Contract | `CONTRACT-GOVIBE-PMADAPTER` | `0.1.0+draft` | draft | ARCHON | `docs/integration/CONTRACT-PmAdapter.md` |
| API | `API-004-TASK-SCOPED-CONTEXT-PACKET-SCHEMA` | `0.3.0` | approved | ARCHON / ATHER | `docs/api/API-004-Task-Scoped-Context-Packet-Schema.md` |
| API | `API-005-GOVIBE-CAPABILITY-CONTRACTS` | `3.1.0` | approved | Boss / ATHER | `docs/api/API-005-GoVibe-Capability-Contracts.md` |
| API | `API-006-VAULT-CONTEXT-REPLAY-CONTRACTS` | `1.1.0` | approved | Boss / ATHER | `docs/api/API-006-Vault-Context-and-Replay-Contracts.md` |
| API | `API-007-KNOWLEDGE-CONTEXT-AUTHORITY-CONTRACT` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/api/API-007-Knowledge-Context-Authority-Contract.md` |
| API | `API-008-PROVIDER-ENTITLEMENT-ROUTING-USAGE-CONTRACT` | `0.4.0+draft` | draft | ARCHON / ATHER | `docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md` |
| API | `API-009-PERSISTENT-MEMORY-CONTRACT` | `0.2.0+draft` | draft | Boss (CEO) | `docs/api/API-009-Persistent-Memory-Contract.md` |
| API | `API-010-MULTI-TENANT-VAULT-RESOLUTION-CONTRACT` | `0.1.0+draft` | draft | Boss (CEO) | `docs/api/API-010-Multi-Tenant-Vault-Resolution-Contract.md` |
| API | `MISSION-PROTOCOL-V2` | `0.1.0+draft` | draft | ATHER | `docs/api/MISSION-PROTOCOL-v2.md` |
| Change Request | `CR-2026-07-26-govibe-rwang-capability-absorption` | `1.0.0` | approved | Boss (Product Authority) | `docs/change-control/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md` |
| Change Request | `CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-02-Multi-Provider-Entitlement-Routing.md` |
| Change Request | `CR-2026-08-04-DOC-GOVERNANCE-REFINEMENT` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-04-Doc-Governance-Refinement.md` |
| Change Request | `CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.2.1+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md` |
| Change Request | `CR-2026-08-10-MISSIONSNAPSHOT-ORCHESTRATION-CONTRACT` | `1.0.0` | approved | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-10-MissionSnapshot-Orchestration-Contract.md` |
| Change Request | `CR-2026-08-15-MULTI-TENANT-PRINCIPAL-SCOPED-VAULT-BINDING` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-15-Multi-Tenant-Principal-Scoped-Vault-Binding.md` |
| Change Request | `CR-2026-08-19-ENTITLEMENT-EXECUTION-STACK-DISPOSITION` | `0.2.0` | approved | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-19-Entitlement-Execution-Stack-Disposition.md` |
| Work Packet | `WP-12-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-0-1` | `0.1.2+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md` |
| Work Packet | `WP-13-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-2` | `0.1.2+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-13-Persistent-Memory-MSP-Runtime-Phase-2.md` |
| Work Packet | `WP-14-VAULT-SCOPING-MSP-RUNTIME-ENTITIES` | `0.1.3+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-14-Vault-Scoping-Msp-Runtime-Entities.md` |
| Work Packet | `WP-15-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-3` | `0.1.3+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-15-Persistent-Memory-MSP-Runtime-Phase-3.md` |
| Work Packet | `WP-16-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-4` | `0.1.3+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-16-Persistent-Memory-MSP-Runtime-Phase-4.md` |
| Work Packet | `WP-17-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-5-STAGE-A` | `0.2.5+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-17-Persistent-Memory-MSP-Runtime-Phase-5-Stage-A.md` |
| Work Packet | `WP-18-PERSISTENT-MEMORY-MSP-RUNTIME-PHASE-5-STAGE-B` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/work-packets/WP-18-Persistent-Memory-MSP-Runtime-Phase-5-Stage-B.md` |
| Change Request | `CR-2026-08-03-DOCUMENT-IA-KNOWLEDGE-GRAPH-READINESS` | `0.3.0+draft` | draft | Boss (Product Authority) | `docs/change-requests/CR-2026-08-03-Document-IA-and-Knowledge-Graph-Readiness.md` |
| Change Request | `CR-2026-08-03-PHASE1B-METADATA-DECISION-PACKET` | `0.2.0` | approved | Boss (Product Authority) | `docs/change-requests/CR-2026-08-03-Phase1B-Metadata-Decision-Packet.md` |
| Change Request | `CR-2026-08-03-PHASE2-SEMANTIC-AUTHORITY-DECISION-PACKET` | `0.2.0` | approved | Boss (Product Authority) | `docs/change-requests/CR-2026-08-03-Phase2-Semantic-Authority-Decision-Packet.md` |
| Change Request | `FUTURE-CR-CONTEXT-AUTHORITY-RUNTIME-REPAIR` | `0.2.3` | approved | Boss | `docs/change-requests/CR-2026-08-03-Context-Authority-Runtime-Repair.md` |
| Change Request | `CR-2026-08-03-EXECUTION-BINDING-V1-LIFECYCLE-DECISION` | `0.2.6` | approved | Boss (CEO) | `docs/change-requests/CR-2026-08-03-Execution-Binding-v1-Lifecycle-and-Legacy-Sunset-Decision.md` |
| Evidence | `EVIDENCE-WP-10-EXECUTION-BINDING-V1-CONSUMER-DISCOVERY` | `0.2.2` | approved | ATHER | `docs/assurance/audit/EVIDENCE-WP-10-Execution-Binding-v1-Consumer-Discovery.md` |
| Evidence | `EVIDENCE-PROVIDER-ENTITLEMENT-RUNTIME-CONFORMANCE` | `0.4.0+draft` | draft | ATHER | `docs/assurance/audit/EVIDENCE-Provider-Entitlement-Runtime-Conformance.md` |
| TODO | `TODO-EXECUTION-BINDING-LIFECYCLE` | `0.1.2+draft` | draft | Boss (CEO) / ATHER | `docs/change-control/TODO-Execution-Binding-Lifecycle.md` |
| Blueprint | `BLUEPRINT-DOCUMENT-IA-GRAPH-CONTRACT` | `0.1.0+draft` | draft | ARCHON / THESEUS / ATHER | `docs/blueprints/BLUEPRINT-Document-Information-Architecture-and-Graph-Contract.md` |
| Migration | `MIGRATION-DOCUMENT-IA-GRAPH-READINESS` | `0.3.0+draft` | draft | LYRA / ATHER | `docs/migration/MIGRATION-Document-IA-and-Graph-Readiness.md` |
| Rollback | `ROLLBACK-DOCUMENT-IA-CLEANSING-PHASE1` | `0.3.0+draft` | draft | ATHER | `docs/change-requests/ROLLBACK-Document-IA-Cleansing-Phase1.md` |
| Navigation | `DOCS-NAVIGATION-HUB` | `0.3.1+draft` | draft | THESEUS / ATHER | `docs/README.md` |
| PRD | `PRD-GOVIBE-MCP-ORCHESTRATION` | `0.2.2+draft` | draft | GoVibe | `docs/PRD-GoVibe-MCP-Orchestration.md` |
| Design | `DESIGN-GOVIBE-DOCUMENT-HIERARCHY` | `0.2.0+draft` | draft | ARCHON / THESEUS / ATHER | `docs/design/GoVibe-Document-Hierarchy.md` |
| Design | `DESIGN-WIREFRAME-A2-ROADMAP-BOARD` | `0.1.1+draft` | draft | THESEUS / VIBE | `docs/design/WIREFRAME-A2-Roadmap-Board.md` |
| Design | `DESIGN-SITE-MAP` | `1.1.0` | approved | Boss (CEO) | `docs/design/SITE_MAP.md` |
| Design | `DESIGN-DOMAIN-DETAILS` | `1.1.0` | approved | Boss (CEO) | `docs/design/DOMAIN_DETAILS.md` |

## 4. Roadmap and Planning

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Roadmap | `ROADMAP-GOVIBE-MCP-RUNTIME` | `0.4.8` | approved | LYRA | `docs/roadmap/ROADMAP-govibe-mcp-runtime.md` |
| Master Plan | `MASTERPLAN-GOVIBE-MVP-DEVELOPER-TRIAL` | `0.2.1` | approved | LYRA | `docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md` |
| Master Plan | `MASTERPLAN-GOVIBE-PRODUCTION-READINESS` | `0.3.19` | approved | LYRA | `docs/roadmap/MASTERPLAN-govibe-production-readiness.md` |
| Backlog | `BACKLOG-PRODUCTION-READINESS-EXECUTION` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/BACKLOG-production-readiness-execution.md` |
| Roadmap | `ROADMAP-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | LYRA | `docs/roadmap/ROADMAP-task-scoped-context-injection.md` |
| Roadmap | `ROADMAP-TRANSLATOR-CORE` | `0.1.0` | approved | LYRA | `docs/roadmap/ROADMAP-translator-core.md` |
| Roadmap | `ROADMAP-PROVIDER-ENTITLEMENT-RUNTIME` | `0.1.6+draft` | draft | LYRA | `docs/roadmap/ROADMAP-provider-entitlement-runtime.md` |
| Backlog | `BACKLOG-P1-MVP-CORE` | `0.1.1+draft` | draft | LYRA | `docs/roadmap/BACKLOG-p1-mvp-core.md` |
| Backlog | `BACKLOG-PROVIDER-ENTITLEMENT-RUNTIME` | `0.1.6+draft` | draft | LYRA | `docs/roadmap/BACKLOG-provider-entitlement-runtime.md` |
| Backlog | `BACKLOG-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | LYRA | `docs/roadmap/BACKLOG-task-scoped-context-injection.md` |
| Roadmap | `ROADMAP-PERSISTENT-MEMORY-RUNTIME` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/ROADMAP-persistent-memory-runtime.md` |
| Backlog | `BACKLOG-PERSISTENT-MEMORY-RUNTIME` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/BACKLOG-persistent-memory-runtime.md` |
| Backlog | `BACKLOG-GOVLAYER-SUPERVISION-SURFACES` | `0.1.6+draft` | draft | LYRA | `docs/roadmap/BACKLOG-govlayer-supervision-surfaces.md` |
| Implementation Plan | `IMP-SYSTEM05-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.2` | approved | LYRA / ARCHON / ATHER | `docs/roadmap/IMP-SYSTEM05-Task-Scoped-Context-Injection.md` |
| Backlog | `IMP-GVMP01P05EP01` | `n/a` | tracked-outside-registry | LYRA | `.agents/.devlog/implement/IMP-GVMP01P05EP01.md` |

## 5. Agent Governance and Architecture

| Group | Doc ID | Version | Status | Owner | Path |
|---|---|---|---|---|---|
| Feature | `FEAT-DOCUMENT-VERSION-GOVERNANCE` | `0.1.1` | approved | ATHER / THESEUS | `docs/features/traceability-audit/FEAT-Document-Version-Governance.md` |
| Feature | `FEAT-MSP-VALIDATE-EVIDENCE-ADAPTER` | `0.1.1` | approved | ATHER / KIN | `docs/features/traceability-audit/FEAT-MSP-Validate-Evidence-Adapter.md` |
| Feature | `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION` | `0.1.2` | approved | LYRA / ATHER | `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` |
| Feature | `FEAT-PER-AGENT-MEMORY-UNIT` | `0.2.1+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Per-Agent-Memory-Unit.md` |
| Feature | `FEAT-TIERED-REVIEW` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/features/agent-team/FEAT-Tiered-Review.md` |
| Feature | `FEAT-CODEV-COVIBE-TERMINOLOGY-DEFINITION` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md` |
| Feature | `FEAT-CODEV-MODULE` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoDev-Module.md` |
| Feature | `FEAT-COVIBE-MODULE` | `0.2.0` | approved | THESEUS | `docs/features/agent-team/FEAT-CoVibe-Module.md` |
| Feature | `FEAT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/features/agent-team/FEAT-Task-Scoped-Context-Injection.md` |
| Feature | `FEAT-QWEN-CLI-MODEL-ROUTING` | `0.1.4` | approved | KIN / LYRA / ATHER | `docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md` |
| Feature | `FEAT-MULTI-PROVIDER-ENTITLEMENT-ROUTING` | `0.1.0+draft` | draft | LYRA / ARCHON / ATHER | `docs/features/integration-bridge/FEAT-Multi-Provider-Entitlement-Routing.md` |
| Audit | `AUDIT-COGNITIVE-SYSTEM-INBOUND-TRIAGE-2026-06-16` | `0.1.1` | approved | ATHER / LYRA | `docs/assurance/audit/AUDIT-Cognitive-System-Inbound-Triage-2026-06-16.md` |
| Audit | `POC-5-AXIS-COVERAGE` | `0.1.1+draft` | draft | Boss (CEO) | `docs/assurance/audit/POC-5-Axis-Coverage.md` |
| Audit | `POC-H6-BUDGET-SUFFICIENCY` | `0.2.0` | approved | Boss (CEO) | `docs/assurance/audit/POC-H6-Budget-Sufficiency.md` |
| Audit | `AUDIT-USER-FLOW-RUNTIME-GAPS-2026-06-22` | `0.1.0+draft` | draft | Boss (CEO) | `docs/assurance/audit/AUDIT-User-Flow-Runtime-Gaps-2026-06-22.md` |
| Audit | `AUDIT-GOVIBE-RWANG-CUTOVER-READINESS-2026-07-30` | `1.0.2` | draft | ATHER | `docs/audit/AUDIT-GoVibe-RWANG-Cutover-Readiness-2026-07-30.md` |
| Audit | `AUDIT-2026-08-01-H-AXIS-STD-INVENTORY` | `0.1.2` | under-review | ATHER | `docs/assurance/audit/AUDIT-2026-08-01-H-Axis-and-STD-Inventory.md` |
| Feature | `FEAT-ROADMAP-PROMOTION-CONTRACT` | `0.1.0` | approved | LYRA | `docs/features/project-roadmap/FEAT-Roadmap-Promotion-Contract.md` |
| Feature | `FEAT-VISUAL-AGENT-FLEET-SYSTEM` | `0.1.1` | approved | THESEUS | `docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md` |
| Feature | `FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION` | `0.1.1+draft` | draft | Boss (CEO) | `docs/features/genesis-knowledge-system/FEAT-Doc-Format-Template-Extraction.md` |
| ADR | `ADR-013-task-scoped-context-injection` | `0.1.0` | accepted | ARCHON / ATHER | `docs/adr/ADR-013-Task-Scoped-Context-Injection.md` |
| ADR | `ADR-014-msp-gks-traceability-gate` | `0.1.0` | accepted | ARCHON / ATHER | `docs/adr/ADR-014-MSP-GKS-Traceability-Gate.md` |
| ADR | `ADR-015-MASTER-ESSENCE-VS-GOV-POLICY` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-015-Master-Essence-vs-GOV-Policy.md` |
| ADR | `ADR-016-FULL-STACK-MANDATORY-SWAPPABLE-BACKEND` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-016-Full-Stack-Mandatory-Swappable-Backend.md` |
| ADR | `ADR-017-GOVIBE-GOVERNANCE-TRANSLATOR-GKS-INTERLINGUA` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-017-GoVibe-Governance-Translator-GKS-Interlingua.md` |
| ADR | `ADR-018-STRUCTURAL-DECOMPOSITION-CONTAINMENT-WIKILINK` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-018-Structural-Decomposition-Containment-Wikilink.md` |
| ADR | `ADR-019-UNIVERSAL-CODE-IN-MCP-OUT` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-019-Universal-Code-In-MCP-Out.md` |
| ADR | `ADR-020-PER-AGENT-MEMORY-UNIT` | `0.1.2+draft` | proposed | ARCHON / ATHER | `docs/adr/ADR-020-Per-Agent-Memory-Unit.md` |
| ADR | `ADR-027-IN-REPO-MSP-RUNTIME-PACKAGE-BOUNDARY` | `0.3.0` | accepted | Boss (CEO) | `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` |
| ADR | `ADR-028-MULTI-TENANT-PRINCIPAL-SCOPED-VAULT-BINDING` | `0.1.0+draft` | proposed | Boss (CEO) | `docs/adr/ADR-028-Multi-Tenant-Principal-Scoped-Vault-Binding.md` |
| ADR | `ADR-029-GOV-LAYER-LAUNCHER-CONSOLE-BOUNDARY` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md` |
| ADR | `ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE` | `1.0.0` | approved | Boss / ATHER | `docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md` |
| ADR | `ADR-023-KNOWLEDGE-AUTHORITY-CONTEXT-AUTHORITY-BOUNDARY` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md` |
| ADR | `ADR-024-PROVIDER-ENTITLEMENT-EXECUTION-AUTHORITY-BOUNDARY` | `0.2.0` | accepted | Boss (CEO) | `docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md` |
| ADR | `ADR-025-STORAGE-BACKEND-INDEPENDENCE` | `0.1.0+draft` | proposed | Boss / ARCHON / ATHER | `docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md` |
| ADR | `ADR-026-MSP-EXTERNAL-RUNTIME-DEPLOYMENT` | `0.1.2+draft` | proposed | Boss (CEO) | `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md` |
| Architecture | `BLUEPRINT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.1` | approved | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md` |
| Architecture | `BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE` | `3.1.0` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md` |
| Architecture | `BLUEPRINT-MISSION-GATEWAY-RUNTIME-SPLIT` | `0.1.2` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-Mission-Gateway-Runtime-Responsibility-Split.md` |
| Architecture | `ARCH-VAULT-CONTEXT-MODEL` | `1.0.1` | approved | Boss / ATHER | `docs/architecture/ARCH-Vault-and-Context-Model.md` |
| Spec | `SPEC-WORKSPACE-SYSTEM` | `0.3.3` | approved | Boss (CEO) | `docs/specs/SPEC-Workspace-System.md` |
| Architecture | `TDD-POC-CANONICAL-LOOP` | `1.0.0` | approved | Boss / ATHER | `docs/architecture/TDD-POC-Canonical-Loop.md` |
| Architecture / Conformance | `C4-KNOWLEDGE-CONTEXT-AUTHORITY-OVERLAY` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/C4-Knowledge-Context-Authority-Overlay.md` |
| Architecture / Conformance | `C4-PROVIDER-ENTITLEMENT-EXECUTION-ROUTING-OVERLAY` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/C4-Provider-Entitlement-Execution-Routing-Overlay.md` |
| Architecture | `BLUEPRINT-TRANSLATOR-CORE-SLICE` | `0.1.1+draft` | draft | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Translator-Core-Slice.md` |
| LLD | `LLD-TASK-SCOPED-CONTEXT-INJECTION-CORE` | `0.1.1` | approved | ARCHON / ATHER | `docs/lld/LLD-Task-Scoped-Context-Injection-Core.md` |
| Architecture | `MSP-GKS-TAXONOMY-MAPPING` | `0.1.0` | approved | THESEUS / KIN | `docs/architecture/MSP-GKS-Taxonomy-Mapping.md` |
| Architecture | `SDD-MSP-EXTERNAL-EVIDENCE-BOUNDARY` | `0.1.1` | approved | ARCHON / KIN / ATHER | `docs/architecture/SDD-MSP-External-Evidence-Boundary.md` |
| Architecture | `SDD-EXECUTION-ROUTING-AND-FAILOVER` | `0.2.0+draft` | draft | ARCHON / ATHER | `docs/architecture/SDD-Execution-Routing-and-Failover.md` |
| Architecture | `SDD-SYMBOL-GRAPH-TRACEABILITY-BOUNDARY` | `0.1.1` | approved | ARCHON / THESEUS / ATHER | `docs/architecture/SDD-Symbol-Graph-Traceability-Boundary.md` |
| Architecture | `SDD-VISUAL-AGENT-FLEET` | `0.1.0` | approved | THESEUS / ARCHON | `docs/architecture/SDD-Visual-Agent-Fleet.md` |
| Architecture | `SDD-GOVIBE-MSP-GKS-INTEGRATION` | `0.1.2+draft` | draft | Boss (CEO) | `docs/architecture/SDD-GoVibe-MSP-GKS-Integration.md` |
| Architecture | `SDD-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.1.0+draft` | draft | Boss (CEO) | `docs/architecture/SDD-Persistent-Memory-MSP-Runtime.md` |
| Policy | `POLICY-PROVIDER-ENTITLEMENT-SHARING-COMPATIBILITY` | `0.1.1+draft` | draft | Boss / ATHER | `docs/security/POLICY-Provider-Entitlement-Sharing-Compatibility.md` |
| Policy | `POLICY-PROVIDER-ENTITLEMENT-USAGE-LEDGER-REDACTION-AND-RETENTION` | `0.1.1+draft` | draft | Boss / ATHER | `docs/security/POLICY-Provider-Entitlement-Usage-Ledger-Redaction-and-Retention.md` |
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
| Runbook | `RUNBOOK-GOVIBE-FIRST-USE` | `0.1.4+draft` | draft | GoVibe | `docs/operations/runbooks/RUNBOOK-GoVibe-First-Use.md` |
| Runbook | `RUNBOOK-GOVIBE-QUICKSTART` | `0.1.0+draft` | draft | THESEUS | `docs/operations/runbooks/RUNBOOK-GoVibe-Quickstart.md` |
| Runbook | `RUNBOOK-GOVIBE-MULTI-AGENT` | `0.2.0+draft` | draft | GoVibe | `docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md` |
| Runbook | `RUNBOOK-PERSISTENT-MEMORY-RUNTIME` | `0.2.1+draft` | draft | Boss (CEO) | `docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md` |
| Handover | `GVDOC-1004` | `2.3.0+draft` | draft | THESEUS | `docs/handover/GVDOC-1004-Handover Specification.md` |
| SRS | `SRS-GOVIBE-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md` |
| SRS | `SRS-GOVIBE-MCP-SERVER` | `0.2.1` | approved | GoVibe | `docs/srs/SRS-GoVibe-MCP-Server.md` |
| SRS | `SRS-OLLAMA-SIDECAR-EXECUTION` | `0.2.1` | approved | THESEUS | `docs/srs/SRS-Ollama-Sidecar-Execution.md` |
| SRS | `SRS-GKS-RETRIEVAL-LAYER` | `0.1.1+draft` | draft | Boss (CEO) | `docs/srs/SRS-GKS-Retrieval-Layer.md` |
| SRS | `SRS-GOVIBE-TRANSLATOR-CORE-SLICE` | `0.1.2+draft` | draft | Boss (CEO) | `docs/srs/SRS-GoVibe-Translator-Core-Slice.md` |
| SRS | `SRS-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.1.0+draft` | draft | Boss (CEO) | `docs/srs/SRS-Persistent-Memory-MSP-Runtime.md` |
| Architecture | `SEQ-OLLAMA-SIDECAR-FLOW` | `0.1.2` | approved | THESEUS | `docs/architecture/SEQ-Ollama-Sidecar-Flow.md` |
| LLD | `LLD-GOVIBE-MCP-TOOLS` | `0.3.1` | approved | GoVibe | `docs/lld/LLD-GoVibe-MCP-Tools.md` |
| LLD | `LLD-TRANSLATOR-CORE-SLICE` | `0.1.1+draft` | draft | ARCHON / ATHER | `docs/lld/LLD-Translator-Core-Slice.md` |
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
| 0.3.74+draft | 2026-08-20 | Claude Opus 5 | Synchronized SPEC-WORKSPACE-SYSTEM to 0.3.3 and this registry's own self-row to 0.3.74+draft: recorded the owner-approved MSP semantic change executed under TASK-PRD-007 as §5.3.1 (inventory scope derived from the repository's git ignore rules rather than a hand-maintained list; non-git-toplevel workspaces must not inherit an enclosing repository's rules; unexpected git failure must be surfaced, not silently widen scope; `governingRuleSets` must carry no absolute path so `sourceSnapshotHash` stays content-addressed for §6 replay) and §5.3.2 (observed candidates published to the Mission Control snapshot must not be presented as canonical; per-stage bounding must be disclosed with numerator and denominator describing the same population). The change was owner-directed in session. No document status changed by this row; TASK-PRD-007 itself remains open in the masterplan and no Definition-of-Done criterion is ticked by this row. |
| 0.3.73+draft | 2026-08-20 | Claude Opus 5 | Synchronized SPEC-WORKSPACE-SYSTEM to 0.3.2: `govibe.workspace.impact` results now declare their own analysis boundary (`boundary.excluded[]`, one entry per excluded subtree with a reason). The impact engine builds its link graph by walking the filesystem rather than the git index, so a `git worktree add` target parked inside the repository was indexed as a complete second copy of the tree — `git worktree` writes `.git` as a *file*, which the walker's `.git` directory-name exclusion never matched. Measured on this repository, one seed path returned 197 affected artifacts of which roughly half were worktree twins of governed documents (`docs/specs/SPEC-Workspace-System.md` and its copy both returned as distinct `review_and_update` dependents at distance 1); after the fix, 100 affected and zero worktree paths. This is an AGENTS.md §10 correctness fix — phantom dependents inflate the mandatory required-review set with paths nobody should edit. Nested checkouts and root-level scratch directories (`.claude/`, `.agents/`, `.brain/`, `state/`, `benchmark_results/`, `ref/`) are excluded and reported, never silently dropped; scratch names are matched against root children only so a governed nested `src/state/` stays indexed. Deep scan's separate `ignored` set in `packages/govibe-core/src/scan/scan.mjs` was deliberately left unchanged — it governs what is submitted to MSP and needs owner sign-off. Evidence: `npx vitest run packages/govibe-core/impact-engine.test.mjs` (9 passed, 6 new). No document status changed by this row. |
| 0.3.72+draft | 2026-08-20 | Claude Sonnet 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.19 and this registry's own self-row to 0.3.72+draft: bookkeeping-consistency reconciliation, not new execution work. With GATE-BOOTSTRAP flipped to met in §4 (0.3.18/0.3.71+draft rows) and TASK-PRD-010 — confirmed as SPR-PRD-05's sole child task in the Assignments table — already `done`, PHASE-PRD-05's own named exit criterion ("GATE-BOOTSTRAP is met") and SPR-PRD-05's sole blocking task were both already satisfied, leaving the Phases/Sprints table progress rows internally contradictory with §4. PHASE-PRD-05 status in-progress → done, progress 75 → 100; SPR-PRD-05 status in-progress → done, progress 75 → 100. §4 gates, TASK-PRD-010's own row, and the plan's `approved` lifecycle status are unchanged by this row. |
| 0.3.71+draft | 2026-08-20 | Claude Sonnet 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.18 and this registry's own self-row to 0.3.71+draft: closed the one gap an adversarial review found in TASK-PRD-010's prior evidence (live boot verified only against a pre-existing `.env`, never one produced by `npm run env:bootstrap`) with a real end-to-end seam test — the real `.env` was backed up, removed, regenerated by `env:bootstrap` (fresh 64-hex matched token pair), the sidecar was booted against that bootstrap-generated file alone, and `GET /mission/snapshot` returned `200` with 31 real roadmap nodes / 9 real agents / `sourcePath: docs/roadmap/ROADMAP-translator-core.md`; the real `.env` was restored unconditionally afterward (verified, no backup file left behind). GATE-BOOTSTRAP flipped to met in §4 on this evidence; TC-TASK-PRD-010 review → done (0.2.0+draft → 0.3.0+draft), exit criterion ticked with an honest caveat that this proves the documented bootstrap path, not a literal second-human fresh-machine run. Backlog Items table: TASK-PRD-010 review → done. Verification table unchanged (QA passed, Audit stays pending). With this gate met, all six §4 Readiness Gates now read met. No document status changed to approved/accepted by this row beyond this registry's own routine patch and the masterplan's already-approved status. |
| 0.3.70+draft | 2026-08-19 | Claude Sonnet 5 | TASK-PRD-010 execution sync (GAP-09 / GATE-BOOTSTRAP): registered `RUNBOOK-GOVIBE-QUICKSTART` (draft, 0.1.0+draft, owner THESEUS, `docs/operations/runbooks/RUNBOOK-GoVibe-Quickstart.md`) — a single linear clean-checkout-to-connected-Mission-Control path, including the new `npm run env:bootstrap` helper (`scripts/mcp/bootstrap-env.mjs`) that removes the manual copy-and-match-two-tokens blocker. Synchronized `RUNBOOK-GOVIBE-FIRST-USE` to 0.1.4+draft (fixed a stale `.env.local` reference — the loader actually reads `.env` — that would have silently defeated its own token-setup instructions; see that runbook's changelog). Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.17 (TASK-PRD-010 planned → review with live sidecar+frontend verification evidence in its Task Container; PHASE-PRD-05/SPR-PRD-05 planned → in-progress). No document status changed to approved/accepted by this row; GATE-BOOTSTRAP itself stays not met pending an owner-directed flip per the masterplan's changelog. |
| 0.3.69+draft | 2026-08-19 | Claude Sonnet 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.16 and this registry's own self-row to 0.3.69+draft: owner-directed ratification (Boss, in session) of nineteen review-status tasks to done (TASK-PRD-005, 009, 018, 019, 020, 021, 022, 023, 024, 026, 027, 028, 030, 031, 032, 033, 034, 035, 036), citing green baseline-check run 32226975076 on `main` @ commit 9bc4215 (the #166 merge, current HEAD); GATE-CONTRACT and GATE-SEMANTIC flipped to met citing the same run; GATE-BOOTSTRAP stays not met. TASK-PRD-029 stays at review (its actor-attribution success criterion has no new evidence). No document status changed by this row. |
| 0.3.68+draft | 2026-08-19 | VIBE | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.15 and this registry's own self-row to 0.3.68+draft: TASK-PRD-032 (AUD-15) executed to review — completion gate now requires attached impact evidence for explicitly-declared semantic/schema/authority/runtime-behavior-class done transitions (scripts/mcp/runtime/roadmap-service.mjs, extending the TASK-PRD-030 node.update guard), and scripts/docs/diff-check.mjs is wired as a blocking, pull_request-scoped step in .github/workflows/baseline-check.yml (new --base <ref> diff mode). PHASE-PRD-09/SPR-PRD-09 progress 60 → 90, status in-progress → review. No document status changed by this row. |
| 0.3.67+draft | 2026-08-19 | ATHER | Reconciled the TASK-PRD-009/TASK-PRD-022 H-axis sweep (worktree commit b709a00, review-gate APPROVE-FOR-COMMIT) onto origin/main's Batch 3/4/6 merge base (protocol v2 + parity + CI hygiene, frontend honesty, dispatch gate + ADR-024 acceptance). Synchronized the version rows of thirteen registered documents to match the abolished-H-axis semantic corrections made to their frontmatter/body (field renames `context_scaling_tier`/`context_tier`/`planning_tier` -> `access_scope`, hop labels -> `retrieval_radius`, no status changes) — PRD-GOVIBE-PLATFORM-OVERVIEW 0.6.1+draft, PRD-GOVIBE-MCP-ORCHESTRATION 0.2.2+draft, MASTERPLAN-GOVIBE-MVP-DEVELOPER-TRIAL 0.2.1, FEAT-DOCUMENT-VERSION-GOVERNANCE 0.1.1, FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION 0.1.2, FEAT-PER-AGENT-MEMORY-UNIT 0.2.1+draft, FEAT-QWEN-CLI-MODEL-ROUTING 0.1.4, POC-5-AXIS-COVERAGE 0.1.1+draft, FEAT-VISUAL-AGENT-FLEET-SYSTEM 0.1.1, FEAT-DOC-FORMAT-TEMPLATE-EXTRACTION 0.1.1+draft, BLUEPRINT-TRANSLATOR-CORE-SLICE 0.1.1+draft, SRS-GOVIBE-TRANSLATOR-CORE-SLICE 0.1.2+draft, LLD-TRANSLATOR-CORE-SLICE 0.1.1+draft — none of these thirteen were touched by any merged batch, so no collision. Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.14 (reconciled onto main's 0.3.13 tip, keeping every TASK-PRD row through 036 and all PHASE/SPR states from main's Batches 3/4/6, plus this worktree's TASK-PRD-009/TASK-PRD-022 review status and PHASE-PRD-04/SPR-PRD-04 progress 0 -> 90; GATE-SEMANTIC stays not met pending CI evidence) and this registry's own self-row to 0.3.67+draft. No document status changed by this row. |
| 0.3.66+draft | 2026-08-19 | Claude Sonnet 5 | Owner-decision row, by owner authority (Boss, CR-2026-08-19 §6 D-01 recorded decision): `ADR-024-PROVIDER-ENTITLEMENT-EXECUTION-AUTHORITY-BOUNDARY` `0.1.1+draft` draft → `0.2.0` accepted, scoped to §2.5 two-phase routing as executed by TASK-PRD-035's phase-1 dispatch gate (API-008 remains draft; entitlement/compatibility arbitration across external providers, the credential boundary, and the D-03 deferred modules explicitly out of scope per the ADR's new §7). This row DOES change ADR-024 to accepted, on owner authority (CR-2026-08-19 §6 D-01), not a self-applied ratification. Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.13 (reconciled onto origin/main's Batch 3+4 merge base, 0.3.12 -> 0.3.13: TASK-PRD-035 D-01 phase-1 dispatch-gate integration and TASK-PRD-036 D-04 replay-provider pinned test executed to review; PHASE-PRD-07/SPR-PRD-07 progress 70 → 85, kept alongside main's independent PHASE-PRD-02/SPR-PRD-02 and PHASE-PRD-03/SPR-PRD-03 bumps recorded in the 0.3.65+draft row below) and TODO-EXECUTION-BINDING-LIFECYCLE to 0.1.2+draft (recorded the TASK-PRD-035 review-gate MINOR — provider-adapter-host.mjs's rejectCanonicalIdentities fail-closed against the launcher's opaque stdout/stderr — as a deferred phase-2 follow-up, not fixed in this batch). |
| 0.3.65+draft | 2026-08-19 | Claude Sonnet 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.12 (reconciled onto the Batch 3 merge base, 0.3.11 -> 0.3.12): TASK-PRD-020 (AUD-07, the sole live-data-rule violation — fabricated D1 Reactor Run Trigger telemetry/benchmark/lifecycle removed and replaced with honest empty-state + real reactor.run acknowledgement) and TASK-PRD-021 (AUD-24 — dedicated "unauthorized" connection state, EventProvenance/lastIngest marker on every ingestion path, shared useConnectionStatus hook consumed by EmptyState and StatusBar) executed to review in one batch (VIBE executor). PHASE-PRD-03/SPR-PRD-03 progress 20 → 40. No document status changed by this row. |
| 0.3.64+draft | 2026-08-19 | Claude Sonnet 5 | Registered `MISSION-PROTOCOL-V2` (draft, 0.1.0+draft, owner ATHER, `docs/api/MISSION-PROTOCOL-v2.md`) under §3 Product and Platform — the doc AUD-34/TASK-PRD-034 replaced the unregistered `docs/api/MISSION-PROTOCOL-v1.md` (removed) with. Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.11 (TASK-PRD-018, TASK-PRD-019, TASK-PRD-034 executed to review in one owner-directed batch) and `BLUEPRINT-MISSION-GATEWAY-RUNTIME-SPLIT` to 0.1.2 (reference-path-only update from the retired v1 filename to v2). This row DOES add one new registered document (MISSION-PROTOCOL-V2, entering as draft); no existing document's status changed. |
| 0.3.63+draft | 2026-08-19 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.10 and SPEC-WORKSPACE-SYSTEM to 0.3.1: TASK-PRD-026 (AUD-04 sidecar RBAC bypass), TASK-PRD-027 (AUD-05 ungoverned docs.resolve/ingest.code file access), TASK-PRD-028 (AUD-10 credential exposures — child env, WS token, log redaction; PM connector vault-wiring recorded as an interim acceptance expiring 2026-11-19), and TASK-PRD-029 (AUD-08 unverified approvalRef) executed to review in one owner-directed batch (Boss instruction, VIBE/ARCHON executors per each Task Container's pic). PHASE-PRD-08/SPR-PRD-08 progress 0 → 70. No document status changed by this row. |
| 0.3.62+draft | 2026-08-19 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.9: the independent review gate's round-2 delta verification (probes A/B/B2/C/D/E/F) reproduced all twelve 0.3.8 findings as fixed — verdict APPROVE-FOR-COMMIT. Verification table Audit Status set pending → passed for TASK-PRD-030, TASK-PRD-031, TASK-PRD-033 (QA stays passed); each Task Container's changelog got one appended sentence recording the audit as this in-session review-gate audit, not a separate ATHER session. No document status changed by this row. |
| 0.3.61+draft | 2026-08-19 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.8: review-gate (Opus, ATHER-role) correction/hardening row on the 0.3.7 batch. TASK-PRD-030's node.update->done guard had a demonstrated caller-controlled asOf bypass (030-A, fixed) and a verification-erasure bug that blocked the ADR-029 approve flow (030-B, fixed), both closed with new named regression tests in scripts/mcp/runtime/roadmap-service.test.mjs; TASK-PRD-031/033 were approved as executed and received nine additional reviewer-endorsed hardening fixes (snapshot freshness on dedup replay, minted-commandId/command-type dedup-key correctness, journal-append rollback on failure, absolute-path env validation, durability-scope comment accuracy, governance-visibility markers for the DoD override path). No document status changed by this row. |
| 0.3.60+draft | 2026-08-19 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.7: TASK-PRD-030 (AUD-06 false-success paths), TASK-PRD-031 (AUD-11 restart durability), and TASK-PRD-033 (AUD-18 command idempotency) executed to review in one owner-directed batch (Boss instruction, VIBE executor), each with real local test/gate evidence in its Task Container changelog; TASK-PRD-032 stays planned (out of this batch's scope). PHASE-PRD-09/SPR-PRD-09 progress 0 → 60. No document status changed by this row. |
| 0.3.59+draft | 2026-08-19 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.6: TASK-PRD-023 exit criterion ticked on green baseline-check run 32193062736 (PR #159) which executed the msp:smoke gate in CI. No document status changed by this row. |
| 0.3.58+draft | 2026-08-19 | Claude Fable 5 | Owner-decision row, by explicit owner (Boss, decision authority) instruction: CR-2026-08-19-ENTITLEMENT-EXECUTION-STACK-DISPOSITION 0.1.0+draft → 0.2.0 approved (D-01..D-05 approved as recommended, recorded in its §6). This row DOES change that one document to approved, on owner authority. Synchronized: MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.5 (TASK-PRD-025 done, handoff completed, follow-ups TASK-PRD-035/036 opened) and TODO-EXECUTION-BINDING-LIFECYCLE to 0.1.1+draft (D-03 deferred dispositions with revisit triggers). |
| 0.3.57+draft | 2026-08-19 | Claude Fable 5 | TASK-PRD-025 execution sync: registered CR-2026-08-19-ENTITLEMENT-EXECUTION-STACK-DISPOSITION (draft, Boss decision pending in its §6) and MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.4 (task to review). No document status changed by this row. |
| 0.3.56+draft | 2026-08-19 | Claude Fable 5 | TASK-PRD-024 execution sync: MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.3 (contextAuthority forwarding fixed via shared contract; live-surface integration test green; task to review). No document status changed by this row. |
| 0.3.55+draft | 2026-08-19 | Claude Fable 5 | TASK-PRD-023 execution sync: MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.2 (task to review on recorded owner C-3 approval; MSP launch contract wired with msp:smoke CI gate) and RUNBOOK-PERSISTENT-MEMORY-RUNTIME to 0.2.1+draft (§7.1 promotion smoke gate and local .env launch path). No document status changed by this row. |
| 0.3.54+draft | 2026-08-19 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.1: AUD-34 opened (mission protocol spec stale/incomplete/unregistered) and bound to TASK-PRD-034 with a complete Task Container. No document status changed by this row. |
| 0.3.53+draft | 2026-08-19 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.3.0: the 2026-08-19 contract-to-runtime audit register (§3.3, AUD-01..AUD-33) landed with three new phases (PHASE-PRD-07..09), sprints SPR-PRD-07..09, and sixteen new tasks TASK-PRD-018..033, each with a complete Task Container per the plan's §11.3 promotion rule. All new work enters as planned; no document status changed by this row. |
| 0.3.52+draft | 2026-08-17 | Claude Sonnet 5 | Registered CONTRACT-GOVIBE-PMADAPTER (draft) and GLS-005 closure row: BACKLOG-GOVLAYER-SUPERVISION-SURFACES synchronized to 0.1.6+draft (PmAdapter contract, registry, Notion/Jira adapters, and the govibe.pm.export/sync MCP tools implemented and closed to done). Owner-directed ("เริ่ม GLS-005 ต่อเลย"), not an independent ATHER audit reproduction. AC-01 is ticked on contract-level evidence (real request shape confirmed against Notion's live API with an invalid token) -- no live Notion or Jira account exists in this session, so a full successful export against a connected account remains unverified and is explicitly noted as such in both the contract doc and the Task Container changelog. |
| 0.3.51+draft | 2026-08-17 | Claude Sonnet 5 | GLS-003 closure row: BACKLOG-GOVLAYER-SUPERVISION-SURFACES synchronized to 0.1.5+draft (Mission Canvas governed actions implemented, live-verified against a real C-3 gate, and closed to done). Owner-directed closure ("เริ่ม GLS-003 ต่อเลย"), not an independent ATHER audit reproduction. |
| 0.3.50+draft | 2026-08-17 | Claude Sonnet 5 | GLS-002 closure row: BACKLOG-GOVLAYER-SUPERVISION-SURFACES synchronized to 0.1.4+draft (Mission Canvas / A8 implemented and closed to done). Owner-directed closure ("เริ่ม GLS-002 Canvas ต่อเลย"), not an independent ATHER audit reproduction. |
| 0.3.49+draft | 2026-08-17 | Claude Sonnet 5 | Registered REFERENCE-NOTION-JIRA-CONNECTOR-REQUIREMENTS (draft): OAuth/scope/rate-limit research for GLS-005's PmAdapter, authored on user request while GLS-004's CI ran. Research only, not a design decision. |
| 0.3.48+draft | 2026-08-17 | Claude Sonnet 5 | GLS-004 closure row: BACKLOG-GOVLAYER-SUPERVISION-SURFACES synchronized to 0.1.3+draft (node execution contract schema, generator, and gate-time hook enforcement landed and GLS-004 closed to done). Owner-directed closure (Boss present, "จัดการปิดงานให้หมด"), not an independent ATHER audit reproduction. |
| 0.3.47+draft | 2026-08-17 | Claude Sonnet 5 | GLS-001 closure row: BACKLOG-GOVLAYER-SUPERVISION-SURFACES synchronized to 0.1.2+draft (GLS-001 done, ATHER impact-analysis handoff completed with a fresh calculateWorkspaceImpact run against merged main). Owner-directed closure (Boss present, explicit instruction), not an independent ATHER audit reproduction. |
| 0.3.46+draft | 2026-08-17 | Claude Fable 5 | Ratification row, by explicit owner (Boss, ratification authority) instruction in session: ADR-029-GOV-LAYER-LAUNCHER-CONSOLE-BOUNDARY 0.1.0+draft → 0.2.0 accepted, with the H4 override for GLS-001 authorized in the same decision; BACKLOG-GOVLAYER-SUPERVISION-SURFACES synchronized to 0.1.1+draft (GLS-001 ratification handoff completed, task planned → ready). This row DOES change ADR-029 to accepted, on owner authority. |
| 0.3.45+draft | 2026-08-17 | Claude Fable 5 | Registered ADR-029 (Gov-Layer, Launcher, and Console Boundary; proposed) and BACKLOG-GOVLAYER-SUPERVISION-SURFACES (draft) on owner direction from the 2026-08-17 session. No document was promoted or ratified by this registry-only row; ADR-029 ratification and the H4 authorization remain pending owner handoffs. |
| 0.3.44+draft | 2026-08-15 | ATHER | Registered the owner-approved MissionSnapshot orchestration contract (CR-2026-08-10-MISSIONSNAPSHOT-ORCHESTRATION-CONTRACT) and refreshed PR #131 on current main with all newer main entries preserved; ATHER audit remains pending. |
| 0.3.43+draft | 2026-08-15 | OpenAI | Registered Issue #136 multi-tenant principal-scoped vault CR, ADR-028, and API-010; no document was promoted or owner-approved by this registry-only row. |
| 0.3.42+draft | 2026-08-14 | ATHER | Synchronized API-008/API-009, ADR-027, execution-routing SDD, entitlement evidence, usage policy, persistent-memory runbook, and their registry versions after the #109/#110/#111/#76 issue sweep. |
| 0.3.41+draft | 2026-08-09 | Claude Fable 5 | Ratification row, by explicit owner (Boss, ratification authority) instruction: SPEC-WORKSPACE-SYSTEM 0.2.4+draft → 0.3.0 approved and MASTERPLAN-GOVIBE-PRODUCTION-READINESS 0.1.15+draft → 0.2.0 approved. Evidence basis: PR #128 (merge c75e636) with the full baseline gate and CI green; spec AC-01..AC-08 pinned by the §12 suites. This row DOES change these two documents to approved, on owner authority. TASK-PRD-001 closes with this change per its exit criterion. |
| 0.3.40+draft | 2026-08-09 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.1.15+draft: SPR-PRD-06 / PHASE-PRD-06 closed to done on an owner-directed audit pass with recorded gate evidence and green PR #128 CI; Verification set to passed for TASK-PRD-013..017. No document status changed to approved/accepted/candidate by this row. |
