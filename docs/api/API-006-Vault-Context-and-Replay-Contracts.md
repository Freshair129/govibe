---
title: "API: Vault, Context, and Replay Contracts"
doc_id: "API-006-VAULT-CONTEXT-REPLAY-CONTRACTS"
status: "proposed"
version: "0.1.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
---

# Boundary

Claude Code and other executors call GoVibe MCP. GoVibe calls the MSP parent boundary only. MSP owns vault registration, private memory, context resolution, injection lineage, replay authorization, and mediation to GKS. No GoVibe-facing GKS or GenesisBlockDB tool is part of this contract.

# Context profiles

```ts
type ContextProfile = "T-ctx" | "V-ctx" | "W-ctx" | "M-ctx";
```

- T-ctx: system plus one task/event context.
- V-ctx: global private plus current workspace private context.
- W-ctx: V-ctx plus one active multi-agent workflow.
- M-ctx: per-turn synchronized global/workspace context with diff lineage and real-time shared context.

# Vault bindings

```ts
type WorkspaceVaultBindings = {
  schema: "govibe-workspace-vault-bindings/v1";
  project_id: string;
  workspace_id: string;
  primary_shared_vault: VaultBinding;
  workspace_private_vaults: VaultBinding[];
  global_private_vault: VaultBinding;
  mounted_shared_vaults: VaultBinding[];
};
```

The primary Shared Vault materializes at `.brain/<project-slug>/`. Workspace-private memory may materialize at `.brain/private/<agent-id>/`. Global-private memory is parent-managed and normally represented by a reference rather than copied into the repository.

# Context packet extension

API-004 packets gain these fields:

```ts
type ContextLineage = {
  contextProfile: ContextProfile;
  contextId: string;
  cacheId: string;
  kvId: string | null;
  parentContextId: string | null;
  sourceManifestHash: string;
  contextHash: string;
};
```

`contextId` identifies the logical assembly. `cacheId` identifies the materialized payload. `kvId` is issued by the model runtime after ingestion and must remain null before that event.

# Parent-facing MCP capabilities

Target capabilities are:

- `govibe.context.resolve`
- `govibe.context.diff`
- `govibe.context.replay`
- `govibe.context.audit`
- `govibe.vault.status`
- `govibe.vault.mount`
- `govibe.memory.promote`

These capabilities are GoVibe commands backed by MSP-facing contracts. They do not expose GKS directly.

# Replay invariants

1. Replay preserves exact source versions, policy, ordering, and hashes.
2. M-ctx records append-only `parentContextId` lineage each turn.
3. KV reuse requires matching model, tokenizer, tool schemas, system context, ordering, and source content.
4. Context reproducibility, execution reproducibility, and output identity are reported separately.
5. Newer vault versions are never substituted silently.
