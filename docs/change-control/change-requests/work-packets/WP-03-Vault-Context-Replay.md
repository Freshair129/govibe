---
title: "WP-03: Vault, Context, Link, Impact, Replay, and Alignment Implementation"
doc_id: "WP-03-VAULT-CONTEXT-REPLAY"
status: "completed"
version: "1.1.1"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-3"
access_scope: "H4"
---

# Objective

Implement the GoVibe vault identity, context profiles, exact context replay/audit lineage, Deep Scan link discovery, backlink indexing, explainable impact analysis, and alignment-to-canonical documentation propagation without allowing GoVibe to call GKS directly.

# Canonical decisions

- `Shared Vault` is the project source of truth for authorized agent teams.
- `Workspace Private Vault` is the primary episodic and experiential memory of one agent in the current workspace.
- `Global Private Vault` contains compressed durable memory promoted from workspace memory.
- `V-space` means workspace. It is not a separate memory tier.
- Context profiles are `T-ctx`, `V-ctx`, `W-ctx`, and `M-ctx`.
- Every injected context records `context_id`, `cache_id`, and optional runtime-issued `kv_id`.
- GoVibe talks only to the MSP parent boundary. MSP mediates GKS access.
- Deep Scan creates document/atom/symbol/link candidates; GKS assigns canonical identities.
- Backlinks are reverse projections of existing forward relations.
- Impact analysis traverses backlinks and explains affected artifacts, distance, score, and action.
- Alignment documents are registered non-SOT conformance mappings. Canonical API/ADR/Architecture/Blueprint documents remain authoritative.

# Implemented scope

1. Added canonical architecture, ADR, API, Blueprint, Agent, and Claude guidance.
2. Added vault, memory, context, cache, injection, KV, replay, link, and impact schemas.
3. Extended workspace initialization with stable project/workspace/vault identities and `.brain/<project-slug>/` materialization.
4. Added context profile, context lineage, exact-packet persistence, injection recording, and replay integrity helpers.
5. Removed active direct-GKS runtime behavior and routed knowledge candidates through MSP promotion.
6. Extended Deep Scan Markdown and symbolic stages with wikilink, reference, call, import, and inheritance candidates.
7. Preserved unresolved link evidence in scan promotion and proof payloads.
8. Replaced substring-only workspace impact search with cycle-safe backlink traversal over an observed file/link graph.
9. Added explainable `govibe-impact/v2` results with relation chain, distance, score, action, unresolved links, and graph coverage.
10. Added unit coverage for backlink construction, transitive impact, and cycle handling.
11. Added `ALIGNMENT-01`, `ALIGNMENT-04`, `ALIGNMENT-06`, and `ALIGNMENT-12` as conformance documents with `conforms_to` links to canonical owners.
12. Registered alignment documents in `DOC-VERSION-REGISTRY.md` and corrected stale canonical document version/status entries.

# Alignment model

```text
Alignment document
  -> conforms_to canonical API / ADR / Architecture / Blueprint
  -> source_of_truth: false
  -> registered for traceability and backlink discovery
```

When an alignment mapping conflicts with a canonical owner, the canonical document wins and the alignment mapping must be revised.

# External boundary

The MSP server-side Vault Registry, canonical relation resolver, GKS materialization, and provider-owned KV byte storage are external services. This repository implements and verifies the GoVibe contracts, client boundary, local exact-context retention, observed-link graph, impact engine, and documentation conformance mapping. It does not pretend to modify inaccessible parent services.

# Acceptance criteria

- Workspace initialization creates `.govibe/vaults.json`, Shared Vault materialization, and Workspace Private materialization.
- Shared, Workspace Private, and Global Private vault references are distinguishable and stable.
- Context packets validate T/V/W/M profiles and retain context/cache/KV lineage.
- Exact injected packets and injection records are persisted and hash-verifiable.
- Deep Scan creates candidate links and submits them through MSP, never a direct GKS client.
- Wikilinks, explicit references, relative imports, calls, and inheritance links are represented as observed candidates.
- Backlinks preserve the original forward relation identity.
- `workspaceImpact` returns direct/transitive affected artifacts with explanations and remains backward compatible through `references`.
- Impact traversal is cycle-safe, distance-bounded, and reports unresolved targets.
- Alignment 01/04/06/12 are traceable to canonical owners and registered as non-SOT conformance documents.
- Tests, docs validation, lint, MCP smoke, build, and E2E pipeline pass on the final verified implementation head.

# Verification evidence

- Implementation and alignment/registry verification head: `fb56caa5ccf6871f7f73d0487abf29755e235c1a`.
- GitHub Actions workflow: `E2E Tests — CI Pipeline`.
- Workflow run: `122`.
- Result: `success`.
- PR remained mergeable and ready for review after verification.

# Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.1.1 | 2026-08-01 | Boss / ATHER | Closed WP-03 after successful final alignment/registry CI verification on run 122. |
| 1.1.0 | 2026-08-01 | Boss / ATHER | Added alignment conformance ingestion, registry propagation, canonical ownership rules, and traceability acceptance criteria. |
| 1.0.0 | 2026-08-01 | Boss / ATHER | Expanded WP-03 to full vault/context/replay plus Deep Scan links, backlinks, and explainable impact implementation. |
| 0.1.0 | 2026-08-01 | Boss / ATHER | Initial implementation work packet. |
