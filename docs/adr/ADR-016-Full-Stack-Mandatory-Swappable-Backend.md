---
doc_id: "ADR-016-FULL-STACK-MANDATORY-SWAPPABLE-BACKEND"
title: "ADR-016: Mandatory GoVibe + MSP core; full eco optional (tiered); swappable storage backend"
status: "accepted"
version: "0.2.0"
updated: "2026-06-22"
owner: "Boss (CEO)"
type: adr
---

# ADR-016: Mandatory GoVibe + MSP core; full eco optional (tiered); swappable storage backend

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
We must place the Compute / Retriever layer. Options: **(A) hexagonal/portable** — Compute as an orchestrator-agnostic service so any orchestrator (MSP / LangGraph / custom) can host it; **(B) vertically-integrated** — require GoVibe + MSP, swap only the storage backend. (A) maximizes portability but multiplies adapter + integration cost; (B) maximizes performance and coherence for a solo owner who controls the whole eco. Interop for *external* orchestrators is handled separately by the translator/bridge model (ADR-017), so (B) does not actually wall others out at the data level.

## 2. Decision
- **The mandatory CORE is GoVibe + MSP** (governance + the memory/soul passport) — so the moat (governance + provenance) is never hollow. Compute + Retriever live in MSP (per `FRAMEWORK--MSP-ARCHITECTURE-V2`; MSP Spec §13 4-layer retrieval).
- **Adoption is tiered (NOT all-or-nothing).** *Partial* = run the GoVibe+MSP core as a governance/translation layer over your **own** orchestration + tools (you lose only full-eco features). *Full eco* (optional) adds **GenesisBlockDB** + the visual GKS UI (ERD / DAG / node graph) + the `.agents` orchestrator + native-GKS rendering (token-efficient, end-to-end traceable).
- **Only the storage BACKEND is swappable** behind a driver interface: **GenesisBlockDB** (default), Obsidian, or another vector/graph DB.
- External orchestrators interoperate via the MCP + GKS translation (ADR-017), **not** by hosting GoVibe's Compute themselves.

## 3. Consequences
- (+) Maximum end-to-end performance; no per-orchestrator Compute adapters; single coherent eco.
- (+) Backend portability retained (driver interface).
- (+) Lower adoption friction + clear upgrade path (partial core → full eco); better GTM for the solo/SEA beachhead while the core still guarantees governance + provenance.
- (−) Adopters who want GoVibe's Compute in-process are coupled to MSP.
- (−) Solo maintenance / bus-factor risk across the full stack — accepted, mitigated by leading with the governance moat and treating decomposition/generation as enabling-infra.

## 4. Related
[[ADR-017-GoVibe-Governance-Translator-GKS-Interlingua]], `FRAMEWORK--MSP-ARCHITECTURE-V2`, `BRD-GoVibe-Platform`.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-06-22 | Boss (CEO) | Amended to Option B: mandatory unit is the GoVibe+MSP **core**; the full eco (GenesisBlockDB, visual GKS UI, `.agents` orchestrator, native-GKS rendering) is **optional/tiered** — partial adopters run the core over their own orchestration. Storage backend remains swappable. |
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided full-stack-mandatory (GoVibe+MSP) with swappable storage backend. |
