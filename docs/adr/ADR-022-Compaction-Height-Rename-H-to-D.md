---
doc_id: "ADR-022-COMPACTION-HEIGHT-RENAME-H-TO-D"
uid: "01KW7MW5KNGSPY9SM28Z90RR0H"
title: "ADR-022: Compaction Height label renamed H→D (resolve collision with Context-Hop H0–H6)"
status: "accepted"
version: "0.1.0"
content_hash: "atom:1439c5cdb4d2acca"
updated: "2026-06-29"
owner: "Boss (CEO)"
type: adr
related_docs:
  - "docs/adr/ADR-018-Structural-Decomposition-Containment-Wikilink.md"
  - ".agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md"
  - "docs/specs/SPEC-Genesis-Block.md"
  - ".agents/.devlog/CHECKPOINT-2026-06-22-Architecture-Session.md"
---

# ADR-022: Compaction Height renamed H→D

**Status:** Accepted
**Decided:** 2026-06-22 (Architecture Session) · **Formalized:** 2026-06-29
**Owner:** Boss (CEO)

## 1. Context
Two orthogonal scales were both labelled "H", with inverted meaning — a recurring source of confusion across the GKS docs:

- **Context Hop (H0–H6)** — retrieval / tool-access radius. H0 = single file (no surrounding context); H6 = full-network ceiling. *Higher H = wider scope.*
- **Compaction Height (originally "Hector Height" H1–H5)** — how many structural levels pack into one physical `.md`. H5 = 3 layers; H1 = 8 layers (deep). *Higher number = fewer layers* — the inverse direction.

The same letter meaning two inverted things forced every reader (and the author) to disambiguate by context. The collision was identified in the 2026-06-22 architecture session ([[CHECKPOINT-2026-06-22-Architecture-Session]]) and the rename was decided there, but it was never written as its own ADR — it was mis-cited inline as "[ADR-018]" (ADR-018 actually decides the containment tree), and several specs still used the old "H" naming for compaction.

## 2. Decision
- **Compaction Height is renamed `D` (D1–D5).** `D` = structural-layer packing depth in one physical `.md`.
- **`H` is reserved exclusively for the Context-Hop scale (H0–H6).**
- **SWE abstraction mapping:** D5 ≈ HLD/Architecture · D4 ≈ SDD · D3 ≈ SDD↔LLD · D2 ≈ LLD · D1 ≈ LLD/Code.
- Layer counts (carried unchanged from the prior model): D5 = 3 layers · D4 = 4 · D3 = 5 · D2 = 6 · D1 = 8.
- This ADR owns the rename decision; ADR-018 stays scoped to the containment-tree decision and is updated only to use the new label.

## 3. Consequences
- (+) "H" now has a single, unambiguous meaning across all GKS docs.
- (+) The three orthogonal axes are cleanly separable: **H** (hop / scope) · **D** (compaction) · **T** (dispatch tier).
- (−) One-time sweep required across docs that used compaction-as-H.

### Docs updated for the rename (2026-06-29)
- `.agents/FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS.md` (§2 heading + Hierarchy Resolution Map + citation)
- `docs/adr/ADR-018-Structural-Decomposition-Containment-Wikilink.md` (body reference)
- `docs/specs/SPEC-Genesis-Block.md` (§3 mapping table)
- `docs/srs/SRS-Genesis-Block.md` (FR-3)
- `docs/srs/SRD-Genesis-Block.md` (R-02)
- `docs/architecture/SDD-Genesis-Block.md` (compaction-range subgraph)

Left on the OLD label intentionally as historical record: `.agents/.devlog/CHECKPOINT-2026-06-22-Architecture-Session.md`, `docs/archive/candidate/hector-compaction-explorer.html`.

## 4. Related
`FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS`, `SPEC-Genesis-Block`, [[ADR-018-Structural-Decomposition-Containment-Wikilink]], [[CHECKPOINT-2026-06-22-Architecture-Session]].

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-29 | Boss (CEO) | Formalized the 2026-06-22 decision to rename Compaction Height H1–H5 → D1–D5; reserved H for Context-Hop H0–H6. Swept GKS docs. |
