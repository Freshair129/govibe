---
title: "API: GoVibe Capability Contracts"
doc_id: "API-005-GOVIBE-CAPABILITY-CONTRACTS"
status: "approved"
version: "3.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
---

# Boundary

Claude Code and other executors call GoVibe MCP. GoVibe calls MSP only. MSP owns identity, Vault Registry, private memory, context resolution, injection lineage, replay authorization, evidence, promotion gates, and all mediation to GKS. GoVibe must not expose or call a direct GKS or GenesisBlockDB port.

```text
Executor -> GoVibe MCP -> MSP -> GKS -> GenesisBlockDB
```

# Skill Definition

`govibe-skill-definition/v1` is immutable for an `(id, version)` pair. Workspace locks pin exact versions and hashes. Workspace policy may narrow Global trust but may not widen it.

# Workspace Initialization

`govibe.workspace.initialize`:

1. resolves the workspace inside the allowed-root boundary;
2. creates `.govibe/` and `.brain/`;
3. creates stable `project_id`, `workspace_id`, and vault bindings;
4. creates `.govibe/vaults.json`;
5. materializes the project Shared Vault at `.brain/<project-slug>/`;
6. materializes the current Agent Workspace Private Vault at `.brain/private/<agent-id>/`;
7. binds the Agent Global Private Vault by reference;
8. pins the built-in scan skill;
9. registers the workspace and vault bindings through MSP;
10. does not run a deep scan.

MSP registration is fail-closed for governed execution. A local prepared state without parent registration is not dispatchable.

# Context Profiles

- `T-ctx`: system plus one task/event context, normally workers or headless agents.
- `V-ctx`: Agent Global Private plus current Workspace Private context.
- `W-ctx`: V-ctx plus exactly one active multi-agent workflow.
- `M-ctx`: per-turn synchronized Global/Workspace context with diff lineage and real-time shared context.

Context profile is independent from H access scope, R retrieval radius, D resolution depth, W fan-out, Budget, and Risk.

# Context Lineage

Every injected context carries:

- `contextId`: logical assembly identity;
- `cacheId`: exact materialized payload identity;
- `kvId`: optional runtime-issued KV identity;
- `parentContextId`: prior context in an M-ctx chain;
- source-manifest and context hashes.

Replay preserves exact source versions. Context reproducibility, execution reproducibility, and output identity are reported separately.

# Stage Run and Deep Scan

The public deep-scan contract contains twelve stages:

1. Scan
2. Structure
3. Markdown Parse
4. COBOL Parse
5. Symbolic Parse
6. Routes
7. Tools
8. ORM
9. Cross-File Resolution
10. MRO
11. Communities
12. Processes

F1-F4 are internal finalization operations and are not public Stage 13-16 identifiers. GoVibe orchestrates scan execution. Producing stages submit a `govibe-knowledge-candidate/v1` to MSP. MSP validates authority and promotion policy, mediates GKS lifecycle, and returns opaque knowledge and promotion references.

# MCP Commands

Existing commands:

- `govibe.workspace.initialize`
- `govibe.workflow.continue`
- `govibe.workspace.scan`
- `govibe.plan.create`
- `govibe.workflow.status`
- `govibe.workspace.impact`
- `govibe.docs.version`
- `govibe.review.run`
- `govibe.optimize.run`

Vault/context commands:

- `govibe.vault.status`
- `govibe.vault.mount`
- `govibe.context.resolve`
- `govibe.context.diff`
- `govibe.context.audit`
- `govibe.context.replay`
- `govibe.memory.promote`

All vault/context commands are GoVibe-facing commands backed by MSP parent contracts.

# MSP Parent Tools

GoVibe may use only parent-facing tools such as:

- `msp_workspace_register`
- `msp_context_resolve`
- `msp_context_injection_record`
- `msp_context_replay`
- `msp_knowledge_promote`
- `msp_evidence_record`

The exact internal MSP-to-GKS port is outside the GoVibe contract.

# Ownership Negatives

- GoVibe must not call GKS directly.
- GoVibe must not call GenesisBlockDB directly.
- Executors must not call MSP, GKS, or GenesisBlockDB directly through GoVibe runtime credentials.
- Workspace Private memory is not project source of truth.
- Raw Workspace Private episodes must not be copied wholesale into Global Private memory.
- Private memory must not be promoted to Shared Vault without MSP validation and approval.
- `kvId` must not be issued before the model runtime creates or verifies the KV cache.
- Replay must not substitute newer vault versions silently.

# Runtime Transport

`GOVIBE_MSP_*` configures the single parent transport. New GoVibe runtime code must not require `GOVIBE_GKS_*`. The stdio wire format is newline-delimited JSON-RPC compatible with MCP SDK `StdioServerTransport`.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 3.0.0 | 2026-08-01 | Boss / ATHER | Replaced independent GKS access with mandatory MSP mediation; added vault identity, context profiles, replay lineage, and parent-mediated knowledge promotion. |
| 2.0.2 | 2026-07-30 | ATHER | Fixed the stdio wire contract. |
| 2.0.0 | 2026-07-30 | Boss / ATHER | Added full migration capability contracts. |
