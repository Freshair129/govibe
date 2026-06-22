---
doc_id: "ADR-015-MASTER-ESSENCE-VS-GOV-POLICY"
title: "ADR-015: 'Master' = essence tier; root governance policy → GOV-- prefix"
status: "accepted"
version: "0.1.0"
updated: "2026-06-22"
owner: "Boss (CEO)"
type: adr
---

# ADR-015: "Master" = essence tier; root governance policy → `GOV--`

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
"Master" drifted into three meanings across the lineage: **(T1) Master Log** = the index + provenance spine cataloguing all blocks; **(T2) Master Block** = the *essence* tier (knowledge promoted when it has the 4 dimensions Algo/Concept/Frame/Proto **and** a cross-model-stable definition); **(matured)** **MASTER--** = *root governance policy* (authority rank 3, e.g. `MASTER--DOC-TO-CODE`). One word doing three jobs creates ambiguity in every document that references it.

## 2. Decision
- **"Master Block" means the essence / canonical-knowledge tier only.**
- **"Master Log" means the index + provenance/lineage spine** (its T1 origin).
- **Root governance policy gets its own prefix `GOV--` / `GOVERNANCE--`** (no longer `MASTER--`).
- SSOT authority order keeps the policy role, just renamed: `Code > PROTO > GOV > ADR > FRAMEWORK/GENESIS > KNOWLEDGE-TYPES > CONCEPT/FEAT/BLUEPRINT`.

## 3. Consequences
- (+) Removes the collision; "Master" returns to its index/essence origin.
- (+) `GOV--` is self-evidently "policy"; clearer than overloaded `MASTER--`.
- (−) Migration: existing `MASTER--*` *policy* atoms must be renamed to `GOV--*` (essence/index atoms are untouched).

## 4. Related
`SPEC-Genesis-Block`, `KNOWLEDGE-HIERARCHY-AND-SSOT`, [[ADR-018-Structural-Decomposition-Containment-Wikilink]].

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-22 | Boss (CEO) | Initial decision: Master = essence/index; `GOV--` = policy. |
