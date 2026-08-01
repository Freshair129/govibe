---
title: "API: Vault, Context, Link, Impact, and Replay Contracts"
doc_id: "API-006-VAULT-CONTEXT-REPLAY-CONTRACTS"
status: "approved"
version: "1.1.0"
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

GoVibe commands may expose `govibe.context.*`, `govibe.vault.*`, `govibe.memory.promote`, and `govibe.workspace.impact`, but their implementation must use MSP-facing contracts for canonical or cross-vault operations.

# Knowledge Promotion

Producing scan stages submit `govibe-knowledge-candidate/v1` to MSP with provenance. MSP applies identity, disclosure, promotion, and Shared Vault policy before mediating GKS. Returned `gks:` references are opaque references and do not expose a direct GKS connection.

Deep Scan may create candidate identities such as `document_candidate_id`, `atom_candidate_id`, `symbol_candidate_id`, and `link_candidate_id`. Only GKS may assign canonical `document_id`, `document_version_id`, `atom_id`, `symbol_id`, `entity_id`, or `relation_id`.

# Link candidate contract

```ts
type KnowledgeLinkCandidate = {
  schema: "govibe-knowledge-link-candidate/v1";
  candidate_id: string;
  link_type: "wikilink" | "crosslink" | "symbol_link" | "reference" | "import" | "call" | "inheritance";
  relation_type?: string;
  source: {
    candidate_ref: string;
    path?: string | null;
    span?: Record<string, unknown> | null;
  };
  target: {
    label: string;
    candidate_ref?: string | null;
    canonical_ref?: string | null;
  };
  provenance: {
    run_id: string;
    stage: number;
    source_hash: string;
    source_path?: string | null;
    source_line?: number | null;
  };
  confidence: number;
  resolution_state?: "unresolved" | "resolved_candidate" | "submitted" | "rejected" | "canonicalized";
};
```

Stage 3 discovers Markdown wikilink/reference candidates. Stage 5 discovers symbols and call links. Stages 6-8 add route, tool, and ORM relations. Stage 9 resolves cross-file imports and references. Stage 10 resolves inheritance. Stages 11-12 may add community and process relations.

# Canonical links and backlinks

GKS canonicalizes accepted link candidates into relation records with stable `relation_id`, typed source/target identities, lifecycle status, temporal validity, confidence, and provenance.

A backlink is an incoming-edge projection:

```text
source --relation_id/relation_type--> target
backlink(target) = { source, relation_id, relation_type }
```

Backlink indexes may be materialized by GKS/GenesisBlockDB or locally for the observed workspace graph. Materialization never creates a second semantic relation and must preserve the original relation identity.

# Impact query

```ts
type ImpactQuery = {
  schema: "govibe-impact-query/v1";
  workspace_path: string;
  change_type:
    | "editorial"
    | "schema_additive"
    | "schema_breaking"
    | "semantic_change"
    | "authority_boundary_change"
    | "runtime_behavior_change";
  seeds: Array<{
    kind: "path" | "document_id" | "atom_id" | "symbol_id" | "concept";
    value: string;
  }>;
  max_distance?: number;
  minimum_score?: number;
  include_unresolved?: boolean;
};
```

The current GoVibe local runtime resolves path and document-ID seeds from the observed workspace graph. Canonical atom, symbol, and concept seeds require MSP-mediated GKS resolution before traversal.

# Impact result

`govibe-impact/v2` returns:

- `change_id` and `change_type`;
- resolved seeds;
- affected artifacts sorted by impact score;
- graph distance and relation chain;
- human-readable reason;
- `must_update`, `review_and_update`, or `review` action;
- unresolved links;
- graph coverage summary and traversal policy;
- backward-compatible `references` containing affected paths.

Impact score is derived from relation weight, distance decay, change severity, and relation confidence. Traversal must be cycle-safe and bounded by `max_distance` and `minimum_score`.

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
9. Deep Scan creates candidates; GKS assigns canonical knowledge identities.
10. Backlinks preserve the forward relation identity and direction.
11. Every impact result explains why each artifact is affected.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.1.0 | 2026-08-01 | Boss / ATHER | Added Deep Scan link-candidate ownership, canonical relation/backlink projection, and explainable impact query/result contracts. |
| 1.0.0 | 2026-08-01 | Boss / ATHER | Approved vault binding, context profiles, exact injection retention, MSP-mediated promotion, replay, audit, and KV lineage contracts. |
