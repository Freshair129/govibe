---
doc_id: "ADR-018-STRUCTURAL-DECOMPOSITION-CONTAINMENT-WIKILINK"
uid: "01KVXGFSJJS266CQDJ62AWA3JE"
title: "ADR-018: Structural decomposition = single containment tree + wikilink cross-link graph"
status: "accepted"
version: "0.1.1"
content_hash: "atom:fc39957e4ae3cb6e"
updated: "2026-06-29"
owner: "Boss (CEO)"
type: adr
related_docs:
  - "docs/adr/ADR-015-Master-Essence-vs-GOV-Policy.md"
---

# ADR-018: Structural decomposition = containment tree + wikilink graph

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
How to catalog systems/modules/features. Textbook enterprise-architecture keeps two orthogonal catalogs (functional Feature vs structural Component) linked by a traceability matrix. The Hector model (FRAMEWORK_MASTER_SPEC base) instead uses a single compositional containment tree where Feature is a structural level.

## 2. Decision
Adopt a **single COMPOSITIONAL containment tree**:
`PLAT → SYS → SUBSYS → MOD → SUBMOD → FEAT → COMP → CLASS → METH`
- The **prefix is the stable type**; the `L0–L7` numbers are **relative depth** within a Hector-compacted chain (a prefix appears at different L-levels by height).
- **Compaction Height (D1–D5)** controls how many levels compact into one physical `.md` (Storage Layer). *(Renamed from "Hector Height H1–H5"; "H" is reserved for the Context-Hop scale H0–H6 — see [[ADR-022-Compaction-Height-Rename-H-to-D]].)*
- **Cross-cutting / cross-system links use wikilink edges `[[TYPE::Name]]`** (an atom has one physical containment "primary owner" but N inbound references), constrained by the **Acyclic Backlink Invariant** (crosslinks flow upward; no cycles).
- **Relationship criticality is auto-derived** from the dependency graph — *support* (reached only via a parent), *core* (shared + remove ⇒ system dead), *central* (shared + remove ⇒ feature loss only) — computed via GenesisBlockDB K-Impact `R(n)=0.5·DD+0.3·AS+0.2·SC`, not hand-labeled.

## 3. Consequences
- (+) Single source, two projections (tree-view + graph-view); no doc duplication.
- (+) Cross-cutting features handled by wikilinks, not copies.
- (−) Every atom needs a primary containment owner.
- (−) The wikilink graph + acyclic check must be first-class (validated).

## 4. Related
`SPEC-Genesis-Block`, `FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS`, GenesisBlockDB K-Impact, [[ADR-015-Master-Essence-vs-GOV-Policy]].

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided single containment tree + wikilink cross-link graph; criticality auto-derived. |
| 0.1.1 | 2026-06-29 | Boss (CEO) | Body reference "Hector Height H1–H5" → "Compaction Height D1–D5"; the H→D rename is owned by ADR-022. |
