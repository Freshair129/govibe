---
title: "ADR-022: Vault Ownership and Context Lineage"
doc_id: "ADR-022-VAULT-OWNERSHIP-CONTEXT-LINEAGE"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
---

# Decision

GoVibe adopts three vault roles: project Shared Vault, agent Workspace Private Vault, and agent Global Private Vault. MSP owns vault registration, identity, disclosure, promotion, and context lineage. GKS owns shared project knowledge lifecycle behind MSP. GoVibe does not call GKS directly.

Context assembly uses four profiles: T-ctx, V-ctx, W-ctx, and M-ctx. Every agent injection is bound to a `context_id`, `cache_id`, and optional runtime-issued `kv_id`.

# Consequences

- Workspace initialization creates stable project/workspace IDs and local vault bindings.
- `.brain/<project-slug>/` represents the primary Shared Vault materialization.
- Detailed episodes are written to Workspace Private Vault first.
- Global Private memory is compressed and promoted, not raw-copy synchronized.
- M-ctx creates a parent-linked per-turn context chain and diff record.
- Exact injected packets are retained by `cache_id` for replay and audit.
- Replay distinguishes context reproducibility, execution reproducibility, and identical output.

# Invariants

1. Private memory is not project source of truth.
2. Agents cannot promote private episodes directly into Shared Vault without MSP mediation.
3. GoVibe cannot call GKS or GenesisBlockDB directly.
4. Every injected payload has a cache identity and content hash.
5. A KV cache is invalid when model, tokenizer, system context, tool schema, ordering, or source content changes.
6. Replay never substitutes newer source versions silently.
7. T/V/W/M context profiles do not grant H access scope or alter R/D/W/Budget/Risk.
8. `V-space` means the current workspace and is not a separate memory tier.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.0.0 | 2026-08-01 | Boss / ATHER | Approved vault ownership, context profiles, exact injection retention, parent-only mediation, and replay lineage. |
