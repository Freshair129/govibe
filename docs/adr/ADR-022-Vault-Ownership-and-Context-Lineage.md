---
title: "ADR-022: Vault Ownership and Context Lineage"
doc_id: "ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE"
status: "proposed"
version: "0.1.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
---

# Decision

GoVibe adopts three vault roles: project Shared Vault, agent Workspace Private Vault, and agent Global Private Vault. MSP owns vault registration, identity, disclosure, promotion, and context lineage. GKS owns shared project knowledge lifecycle behind MSP. GoVibe does not call GKS directly.

Context assembly uses four profiles: T-ctx, V-ctx, W-ctx, and M-ctx. Every agent injection is bound to a `context_id`, `cache_id`, and optional runtime-issued `kv_id`.

# Consequences

- Workspace initialization must create stable project/workspace IDs and local vault bindings.
- `.brain/<project-slug>/` represents the primary Shared Vault materialization.
- Detailed episodes are written to Workspace Private Vault first.
- Global private memory is compressed and promoted, not raw-copy synchronized.
- M-ctx creates a parent-linked per-turn context chain and diff record.
- Replay distinguishes context reproducibility, execution reproducibility, and identical output.

# Invariants

1. Private memory is not project source of truth.
2. Agents cannot promote private episodes directly into Shared Vault without MSP mediation.
3. GoVibe cannot call GKS or GenesisBlockDB directly.
4. Every injected payload has a cache identity and content hash.
5. A KV cache is invalid when model, tokenizer, system context, tool schema, ordering, or source content changes.
6. Replay never substitutes newer source versions silently.
