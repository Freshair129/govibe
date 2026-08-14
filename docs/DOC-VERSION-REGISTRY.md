---
title: "Document Version Registry"
doc_id: "DOC-VERSION-REGISTRY"
status: "draft"
version: "0.3.43+draft"
updated: "2026-08-15"
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
| Registry | `DOC-VERSION-REGISTRY` | `0.3.43+draft` | draft | ATHER / THESEUS | `docs/DOC-VERSION-REGISTRY.md` |

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
| API | `API-008-PROVIDER-ENTITLEMENT-ROUTING-USAGE-CONTRACT` | `0.4.0+draft` | draft | ARCHON / ATHER | `docs/api/API-008-Provider-Entitlement-Routing-Usage-Contract.md` |
| API | `API-009-PERSISTENT-MEMORY-CONTRACT` | `0.2.0+draft` | draft | Boss (CEO) | `docs/api/API-009-Persistent-Memory-Contract.md` |
| API | `API-010-MULTI-TENANT-VAULT-RESOLUTION-CONTRACT` | `0.1.0+draft` | draft | Boss (CEO) | `docs/api/API-010-Multi-Tenant-Vault-Resolution-Contract.md` |
| Change Request | `CR-2026-07-26-govibe-rwang-capability-absorption` | `1.0.0` | approved | Boss (Product Authority) | `docs/change-control/change-requests/CR-2026-07-26-GoVibe-RWANG-Capability-Absorption.md` |
| Change Request | `CR-2026-08-02-MULTI-PROVIDER-ENTITLEMENT-ROUTING` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-02-Multi-Provider-Entitlement-Routing.md` |
| Change Request | `CR-2026-08-04-DOC-GOVERNANCE-REFINEMENT` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-04-Doc-Governance-Refinement.md` |
| Change Request | `CR-2026-08-04-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.2.1+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md` |
| Change Request | `CR-2026-08-15-MULTI-TENANT-PRINCIPAL-SCOPED-VAULT-BINDING` | `0.1.0+draft` | draft | Boss (CEO) | `docs/change-control/change-requests/CR-2026-08-15-Multi-Tenant-Principal-Scoped-Vault-Binding.md` |
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
| Master Plan | `MASTERPLAN-GOVIBE-PRODUCTION-READINESS` | `0.2.1` | approved | LYRA | `docs/roadmap/MASTERPLAN-govibe-production-readiness.md` |
| Backlog | `BACKLOG-PRODUCTION-READINESS-EXECUTION` | `0.1.0+draft` | draft | LYRA | `docs/roadmap/BACKLOG-production-readiness-execution.md` |
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
| ADR | `ADR-027-IN-REPO-MSP-RUNTIME-PACKAGE-BOUNDARY` | `0.3.0` | accepted | Boss (CEO) | `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md` |
| ADR | `ADR-028-MULTI-TENANT-PRINCIPAL-SCOPED-VAULT-BINDING` | `0.1.0+draft` | proposed | Boss (CEO) | `docs/adr/ADR-028-Multi-Tenant-Principal-Scoped-Vault-Binding.md` |
| ADR | `ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE` | `1.0.0` | approved | Boss / ATHER | `docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md` |
| ADR | `ADR-023-KNOWLEDGE-AUTHORITY-CONTEXT-AUTHORITY-BOUNDARY` | `0.1.0` | accepted | Boss (CEO) | `docs/adr/ADR-023-Knowledge-Authority-Context-Authority-Boundary.md` |
| ADR | `ADR-024-PROVIDER-ENTITLEMENT-EXECUTION-AUTHORITY-BOUNDARY` | `0.1.1+draft` | draft | Boss (CEO) | `docs/adr/ADR-024-Provider-Entitlement-Execution-Authority-Boundary.md` |
| ADR | `ADR-025-STORAGE-BACKEND-INDEPENDENCE` | `0.1.0+draft` | proposed | Boss / ARCHON / ATHER | `docs/adr/ADR-025-Storage-Backend-Independence-and-GenesisBlockDB-Adapter-Boundary.md` |
| ADR | `ADR-026-MSP-EXTERNAL-RUNTIME-DEPLOYMENT` | `0.1.2+draft` | proposed | Boss (CEO) | `docs/adr/ADR-026-MSP-External-Runtime-Deployment.md` |
| Architecture | `BLUEPRINT-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.1` | approved | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Task-Scoped-Context-Injection.md` |
| Architecture | `BLUEPRINT-GOVIBE-CAPABILITY-VERTICAL-SLICE` | `3.1.0` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md` |
| Architecture | `BLUEPRINT-MISSION-GATEWAY-RUNTIME-SPLIT` | `0.1.1` | approved | Boss / ATHER | `docs/architecture/BLUEPRINT-Mission-Gateway-Runtime-Responsibility-Split.md` |
| Architecture | `ARCH-VAULT-CONTEXT-MODEL` | `1.0.1` | approved | Boss / ATHER | `docs/architecture/ARCH-Vault-and-Context-Model.md` |
| Spec | `SPEC-WORKSPACE-SYSTEM` | `0.3.0` | approved | Boss (CEO) | `docs/specs/SPEC-Workspace-System.md` |
| Architecture | `TDD-POC-CANONICAL-LOOP` | `1.0.0` | approved | Boss / ATHER | `docs/architecture/TDD-POC-Canonical-Loop.md` |
| Architecture / Conformance | `C4-KNOWLEDGE-CONTEXT-AUTHORITY-OVERLAY` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/C4-Knowledge-Context-Authority-Overlay.md` |
| Architecture / Conformance | `C4-PROVIDER-ENTITLEMENT-EXECUTION-ROUTING-OVERLAY` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/C4-Provider-Entitlement-Execution-Routing-Overlay.md` |
| Architecture | `BLUEPRINT-TRANSLATOR-CORE-SLICE` | `0.1.0+draft` | draft | ARCHON / ATHER | `docs/architecture/BLUEPRINT-Translator-Core-Slice.md` |
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
| Runbook | `RUNBOOK-GOVIBE-FIRST-USE` | `0.1.3+draft` | draft | GoVibe | `docs/operations/runbooks/RUNBOOK-GoVibe-First-Use.md` |
| Runbook | `RUNBOOK-GOVIBE-MULTI-AGENT` | `0.2.0+draft` | draft | GoVibe | `docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md` |
| Runbook | `RUNBOOK-PERSISTENT-MEMORY-RUNTIME` | `0.2.0+draft` | draft | Boss (CEO) | `docs/operations/runbooks/RUNBOOK-Persistent-Memory-Runtime.md` |
| Handover | `GVDOC-1004` | `2.3.0+draft` | draft | THESEUS | `docs/handover/GVDOC-1004-Handover Specification.md` |
| SRS | `SRS-GOVIBE-TASK-SCOPED-CONTEXT-INJECTION` | `0.1.0` | approved | ARCHON / ATHER | `docs/srs/SRS-GoVibe-Task-Scoped-Context-Injection.md` |
| SRS | `SRS-GOVIBE-MCP-SERVER` | `0.2.1` | approved | GoVibe | `docs/srs/SRS-GoVibe-MCP-Server.md` |
| SRS | `SRS-OLLAMA-SIDECAR-EXECUTION` | `0.2.1` | approved | THESEUS | `docs/srs/SRS-Ollama-Sidecar-Execution.md` |
| SRS | `SRS-GKS-RETRIEVAL-LAYER` | `0.1.1+draft` | draft | Boss (CEO) | `docs/srs/SRS-GKS-Retrieval-Layer.md` |
| SRS | `SRS-GOVIBE-TRANSLATOR-CORE-SLICE` | `0.1.1+draft` | draft | Boss (CEO) | `docs/srs/SRS-GoVibe-Translator-Core-Slice.md` |
| SRS | `SRS-PERSISTENT-MEMORY-MSP-RUNTIME` | `0.1.0+draft` | draft | Boss (CEO) | `docs/srs/SRS-Persistent-Memory-MSP-Runtime.md` |
| Architecture | `SEQ-OLLAMA-SIDECAR-FLOW` | `0.1.2` | approved | THESEUS | `docs/architecture/SEQ-Ollama-Sidecar-Flow.md` |
| LLD | `LLD-GOVIBE-MCP-TOOLS` | `0.3.1` | approved | GoVibe | `docs/lld/LLD-GoVibe-MCP-Tools.md` |
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
| 0.3.43+draft | 2026-08-15 | OpenAI | Registered Issue #136 multi-tenant principal-scoped vault CR, ADR-028, and API-010; no document was promoted or owner-approved by this registry-only row. |
| 0.3.42+draft | 2026-08-14 | ATHER | Synchronized API-008/API-009, ADR-027, execution-routing SDD, entitlement evidence, usage policy, persistent-memory runbook, and their registry versions after the #109/#110/#111/#76 issue sweep. |
| 0.3.41+draft | 2026-08-09 | Claude Fable 5 | Ratification row, by explicit owner (Boss, ratification authority) instruction: SPEC-WORKSPACE-SYSTEM 0.2.4+draft → 0.3.0 approved and MASTERPLAN-GOVIBE-PRODUCTION-READINESS 0.1.15+draft → 0.2.0 approved. Evidence basis: PR #128 (merge c75e636) with the full baseline gate and CI green; spec AC-01..AC-08 pinned by the §12 suites. This row DOES change these two documents to approved, on owner authority. TASK-PRD-001 closes with this change per its exit criterion. |
| 0.3.40+draft | 2026-08-09 | Claude Fable 5 | Synchronized MASTERPLAN-GOVIBE-PRODUCTION-READINESS to 0.1.15+draft: SPR-PRD-06 / PHASE-PRD-06 closed to done on an owner-directed audit pass with recorded gate evidence and green PR #128 CI; Verification set to passed for TASK-PRD-013..017. No document status changed to approved/accepted/candidate by this row. |
