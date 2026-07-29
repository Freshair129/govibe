# Candidate Archive Review

**Status:** archived reference
**Updated:** 2026-06-12
**Purpose:** preserve legacy HTML prototypes while keeping SSOT in `docs/`

This folder stores the three files that used to live in `G:\govibe\candidate\`. They are kept as reference only; the canonical sources remain the product docs and feature specs under `docs/`.

## Disposition

| Archived file | Classification | Current SSOT counterpart | Decision |
|---|---|---|---|
| `hector-compaction-explorer.html` | Legacy concept/demo | `docs/CONCEPT--HYBRID-JIT-CONTEXT.md`, `docs/STD-Execution-Governance.md`, `docs/features/genesis-knowledge-hcs/*` | Archive only |
| `data-architecture-hnsw-explorer.html` | Legacy explainer/demo | `docs/features/genesis-knowledge-system/FEAT-HNSW-Vector-Space.md`, `docs/features/genesis-knowledge-system/FEAT-GenesisBlockDB-Core.md` | Archive only |
| `genesisdb-obsidian-production-workflow.html` | Workflow prototype | `docs/CONCEPT--HYBRID-JIT-CONTEXT.md`, `docs/CONCEPT--HYBRID-RETRIEVAL-FTS-LAYER.md`; the former Markdown Renderer feature spec was retired | Archive + retain as reference |

## Notes

- The archive is intentionally not the source of truth.
- The current docs already cover the core requirements behind these prototypes.
- The only extra value from the workflow prototype is the operational detail around batch ingest and virtual rendering, which is already consistent with the JIT context model.

