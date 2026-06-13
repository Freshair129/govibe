# PRD: GoVibe Platform Overview

**Status:** `DRAFT`
**Author:** Rwang (Senior Dev)
**Date:** 2026-06-06
**Updated:** 2026-06-12

## 1. Product Vision
GoVibe is an AI-native visual CoDev and project management platform for coordinating human developers, their agent teams, project documents, roadmap progress, artifacts, and third-party AI coding tools through API and MCP integrations.

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
- Extract internal knowledge atoms from approved SWE documents for AI context retrieval, graph linking, Mission Control visualization, and progress tracking.

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
- External agent integration through API, MCP, webhook, local bridge, or file-based workflows.

### 4.5 Governance and Access Control
- RBAC governs human user access.
- ABAC governs agents, subagents, MCP clients, services, and scheduled jobs.
- Policy decisions should be auditable and traceable to project, task, resource, action, and context.

### 4.6 Genesis Knowledge and GenesisBlock DB
- Human-readable SWE documents are transformed into internal knowledge atoms only after authoring.
- Atoms such as `CONCEPT`, `MOD`, `FEAT`, `FLOW`, `ALGO`, `ENTITY`, `GUARD`, `API`, and `MCP` are derived knowledge artifacts.
- The knowledge layer supports graph retrieval, context compaction, symbol linking, and Mission Control visualization.
- Hybrid Just-In-Time Context Rendering loads the minimum useful document, atom, and graph context for each agent task.

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

### 5.1 Mission Control Experience System
- **Dashboard Shell:** top navigation, sidebar, domain router, theme controller, footer status.
- **Mission Control Views:** Project Overview, Genesis Knowledge, Block DB, AI Benchmark.
- **Command Terminal:** terminal session, command input, log renderer, runtime bridge adapter.

### 5.2 Project Roadmap Management System
- **Roadmap Board:** phase renderer, sprint renderer, task cards, progress calculator.
- **Task Assignment:** owner selector, agent assignee selector, status transition, blocker marker.
- **Artifact Tracker:** artifact linker, review status, evidence attachment.

### 5.3 Docs to Code System
- **Document Source Loader:** Markdown loader, HTML loader, frontmatter parser, document version resolver.
- **Requirement Extractor:** section parser, acceptance criteria extractor, task candidate extractor, risk hint extractor.
- **Task Generator:** requirement-to-task mapper, dependency resolver, assignment suggestion, verification mapper.
- **Code Context Packager:** source document citation, context bundle builder, agent prompt context builder.

### 5.4 Diagram to Doc System
- **Diagram Ingestion:** Mermaid, C4, ERD, flow, site map, and dependency graph parsers.
- **Diagram Semantic Extractor:** node classifier, edge classifier, boundary detector, dependency extractor.
- **Document Draft Generator:** PRD, SRD, SDD, LLD, API Contract, and Runbook draft sections with human review gate.

### 5.5 Agent Team Management System
- **Agent Roster:** agent profile, capability matrix, status, media profile.
- **Agent Team Orchestration:** team boundary, assignment queue, workload state, handoff state.
- **Agent Workspace:** prompt config, tool permission view, runtime status, output artifacts.

### 5.6 Integration Bridge System
- **External Agent Adapters:** Claude Code, Gemini CLI, OpenClaw, Hermes, and future coding-agent adapters.
- **MCP Server / Bridge:** tool registry, resource registry, permission mapper, invocation logger, orchestration contract.
- **Webhook/API/Local Bridge:** webhook receiver, event normalizer, command dispatcher, local bridge connector.

### 5.7 Governance Access Control System
- **User RBAC:** user role, permission set, project membership, role policy evaluator.
- **Agent ABAC:** subject attributes, resource attributes, action context, policy decision point.
- **Policy Enforcement:** policy enforcement point, obligation handler, deny reason renderer, policy audit logger.

### 5.8 Genesis Knowledge System
- **Hierarchy Compaction System:** H-level classifier, context scope resolver, graph hop resolver, compaction engine, context budget planner.
- **Hybrid JIT Context System:** Markdown source resolver, in-memory graph builder, hop-bounded context query, virtual document renderer, context overwrite guard.
- **Atom Extraction System:** concept, feature, module, flow, algorithm, entity, guard, API, and MCP extractors.
- **Knowledge Graph:** node registry, edge registry, symbol linker, document backlink index, graph query engine.
- **GenesisBlockDB:** block store, version index,In-memory embedding index, retrieval ranker.

### 5.9 Traceability Audit Verification System
- **Traceability Index:** document section link, task link, agent assignment link, artifact link, verification evidence link.
- **Audit Trail:** user action log, agent action log, policy decision log, artifact change log.
- **Verification Matrix:** acceptance criteria check, test plan mapper, regression check, release readiness status.

### 5.10 Execution Governance System
- **Complexity-Based Execution:** task complexity classifier, C0-C3 workflow selector, H-scale mapper, required artifact resolver, verification requirement resolver.
- **Doc-First Gate:** Docs to Code gate, Diagram to Doc gate, human approval gate, canonical source checker.
- **Multi-Agent Operating Runbook:** coordination layers, role matrix, plan approval, branch/PR review flow, shared task list, file locking, conflict resolution.
- **Agent Execution Policy:** assumption reporter, scope boundary checker, risk classifier, definition-of-done checker.

### 5.11 Platform Product AST
This AST is the product-level decomposition of GoVibe. It is self-contained enough to show the platform shape, but implementation details remain in SRS, SDD, LLD, API Contract, Runbook, and Test Plan documents.

```text
PRD::GoVibe-Platform
+-- META
|   +-- ProductVision
|   +-- ProductPositioning
|   +-- TargetAudience
|   +-- Goals
|   +-- NonGoals
|   +-- SuccessMetrics
|
+-- OPERATING-LOOP::Docs-to-Code
|   +-- HumanFirstSWEDocs
|   +-- RequirementExtraction
|   +-- TaskGeneration
|   +-- AgentAssignment
|   +-- ImplementationContext
|   +-- ReviewCriteria
|   +-- VerificationEvidence
|
+-- OPERATING-LOOP::Diagram-to-Doc
|   +-- DiagramIngestion
|   +-- SemanticExtraction
|   +-- DocumentDraftGeneration
|   +-- HumanReviewGate
|   +-- ApprovedDocumentPromotion
|
+-- SYSTEM-01::Mission-Control-Experience-System
|   +-- MODULE::Dashboard-Shell
|   |   +-- TopNavigation
|   |   +-- SidebarNavigation
|   |   +-- DomainRouter
|   |   +-- ThemeController
|   |   +-- FooterStatusBar
|   +-- MODULE::Mission-Control-Views
|   |   +-- ProjectOverviewView
|   |   +-- GenesisKnowledgeView
|   |   +-- GenesisBlockDBView
|   |   +-- AIBenchmarkView
|   +-- MODULE::Command-Terminal
|       +-- TerminalSession
|       +-- CommandInput
|       +-- LogRenderer
|       +-- RuntimeBridgeAdapter
|
+-- SYSTEM-02::Project-Roadmap-Management-System
|   +-- MODULE::Roadmap-Board
|   |   +-- PhaseRenderer
|   |   +-- SprintRenderer
|   |   +-- TaskCard
|   |   +-- ProgressCalculator
|   +-- MODULE::Task-Assignment
|   |   +-- OwnerSelector
|   |   +-- AgentAssigneeSelector
|   |   +-- StatusTransition
|   |   +-- BlockerMarker
|   +-- MODULE::Artifact-Tracker
|       +-- ArtifactLinker
|       +-- ReviewStatus
|       +-- EvidenceAttachment
|
+-- SYSTEM-03::Docs-to-Code-System
|   +-- MODULE::Document-Source-Loader
|   |   +-- MarkdownLoader
|   |   +-- HTMLLoader
|   |   +-- FrontmatterParser
|   |   +-- DocumentVersionResolver
|   +-- MODULE::Requirement-Extractor
|   |   +-- SectionParser
|   |   +-- AcceptanceCriteriaExtractor
|   |   +-- TaskCandidateExtractor
|   |   +-- RiskHintExtractor
|   +-- MODULE::Task-Generator
|   |   +-- RequirementToTaskMapper
|   |   +-- TaskDependencyResolver
|   |   +-- AgentAssignmentSuggestion
|   |   +-- VerificationRequirementMapper
|   +-- MODULE::Code-Context-Packager
|       +-- SourceDocCitation
|       +-- ContextBundleBuilder
|       +-- AgentPromptContextBuilder
|
+-- SYSTEM-04::Diagram-to-Doc-System
|   +-- MODULE::Diagram-Ingestion
|   |   +-- MermaidParser
|   |   +-- C4DiagramParser
|   |   +-- ERDParser
|   |   +-- FlowDiagramParser
|   +-- MODULE::Diagram-Semantic-Extractor
|   |   +-- NodeClassifier
|   |   +-- EdgeClassifier
|   |   +-- BoundaryDetector
|   |   +-- DependencyExtractor
|   +-- MODULE::Doc-Draft-Generator
|       +-- PRDSectionDraft
|       +-- SRSSectionDraft
|       +-- SDDSectionDraft
|       +-- APIContractDraft
|       +-- HumanReviewGate
|
+-- SYSTEM-05::Agent-Team-Management-System
|   +-- MODULE::Agent-Roster
|   |   +-- AgentProfile
|   |   +-- CapabilityMatrix
|   |   +-- AgentStatus
|   |   +-- AgentMediaProfile
|   +-- MODULE::Agent-Team-Orchestration
|   |   +-- TeamBoundary
|   |   +-- AssignmentQueue
|   |   +-- WorkloadState
|   |   +-- HandoffState
|   +-- MODULE::Agent-Workspace
|       +-- AgentPromptConfig
|       +-- ToolPermissionView
|       +-- RuntimeStatusView
|       +-- OutputArtifactView
|
+-- SYSTEM-06::Integration-Bridge-System
|   +-- MODULE::External-Agent-Adapters
|   |   +-- ClaudeCodeAdapter
|   |   +-- GeminiCLIAdapter
|   |   +-- OpenClawAdapter
|   |   +-- HermesAdapter
|   +-- MODULE::MCP-Bridge
|   |   +-- MCPToolRegistry
|   |   +-- MCPResourceRegistry
|   |   +-- MCPPermissionMapper
|   |   +-- MCPInvocationLogger
|   +-- MODULE::Webhook-API-Local-Bridge
|       +-- WebhookReceiver
|       +-- EventNormalizer
|       +-- APICommandDispatcher
|       +-- LocalBridgeConnector
|
+-- SYSTEM-07::Governance-Access-Control-System
|   +-- MODULE::User-RBAC
|   |   +-- UserRole
|   |   +-- PermissionSet
|   |   +-- ProjectMembership
|   |   +-- RolePolicyEvaluator
|   +-- MODULE::Agent-ABAC
|   |   +-- SubjectAttributeBag
|   |   +-- ResourceAttributeBag
|   |   +-- ActionContext
|   |   +-- PolicyDecisionPoint
|   +-- MODULE::Policy-Enforcement
|       +-- PolicyEnforcementPoint
|       +-- ObligationHandler
|       +-- DenyReasonRenderer
|       +-- PolicyAuditLogger
|
+-- SYSTEM-08::Genesis-Knowledge-System
|   +-- MODULE::Hierarchy-Compaction-System
|   |   +-- HLevelClassifier
|   |   +-- ContextScopeResolver
|   |   +-- GraphHopResolver
|   |   +-- CompactionEngine
|   |   +-- ContextBudgetPlanner
|   +-- MODULE::Hybrid-JIT-Context-System
|   |   +-- MarkdownSourceResolver
|   |   +-- InMemoryGraphBuilder
|   |   +-- HopBoundedContextQuery
|   |   +-- VirtualDocumentRenderer
|   |   +-- ContextOverwriteGuard
|   +-- MODULE::Atom-Extraction-System
|   |   +-- ConceptExtractor
|   |   +-- FeatureExtractor
|   |   +-- ModuleExtractor
|   |   +-- FlowExtractor
|   |   +-- AlgorithmExtractor
|   |   +-- EntityExtractor
|   |   +-- GuardExtractor
|   |   +-- MCPExtractor
|   +-- MODULE::Knowledge-Graph
|   |   +-- NodeRegistry
|   |   +-- EdgeRegistry
|   |   +-- SymbolLinker
|   |   +-- DocumentBacklinkIndex
|   |   +-- GraphQueryEngine
|   +-- MODULE::GenesisBlock-DB
|       +-- BlockStore
|       +-- VersionIndex
|       +-- EmbeddingIndex
|       +-- RetrievalRanker
|
+-- SYSTEM-09::Traceability-Audit-Verification-System
|   +-- MODULE::Traceability-Index
|   |   +-- DocSectionLink
|   |   +-- TaskLink
|   |   +-- AgentAssignmentLink
|   |   +-- ArtifactLink
|   |   +-- VerificationEvidenceLink
|   +-- MODULE::Audit-Trail
|   |   +-- UserActionLog
|   |   +-- AgentActionLog
|   |   +-- PolicyDecisionLog
|   |   +-- ArtifactChangeLog
|   +-- MODULE::Verification-Matrix
|       +-- AcceptanceCriteriaCheck
|       +-- TestPlanMapper
|       +-- RegressionCheck
|       +-- ReleaseReadinessStatus
|
+-- SYSTEM-10::Execution-Governance-System
    +-- MODULE::Complexity-Based-Execution
    |   +-- TaskComplexityClassifier
    |   +-- C0C3WorkflowSelector
    |   +-- HScaleMapper
    |   +-- RequiredArtifactResolver
    |   +-- VerificationRequirementResolver
    +-- MODULE::Doc-First-Gate
    |   +-- DocsToCodeGate
    |   +-- DiagramToDocGate
    |   +-- HumanApprovalGate
    |   +-- CanonicalSourceChecker
    +-- MODULE::Multi-Agent-Operating-Runbook
    |   +-- CoordinationLayerPolicy
    |   +-- RoleMatrix
    |   +-- PlanApprovalFlow
    |   +-- BranchPRReviewFlow
    |   +-- SharedTaskListPolicy
    |   +-- FileLockingProtocol
    |   +-- ConflictResolutionPolicy
    +-- MODULE::Agent-Execution-Policy
        +-- AssumptionReporter
        +-- ScopeBoundaryChecker
        +-- RiskClassifier
        +-- DefinitionOfDoneChecker
```

## 6. User Stories
| ID | Role | Story |
| :--- | :--- | :--- |
| US-01 | Developer | As a developer, I want approved docs to generate implementation tasks so my agent team works from the same source of truth. |
| US-02 | Architect | As an architect, I want diagrams to generate draft SDD sections so architecture discussions become reviewable documentation. |
| US-03 | Tech Lead | As a tech lead, I want to assign tasks to agent teams and track progress, blockers, artifacts, and reviews in one surface. |
| US-04 | Operator | As an operator, I want to see active agents, their media, capabilities, and status so I can verify the right agent is working on the right task. |
| US-05 | Security Owner | As a security owner, I want RBAC for users and ABAC for agents so project resources are protected by role, attributes, and execution context. |
| US-06 | Lead Agent | As a lead agent, I want the Execution Governance Standard and the multi-agent runbook to define execution gates so teammates know when to plan, claim, implement, review, and stop for approval. |

## 7. Success Metrics
- **Documentation Fidelity:** UI state and generated tasks can be traced back to approved PRD, SRD, SDD, LLD, API Contract, Runbook, or Test Plan sections.
- **Diagram Traceability:** reviewed diagrams can generate or update structured documentation without losing architectural intent.
- **Project Traceability:** roadmap item -> task -> agent assignment -> artifact -> review -> verification evidence is visible.
- **Agent Interoperability:** external coding agents can integrate through API/MCP without provider lock-in.
- **Governance Coverage:** RBAC/ABAC decisions are auditable for user and agent actions.
- **Execution Governance:** C-level, H-level, required artifacts, approval gates, and verification requirements are visible before complex work begins.
- **Visual Fidelity:** Mission Control preserves the master template identity where applicable.
- **Performance:** primary dashboard interactions remain smooth on standard desktop hardware.

## 8. Related Architecture Documents
- **C4 Architecture:** `docs/architecture/C4-GoVibe-Platform.md`
- **System Design:** `docs/SDD-System-Design.md`
- **Execution Governance:** `docs/STD-Execution-Governance.md`
- **Human-First Docs and Atom Extraction:** `docs/DOCS-Human-First-Atom-Extraction.md`
