---
doc_id: "ADR-018-STRUCTURAL-DECOMPOSITION-CONTAINMENT-WIKILINK"
title: "ADR-018: Structural decomposition = single containment tree + wikilink cross-link graph"
status: "accepted"
version: "0.2.0"
updated: "2026-08-02"
owner: "Boss (CEO)"
type: adr
related_adrs: ["ADR-023"]
---

# ADR-018: Structural decomposition = containment tree + wikilink graph

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
How to catalog systems/modules/features. Textbook enterprise-architecture keeps two orthogonal catalogs (functional Feature vs structural Component) linked by a traceability matrix. The Hector model instead uses a single compositional containment tree where Feature is a structural level.

The resulting graph may contain valid relations across many domains. Graph topology describes what is connected; it does not by itself determine which nodes and relations are necessary, permitted, or useful for a particular agent task.

## 2. Decision
Adopt a **single COMPOSITIONAL containment tree**:
`PLAT → SYS → SUBSYS → MOD → SUBMOD → FEAT → COMP → CLASS → METH`

- The **prefix is the stable type**; the `L0–L7` numbers are **relative depth** within a Hector-compacted chain.
- **Hector Height (H1–H5)** controls how many levels compact into one physical `.md` storage artifact.
- **Cross-cutting / cross-system links use wikilink edges `[[TYPE::Name]]`**. An atom has one physical containment primary owner and may have N inbound references, constrained by the Acyclic Backlink Invariant.
- **Relationship criticality is auto-derived** from the dependency graph, not hand-labeled.
- Every promoted feature, requirement, decision, ADR, task, implementation symbol, test, and evidence artifact should preserve explicit forward or reverse relations sufficient to recover both WHAT and WHY.
- **Graph topology is not retrieval policy.** Agents and GoVibe must not traverse arbitrary graph neighborhoods in the governed runtime path. MSP supplies the task-specific traversal profile: seed refs, required reason chains, relation allowlist, exclusions, radius, depth, width, authority state, and budget (`ADR-023`).
- Missing or unresolved links must remain explicit evidence. They must not be replaced with inferred relations solely because an LLM can produce plausible prose.

## 3. Consequences
- (+) Single source, two projections: tree view and graph view; no doc duplication.
- (+) Cross-cutting features are handled by relations rather than copies.
- (+) WHY can be preserved from insight and issue through decision, implementation, and verification.
- (+) MSP can construct bounded context without weakening the canonical graph.
- (−) Every atom needs a primary containment owner.
- (−) The wikilink graph and acyclic check must be first-class and validated.
- (−) Retrieval contracts must be tested separately from graph completeness.
- (−) A complete graph can still produce a bad context packet if authority, scope, exclusions, or reason-chain requirements are wrong.

## 4. Related
`SPEC-Genesis-Block`, `FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS`, GenesisBlockDB K-Impact, [[ADR-015-Master-Essence-vs-GOV-Policy]], [[ADR-023-Knowledge-Authority-Context-Authority-Boundary]].

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-02 | Boss (CEO) | Separated canonical graph topology from MSP-governed retrieval policy and required explicit WHY relations. |
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided single containment tree + wikilink cross-link graph; criticality auto-derived. |
