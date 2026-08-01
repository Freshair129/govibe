---
title: "Architecture: Vault and Context Model"
doc_id: "ARCH-VAULT-CONTEXT-MODEL"
status: "proposed"
version: "0.1.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
source_of_truth: true
---

# Vault model

## Shared Vault

A Shared Vault is the governed project source of truth available to authorized agent teams. Its content includes approved requirements, architecture, decisions, contracts, validated observations, and promoted team knowledge.

The project slug is used for the materialized folder name. For project `govibe`, the primary shared-vault materialization is `.brain/govibe/`, not `.brain/govibe-knowledge-block/`.

## Workspace Private Vault

A Workspace Private Vault belongs to one agent in one current workspace. It is the primary store for detailed episodic and experiential memory, task continuity, state snapshots, hypotheses, mistakes, and recovery patterns. It is not project source of truth.

## Global Private Vault

A Global Private Vault belongs to one agent across workspaces. It receives compressed, generalized, privacy-safe durable memory promoted from Workspace Private Vaults. Raw workspace episodes are not copied wholesale into the global vault.

```text
Workspace Private Vault
  -> reflect / deduplicate / redact / compress
  -> Global Private Vault
```

A separate promotion path moves validated project truth into the Shared Vault:

```text
Workspace Private Vault
  -> knowledge candidate
  -> MSP validation and approval
  -> Shared Vault
```

# Identity and registry

Every vault has an immutable `vault_id`. Records bind vaults to the relevant `project_id`, `workspace_id`, and `agent_id`.

- Shared project vault: requires `project_id`; `agent_id` is absent.
- Workspace private vault: requires `agent_id`, `project_id`, and `workspace_id`.
- Global private vault: requires `agent_id`; project/workspace bindings are absent or contextual.

The Vault Registry is parent-owned by MSP because it spans project knowledge, agent identity, disclosure, and private memory. GoVibe uses MSP-facing contracts only. MSP mediates access to GKS; GoVibe must not call GKS or GenesisBlockDB directly.

# Local materialization

```text
<workspace>/.govibe/
  config.json
  project-state.json
  skill-lock.json
  vaults.json

<workspace>/.brain/
  <project-slug>/          # primary Shared Vault materialization
  private/<agent-id>/      # optional Workspace Private Vault materialization
  <mounted-project-slug>/  # mounted Shared Vault from another project
```

Local `.brain` content is a materialization or governed source artifact. Canonical identity and lifecycle are resolved by registry references and version/hash metadata, never by folder name alone.

# Context assembly profiles

## T-ctx

Loads system context plus one event or task context. It is normally used for workers and headless agents.

## V-ctx

Loads the agent Global Private Vault and current Workspace Private Vault. It is the standard memory profile for ordinary stateful GoVibe agents.

## W-ctx

Loads V-ctx plus exactly one active multi-agent workflow. It is normally used for orchestrators, lead agents, and final gates.

## M-ctx

Synchronizes and loads Global Private and current Workspace Private context, checks diffs every turn, and produces real-time shared context. It is normally used for review gates and audit agents.

Context profile is independent from execution governance. `T/V/W/M-ctx` do not determine H access scope, R retrieval radius, D resolution depth, W fan-out, budget, or risk.

# Context lineage

Every injected context must be auditable:

- `context_id`: logical context assembly identity.
- `cache_id`: materialized/serialized context snapshot identity.
- `kv_id`: optional model-runtime KV cache identity issued after ingestion.

```text
Vault/source versions
  -> context assembly
  -> context_id
  -> materialized packet
  -> cache_id
  -> agent injection
  -> optional kv_id
  -> turn result
```

Replay must preserve exact source versions and hashes. It must not silently substitute current vault versions. M-ctx forms an append-only `parent_context_id` chain with a per-turn diff reference.
