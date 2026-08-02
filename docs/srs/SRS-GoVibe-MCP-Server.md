---
title: "SRS: GoVibe MCP Server"
doc_id: "SRS-GOVIBE-MCP-SERVER"
status: "approved"
version: "0.2.1"
updated: "2026-06-20"
owner: "GoVibe"
source_of_truth: true
prd_system: "SYSTEM-06::Integration-Bridge-System"
related_docs:
  - "docs/PRD-GoVibe-MCP-Orchestration.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/features/governance-access/FEAT-RBAC-ABAC-Governance.md"
  - "docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - "docs/adr/ADR-002-MCP-As-Primary-Orchestration-Interface.md"
---

# SRS: GoVibe MCP Server

## 1. Introduction

This document defines the software requirements for the GoVibe MCP Server.

The MCP Server is the primary orchestration interface for GoVibe. It exposes governed tools and resources for Mission Control, CLI, lead agents, sidecar executors, and external automation surfaces. The runtime speaks MCP JSON-RPC (`Content-Length`-framed) over stdio and additionally boots an HTTP/WebSocket sidecar bound to `127.0.0.1:4310` (port configurable via `GOVIBE_MCP_PORT`, host via `GOVIBE_MCP_HOST`) for browser/Mission Control transport.

## 2. System Context

- Primary PRD system: `SYSTEM-06::Integration-Bridge-System`
- Supporting systems:
  - `SYSTEM-05::Agent-Team-Management-System`
  - `SYSTEM-02::Project-Roadmap-Management-System`
  - `SYSTEM-07::Governance-Access-Control-System`
  - `SYSTEM-09::Traceability-Audit-Verification-System`
  - `SYSTEM-10::Execution-Governance-System`

## 3. Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-001 | The system must expose GoVibe orchestration capabilities through MCP tool contracts. | MUST | At least one tool exists in each initial capability domain or the domain is explicitly deferred. |
| FR-002 | The system must expose governed document and project resources through MCP resource contracts where appropriate. | MUST | Approved docs or derived project state can be resolved through controlled resources or equivalent tool responses. |
| FR-003 | The system must support agent execution requests through a stable orchestration tool surface. | MUST | A caller can request execution with actor, scope, task, and policy context. |
| FR-004 | The system must support roadmap read and update operations from document-driven state. | MUST | Callers can load roadmap state and update progress without relying on hardcoded UI data. |
| FR-005 | The system must enforce RBAC and ABAC checks before executing governed actions. | MUST | Unauthorized actions fail with a clear denial reason. (Planned — not yet enforced in the current runtime; tool calls accept an `actor` argument but no permission gate is applied.) |
| FR-006 | The system must preserve invocation audit metadata. | MUST | Invocation records capture actor, action, target, result, and decision context. |
| FR-007 | The system must support capability discovery. | SHOULD | A caller can enumerate available tools/resources or equivalent registry-backed metadata. |
| FR-008 | The system must allow Mission Control and CLI to use the same orchestration rules. | MUST | Presentation layers do not need separate business-rule implementations for the same action. |
| FR-009 | The system must support bounded local sidecar execution through the same orchestration model. | SHOULD | Atomic-task execution can be routed through local executor policy while keeping the same governance flow. |
| FR-010 | The system must support deployment-oriented operations through governed adapters. | SHOULD | Vercel CLI and/or GitHub workflow operations can be surfaced through the orchestration layer. |

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-001 | Governance consistency | RBAC and ABAC decisions must be applied consistently across UI, CLI, and agent callers. |
| NFR-002 | Traceability | Every state-changing operation must preserve links to source document, task, or project context when available. |
| NFR-003 | Extensibility | New orchestration tools should be addable without changing Mission Control UX contracts. |
| NFR-004 | Bounded execution safety | Atomic or sidecar execution must preserve context caps and executor policy limits. |
| NFR-005 | Provider neutrality | The interface must not assume one external coding tool vendor. |

## 5. External Interfaces

### 5.1 Tool domains

The live catalog (`scripts/mcp/registry.mjs`) exposes:

- `govibe.agent.*` — `agent.run`
- `govibe.docs.*` — `docs.resolve`
- `govibe.roadmap.*` — `roadmap.load`, `roadmap.update`, `roadmap.export`
- `govibe.deploy.*` — `deploy.vercel` (scaffold; not yet bound to a real adapter)
- `govibe.workspace.*` — `workspace.initialize`, `workspace.validate`
- `govibe.doc.*` — `doc.create`

Progress and audit are surfaced as fields on tool responses (e.g. `auditRef`) and on the mission
snapshot rather than as standalone `govibe.progress.*` / `govibe.audit.*` tool domains. Those
domains are not implemented in the current runtime.

### 5.1a Sidecar HTTP/WS endpoints

The bundled sidecar (`scripts/mcp/sidecar-server.mjs`) serves:

- `GET /mission/snapshot` — current `MissionSnapshot` (optional `?source=` reloads a roadmap source)
- `GET /roadmap/sources` — active source plus discoverable roadmap sources
- `POST /mission/commands` — dispatch a `MissionCommand`
- `/mission/ws` — WebSocket channel that streams snapshot/event payloads

### 5.2 Resource domains

- approved document resources
- resolved context packets
- roadmap or backlog snapshots
- capability registry metadata

### 5.3 Caller surfaces

- Mission Control UI
- GoVibe CLI
- lead orchestration agents
- bounded local sidecars
- CI/CD automation

## 6. Data Requirements

Inputs may include:

- actor identity
- user role or agent attributes
- project and scope identifiers
- task or operation payload
- requested capability
- document or roadmap selectors

Outputs may include:

- execution results
- progress updates
- resolved resources
- denial reasons
- audit identifiers

## 7. Security and Governance Requirements

> Status: the policy model below is the **planned** governance contract. The current runtime labels
> its capability surface as RBAC/ABAC (`describeCapabilitySurface` in `handlers.mjs`) but does not
> yet enforce permission checks on tool calls — there is no deny path wired into the runtime today.

- Human caller permissions must be evaluated through RBAC.
- Agent and service permissions must be evaluated through ABAC.
- Deny paths must be explicit and inspectable.
- Tool execution must not silently widen scope beyond granted context.
- Deployment or mutation operations must remain attributable to an actor and project context.

## 8. Initial Acceptance Scope

The first acceptable slice of the MCP Server should support:

1. `govibe.agent.run`
2. `govibe.docs.resolve`
3. `govibe.roadmap.load`
4. `govibe.roadmap.update`
5. `govibe.deploy.vercel`

## 9. Traceability

| Requirement group | PRD mapping | Design mapping |
|---|---|---|
| FR-001 to FR-004 | Integration bridge and project roadmap systems | `docs/lld/LLD-GoVibe-MCP-Tools.md` |
| FR-005 to FR-006 | Governance and audit systems | `docs/lld/LLD-GoVibe-MCP-Tools.md` |
| FR-007 to FR-010 | Platform orchestration and operator surfaces | `docs/adr/ADR-002-MCP-As-Primary-Orchestration-Interface.md` |

## 10. Open Questions

- Should read-only resources always be offered as MCP resources, or can some remain tool-return payloads in the first implementation?
- Should deployment operations be split into trigger and status capabilities from the first release?

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.1 | 2026-06-20 | GoVibe | Signed off; promoted draft -> approved (as-built, verified against current runtime code). |
| 0.2.0 | 2026-06-20 | GoVibe | Corrected the transport description (MCP JSON-RPC over stdio plus an HTTP/WS sidecar on 127.0.0.1:4310) and added the sidecar endpoints; removed the non-existent `govibe.progress.*` / `govibe.audit.*` tool domains and aligned the tool domain list with the live catalog; labelled RBAC/ABAC enforcement as planned/not-yet-enforced to match the current runtime. |
| 0.1.0 | 2026-06-13 | GoVibe | Initial software requirements draft. |
