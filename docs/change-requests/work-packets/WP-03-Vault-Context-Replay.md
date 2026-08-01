---
title: "WP-03: Vault, Context, Replay Implementation"
doc_id: "WP-03-VAULT-CONTEXT-REPLAY"
status: "in_progress"
version: "0.1.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-3"
access_scope: "H4"
---

# Objective

Implement the first vertical slice of GoVibe vault identity, context profiles, and replay/audit lineage without allowing GoVibe to call GKS directly.

# Canonical decisions

- `Shared Vault` is the project source of truth for authorized agent teams.
- `Workspace Private Vault` is the primary episodic and experiential memory of one agent in the current workspace.
- `Global Private Vault` contains compressed durable memory promoted from workspace memory.
- `V-space` means workspace. It is not a separate memory tier.
- Context profiles are `T-ctx`, `V-ctx`, `W-ctx`, and `M-ctx`.
- Every injected context records `context_id`, `cache_id`, and optional runtime-issued `kv_id`.
- GoVibe talks only to the MSP parent boundary. MSP mediates GKS access.

# Scope

1. Add canonical architecture documents and schemas.
2. Extend workspace initialization with stable project/workspace/vault identities and `.brain/<project-slug>/` materialization.
3. Add context profile and context lineage helpers.
4. Extend context packets with replay/audit identifiers.
5. Preserve backward compatibility with existing project state where possible.

# Non-goals

- Implementing the MSP server-side vault registry.
- Persisting model-provider KV bytes.
- Implementing full M-ctx turn synchronization transport.
- Direct GKS or GenesisBlockDB connectivity.

# Acceptance criteria

- Workspace initialization creates `.govibe/vaults.json` and `.brain/<project-slug>/manifest.json`.
- Shared, workspace-private, and global-private vault references are distinguishable.
- Context packets validate a canonical context profile.
- Context packets include `contextId`, `cacheId`, `kvId`, source manifest hash, context hash, and parent context ID where applicable.
- No new GoVibe-to-GKS direct port is introduced.
