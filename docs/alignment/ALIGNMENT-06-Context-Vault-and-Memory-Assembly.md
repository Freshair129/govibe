---
title: "Alignment 06: Context, Vault, and Memory Assembly"
doc_id: "ALIGNMENT-06-CONTEXT-VAULT-MEMORY-ASSEMBLY"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
type: "alignment"
source_of_truth: false
conforms_to:
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/api/API-006-Vault-Context-and-Replay-Contracts.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
---

# Purpose

This document maps context and memory vocabulary to canonical contracts. It must not introduce a parallel context-tier system.

# Vault hierarchy

- Shared Vault: governed project source of truth for authorized Agent Teams.
- Workspace Private Vault: detailed episodic and experiential memory for one Agent in the current workspace.
- Global Private Vault: compressed, reusable, privacy-safe durable memory for one Agent across workspaces.

`V-space` means workspace. It is not a fourth vault or memory tier.

# Context profiles

| Profile | Assembly contract |
|---|---|
| T-ctx | system context plus one task/event context |
| V-ctx | Agent Global Private plus current Workspace Private context |
| W-ctx | V-ctx plus exactly one active multi-agent workflow |
| M-ctx | per-turn synchronized Global/Workspace context with diff and parent lineage |

Shared Vault material may be selected into system/task/workflow context under policy, but it is not silently added as an extra mandatory source to every profile.

# Lineage and replay

Every dispatched turn binds:

- `contextId` for logical assembly;
- `cacheId` for the exact retained packet;
- optional runtime-issued `kvId`;
- Agent, project, workspace, session, run and turn identity;
- source versions and hashes;
- `parentContextId` and diff reference for M-ctx.

Replay must not silently replace an unavailable historical source version with the current version.

# Memory promotion

```text
Workspace Private
  -> reflection / deduplication / redaction / compression
  -> Global Private

Workspace Private
  -> validated knowledge candidate
  -> MSP approval and promotion
  -> Shared Vault
```

Private experience is not Shared truth. Raw episodic turns must not be copied wholesale into Global Private memory.

# Axis separation

Context profile is not access scope, retrieval radius, resolution depth, fan-out, budget or risk:

```text
T/V/W/M-ctx != H
T/V/W/M-ctx != R
T/V/W/M-ctx != D
T/V/W/M-ctx != W axis
```

Legacy `context_tier` fields must be classified and migrated rather than renamed blindly.
