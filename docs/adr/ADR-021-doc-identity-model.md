---
doc_id: "ADR-021-DOC-IDENTITY-MODEL"
uid: "01KVXGFSJPGVABRYG749XV52GJ"
title: "Doc Identity Model: uid + doc_id + path + content_hash"
status: "accepted"
version: "0.1.0+draft"
content_hash: "atom:91de13fcc3d24ede"
updated: "2026-06-25"
owner: "ARCHON / Boss (CEO)"
type: adr
related_docs:
  - "docs/features/genesis-knowledge-system/FEAT-GKS-Node-Identity.md"
  - "docs/features/execution-governance/FEAT-Doc-Content-Integrity.md"
  - "docs/adr/ADR-007-Deterministic-Governance.md"
  - "docs/adr/ADR-019-Universal-Code-In-MCP-Out.md"
---

# Doc Identity Model: uid + doc_id + path + content_hash

**Status:** Accepted

## 1. Context

GoVibe doc governance currently identifies a doc by two coupled handles: its **filename-derived
`doc_id`** and its **path** (used by the registry `Path` column and by `related_docs` crosslinks).
This couples identity to location and name:

- Rename/move a file → the registry `Path` and every inbound `related_docs` break (the `doc_id` in
  frontmatter survives, but references key on path).
- Re-title a doc → the semantic `doc_id` itself would change.
- No content-integrity signal: a body can be edited without bumping `version`, and no gate detects
  the drift (see [[FEAT-DOC-CONTENT-INTEGRITY]]).

This is also the identity contract for the GKS / GenesisBlockDB direction: when content is decomposed
into atoms ([[ADR-019-UNIVERSAL-CODE-IN-MCP-OUT]]), a node needs a stable key that survives both
rename (path change) and edit (content change).

## 2. Decision

Adopt a **four-layer identity model**, separating identity / handle / location / version:

| Layer | Field | Changes when | Form |
|---|---|---|---|
| **Identity** | `uid` | never (mint once, immutable) | ULID (sortable, time-prefixed) |
| **Handle** | `doc_id` | re-title (rare, deliberate) | human `TYPE-SLUG` |
| **Location** | path | rename/move | repo path |
| **Version-identity** | `content_hash` | substantive body edit | `atom:` + sha256 of sorted GKS atom keys |

Rules:
1. `uid` is minted once and frozen; it is the stable node key in the atom graph / GenesisBlockDB.
2. `doc_id` stays human-readable (greppable, semantic) — a handle, not the identity.
3. **References resolve by id, not raw path.** The registry is the single `id → path` resolver, so a
   rename touches one registry row + frontmatter, and inbound `related_docs` survive.
4. `content_hash` is the atom-merkle of the body (excluding frontmatter + Changelog), reusing the
   translator atomizer — forward-compatible with GenesisBlockDB content-addressing.

## 3. Consequences

- **Positive:** rename-safe and re-title-safe references; content drift becomes detectable;
  one stable node id for the future atom store; `doc_id` keeps its human/grep value.
- **Cost:** every governed doc gains `uid` + `content_hash` frontmatter (one-time deterministic
  backfill; the `uid` mint is non-deterministic but frozen-after-mint, unlike the otherwise
  deterministic tooling of [[ADR-007-DETERMINISTIC-GOVERNANCE]]).
- **Staged:** this ADR sets the contract. Implementation splits into [[FEAT-GKS-NODE-IDENTITY]]
  (foundation, GKS) and [[FEAT-DOC-CONTENT-INTEGRITY]] (GoVibe drift-gate consumer). Persisting the
  atom store + JIT retrieval is a later GenesisBlockDB epic, out of scope here.

## 4. Related

- [[FEAT-GKS-NODE-IDENTITY]] — GKS foundation FR (uid + content-address)
- [[FEAT-DOC-CONTENT-INTEGRITY]] — GoVibe drift-gate consumer
- [[ADR-019-UNIVERSAL-CODE-IN-MCP-OUT]] — atoms as the universal interlingua
- [[ADR-007-DETERMINISTIC-GOVERNANCE]] — the governance-tooling contract this extends

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-25 | ARCHON / Boss (CEO) | Proposed the four-layer identity model (uid/doc_id/path/content_hash); references resolve by id; content_hash = atom-merkle. Awaiting owner ratification before implementation. |
