---
doc_id: "ADR-017-GOVIBE-GOVERNANCE-TRANSLATOR-GKS-INTERLINGUA"
title: "ADR-017: GoVibe = governance translator; GKS = interlingua; ride MCP/A2A"
status: "accepted"
version: "0.2.0"
updated: "2026-08-02"
owner: "Boss (CEO)"
type: adr
related_adrs: ["ADR-020"]
---

# ADR-017: GoVibe = governance translator; GKS = interlingua; ride MCP/A2A

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
The market is composability-first; the interop *standards* (MCP — Anthropic, A2A — Google/Linux Foundation, Internet-of-Agents consortia) are owned by the AI labs/coalitions — a solo dev cannot win "the standard". Teams already run their own agent swarms with their own conventions and will not learn a new vocabulary or restructure their docs to adopt a tool.

A canonical interlingua alone does not determine what an agent should receive for one task. A relation graph may contain valid links across product, marketing, architecture, code, operations, and governance. Unrestricted translation or traversal would either overload context or allow the agent to ignore the relevant reason chain.

## 2. Decision
GoVibe positions as a **governance + interop layer (a translator/interpreter), NOT a new standard** — it **rides MCP/A2A** as transport.

- **GKS is the canonical interlingua / pivot representation. GoVibe does not *communicate in* GKS — it replies in each team's own convention — but GKS is not hidden: in full-eco use it is directly inspectable via the visual UI (ERD / DAG / node graph over GKS + GenesisBlockDB).**
- Each team keeps its own convention (userA = format `A1`, userB = `A25`). GoVibe maps **`A1 ⇄ GKS ⇄ A25`**.
- When a GKS-equipped agent is contacted by userA, it understands via GKS and **replies in userA's own system language (`A1`)**.
- **Pivot economics:** N team-conventions need **N mappings (→ GKS)**, not **N² pairwise** translators.
- **GKS is the knowledge and relation authority, not the per-turn context authority.** Translation and rendering must use an MSP-issued context packet that identifies the task, authority, approved source versions, required reason chains, relation policy, exclusions, and context budget (`ADR-020`).
- A language pack may transform vocabulary and document format, but it must preserve source identity, provenance, authority state, unresolved assumptions, and WHY relations. Fluent output is not translation fidelity if the reason chain is lost.

## 3. Consequences
- (+) Zero-vocabulary-migration adoption — teams keep their own format and tools.
- (+) Genuine swarm-to-swarm interop without forcing a shared standard.
- (+) Moat = the GKS pivot + governed context + translation fidelity.
- (+) Task output can remain concise while retaining canonical links back to richer GKS knowledge.
- (−) Must build/maintain per-convention language packs — bounded to N, not N².
- (−) Translation fidelity is a real risk; verification must compare meaning, authority, provenance, exclusions, and reason chains, not formatting alone.
- (−) Translators cannot query or render arbitrary graph neighborhoods; they must obey MSP context policy.

## 4. Related
[[ADR-016-Full-Stack-Mandatory-Swappable-Backend]], [[ADR-019-Universal-Code-In-MCP-Out]], [[ADR-020-Knowledge-Authority-Context-Authority-Boundary]], `BRD-GoVibe-Platform` §4.1, MCP / A2A.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-02 | Boss (CEO) | Defined GKS as knowledge/interlingua authority rather than direct context authority; required MSP-scoped translation and preservation of WHY/provenance relations. |
| 0.1.1 | 2026-06-22 | Boss (CEO) | Clarified GKS is not hidden; defined language pack as vocabulary map + doc-format template. |
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided translator/interlingua positioning: GKS pivot, ride MCP/A2A, users keep their own language. |
