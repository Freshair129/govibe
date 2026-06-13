---
title: "PRD: GoVibe MCP Orchestration"
doc_id: "PRD-GOVIBE-MCP-ORCHESTRATION"
status: "draft"
version: "0.1.0"
updated: "2026-06-13"
owner: "GoVibe"
source_of_truth: true
prd_system: "SYSTEM-06::Integration-Bridge-System"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/governance-access/FEAT-RBAC-ABAC-Governance.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - "docs/adr/ADR-002-MCP-As-Primary-Orchestration-Interface.md"
---

# PRD: GoVibe MCP Orchestration

## 1. Product Intent

GoVibe needs a stable orchestration interface that can coordinate human operators, Mission Control UI, local scripts, external coding agents, and future services without hardwiring orchestration logic into one UI runtime or one vendor CLI.

The MCP layer is the primary integration and orchestration surface for this job.

Mission Control remains the visual control plane. A GoVibe CLI may exist as a thin operator surface. Neither should become the canonical home of orchestration logic.

## 2. Problem Statement

Today, orchestration behavior is spread across:

- documentation-driven workflows
- agent registry configuration
- launcher scripts
- external tool adapters
- Mission Control operational behavior

Without a primary protocol surface, GoVibe risks:

- duplicated orchestration logic across UI, CLI, and scripts
- weak permission boundaries for tools and resources
- inconsistent audit trails between human and agent execution
- tight coupling to one executor or provider
- brittle context injection behavior as the platform grows

## 3. Goals

- Make MCP the primary orchestration interface for GoVibe agent operations.
- Keep Mission Control focused on visual coordination, state display, and operator actions.
- Keep CLI usage lightweight and ergonomic for humans, CI, and local automation.
- Provide one capability surface for agent execution, roadmap sync, document resolution, progress updates, and deployment triggers.
- Preserve RBAC for humans and ABAC for agents, subagents, MCP clients, and services.
- Preserve document-driven execution, traceability, and auditability.

## 4. Non-Goals

- Replace external coding tools such as Claude Code, Gemini CLI, OpenClaw, or Hermes.
- Take ownership of third-party billing, quota, or provider runtime policy.
- Make CLI scripts the canonical orchestration contract.
- Bypass approved SWE documents as the source of planning and execution intent.
- Expose unrestricted repo-wide tool access to every agent or MCP client.

## 5. Primary Actors

| Actor | Need |
|---|---|
| Human operator | Trigger work, inspect status, approve actions, and review outcomes |
| Mission Control UI | Visualize state and invoke controlled platform capabilities |
| Lead orchestration agent | Delegate work, retrieve context, and coordinate other agents |
| External coding agent | Receive scoped work and report execution results |
| Local sidecar executor | Perform bounded micro-task or atomic-task work |
| CI/CD automation | Trigger validation, deployment, and status reporting through stable interfaces |

## 6. Product Position

GoVibe should treat its orchestration surfaces as layered:

1. `MCP Server` as the primary orchestration interface
2. `Mission Control UI` as the visual control plane
3. `GoVibe CLI` as a thin operator and automation surface

The business rules for permissions, context injection, task routing, and state mutation should live behind the orchestration interface, not inside presentation layers.

## 7. Core Use Cases

### 7.1 Agent execution

- operator or lead agent requests scoped work
- GoVibe resolves context, permissions, executor policy, and audit metadata
- GoVibe invokes the selected executor through a stable tool contract
- result is linked back to roadmap, task, artifact, and verification context

### 7.2 Document and context resolution

- GoVibe loads approved PRD, SRS, SDD, FEAT, API, runbook, and roadmap sources
- GoVibe resolves the minimum document/context packet for the requested operation
- context is injected according to H-tier, W-scale, and execution policy

### 7.3 Roadmap and progress operations

- PM-generated roadmap docs or imported HTML/Markdown are parsed into project state
- progress, assignment, handoff, and verification status are updated through one orchestration contract
- Mission Control renders document-derived state rather than hardcoded arrays

### 7.4 Governance and audit

- user actions are checked through RBAC
- agent actions are checked through ABAC
- every invocation preserves actor, action, resource, result, and policy context

### 7.5 Deployment and automation

- GoVibe can trigger or report deployment through GitHub workflow paths or Vercel CLI paths
- deployment orchestration remains traceable to project/task context

## 8. Feature Scope

The first MCP orchestration release must support:

- agent execution request and response flow
- context resolution from approved documents
- roadmap load and state update operations
- task progress and assignment update operations
- deployment trigger or deployment status reporting
- registry-backed capability discovery
- invocation logging and audit metadata

## 9. Success Criteria

- GoVibe can expose a coherent tool surface for orchestration without duplicating business logic in UI and CLI layers.
- Mission Control actions can map to stable backend capabilities rather than direct hardcoded runtime behavior.
- At least one agent execution path, one roadmap path, and one deployment path can be routed through the orchestration interface.
- Permission and audit metadata are preserved across orchestration operations.
- Document-driven roadmap and task flows remain the source of state rather than hardcoded UI structures.

## 10. Risks

| Risk | Why it matters | Product response |
|---|---|---|
| Overbuilding the interface too early | Can slow product delivery | Start with a narrow, high-value tool set |
| Tool sprawl without clear boundaries | Weakens governance and audit | Use capability grouping and ABAC/RBAC mapping |
| Logic split between UI, CLI, and scripts | Causes drift and bugs | Keep orchestration rules behind the MCP contract |
| Missing SSOT links | Creates doc drift | Link PRD, SRS, LLD, ADR, FEAT, and runbook explicitly |

## 11. Initial Capability Domains

```text
govibe.agent.*
govibe.docs.*
govibe.roadmap.*
govibe.progress.*
govibe.audit.*
govibe.deploy.*
```

Initial examples:

- `govibe.agent.run`
- `govibe.docs.resolve`
- `govibe.roadmap.load`
- `govibe.roadmap.update`
- `govibe.progress.report`
- `govibe.deploy.vercel`

## 12. Related System Mapping

- Primary system: `SYSTEM-06::Integration-Bridge-System`
- Supporting systems:
  - `SYSTEM-05::Agent-Team-Management-System`
  - `SYSTEM-02::Project-Roadmap-Management-System`
  - `SYSTEM-07::Governance-Access-Control-System`
  - `SYSTEM-09::Traceability-Audit-Verification-System`
  - `SYSTEM-10::Execution-Governance-System`

## 13. Open Questions

- Should some low-risk read-only capabilities be directly callable from local CLI without MCP round-trip while still reusing the same core policy layer?
- Should deployment operations be implemented as first-class tools in the first release or start as adapter-backed commands only?
- Which capability groups need separate ABAC classes from day one?
