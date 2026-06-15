---
doc_id: "PRD-GOVIBE-PLATFORM-OVERVIEW"
status: "draft"
version: "0.3.0+draft"
updated: "2026-06-16"
owner: "Rwang (Senior Dev)"
source_of_truth: true
block_manifest:
  core:
    id: "[[DOC::PRD_PLATFORM_OVERVIEW]]"
    block_id: "[[GKS::GENESIS_BLOCK_V3]]"
    context_scaling_tier: "H4"
---

# PRD: GoVibe Platform Overview

**Status:** `DRAFT`
**Author:** Rwang (Senior Dev)
**Date:** 2026-06-06
**Updated:** 2026-06-16

## 1. Product Vision
GoVibe is an AI-native visual CoDev and project management platform for coordinating human developers, their agent teams, project documents, roadmap progress, artifacts, and third-party AI coding tools through API and MCP integrations, leveraging MemoryOS V3 (Native Runtime / GenesisBlockDB).

The platform is built around two operating loops:

- **Docs to Code:** approved human-readable SWE documents become the source for tasks, agent assignments, implementation context, review criteria, and verification.
- **Diagram to Doc:** architecture diagrams, flow diagrams, entity diagrams, site maps, and sequence diagrams can be transformed into structured documentation before implementation begins.

GoVibe keeps the visual identity of Mission Control, but the product center is project coordination: progress tracking, agent team management, access control, knowledge retrieval, and delivery visibility.

The platform uses three coordinated surfaces:

- `Mission Control UI` as the visual control plane
- `MCP Server` as the primary orchestration interface
- `GoVibe CLI` as a thin human/operator and automation surface

## 2. Product Positioning
GoVibe is a coordination layer, not a replacement for external coding agents.

### 2.1 Goals
- Provide a single visual surface for CoDev project planning, execution, review, and progress tracking.
- Let agent-written PRD, SRD, SRS, SDD, LLD, API contracts, runbooks, and test plans drive UI state and implementation tasks.
- Let diagrams become first-class project inputs that can generate or update documentation.
- Coordinate multiple developer-owned agent teams without taking over third-party billing, subscriptions, or runtime quotas.
- Support RBAC for human users and ABAC for agents, subagents, MCP clients, and services.
- Extract internal knowledge atoms from approved SWE documents for AI context retrieval, graph linking, Mission Control visualization, and progress tracking via MemoryOS V3.

### 2.2 Non-goals
- GoVibe does not manage Claude Code, Gemini CLI, OpenClaw, Hermes, or similar provider billing.
- GoVibe does not replace third-party AI coding tools.
- GoVibe does not require human developers to write Genesis atoms directly.
- GoVibe does not make atom files the canonical source of truth when a human-readable SWE document exists.

### 2.3 Collaboration Terminology
`CoDev` and `CoVibe` are narrow GoVibe collaboration terms that sit on top of the current platform system map.

- `CoDev` means the inter-owner or inter-team coordination mode where multiple human-owned delivery parties and their agent teams collaborate through GoVibe.
- `CoVibe` means the intra-owner orchestration mode where one primary owner or lead agent coordinates bounded support agents or bounded external executors.
- Both terms are terminology layers over `SYSTEM-05::Agent-Team-Management-System` with supporting bridge behavior through `SYSTEM-06::Integration-Bridge-System`.
- This terminology refinement does not add a new top-level PRD system, does not replace `MCP`, and does not change C4 scope in this phase.

## 3. Target Audience
- **Human Developers:** Working with personal or team AI agents during normal software delivery.
- **Tech Leads and Architects:** Managing multiple agent-assisted workstreams, access boundaries, technical decisions, and delivery risk.
- **Product and Project Owners:** Tracking roadmap state, blockers, ownership, artifacts, and release progress.
- **AI Agent Operators:** Connecting Claude Code, Gemini CLI, OpenClaw, Hermes, MCP servers, local bridges, and other automation surfaces.

## 4. Key Features
### 4.1 Mission Control Center
- Real-time project, agent, task, artifact, and system status.
- Visual domain navigation for Project Overview, Genesis Knowledge, Block DB, and AI Benchmark.
- Floating terminal for direct command interaction and operational feedback.

### 4.2 Docs to Code Workflow
- Human-first SWE documents remain the canonical planning and design surface.
- PRD, SRD, SDD, LLD, API Contract, Runbook, and Test Plan documents can drive task generation and agent assignments.
- Roadmap and task progress can be rendered from approved Markdown or HTML documents instead of hardcoded UI data.
- Review status, implementation status, blockers, and test evidence can be tracked against document sections.

### 4.3 Diagram to Doc Workflow
- Architecture diagrams, sequence diagrams, flow diagrams, ERDs, and site maps can become structured documentation.
- Generated documentation must be reviewed before it becomes canonical.
- Diagram-derived docs can feed the same Docs to Code pipeline as manually written docs.

### 4.4 Agent Team Management
- Agent roster, agent team assignment, capability metadata, and current work state.
- Agent media and status panels for operator confidence.
- Visual Agent Fleet governance maps agent identity to fleet role, job-title equivalent, domain, cluster, responsibility, authority boundary, source refs, and scope status.
- Protected human-dev workflow material is used as upstream context only; derived agent context must preserve source refs and must not mutate the protected source.
- Scope expansion is routed through change-control impact assessment before LYRA accepts it into a plan.
- External agent integration through API, MCP, webhook, local bridge, or file-based workflows.

### 4.5 Governance and Access Control
- RBAC governs human user access.
- ABAC governs agents, subagents, MCP clients, services, and scheduled jobs.
- Policy decisions should be auditable and traceable to project, task, resource, action, and context.

### 4.6 Genesis Knowledge and GenesisBlock DB (MemoryOS V3)
- Human-readable SWE documents are transformed into internal knowledge atoms only after authoring.
- Atoms such as `CONCEPT`, `MOD`, `FEAT`, `FLOW`, `ALGO`, `ENTITY`, `GUARD`, `API`, and `MCP` are derived knowledge artifacts stored in MemoryOS V3.
- The knowledge layer supports graph retrieval, context compaction, symbol linking, and Mission Control visualization.
- Hybrid Just-In-Time Context Rendering loads the minimum useful document, atom, and graph context for each agent task from the Native Runtime.

### 4.7 Execution Governance and Multi-Agent Operations
- The Execution Governance Standard classifies work by complexity (`C-0` to `C-3`) and context tier (`H0` to `H5`) before execution.
- Multi-agent operations define team roles, plan approval, task claiming, file locking, PR handoff, review, and conflict resolution.
- Complex work must preserve traceability from source document to task, agent assignment, artifact, review, and verification evidence.

### 4.8 Orchestration Interfaces
- MCP is the primary orchestration interface for governed tools, resources, state mutation, and agent execution.
- Mission Control consumes orchestration capabilities as a visual control plane and should not own business rules for execution policy or roadmap mutation.
- GoVibe CLI is a thin operator and automation surface over the same orchestration rules.

## 5. Platform System Map
GoVibe is composed of ten product systems. Each system may have its own SRS, SRD, SDD, LLD, API Contract, Runbook, or Test Plan when implementation detail is required.

```text
PRD::GoVibe-Platform
+-- SYSTEM-01::Mission-Control-Experience-System
+-- SYSTEM-02::Project-Roadmap-Management-System
+-- SYSTEM-03::Docs-to-Code-System
+-- SYSTEM-04::Diagram-to-Doc-System
+-- SYSTEM-05::Agent-Team-Management-System
+-- SYSTEM-06::Integration-Bridge-System
+-- SYSTEM-07::Governance-Access-Control-System
+-- SYSTEM-08::Genesis-Knowledge-HCS-System
+-- SYSTEM-09::Traceability-Audit-Verification-System
+-- SYSTEM-10::Execution-Governance-System
```

### 5.1 System Module Map

This map defines product-level modules only. Detailed implementation ownership, schemas, and runtime contracts belong in each system's FEAT, SRS, SDD, API, LLD, or RUNBOOK documents.

| System | Product Modules | Primary Consumers |
|---|---|---|
| `SYSTEM-01::Mission-Control-Experience-System` | `A1 Dashboard Shell`, `A2 Development Roadmap Board`, `A5 Agent Management`, `Command Reactor`, `Status/Telemetry Surface`, `Template-Parity View Contracts` | human developer, product owner, agent operator |
| `SYSTEM-02::Project-Roadmap-Management-System` | `Master Plan Source`, `Roadmap Source`, `Backlog Source`, `Sprint/Task Container`, `Roadmap Promotion Gate`, `Roadmap Snapshot`, `Progress Calculation`, `Bi-Temporal Roadmap History` | LYRA, A2, ATHER, GHOST |
| `SYSTEM-03::Docs-to-Code-System` | `Human SWE Document Ingestion`, `Spec-to-Task Extraction`, `Symbol Link Extraction`, `Task Packet Generation`, `Context Packet Assembly`, `Doc/Code Drift Detection` | THESEUS, system parent agents, module workers |
| `SYSTEM-04::Diagram-to-Doc-System` | `Architecture Diagram Intake`, `Flow/Sequence Intake`, `ERD/Site Map Intake`, `Diagram Normalization`, `Generated Doc Draft`, `Human Review Gate` | architect, doc writer, system parent agents |
| `SYSTEM-05::Agent-Team-Management-System` | `Role Registry`, `System Parent Agent Routing`, `Module Worker Dispatch`, `Visual Agent Fleet Metadata`, `Handoff State`, `CoDev Mode`, `CoVibe Mode`, `Bounded Support Executor Contract` | LYRA, ARCHON, THESEUS, ATHER, GHOST, VIBE, KIN |
| `SYSTEM-06::Integration-Bridge-System` | `MCP Server`, `GoVibe CLI`, `Webhook/File Bridge`, `External Agent Connector`, `Gemini CLI Bounded Executor`, `Ollama/Local Sidecar`, `Mission Event Gateway` | external tools, lead agent, system parent agents |
| `SYSTEM-07::Governance-Access-Control-System` | `Human RBAC`, `Agent ABAC`, `Policy Decision Point`, `Policy Enforcement Point`, `Tenant/Vault Boundary`, `Approval Owner Rules`, `Permission Evidence` | human owner, auditor, integration bridge |
| `SYSTEM-08::Genesis-Knowledge-HCS-System` | `GenesisBlockDB`, `Knowledge Atom Registry`, `Hector/H-Tier Compaction`, `HNSW/Vector Retrieval`, `Hybrid JIT Context Renderer`, `Symbol Graph`, `Knowledge Taxonomy`, `MemoryOS V3 Adapter` | docs-to-code, agents, Mission Control knowledge views |
| `SYSTEM-09::Traceability-Audit-Verification-System` | `Document Version Registry`, `Change Request Ledger`, `RCA Ledger`, `Diff Check`, `Source-to-Code Trace`, `Verification Evidence`, `Audit Report`, `Promotion Certification` | ATHER, GHOST, release owner |
| `SYSTEM-10::Execution-Governance-System` | `C-Level Complexity Classification`, `H0-H6 Context Tiering`, `W-Scale Fan-Out Control`, `Task/Packet State Machine`, `Review Gate`, `QA Gate`, `Closure Criteria`, `Runtime Guardrail Policy` | all system agents and reviewer agents |

### 5.2 System-Based Execution And Role-Based Review

GoVibe uses systems as the primary execution routing structure and roles as the review/governance layer.

```text
PRD change or approved request
  -> impacted SYSTEM parent
  -> module worker or bounded support executor
  -> role reviewer gate
  -> verification and audit evidence
  -> approved board/runtime state
```

Execution ownership:

- System parent agents own execution routing inside their system boundary.
- Module workers own bounded implementation or analysis packets.
- External support executors are bounded by context packets and never become final approvers.

Review ownership:

- `LYRA` reviews planning completeness, sequencing, and scope routing.
- `ARCHON` reviews architecture and cross-system trade-offs.
- `THESEUS` reviews documentation structure and source-of-truth hygiene.
- `ATHER` reviews governance, auditability, and promotion readiness.
- `GHOST` reviews QA evidence, UI behavior, and regression risk.

### 5.3 Module Detail Rule

The PRD module map is intentionally high level. A module becomes implementation-ready only when its owning system document defines:

- source-of-truth document path
- owner and reviewer roles
- accepted inputs and outputs
- state model or event contract
- symbol links to docs, code, tests, and evidence
- acceptance criteria, success criteria, and definition of done

*(Remaining sections preserved...)*

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.3.0 | 2026-06-16 | Expanded the Platform System Map with product-level modules, system-based execution routing, and role-based review ownership. |
| 0.2.0 | 2026-06-16 | Added the narrow CoDev and CoVibe terminology subsection under product positioning without changing the current system map. |
| 0.1.0 | 2026-06-15 | Added canonical doc_id metadata to align the PRD with the document versioning governance standard. |
