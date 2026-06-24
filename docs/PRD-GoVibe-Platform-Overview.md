---
title: "PRD: GoVibe Platform Overview"
doc_id: "PRD-GOVIBE-PLATFORM-OVERVIEW"
uid: "01KVXGFW2JXDF9EF05C0S1DMM2"
status: "draft"
version: "0.4.3+draft"
content_hash: "atom:b8b4d405f35546a6"
updated: "2026-06-23"
owner: "Rwang (Senior Dev)"
source_of_truth: true
related_adrs: ["ADR-015", "ADR-016", "ADR-017", "ADR-018", "ADR-019"]
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
**Updated:** 2026-06-20

## 1. Product Vision
GoVibe is the **governance + interoperability layer** for multi-agent software development — a rule-keeper and translator that lets developers' AI agent teams build to one shared, enforced, traceable standard, riding open protocols (MCP/A2A) instead of replacing the tools they already use. It reads **code** (the universal artifact) and decomposes it into GKS atoms (universal code-in, `ADR-019`), then translates between each team's own conventions through GKS as an internal pivot (`ADR-017`). It is **not** a coding agent, an orchestrator, or a database competitor. It leverages MemoryOS V3 (Native Runtime / GenesisBlockDB).

The platform is built around two operating loops:

- **Docs to Code:** approved human-readable SWE documents become the source for tasks, agent assignments, implementation context, review criteria, and verification.
- **Diagram to Doc:** architecture diagrams, flow diagrams, entity diagrams, site maps, and sequence diagrams can be transformed into structured documentation before implementation begins.

GoVibe keeps the visual identity of Mission Control, but the product center is governance + translation: enforced standards, provenance, knowledge retrieval, and delivery visibility across teams.

**Adoption is tiered (`ADR-016`):** the mandatory core is **GoVibe + MSP** (governance + memory passport, so provenance is never hollow). The **full eco** — GenesisBlockDB, the visual GKS UI (ERD / DAG / node graph), the `.agents` orchestrator, native-GKS rendering — is optional; partial adopters run the core over their own orchestration and lose only the full-eco features.

The platform uses three coordinated surfaces:

- `Mission Control UI` as the visual control plane
- `MCP Server` as the primary orchestration interface
- `GoVibe CLI` as a thin human/operator and automation surface

## 2. Product Positioning
GoVibe is a **governance + interop (translator) layer**, not a coding agent, orchestrator, memory, or database competitor. It sits above/across those tools and rides MCP/A2A. **Orchestration (via the `.agents` system) and the visual GKS/GenesisBlockDB UI are full-eco capabilities, not the positioning or moat** — the moat is governance + provenance + translation fidelity.

### 2.1 Goals
- Provide a single visual surface for CoDev project planning, execution, review, and progress tracking.
- Let agent-written PRD, SRD, SRS, SDD, LLD, API contracts, runbooks, and test plans drive UI state and implementation tasks.
- Let diagrams become first-class project inputs that can generate or update documentation.
- Coordinate multiple developer-owned agent teams without taking over third-party billing, subscriptions, or runtime quotas.
- Reduce developer frontier-model token/quota spend by routing bounded, atomic work to local SLMs while reserving frontier models for planning, review, and ambiguous work (`FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION`), keeping execution on-device for cost efficiency and data residency.
- Support RBAC for human users and ABAC for agents, subagents, MCP clients, and services.
- Extract internal knowledge atoms from approved SWE documents for AI context retrieval, graph linking, Mission Control visualization, and progress tracking via MemoryOS V3.
- Translate between teams' own doc/code conventions through the GKS pivot (N mappings, not N²) so heterogeneous swarms interoperate without migrating their docs (`ADR-017`).

### 2.2 Non-goals
- GoVibe does not own or manage your provider's billing or subscription (Claude Code, Gemini CLI, OpenClaw, Hermes, etc.) — it is designed to *reduce* that spend via hybrid-local execution, not to take it over.
- GoVibe does not replace third-party AI coding tools.
- GoVibe does not require human developers to write Genesis atoms directly.
- GoVibe does not make atom files the canonical source of truth when a human-readable SWE document exists.
- GoVibe does not build per-framework adapters or bridges (e.g. a LangGraph bridge); cross-team interop is via the GKS semantic pivot (N mappings, not N²).
- GoVibe does not position as an orchestrator, memory, or database product; those are full-eco capabilities or composed tools, not the market identity.

### 2.3 Collaboration Terminology
`CoDev` and `CoVibe` are narrow GoVibe collaboration terms that sit on top of the current platform system map.
Detailed module behavior is captured in:

- `docs/features/agent-team/FEAT-CoDev-Module.md`
- `docs/features/agent-team/FEAT-CoVibe-Module.md`

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
- The Execution Governance Standard classifies work by complexity (`C-0` to `C-3`) and context tier (`H0` to `H6`) before execution.
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

| System | Responsibility | Product Modules | Primary Inputs | Primary Outputs | Primary Consumers |
|---|---|---|---|---|---|
| `SYSTEM-01::Mission-Control-Experience-System` | Visual control plane for the human-facing GoVibe workspace. | `A1 Dashboard Shell`, `A2 Development Roadmap Board`, `A5 Agent Management`, `Command Reactor`, `Status/Telemetry Surface`, `Template-Parity View Contracts` | roadmap snapshots, agent registry, mission events, telemetry, verification evidence | rendered board state, command events, user decisions, UI evidence | human developer, product owner, agent operator |
| `SYSTEM-02::Project-Roadmap-Management-System` | Source-governed planning and board promotion for phases, sprints, tasks, and implementation packets. | `Master Plan Source`, `Roadmap Source`, `Backlog Source`, `Sprint/Task Container`, `Roadmap Promotion Gate`, `Roadmap Snapshot`, `Progress Calculation`, `Bi-Temporal Roadmap History` | PRD changes, approved master plans, backlog docs, task containers, change requests | board-eligible roadmap snapshot, task state, progress metrics, promotion evidence | LYRA, A2, ATHER, GHOST |
| `SYSTEM-03::Docs-to-Code-System` | Convert approved human SWE documents into bounded implementation context and symbol-linked tasks. | `Human SWE Document Ingestion`, `Spec-to-Task Extraction`, `Symbol Link Extraction`, `Task Packet Generation`, `Context Packet Assembly`, `Doc/Code Drift Detection` | PRD, FEAT, SRS, SDD, API, LLD, runbooks, protected source docs | task packets, context containers, symbol links, drift findings | THESEUS, system parent agents, module workers |
| `SYSTEM-04::Diagram-to-Doc-System` | Convert diagrams and visual architecture references into reviewable system documentation. | `Architecture Diagram Intake`, `Flow/Sequence Intake`, `ERD/Site Map Intake`, `Diagram Normalization`, `Generated Doc Draft`, `Human Review Gate` | screenshots, Figma/HTML prototypes, ERDs, sequence diagrams, site maps | candidate docs, diagram-derived context, architecture review prompts | architect, doc writer, system parent agents |
| `SYSTEM-05::Agent-Team-Management-System` | Coordinate agent identity, role metadata, team handoff, and CoDev/CoVibe collaboration modes. | `Role Registry`, `System Parent Agent Routing`, `Module Worker Dispatch`, `Visual Agent Fleet Metadata`, `Handoff State`, `CoDev Mode`, `CoVibe Mode`, `CoDev Module`, `CoVibe Module`, `Bounded Support Executor Contract` | agent registry, role contracts, task packets, context containers, handoff events | assignments, handoff state, executor constraints, role visibility | LYRA, ARCHON, THESEUS, ATHER, GHOST, VIBE, KIN |
| `SYSTEM-06::Integration-Bridge-System` | Bridge GoVibe with MCP, CLI, local sidecars, external agent CLIs, webhooks, and future service gateways. | `MCP Server`, `GoVibe CLI`, `Webhook/File Bridge`, `External Agent Connector`, `Gemini CLI Bounded Executor`, `Ollama/Local Sidecar`, `Mission Event Gateway` | governed tool calls, CLI commands, context packets, external executor output | mission events, tool results, execution logs, external feedback packets | external tools, lead agent, system parent agents |
| `SYSTEM-07::Governance-Access-Control-System` | Enforce human and agent access rules before governed reads, writes, assignments, and tool calls. | `Human RBAC`, `Agent ABAC`, `Policy Decision Point`, `Policy Enforcement Point`, `Tenant/Vault Boundary`, `Approval Owner Rules`, `Permission Evidence` | subject, resource, action, context, tenant/vault metadata, approval rules | permit/deny decisions, obligations, approval routing, audit evidence | human owner, auditor, integration bridge |
| `SYSTEM-08::Genesis-Knowledge-HCS-System` | Knowledge substrate for atoms, symbol graph, retrieval, compaction, and MemoryOS/GenesisBlock context delivery. | `GenesisBlockDB`, `Knowledge Atom Registry`, `Hector/H-Tier Compaction`, `HNSW/Vector Retrieval`, `Hybrid JIT Context Renderer`, `Symbol Graph`, `Knowledge Taxonomy`, `MemoryOS V3 Adapter` | approved docs, atoms, code symbols, embeddings, graph edges, context requests | retrieved context, atom graph, symbol communities, compressed context packets | docs-to-code, agents, Mission Control knowledge views |
| `SYSTEM-09::Traceability-Audit-Verification-System` | Prove that requirements, docs, code, tasks, execution, and verification stay traceable. | `Document Version Registry`, `Change Request Ledger`, `RCA Ledger`, `Diff Check`, `Source-to-Code Trace`, `Verification Evidence`, `Audit Report`, `Promotion Certification` | doc registry, diffs, task state, test results, RCA/CR records, source refs | audit verdicts, drift reports, certification evidence, blocked-work reasons | ATHER, GHOST, release owner |
| `SYSTEM-10::Execution-Governance-System` | Define complexity, context, fan-out, gates, and closure rules for governed execution. | `C-Level Complexity Classification`, `H0-H6 Context Tiering`, `W-Scale Fan-Out Control`, `Task/Packet State Machine`, `Review Gate`, `QA Gate`, `Closure Criteria`, `Runtime Guardrail Policy` | work request, complexity inputs, scope boundaries, agent capacity, approval state | execution policy, task lifecycle state, gate decisions, DoD closure state | all system agents and reviewer agents |

### 5.2 System Detail Registry

Each system must eventually have a canonical document set. Missing documents are allowed during MVP discovery, but the missing document must be visible as a gap rather than inferred from UI or code.

| System | Canonical Feature Folder | Required Detail Docs | Current MVP Detail Status |
|---|---|---|---|
| `SYSTEM-01` | `docs/features/mission-control/` | FEAT, SDD or design spec, UI verification plan | partial; UI migration and design docs exist, template parity still needs tighter contract |
| `SYSTEM-02` | `docs/features/project-roadmap/` | FEAT, roadmap promotion contract, task-container contract, parser/export contract | active; document-driven source and promotion contract exist |
| `SYSTEM-03` | `docs/features/docs-to-code/` | FEAT, extraction contract, context-container contract, drift-check plan | partial; extraction direction exists, context packet contract needs consolidation |
| `SYSTEM-04` | `docs/features/diagram-to-doc/` | FEAT, diagram intake schema, review gate, generated-doc template | early; feature exists but implementation detail remains thin |
| `SYSTEM-05` | `docs/features/agent-team/` | FEAT, role registry contract, handoff contract, Visual Agent Fleet context | active; multi-agent workflow and role taxonomy docs exist |
| `SYSTEM-06` | `docs/features/integration-bridge/` | FEAT, MCP/API contract, CLI contract, external executor runbook | active; MCP bridge and bounded executor docs exist |
| `SYSTEM-07` | `docs/features/governance-access/` | FEAT, policy model, RBAC/ABAC decision contract, denial evidence format | partial; governance feature exists, PDP/PEP detail should be derived from inbound UCF/ABAC sources |
| `SYSTEM-08` | `docs/features/genesis-knowledge-system/` | FEAT, knowledge atom contract, retrieval contract, symbol graph contract, HCS/JIT design | partial; HCS/JIT docs exist, MSP v3/UCF source packets need derived GoVibe design |
| `SYSTEM-09` | `docs/features/traceability-audit/` | FEAT, doc version registry, diff-check contract, RCA/CR ledger contract | active; document version governance and traceability docs exist |
| `SYSTEM-10` | `docs/features/execution-governance/` | FEAT, C/H/W classification, task state machine, gate policy, closure criteria | active; standard exists, enforcement needs broader validator coverage |

### 5.3 Cross-System Dependency Map

System dependencies must be explicit so a change request can identify affected systems before implementation starts.

| Source System | Depends On | Dependency Reason |
|---|---|---|
| `SYSTEM-01` | `SYSTEM-02`, `SYSTEM-05`, `SYSTEM-06`, `SYSTEM-09` | Mission Control renders roadmap state, agent state, command/tool events, and audit evidence. |
| `SYSTEM-02` | `SYSTEM-03`, `SYSTEM-09`, `SYSTEM-10` | Roadmap promotion relies on parsed docs, traceability, and execution gate status. |
| `SYSTEM-03` | `SYSTEM-08`, `SYSTEM-09`, `SYSTEM-10` | Docs-to-code needs knowledge retrieval, symbol links, traceability, and bounded task packets. |
| `SYSTEM-04` | `SYSTEM-03`, `SYSTEM-08`, `SYSTEM-09` | Diagram-derived docs become docs-to-code inputs and need knowledge/audit provenance. |
| `SYSTEM-05` | `SYSTEM-06`, `SYSTEM-07`, `SYSTEM-10` | Agent routing requires integration surfaces, access decisions, and execution governance. |
| `SYSTEM-06` | `SYSTEM-05`, `SYSTEM-07`, `SYSTEM-09` | External tool calls need agent identity, authorization, and event/audit capture. |
| `SYSTEM-07` | `SYSTEM-05`, `SYSTEM-08`, `SYSTEM-09` | Policy decisions need subject identity, resource metadata, and auditable evidence. |
| `SYSTEM-08` | `SYSTEM-03`, `SYSTEM-07`, `SYSTEM-09` | Knowledge retrieval is populated by docs-to-code, filtered by policy, and audited by traceability. |
| `SYSTEM-09` | all systems | Audit must trace source, decision, artifact, and verification across every governed system. |
| `SYSTEM-10` | `SYSTEM-02`, `SYSTEM-05`, `SYSTEM-07`, `SYSTEM-09` | Execution gates depend on work scope, agent routing, access policy, and evidence state. |

### 5.4 System-Based Execution And Role-Based Review

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

### 5.5 System Change Routing Rule

Every non-trivial change request must name:

- primary impacted system
- supporting impacted systems
- affected product modules
- source-of-truth document path
- execution owner or system parent
- role reviewers and approval owner
- verification evidence expected before close-out

If a change affects more than one system and lacks this routing, `LYRA` must hold the work in planning state until the missing routing is supplied.

### 5.6 Module Detail Rule

The PRD module map is intentionally high level. A module becomes implementation-ready only when its owning system document defines:

- source-of-truth document path
- owner and reviewer roles
- accepted inputs and outputs
- state model or event contract
- symbol links to docs, code, tests, and evidence
- acceptance criteria, success criteria, and definition of done

*(Remaining sections preserved...)*

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.4.2+draft | 2026-06-22 | Rwang (Senior Dev) | Repositioned §1/§2 to the governance + interop (translator) identity per ADR-016/017/019: code-in→GKS pivot, no per-framework adapters, tiered adoption (GoVibe+MSP core mandatory; full eco optional), orchestration/visual UI = full-eco capability not moat. |
| 0.4.1+draft | 2026-06-20 | Rwang (Senior Dev) | Frontmatter/title normalization and context-tier range reconciliation. |
| 0.4.0 | 2026-06-16 | Rwang (Senior Dev) | Expanded the Platform System Map with system responsibilities, inputs, outputs, detail-doc registry, dependencies, and change-routing rules. |
| 0.3.0 | 2026-06-16 | Rwang (Senior Dev) | Expanded the Platform System Map with product-level modules, system-based execution routing, and role-based review ownership. |
| 0.2.1 | 2026-06-17 | Rwang (Senior Dev) | Added module-level CoDev and CoVibe references under the existing Agent-Team Management system without changing the top-level system map. |
| 0.2.0 | 2026-06-16 | Rwang (Senior Dev) | Added the narrow CoDev and CoVibe terminology subsection under product positioning without changing the current system map. |
| 0.1.0 | 2026-06-15 | Rwang (Senior Dev) | Added canonical doc_id metadata to align the PRD with the document versioning governance standard. |
