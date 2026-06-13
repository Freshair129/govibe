---
title: "LLD: GoVibe MCP Tools"
doc_id: "LLD-GOVIBE-MCP-TOOLS"
status: "draft"
version: "0.1.0"
updated: "2026-06-13"
owner: "GoVibe"
source_of_truth: true
prd_system: "SYSTEM-06::Integration-Bridge-System"
related_docs:
  - "docs/PRD-GoVibe-MCP-Orchestration.md"
  - "docs/srs/SRS-GoVibe-MCP-Server.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
---

# LLD: GoVibe MCP Tools

## 1. Purpose

Describe the initial tool-level design for the GoVibe MCP Server.

This document defines the first capability groups, expected request shapes, response expectations, and orchestration responsibilities.

## 2. Design Principles

- Keep MCP as the primary orchestration contract.
- Keep Mission Control and CLI as callers, not business-rule owners.
- Reuse registry-driven context and execution policy where possible.
- Keep mutation operations traceable to source document, task, project, and actor context.
- Preserve provider-neutral adapters behind tool implementations.

## 3. Initial Tool Set

### 3.1 `govibe.agent.run`

Purpose:
- run one governed agent execution request

Inputs:
- actor
- project
- scope
- task
- mode
- executor preference if allowed
- context selectors

Behavior:
- resolve caller permission
- resolve source documents or context packet
- resolve execution policy
- dispatch to the configured adapter or executor
- record invocation and return result metadata

Outputs:
- execution summary
- artifact links if any
- blocker or denial metadata
- audit reference

### 3.2 `govibe.docs.resolve`

Purpose:
- resolve approved document content or a bounded context packet

Inputs:
- actor
- document selectors
- scope
- context tier
- max context bounds

Behavior:
- enforce access policy
- load approved docs only
- return bounded content or references according to policy

Outputs:
- resolved document metadata
- cited sections or files
- bounded content packet or references

### 3.3 `govibe.roadmap.load`

Purpose:
- load document-driven roadmap or backlog state

Inputs:
- actor
- project
- source selector
- output shape

Behavior:
- resolve roadmap source from approved Markdown, HTML, or explicit mission events
- transform into the canonical board payload
- record source provenance

Outputs:
- roadmap snapshot
- source references
- parse warnings if present

### 3.4 `govibe.roadmap.update`

Purpose:
- update roadmap, task, assignment, handoff, or verification state

Inputs:
- actor
- project
- node identifier
- mutation type
- payload

Behavior:
- enforce RBAC or ABAC
- validate mutation against allowed workflow transitions
- persist or emit normalized event
- return updated state summary and audit metadata

Outputs:
- updated node or snapshot summary
- workflow event reference
- audit reference

### 3.5 `govibe.deploy.vercel`

Purpose:
- trigger or inspect Vercel-oriented deployment flow

Inputs:
- actor
- project
- target environment
- action type

Behavior:
- validate permission
- invoke deployment adapter
- capture result and status

Outputs:
- deployment action result
- environment or target metadata
- error details if failed

## 4. Resource Model

Recommended initial resources:

- approved PRD/SRS/SDD/FEAT/API/runbook documents
- resolved roadmap snapshots
- capability registry metadata
- bounded context packets for execution

Tools should be preferred for state mutation. Resources should be preferred for discoverable, inspectable, read-oriented data.

## 5. Internal Responsibilities

```text
MCPServer
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
+-- PolicyLayer
|   +-- UserRBACAdapter
|   +-- AgentABACAdapter
|   +-- DenyReasonFormatter
+-- OrchestrationCore
|   +-- ContextResolver
|   +-- ExecutionRouter
|   +-- RoadmapStateAdapter
|   +-- DeploymentAdapter
+-- AuditLayer
    +-- InvocationLogger
    +-- TraceabilityLinker
```

## 6. Error Model

The tool layer should return explicit errors for:

- permission denied
- missing approved source document
- invalid workflow mutation
- unsupported executor or adapter
- context scope overflow
- deployment adapter failure

Error responses should preserve machine-readable reason categories even when human-readable summaries are shown.

## 7. Sequencing Notes

Typical `govibe.agent.run` path:

1. validate actor
2. resolve scope and source documents
3. build bounded context
4. resolve executor policy
5. invoke adapter or executor
6. log invocation and return result

Typical `govibe.roadmap.update` path:

1. validate actor
2. validate mutation target and transition
3. persist normalized update or event
4. return updated summary and audit metadata

## 8. Deferred Design

Deferred from the first implementation:

- broad free-form code execution tools
- unrestricted repository browsing tools
- direct provider-specific tool contracts that bypass GoVibe policy
- long-running workflow engines beyond current roadmap/task orchestration needs
