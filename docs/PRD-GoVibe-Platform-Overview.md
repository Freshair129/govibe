---
doc_id: "PRD-GOVIBE-PLATFORM-OVERVIEW"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-15"
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
**Updated:** 2026-06-14

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

*(Remaining sections preserved...)*

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.0 | 2026-06-15 | Added canonical doc_id metadata to align the PRD with the document versioning governance standard. |
