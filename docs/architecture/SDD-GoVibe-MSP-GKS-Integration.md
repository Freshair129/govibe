---
doc_id: "SDD-GOVIBE-MSP-GKS-INTEGRATION"
title: "SDD: GoVibe ↔ MSP ↔ GKS ↔ GenesisBlockDB integration"
status: "draft"
version: "0.1.2+draft"
updated: "2026-06-23"
owner: "Boss (CEO)"
type: sdd
---

# SDD: GoVibe ↔ MSP ↔ GKS ↔ GenesisBlockDB integration

## 1. Context
GoVibe is the **cognitive-layer** surface; it must consume MSP/GKS/GenesisBlockDB rather than re-build memory/governance (ADR-016). Today GoVibe's MCP server exposes **10 `govibe.*` tools and ZERO `msp_*`** — the wrap is intended but not yet wired. This SDD specifies the boundary.

## 2. Layered architecture
```
GoVibe (surface: input · orchestrate · govern)        ← cognitive layer
   │  consumes (MCP)
MSP (Memory OS / passport · 4-layer retrieval §13)    ← gate to GKS
   │  storage primitives
GKS (atomic .md corpus + atomic_index/backlinks)      ← Storage Layer (Human SSOT)
   │  driver
GenesisBlockDB (graph+vector+governance+bitemporal)   ← backend (swappable)
```

## 2a. Naming (canonical)

To resolve the "Memory OS" label collision:
- **MemoryOS V3** = umbrella name for the whole memory subsystem (MSP + GKS + GenesisBlockDB). Not any single layer.
- **MSP** = the memory passport / management layer (sessions, episodic, retrieval, validation). Do not call it "Memory OS".
- **GenesisBlockDB** = the swappable storage backend (graph + vector + bitemporal). Do not call it "MemoryOS V3".

Docs that label MSP as "Memory OS" or GenesisBlockDB as "MemoryOS V3" are reconciled to this definition.

## 3. Contracts (the wiring surface)
| Contract | Direction | Spec |
|---|---|---|
| `API-004` ContextPacket | MSP → GoVibe | approved packet schema (Virtual Document) |
| `gks_lookup` / `gks_recall` / `gks_backlinks` | MSP → GKS/backend | 4-layer retrieval (`SRS-GKS-RETRIEVAL-LAYER`) |
| `query_genesis_graph(target, hops)` | GoVibe → MSP/Compute | JIT hop-limited render (to be added as the 11th GoVibe MCP tool) |
| `msp_remember` / `msp_recall` | GoVibe → MSP | write/read memory (sessions→episodic→compressor) |
| governance tiers MASTER/SPEC/GOV/ADR/USER | enforced in GenesisBlockDB engine | defense-in-depth gate |

## 4. Design decisions (refs)
- **ADR-016** full-stack-mandatory (GoVibe+MSP), only backend swappable.
- **ADR-017** GoVibe = translator; GKS = interlingua (`A1 ⇄ GKS ⇄ A25`); ride MCP/A2A.
- **ADR-018** containment tree + wikilink graph; criticality auto-derived (K-Impact).
- **ADR-019** universal code-in (12-step) + MCP-out (7-phase).

## 5. Integration plan (wiring gap → wired)
1. Add MSP client to GoVibe's MCP runtime; expose `query_genesis_graph` (tool #11).
2. Route `govibe.doc.create` / context loads through MSP retrieval (API-004), not the narrow `roadmap-parser.mjs`.
3. Bind GenesisBlockDB as the `StorageDriver` (default); keep Obsidian as an alternate driver.
4. Inherit GenesisBlockDB in-engine governance tiers; surface drift events as GoVibe Tension/verify signals (closes audit #1 at runtime).
5. Layer per-agent memory units on MSP/GKS per `FEAT-PER-AGENT-MEMORY-UNIT` (episodic-unit schema, 8-8-8 distillation, Verify-Gate promotion, LCA reconcile); roll out tier `T0` (failure-log slice) first, `T1`/`T2` per agent once continuity pays off.

## 6. Open / risks
- MCP round-trip latency vs in-process → dual surface (NAPI fast-path + MCP) — GenesisBlockDB already ships both.
- MSP coupling (accepted, ADR-016) — external orchestrators interoperate via the translator (ADR-017), not by hosting Compute.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial integration SDD: stack, contracts, wiring plan (10→11 tools, MSP client, GenesisBlockDB driver). |
| 0.1.1+draft | 2026-06-23 | ARCHON / ATHER | Reference FEAT-PER-AGENT-MEMORY-UNIT for episodic-unit + 8-8-8 distillation + Verify-Gate promotion wiring (integration plan item 5). |
| 0.1.2+draft | 2026-06-23 | ARCHON / ATHER | Added canonical naming (§2a) — MemoryOS V3 = umbrella; MSP = passport layer; GenesisBlockDB = backend — to resolve the "Memory OS" label collision. |
