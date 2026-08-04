---
title: "LLD: GoVibe MCP Tools"
doc_id: "LLD-GOVIBE-MCP-TOOLS"
status: "approved"
version: "0.3.0"
updated: "2026-08-04"
owner: "GoVibe"
source_of_truth: true
prd_system: "SYSTEM-06::Integration-Bridge-System"
related_docs:
  - "docs/PRD-GoVibe-MCP-Orchestration.md"
  - "docs/srs/SRS-GoVibe-MCP-Server.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - "docs/api/API-009-Persistent-Memory-Contract.md"
  - "docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md"
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

## 3. Tool Set

The live tool catalog in `scripts/mcp/registry.mjs` exposes nine `govibe.*` tools. Each entry below
lists the required arguments enforced by the tool `inputSchema` (the runtime rejects calls that omit
them).

| Tool | Required args |
|---|---|
| `govibe.agent.run` | `actor`, `task`, `agent_id` |
| `govibe.docs.resolve` | `actor`, `selectors` |
| `govibe.roadmap.load` | `actor` |
| `govibe.roadmap.update` | `actor`, `nodeId`, `mutationType` |
| `govibe.roadmap.export` | `actor` |
| `govibe.deploy.vercel` | `actor`, `action` |
| `govibe.workspace.initialize` | `actor` |
| `govibe.workspace.validate` | `actor` |
| `govibe.doc.create` | `type`, `slug`, `title`, `owner`, `complexity` |
| `govibe.memory.search` | `actor`, `vault_id`, `query` |
| `govibe.memory.select` | `actor`, `entity_id` |
| `govibe.memory.forget` | `actor`, `entity_id`, `reason` |
| `govibe.memory.decay.run` | `actor`, `vault_id` |
| `govibe.memory.promote` | `actor`, `entity_id`, `target_scope` |

Status for the last five rows: **planned, not yet implemented.** They are
specified here in advance of the persistent-memory MSP runtime work sequenced
by `docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`
and `docs/change-control/change-requests/work-packets/WP-12-Persistent-Memory-MSP-Runtime-Phase-0-1.md`.
`govibe.memory.promote` already exists in the registry (it is not a new tool);
it is listed here only to record that Phase 5 wiring reuses it rather than
introducing a duplicate promotion tool.

### 3.1 `govibe.agent.run`

Purpose:
- run one governed agent execution request

Inputs:
- actor (required)
- agent_id (required) — mapped to the launcher `-Agent` argument by `handlers.mjs`
- task (required)
- project
- scope
- mode (`doc | plan | audit | atomic`)
- executor preference if allowed

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
- actor (required)
- action (required)
- project
- target environment

Behavior:
- validate permission (planned — not yet enforced in the current runtime)
- invoke deployment adapter

Outputs:
- deployment action result
- environment or target metadata
- error details if failed

Status: this tool is currently a **scaffold**. `handlers.mjs` accepts the request and returns an
acknowledgement plus an `auditRef`; it does not yet bind to a governed Vercel CLI / GitHub
deployment adapter.

### 3.6 `govibe.roadmap.export`

Purpose:
- export the live roadmap snapshot to a task-level Markdown artifact under `docs/roadmap`

Inputs:
- actor (required)
- project
- source
- outputPath
- overwrite
- asOfValidAt / asOfRecordedAt (bitemporal selectors)

Behavior:
- resolve the active or requested roadmap source
- render the snapshot to Markdown and write the artifact
- return source, output path, and task count

### 3.7 `govibe.workspace.initialize`

Purpose:
- initialize the GoVibe agent workspace infrastructure

Inputs:
- actor (required)

Behavior:
- run `node scripts/agents/govibe-init.mjs` from the workspace root and return its output

### 3.8 `govibe.workspace.validate`

Purpose:
- validate the current workspace against STD-Execution-Governance standards

Inputs:
- actor (required)

Behavior:
- run `node packages/govibe-core/bin/validate.mjs` from the workspace root and return its output

### 3.9 `govibe.doc.create`

Purpose:
- create a new GoVibe documentation file from a template

Inputs:
- type (required)
- slug (required)
- title (required)
- owner (required)
- complexity (required: `low | medium | high`)

Behavior:
- scaffold a new doc from the matching template with governed frontmatter

### 3.10 `govibe.memory.search`

Status: **planned, not yet implemented** (Phase 5,
`docs/change-control/change-requests/CR-2026-08-04-Persistent-Memory-MSP-Runtime.md`).

Purpose:
- resolve a hybrid (FTS + vector, RRF-fused) memory search against the
  persistent-memory MSP runtime

Inputs:
- actor (required)
- vault_id (required)
- query (required)
- mode (`hybrid | fts | vector`, optional, default `hybrid`)

Behavior:
- delegate to `msp_memory_search` via `scripts/mcp/runtime/memory-service.mjs`
  and `scripts/mcp/msp-memory-contracts.mjs`
- pass through `matched_by`, `layers_used`, `vector_available`, and
  `searchMode` from the runtime response unmodified; never fabricate a hit

Outputs:
- search hits with provenance
- degraded-search indicators (`vector_available`, `searchMode`)

### 3.11 `govibe.memory.select`

Status: **planned, not yet implemented** (Phase 5).

Purpose:
- record a Mission Control operator's selection of a memory entity for
  detail viewing (Domain E, module E1)

Inputs:
- actor (required)
- entity_id (required)

Behavior:
- update local snapshot/UI state only; does not call the MSP runtime

Outputs:
- selection acknowledgement

### 3.12 `govibe.memory.forget`

Status: **planned, not yet implemented** (Phase 5).

Purpose:
- soft-delete a memory entity through the persistent-memory MSP runtime

Inputs:
- actor (required)
- entity_id (required)
- reason (required)

Behavior:
- delegate to `msp_memory_forget`; this is a soft delete only
  (`lifecycle_state=forgotten`) — never a hard `DELETE`

Outputs:
- updated entity record with `lifecycle_state: "forgotten"`

### 3.13 `govibe.memory.decay.run`

Status: **planned, not yet implemented** (Phase 5).

Purpose:
- trigger a decay tick against the persistent-memory MSP runtime from an
  operator command or an external cron/scheduled task

Inputs:
- actor (required)
- vault_id (required)
- dry_run (optional, default `false`)

Behavior:
- delegate to `msp_memory_decay_tick`; the runtime never self-schedules, so
  this tool (or an equivalent external trigger) is the only way a decay tick
  runs

Outputs:
- evaluated/transitioned entity counts and per-entity transition list

### 3.14 `govibe.memory.promote`

Status: **already exists in the registry; reused, not duplicated.** Phase 5
wires this existing tool to the persistent-memory MSP runtime's
`msp_memory_promote` (`target_scope=global_private` fully functional;
`target_scope=shared` always denies with reason `gks_provider_unconfigured`,
per `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md`). No new tool
name is introduced for this behavior.

### 3.15 MSP-side `msp_memory_*` tool surface (packages/msp-runtime)

The `govibe.memory.*` tools above are GoVibe-facing wrappers. The tools they
delegate to run inside `packages/msp-runtime` and are reached only through
GoVibe's single stdio parent transport (`GOVIBE_MSP_COMMAND`/
`GOVIBE_MSP_ARGS`), never called directly by an agent or by Mission Control.
The full request/response contract for each is in
`docs/api/API-009-Persistent-Memory-Contract.md`; this LLD records only the
tool names and their GoVibe-facing caller, matching this document's format
for the rest of the tool set.

| MSP tool | Called by | Status |
|---|---|---|
| `msp_memory_upsert` | `scripts/mcp/runtime/memory-service.mjs` | planned |
| `msp_memory_get` | `scripts/mcp/runtime/memory-service.mjs`, `govibe.memory.select` | planned |
| `msp_memory_list` | `scripts/mcp/runtime/memory-service.mjs` | planned |
| `msp_memory_history` | `scripts/mcp/runtime/memory-service.mjs` | planned |
| `msp_memory_forget` | `govibe.memory.forget` | planned |
| `msp_memory_search` | `govibe.memory.search` | planned |
| `msp_memory_decay_tick` | `govibe.memory.decay.run` | planned |
| `msp_memory_links_list` | `scripts/mcp/runtime/memory-service.mjs` | planned |
| `msp_memory_links_create` | `scripts/mcp/runtime/memory-service.mjs` | planned |

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
|   +-- RoadmapTools (load / update / export)
|   +-- DeployTools (scaffold)
|   +-- WorkspaceTools (initialize / validate)
|   +-- DocTools (doc.create)
|   +-- MemoryTools (search / select / forget / decay.run / promote) [planned]
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
- graph traversal or shared-scope (`gks:`) promotion for the `msp_memory_*`
  surface, per `docs/adr/ADR-027-In-Repo-MSP-Runtime-Package-Boundary.md`'s
  and the governing CR's explicit exclusions

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.0 | 2026-08-04 | Claude (final-gate session) | Documented the planned `govibe.memory.*` tools (search, select, forget, decay.run, and reuse of the existing promote tool) and the underlying `msp_memory_*` MSP-side surface from `docs/api/API-009-Persistent-Memory-Contract.md`, ahead of the persistent-memory MSP runtime work in CR-2026-08-04. All new entries are marked planned/not yet implemented; no existing tool entry was changed. |
| 0.2.1 | 2026-06-20 | GoVibe | Signed off; promoted draft -> approved (as-built, verified against current runtime code). |
| 0.2.0 | 2026-06-20 | GoVibe | Aligned the tool set with the live `registry.mjs` catalog: documented all nine `govibe.*` tools (added `roadmap.export`, `workspace.initialize`, `workspace.validate`, `doc.create`), noted required args per tool, flagged `deploy.vercel` as a scaffold, and corrected the internal responsibilities tree (removed non-existent ProgressTools/AuditTools). |
| 0.1.0 | 2026-06-13 | GoVibe | Initial tool-level design draft. |
