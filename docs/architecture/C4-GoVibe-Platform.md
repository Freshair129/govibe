# C4: GoVibe Platform Architecture

**Status:** `DRAFT`
**Author:** ATHER
**Date:** 2026-06-12
**Source PRD:** `docs/PRD-GoVibe-Platform-Overview.md`
**Architecture Scope:** GoVibe platform, Mission Control, Docs to Code, Diagram to Doc, Agent Team Management, Genesis Knowledge/HCS, and Execution Governance

## 1. Purpose
This document describes GoVibe with the C4 model so product, SWE, architecture, and agent teams can share one architecture view before implementation.

The PRD remains the product source of truth. This C4 document is the architecture view of the product systems declared in the PRD.

## 1.1 Decision Alignment (accepted ADR-015..019, 2026-06-22)

This C4 view is governed by the accepted decisions:
- **Stack (4 layers):** Cognitive (GoVibe + agents) → MSP (Memory OS / passport) → GKS (atomic-`.md` corpus + index) → Obsidian / GenesisBlockDB (swappable backend). GoVibe = cognitive **surface that wraps MSP**, not a standalone runtime (ADR-016).
- **Positioning:** governance + interop **translator** — GKS is an internal interlingua (`A1 ⇄ GKS ⇄ A25`); GoVibe **rides MCP/A2A and bridges INTO** LangGraph, it does not replace them (ADR-017).
- **Structure:** single containment tree `PLAT→SYS→SUBSYS→MOD→…→METH` + wikilink cross-link graph; criticality (support/core/central) auto-derived from the dependency graph (ADR-018).
- **Flow:** universal code-in (12-step decomposition) + MCP-out (7-phase generation), gated by H + W + Complexity (ADR-019).

**2026-08-19 semantic correction (ADR-021/AUD-14, TASK-PRD-022):** §5.7 and §6.1 below directly incorporate the mapping from `C4-GoVibe-Platform-H-Axis-Correction.md` — `HLevelClassifier`/`classifyHLevel` → `AccessScopeResolver`/`resolveAccessScope`, `GraphHopResolver` → `RetrievalRadiusPlanner`, and `H0-H6` context/retrieval ranges → `H0-H4` Access Scope plus a separate `R0-R6` Retrieval Radius. This is the direct rewrite GAP-08 called for; the correction overlay document remains valid as the decision record.
- **Naming:** root governance policy = `GOV--`; "Master" = essence/index (ADR-015). See also `BRD-GoVibe-Platform`, `SDD-GoVibe-MSP-GKS-Integration`.

## 2. C4 Level Summary
| C4 Level | Scope | GoVibe Meaning |
|---|---|---|
| **C1 - System Context** | GoVibe and external actors/systems | Humans, agent teams, third-party coding tools, GitHub, docs, MCP/API integrations |
| **C2 - Container** | Major runtime/deployment containers | Mission Control UI, core services, knowledge services, policy services, integration bridge, storage |
| **C3 - Component** | Components inside each container | Docs to Code, Diagram to Doc, HCS, Hybrid JIT Context, RBAC/ABAC, traceability, runbook governance |
| **C4 - Code / Low-Level** | Key module/class/function skeletons | Parser, resolver, classifier, adapter, evaluator, renderer, indexer modules |

## 3. C1 - System Context
GoVibe is an AI-native visual CoDev and project management platform. It coordinates human developers, their agent teams, documents, roadmap progress, artifacts, access policy, and external coding-agent tools.

```mermaid
flowchart LR
  Human["Human Developer / Tech Lead / Product Owner"]
  AgentTeam["Developer-owned Agent Teams"]
  GoVibe["GoVibe Platform"]
  ThirdParty["External Coding Tools\nClaude Code / Gemini CLI / OpenClaw / Hermes"]
  GitHub["GitHub\nCode / PR / CI"]
  Docs["Human SWE Docs\nPRD / SRS / SDD / LLD / API / Runbook / Test Plan"]
  MCP["MCP / API / Webhook / Local Bridge"]
  Knowledge["Genesis Knowledge / Block DB / HCS"]

  Human -->|"plans, reviews, approves"| GoVibe
  AgentTeam -->|"claims, implements, reports progress"| GoVibe
  GoVibe -->|"context, tasks, policy, traceability"| AgentTeam
  GoVibe -->|"connects through"| MCP
  MCP --> ThirdParty
  GoVibe <--> GitHub
  Docs -->|"source of truth"| GoVibe
  GoVibe <--> Knowledge
```

### C1 Responsibilities
- Coordinate CoDev work without owning third-party billing or provider runtime.
- Use human SWE documents as canonical source material.
- Use HCS and Hybrid JIT Context to provide minimal useful context to agents.
- Keep traceability across roadmap, task, agent assignment, artifact, review, and verification.

## 4. C2 - Container View
The platform is composed of UI, operator, orchestration, core, knowledge, governance, integration, and storage containers.

```mermaid
flowchart TB
  subgraph Client["Client Surfaces"]
    MissionUI["Mission Control UI\nReact / Vite"]
    Terminal["Floating Terminal"]
    GovibeCLI["GoVibe CLI\nThin operator shell"]
  end

  subgraph Orchestration["Orchestration Runtime"]
    MCPServer["GoVibe MCP Server"]
  end

  subgraph Core["Core Platform Runtime"]
    ProjectCore["Project and Roadmap Core"]
    DocsCore["Docs to Code Core"]
    DiagramCore["Diagram to Doc Core"]
    AgentCore["Agent Team Core"]
    ExecGov["Execution Governance Core\nStandard + Runbook Gates"]
  end

  subgraph Knowledge["Knowledge Runtime"]
    HCS["Hierarchy Compaction System"]
    JIT["Hybrid JIT Context System"]
    Atom["Atom Extraction System"]
    Graph["Knowledge Graph"]
    BlockDB["GenesisBlock DB / Retrieval Index"]
  end

  subgraph Security["Governance Runtime"]
    RBAC["User RBAC"]
    ABAC["Agent ABAC"]
    Policy["Policy Enforcement and Audit"]
  end

  subgraph Integration["Integration Runtime"]
    AgentAdapters["External Agent Adapters"]
    Webhooks["Webhook / API / Local Bridge"]
    GitHubBridge["GitHub Bridge"]
    DeployAdapter["Deployment Adapter"]
  end

  subgraph Storage["Storage"]
    DocStore["Document Store\nMarkdown / HTML"]
    StateStore["Project State Store"]
    AuditStore["Audit and Trace Store"]
    VectorIndex["Embedding / Vector Index"]
  end

  MissionUI --> ProjectCore
  MissionUI --> DocsCore
  MissionUI --> DiagramCore
  MissionUI --> AgentCore
  MissionUI --> MCPServer
  Terminal --> ExecGov
  GovibeCLI --> MCPServer

  MCPServer --> ProjectCore
  MCPServer --> DocsCore
  MCPServer --> AgentCore
  MCPServer --> ExecGov
  MCPServer --> Policy
  MCPServer --> AuditStore

  ProjectCore --> StateStore
  DocsCore --> DocStore
  DocsCore --> Atom
  DiagramCore --> DocStore
  AgentCore --> Integration
  ExecGov --> Policy

  Atom --> Graph
  HCS --> Graph
  JIT --> HCS
  JIT --> DocStore
  Graph --> BlockDB
  BlockDB --> VectorIndex

  RBAC --> Policy
  ABAC --> Policy
  Policy --> AuditStore

  MCPServer --> AgentAdapters
  Webhooks --> AgentAdapters
  GitHubBridge --> GitHub["GitHub"]
  MCPServer --> DeployAdapter
  DeployAdapter --> GitHub
```

### C2 Container Mapping To PRD Systems
| PRD System | Main Containers |
|---|---|
| Mission Control Experience | Mission Control UI, Floating Terminal |
| Project Roadmap Management | Project and Roadmap Core, State Store |
| Docs to Code | Docs to Code Core, Document Store, Atom Extraction |
| Diagram to Doc | Diagram to Doc Core, Document Store |
| Agent Team Management | Agent Team Core, GoVibe MCP Server, Integration Runtime |
| Integration Bridge | GoVibe MCP Server, Agent Adapters, Webhooks, GitHub Bridge, Deployment Adapter |
| Governance Access Control | RBAC, ABAC, Policy Enforcement |
| Genesis Knowledge System | HCS, JIT, Atom Extraction, Knowledge Graph, GenesisBlock DB |
| Traceability Audit Verification | Audit Store, Trace Store, Verification Matrix components |
| Execution Governance | Execution Governance Standard, Doc-First Gate, Multi-Agent Operating Runbook |

## 5. C3 - Component View

### 5.1 Mission Control UI
```text
MissionControlUI
+-- DashboardShell
+-- DomainRouter
+-- TopNavigation
+-- SidebarNavigation
+-- ViewRenderer
+-- ThemeController
+-- FooterStatusBar
+-- FloatingTerminalPanel
```

Responsibilities:
- Render the ten product systems as coherent Mission Control surfaces.
- Reflect document-derived project, task, agent, traceability, and verification state.
- Keep UI behavior separate from raw template/runtime code.

### 5.2 Docs To Code Core
```text
DocsToCodeCore
+-- DocumentSourceLoader
|   +-- MarkdownLoader
|   +-- HTMLLoader
|   +-- FrontmatterParser
|   +-- DocumentVersionResolver
+-- RequirementExtractor
|   +-- SectionParser
|   +-- AcceptanceCriteriaExtractor
|   +-- TaskCandidateExtractor
|   +-- RiskHintExtractor
+-- TaskGenerator
|   +-- RequirementToTaskMapper
|   +-- TaskDependencyResolver
|   +-- AgentAssignmentSuggestion
|   +-- VerificationRequirementMapper
+-- CodeContextPackager
    +-- SourceDocCitation
    +-- ContextBundleBuilder
    +-- AgentPromptContextBuilder
```

Responsibilities:
- Convert approved human SWE docs into task and implementation context.
- Preserve traceability from source document section to generated task.
- Prevent hardcoded roadmap/task data from becoming the canonical planning source.

### 5.3 Diagram To Doc Core
```text
DiagramToDocCore
+-- DiagramIngestion
|   +-- MermaidParser
|   +-- C4DiagramParser
|   +-- ERDParser
|   +-- FlowDiagramParser
+-- DiagramSemanticExtractor
|   +-- NodeClassifier
|   +-- EdgeClassifier
|   +-- BoundaryDetector
|   +-- DependencyExtractor
+-- DocumentDraftGenerator
    +-- PRDSectionDraft
    +-- SRSSectionDraft
    +-- SDDSectionDraft
    +-- APIContractDraft
    +-- HumanReviewGate
```

Responsibilities:
- Convert diagrams into reviewed documentation, not directly into production implementation.
- Support the Diagram to Doc gate for C-3 architecture work.

### 5.4 Agent Team Core
```text
AgentTeamCore
+-- AgentRoster
|   +-- AgentProfile
|   +-- CapabilityMatrix
|   +-- AgentStatus
|   +-- AgentMediaProfile
+-- AgentTeamOrchestration
|   +-- TeamBoundary
|   +-- AssignmentQueue
|   +-- WorkloadState
|   +-- HandoffState
+-- AgentWorkspace
    +-- PromptConfig
    +-- ToolPermissionView
    +-- RuntimeStatusView
    +-- OutputArtifactView
```

Responsibilities:
- Track agent teams as project contributors, not provider billing identities.
- Assign tasks and show status, artifacts, tool access, and handoff state.

### 5.5 Integration Bridge / MCP Server
```text
GoVibeMCPServer
+-- ToolRegistry
|   +-- AgentTools
|   +-- DocsTools
|   +-- RoadmapTools
|   +-- ProgressTools
|   +-- AuditTools
|   +-- DeployTools
+-- ResourceRegistry
|   +-- ApprovedDocs
|   +-- RoadmapSnapshots
|   +-- ContextPackets
|   +-- CapabilityMetadata
+-- OrchestrationCore
|   +-- ContextResolver
|   +-- ExecutionRouter
|   +-- RoadmapMutationGateway
|   +-- DeploymentGateway
+-- InvocationAudit
    +-- InvocationLogger
    +-- TraceabilityLinker
    +-- DenyReasonFormatter
```

Responsibilities:
- Expose GoVibe orchestration capabilities through governed MCP tools and resources.
- Keep Mission Control UI and GoVibe CLI as callers rather than business-rule owners.
- Route execution, roadmap, document, audit, and deployment operations through one capability surface.

### 5.6 Governance Access Control
```text
GovernanceAccessControl
+-- UserRBAC
|   +-- UserRole
|   +-- PermissionSet
|   +-- ProjectMembership
|   +-- RolePolicyEvaluator
+-- AgentABAC
|   +-- SubjectAttributeBag
|   +-- ResourceAttributeBag
|   +-- ActionContext
|   +-- PolicyDecisionPoint
+-- PolicyEnforcement
    +-- PolicyEnforcementPoint
    +-- ObligationHandler
    +-- DenyReasonRenderer
    +-- PolicyAuditLogger
```

Responsibilities:
- Apply RBAC to human users.
- Apply ABAC to agents, subagents, MCP clients, services, and scheduled jobs.
- Audit every policy decision that affects project resources.

### 5.7 Genesis Knowledge System
```text
GenesisKnowledgeSystem
+-- HierarchyCompactionSystem
|   +-- AccessScopeResolver
|   +-- ContextScopeResolver
|   +-- RetrievalRadiusPlanner
|   +-- CompactionEngine
|   +-- ContextBudgetPlanner
+-- HybridJITContextSystem
|   +-- MarkdownSourceResolver
|   +-- InMemoryGraphBuilder
|   +-- HopBoundedContextQuery
|   +-- VirtualDocumentRenderer
|   +-- ContextOverwriteGuard
+-- AtomExtractionSystem
|   +-- ConceptExtractor
|   +-- FeatureExtractor
|   +-- ModuleExtractor
|   +-- FlowExtractor
|   +-- AlgorithmExtractor
|   +-- EntityExtractor
|   +-- GuardExtractor
|   +-- MCPExtractor
+-- KnowledgeGraph
|   +-- NodeRegistry
|   +-- EdgeRegistry
|   +-- SymbolLinker
|   +-- DocumentBacklinkIndex
|   +-- GraphQueryEngine
+-- GenesisBlockDB
    +-- BlockStore
    +-- VersionIndex
    +-- EmbeddingIndex
    +-- RetrievalRanker
```

Responsibilities:
- Classify executor Access Scope as `H0-H4` (capability/tool-permission ceiling; `H5`/`H6` are abolished, per `ADR-021`) and select retrieval radius independently as `R0-R6` (graph-traversal breadth; full-network traversal, when permitted, is an explicit retrieval-policy decision, not a reserved H tier).
- Extract atoms from human docs after authoring.
- Render just-in-time context for agent work without making atoms the human authoring format.

### 5.8 Execution Governance
```text
ExecutionGovernance
+-- ComplexityBasedExecution
|   +-- TaskComplexityClassifier
|   +-- C0C3WorkflowSelector
|   +-- HScaleMapper
|   +-- RequiredArtifactResolver
|   +-- VerificationRequirementResolver
+-- DocFirstGate
|   +-- DocsToCodeGate
|   +-- DiagramToDocGate
|   +-- HumanApprovalGate
|   +-- CanonicalSourceChecker
+-- MultiAgentOperatingRunbook
|   +-- CoordinationLayerPolicy
|   +-- RoleMatrix
|   +-- PlanApprovalFlow
|   +-- BranchPRReviewFlow
|   +-- SharedTaskListPolicy
|   +-- FileLockingProtocol
|   +-- ConflictResolutionPolicy
+-- AgentExecutionPolicy
    +-- AssumptionReporter
    +-- ScopeBoundaryChecker
    +-- RiskClassifier
    +-- DefinitionOfDoneChecker
```

Responsibilities:
- Decide the correct process for each task before implementation.
- Enforce doc-first and diagram-to-doc gates for medium/high-complexity work.
- Align multi-agent work with plan approval, file locks, PR review, and Definition of Done.

## 6. C4 - Low-Level Code / Module Skeleton
This level is a design skeleton, not final implementation. Each module may become an LLD, API contract, or test plan before code.

### 6.1 HCS Context Retrieval
```text
ContextRetrievalService
+-- getContext(request)
+-- validateSubjectAccess(subject, resource, action, context)
+-- resolveAccessScope(task, policy)
+-- resolveGraphScope(targetNode, retrievalRadius)
+-- compactContext(nodes, tokenBudget)
+-- renderVirtualDocument(compactedContext)
+-- recordTraceability(request, result)
```

Primary inputs:

```text
subject: user | agent | subagent | mcp-client | service
target: doc section | task | atom | module | artifact
action: read | claim | assign | update-progress | attach-artifact | request-review
context: projectId, branch, riskLevel, source, traceId
```

Primary output:

```text
contextBundle:
  sourceDocuments
  citedSections
  relatedAtoms
  graphNodes
  taskLinks
  policyDecision
  tokenBudget
```

### 6.2 Docs To Code Task Generation
```text
DocsToCodeTaskService
+-- loadDocument(documentId)
+-- parseSections(document)
+-- extractRequirements(sections)
+-- extractAcceptanceCriteria(sections)
+-- mapRequirementsToTasks(requirements)
+-- suggestAgentAssignments(tasks, capabilityMatrix)
+-- createTraceabilityLinks(tasks, documentSections)
```

### 6.3 Diagram To Doc Drafting
```text
DiagramToDocService
+-- parseDiagram(diagramSource)
+-- classifyNodes(nodes)
+-- classifyEdges(edges)
+-- detectBoundaries(graph)
+-- generateDraftDoc(graph, targetDocType)
+-- sendToHumanReview(draftDoc)
+-- promoteApprovedDoc(draftDoc)
```

### 6.4 Policy Decision
```text
PolicyDecisionService
+-- buildSubjectAttributes(subject)
+-- buildResourceAttributes(resource)
+-- buildActionContext(action, context)
+-- evaluateRBAC(user, action, resource)
+-- evaluateABAC(subject, action, resource, context)
+-- returnDecision(effect, obligations, advice, reason)
+-- auditDecision(decision)
```

### 6.5 Execution Governance
```text
ExecutionGovernanceService
+-- classifyComplexity(task)
+-- mapContextTier(task)
+-- resolveRequiredArtifacts(complexity, hTier)
+-- enforceDocFirstGate(task)
+-- enforceDiagramToDocGate(task)
+-- verifyDefinitionOfDone(task)
+-- blockOrApproveExecution(task)
```

### 6.6 MCP Orchestration
```text
McpOrchestrationService
+-- initializeServer()
+-- listTools()
+-- listResources()
+-- readResource(uri)
+-- callTool(name, arguments)
+-- resolveCallerIdentity(actor)
+-- evaluateGovernance(actor, action, resource, context)
+-- resolveContextPacket(scope, selectors, bounds)
+-- dispatchOperation(capability, payload)
+-- recordInvocation(auditRecord)
```

## 7. Architecture Rules
- PRD is the product SSOT.
- SRS is the requirement SSOT when added.
- SDD is the architecture/design SSOT.
- LLD is the module logic SSOT.
- Runbook is the operation SSOT.
- Test Plan is the verification SSOT.
- Atoms are derived knowledge artifacts, not the required human authoring format.
- Diagrams may start architecture work, but reviewed docs must exist before C-3 implementation.
- GoVibe coordinates third-party agent tools but does not manage provider billing or quota.

## 8. Traceability Matrix
| PRD System | C2 Container | C3 Component Group | Expected Supporting Docs |
|---|---|---|---|
| Mission Control Experience | Mission Control UI | Dashboard Shell, Domain Router, Terminal | SDD, UI Spec, Test Plan |
| Project Roadmap Management | Project and Roadmap Core | Roadmap Board, Task Assignment, Artifact Tracker | SRS, SDD, API Contract |
| Docs to Code | Docs Core | Loader, Extractor, Task Generator, Context Packager | SRS, SDD, LLD, Test Plan |
| Diagram to Doc | Diagram Core | Ingestion, Semantic Extractor, Draft Generator | SRS, SDD, LLD |
| Agent Team Management | Agent Core | Roster, Team Orchestration, Workspace | SRS, SDD, Runbook |
| Integration Bridge | GoVibe MCP Server, Integration Runtime | Tool Registry, Resource Registry, Orchestration Core, Agent Adapters, Webhooks, GitHub Bridge | PRD, SRS, LLD, ADR, API Contract, MCP Contract |
| Governance Access Control | Governance Runtime | RBAC, ABAC, Policy Enforcement | SRS, SDD, Access Model, Threat Model |
| Genesis Knowledge HCS | Knowledge Runtime | HCS, JIT, Atom Extraction, Graph, Block DB | SRS, SDD, LLD, API Contract |
| Traceability Audit Verification | Audit/Trace Store | Traceability Index, Audit Trail, Verification Matrix | SRS, SDD, Test Plan |
| Execution Governance | Execution Governance Core | Execution Governance Standard, Doc-First Gate, Multi-Agent Runbook | Standard, Runbook, Test Plan |

## 9. Open Questions
- Should HCS have its own standalone SRS and SDD under `docs/hcs/`?
- Should `docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md` remain draft, non-SOT operational guidance, or require a separately approved canonical artifact?
- Should C4 diagrams become source input for Diagram to Doc, or remain a reviewed architecture artifact only?
- Which storage layer is canonical for graph state in phase 1: in-memory graph, local file index, SQLite, or embedded vector store?

## 10. Acceptance Criteria
- A human reader can understand GoVibe architecture from C1 to C4 without reading atom syntax.
- Every C2 container maps back to at least one PRD system.
- Every C3 component group maps to a product capability.
- Low-level skeletons are ready to become LLD/API/Test Plan documents.
- The document does not replace PRD/SRS/SDD/LLD; it links architecture views across them.
