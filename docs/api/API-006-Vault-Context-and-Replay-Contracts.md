---
title: "API: Vault, Context, and Replay Contracts"
doc_id: "API-006-VAULT-CONTEXT-REPLAY-CONTRACTS"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
source_of_truth: true
related_docs:
  - "docs/architecture/ARCH-Vault-and-Context-Model.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
  - "docs/api/API-004-Task-Scoped-Context-Packet-Schema.md"
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
---

# Boundary

Claude Code and other executors call GoVibe MCP. GoVibe calls MSP only. MSP owns Vault Registry, private memory, context resolution, injection lineage, replay authorization, evidence, and mediation to GKS. No GoVibe-facing GKS or GenesisBlockDB capability is valid.

# Context Profiles

```ts
type ContextProfile = "T-ctx" | "V-ctx" | "W-ctx" | "M-ctx";
```

- `T-ctx`: system plus one task/event context; private history is not loaded implicitly.
- `V-ctx`: Agent Global Private plus current Workspace Private context.
- `W-ctx`: V-ctx plus exactly one active multi-agent workflow.
- `M-ctx`: per-turn synchronized Global/Workspace context with diff lineage and real-time shared context.

# Workspace Vault Bindings

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

The project Shared Vault materializes at `.brain/<project-slug>/`. An Agent Workspace Private Vault materializes at `.brain/private/<agent-id>/`. Global Private memory is parent-managed and represented by immutable vault identity/reference, not copied into every workspace.

# Context Lineage

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

- `contextId` identifies logical assembly.
- `cacheId` identifies the exact persisted packet.
- `kvId` is issued only by a model runtime after ingestion.
- `parentContextId` forms M-ctx turn lineage.
- hashes bind exact sources and payload.

# Local Retention

GoVibe persists:

```text
.govibe/contexts/<cacheId>.json
.govibe/context-injections/<injectionId>.json
```

The cache file stores the exact injected packet and packet hash. The injection record binds Agent, project, workspace, session, run, turn, profile, context/cache/KV IDs, source/context hashes, diff reference, and replay requirements.

# Parent-facing MSP Tools

- `msp_workspace_register`
- `msp_context_resolve`
- `msp_context_injection_record`
- `msp_context_replay`
- `msp_knowledge_promote`
- `msp_evidence_record`

GoVibe commands may expose `govibe.context.*`, `govibe.vault.*`, and `govibe.memory.promote`, but their implementation must use these MSP-facing contracts only.

# Knowledge Promotion

Producing scan stages submit `govibe-knowledge-candidate/v1` to MSP with provenance. MSP applies identity, disclosure, promotion, and Shared Vault policy before mediating GKS. Returned `gks:` references are opaque references and do not expose a direct GKS connection.

# Replay

Replay inputs bind exact `contextId`, `cacheId`, optional `kvId`, source versions, model/runtime metadata, system context hash, tool-schema hash, ordering version, and external-state assumptions.

Replay outputs report separately:

- context reproducibility;
- execution reproducibility;
- output identity.

Newer source versions may not be substituted silently. Missing exact versions yield an explicit non-reproducible result.

# KV Rules

A KV record binds `kvId` to `cacheId`, model/version, tokenizer, runtime, tool-schema hash, system-context hash, context hash, ordering version, creation time, and lifecycle status. Any mismatch invalidates reuse.

# Invariants

1. Every dispatched turn has one context injection record.
2. Every injection points to one exact context cache.
3. Every reusable KV points to the cache from which it was derived.
4. T-ctx does not load private history implicitly.
5. W-ctx has exactly one active workflow.
6. M-ctx after its first turn has a parent context and diff lineage.
7. Private memory is not Shared Vault SOT.
8. GoVibe does not call GKS or GenesisBlockDB directly.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-01 | Boss / ATHER | Approved vault binding, context profiles, exact injection retention, MSP-mediated promotion, replay, audit, and KV lineage contracts. |
