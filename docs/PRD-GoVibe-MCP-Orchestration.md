---
doc_id: "PRD-GOVIBE-MCP-ORCHESTRATION"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-15"
owner: "GoVibe"
source_of_truth: true
block_manifest:
  core:
    id: "[[DOC::PRD_MCP_ORCHESTRATION]]"
    block_id: "[[GKS::GENESIS_BLOCK_V3]]"
    context_scaling_tier: "H4"
---

# PRD: GoVibe MCP Orchestration

## 1. Product Intent

GoVibe needs a stable orchestration interface that can coordinate human operators, Mission Control UI, local scripts, external coding agents, and future services without hardwiring orchestration logic into one UI runtime or one vendor CLI.

The MCP layer is the primary integration and orchestration surface for this job, leveraging MemoryOS V3 (Native Runtime / GenesisBlockDB) for context and state.

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

*(Remaining sections preserved...)*

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.0 | 2026-06-15 | Added canonical doc_id metadata to align the orchestration PRD with the document versioning governance standard. |
