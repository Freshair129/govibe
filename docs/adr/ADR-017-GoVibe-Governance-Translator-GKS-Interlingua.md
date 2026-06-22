---
doc_id: "ADR-017-GOVIBE-GOVERNANCE-TRANSLATOR-GKS-INTERLINGUA"
title: "ADR-017: GoVibe = governance translator; GKS = interlingua; ride MCP/A2A"
status: "accepted"
version: "0.1.1"
updated: "2026-06-22"
owner: "Boss (CEO)"
type: adr
---

# ADR-017: GoVibe = governance translator; GKS = interlingua; ride MCP/A2A

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
The market is composability-first; the interop *standards* (MCP — Anthropic, A2A — Google/Linux Foundation, Internet-of-Agents consortia) are owned by the AI labs/coalitions — a solo dev cannot win "the standard". Teams already run their own agent swarms with their own conventions and will not learn a new vocabulary or restructure their docs to adopt a tool.

## 2. Decision
GoVibe positions as a **governance + interop layer (a translator/interpreter), NOT a new standard** — it **rides MCP/A2A** as transport.

- **GKS is the canonical interlingua / pivot representation. GoVibe does not *communicate in* GKS — it replies in each team's own convention — but GKS is not hidden: in full-eco use it is directly inspectable via the visual UI (ERD / DAG / node graph over GKS + GenesisBlockDB).**
- Each team keeps its own convention (userA = format `A1`, userB = `A25`). GoVibe maps **`A1 ⇄ GKS ⇄ A25`**.
- When a GKS-equipped agent is contacted by userA, it understands via GKS and **replies in userA's own system language (`A1`)**.
- **Pivot economics:** N team-conventions need **N mappings (→ GKS)**, not **N² pairwise** translators — this is the architectural reason to use an interlingua and it is what makes swarm-to-swarm interop scale.

## 3. Consequences
- (+) Zero-vocabulary-migration adoption — teams keep their own format and tools.
- (+) Genuine swarm-to-swarm interop without forcing a shared standard.
- (+) Moat = the GKS pivot + governance/translation fidelity (not DB perf, not being a standard).
- (−) Must build/maintain per-convention "language packs" (A1, A25, …) — bounded to N (pivot), not N². A language pack = vocabulary map **+ doc-format template** (e.g. Feature-Base vs System-Base), consumed by the format-adaptive JIT renderer to emit docs in that convention's format (see [[CONCEPT--HYBRID-JIT-CONTEXT]]).
- (−) Translation fidelity is a real risk (lossy mapping); requires verification + the governance gate.

## 4. Related
[[ADR-016-Full-Stack-Mandatory-Swappable-Backend]], [[ADR-019-Universal-Code-In-MCP-Out]], `BRD-GoVibe-Platform` §4.1, MCP / A2A.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1 | 2026-06-22 | Boss (CEO) | Clarified GKS is not hidden (not *communicated* to users, but inspectable in full-eco visual UI); defined a language pack as vocabulary map + doc-format template consumed by the format-adaptive JIT renderer. |
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided translator/interlingua positioning: GKS pivot, ride MCP/A2A, users keep their own language. |
