---
doc_id: "ADR-017-GOVIBE-GOVERNANCE-TRANSLATOR-GKS-INTERLINGUA"
title: "ADR-017: GoVibe = governance translator; GKS = interlingua; ride MCP/A2A"
status: "accepted"
version: "0.2.0"
updated: "2026-08-02"
owner: "Boss (CEO)"
type: adr
related_adrs: ["ADR-023"]
---

# ADR-017: GoVibe = governance translator; GKS = interlingua; ride MCP/A2A

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
The market is composability-first; interop standards are owned by AI labs/coalitions. Teams already run their own agent swarms with their own conventions and will not learn a new vocabulary or restructure documents merely to adopt a tool.

A canonical interlingua alone does not determine what an agent should receive for one task. A relation graph may contain valid links across product, marketing, architecture, code, operations, and governance. Unrestricted translation or traversal would either overload context or allow the agent to ignore the relevant reason chain.

## 2. Decision
GoVibe positions as a **governance + interop translator/interpreter, not a new standard**, and rides MCP/A2A as transport.

- GKS is the canonical interlingua and pivot representation. GoVibe replies in each team's convention while full-eco users may inspect GKS directly.
- Each team keeps its own convention. GoVibe maps `A1 ⇄ GKS ⇄ A25`.
- N conventions require N mappings to the pivot rather than N² pairwise translators.
- **GKS is the knowledge and relation authority, not the per-turn context authority.** Translation and rendering must use an MSP-issued context packet identifying task, authority, approved source versions, required reason chains, relation policy, exclusions, and budget (`ADR-023`).
- Language packs may transform vocabulary and document format, but must preserve source identity, provenance, authority state, unresolved assumptions, and WHY relations.

## 3. Consequences
- (+) Zero-vocabulary-migration adoption.
- (+) Swarm-to-swarm interop without forcing a shared standard.
- (+) Moat = GKS pivot + governed context + translation fidelity.
- (+) Concise task output can retain canonical links to richer knowledge.
- (-) Per-convention language packs must be maintained.
- (-) Fidelity verification must cover meaning, authority, provenance, exclusions, and reason chains, not formatting alone.
- (-) Translators must obey MSP context policy rather than query arbitrary graph neighborhoods.

## 4. Related
[[ADR-016-Full-Stack-Mandatory-Swappable-Backend]], [[ADR-019-Universal-Code-In-MCP-Out]], [[ADR-023-Knowledge-Authority-Context-Authority-Boundary]], `BRD-GoVibe-Platform`, MCP / A2A.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-02 | Boss (CEO) | Defined GKS as knowledge/interlingua authority rather than direct context authority; required MSP-scoped translation and preservation of WHY/provenance relations. |
| 0.1.1 | 2026-06-22 | Boss (CEO) | Clarified GKS visibility and language-pack behavior. |
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided translator/interlingua positioning. |
