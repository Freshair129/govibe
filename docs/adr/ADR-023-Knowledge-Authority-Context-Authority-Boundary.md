---
doc_id: "ADR-023-KNOWLEDGE-AUTHORITY-CONTEXT-AUTHORITY-BOUNDARY"
title: "ADR-023: GKS knowledge authority vs MSP context authority"
status: "accepted"
version: "0.1.0"
updated: "2026-08-02"
owner: "Boss (CEO)"
type: adr
related_issue: 52
---

# ADR-023: GKS knowledge authority vs MSP context authority

**Status:** Accepted
**Date:** 2026-08-02
**Owner:** Boss (CEO)

## 1. Context

GoVibe must preserve relations from insight, issue, decision, ADR, requirement, feature, implementation, test, and evidence. A document or graph that stores those relations is necessary but insufficient.

A dense relation graph can connect almost every business, product, architecture, code, and operational concept. Giving an agent unrestricted graph traversal either produces excessive context or leaves retrieval optional. In both cases the agent can ignore the relevant WHY, substitute model priors, widen scope, or hallucinate an implementation posture that was never approved.

The failure was reproduced during product review: existing documents described WHAT GoVibe contained, but the relation chain explaining WHY each capability existed was not explicit and enforced enough. The reviewer inferred an enterprise-first governance product, mapped CoVibe and CoDev to company size, and treated external skills as substitutes for the governed knowledge pipeline.

## 2. Decision

Separate canonical knowledge authority from task-specific context authority.

### 2.1 GKS authority

GKS is the canonical authority for:

- knowledge atom identity and version
- source, provenance, and confidence
- containment ownership
- semantic relations and backlinks
- graph version and canonical relation resolution
- traceability from insight and decision through implementation and evidence

GKS answers:

> What knowledge exists, where did it come from, and how is it related?

GKS is not the direct context authority for an agent turn.

### 2.2 MSP authority

MSP is the memory and context operating system. It is the authority for:

- agent, task, workspace, run, session, and turn identity
- permission and privacy boundaries
- context profile and source-version selection
- retrieval radius, relation allowlist, exclusions, depth, width, and budget
- required WHY/source chains
- candidate-versus-canonical visibility
- compaction, ordering, rendering, continuity, cache, and replay lineage
- unresolved assumptions and escalation state

MSP answers:

> Which subset of canonical knowledge must this agent use now, under what scope, authority, and continuity constraints?

### 2.3 Runtime authority chain

```text
Executor / Agent
  -> GoVibe validation and governed execution surface
  -> MSP memory and context authority
  -> GKS canonical knowledge and relation authority
  -> GenesisBlockDB storage and graph/vector execution
```

Agents and GoVibe must not bypass MSP to query GKS or GenesisBlockDB directly in the governed runtime path.

### 2.4 Context construction

Every governed context packet must carry at least:

- task, agent, workspace, run, session, and turn identity
- source IDs, versions, and hashes
- required relation chains or reason references
- retrieval radius and relation policy
- explicit scope inclusions and exclusions
- context budget and compaction policy
- unresolved assumptions
- context/cache/replay lineage

An agent must fail closed or escalate when required WHY, authority, source relation, or scope is unresolved. It must not silently fill the gap from training priors.

### 2.5 External providers and skills

External skills, models, parsers, and generators may produce bounded candidate artifacts. They do not:

- assign canonical GKS identity
- choose unrestricted graph context
- promote knowledge
- redefine approved scope
- bypass MSP context construction

Their outputs must be normalized, provenance-bound, validated, and promoted through the GoVibe -> MSP -> GKS authority chain.

## 3. Consequences

- (+) GKS remains a rich canonical relation graph without forcing every relation into every agent turn.
- (+) MSP makes relation use mandatory, scoped, reproducible, permission-aware, and budget-aware.
- (+) Agents receive the WHY required for the task instead of inventing it.
- (+) CoVibe and CoDev share the same knowledge/context architecture while applying different authority boundaries.
- (+) External providers remain replaceable without replacing the governed product core.
- (-) Context assembly becomes a first-class contract that must be versioned, tested, and audited.
- (-) Retrieval quality cannot be evaluated only by relevance; it must also preserve authority, provenance, exclusions, and reason chains.
- (-) Missing relations must be represented explicitly rather than hidden by fluent generated prose.

## 4. Product implications

The shared target condition is not company size. GoVibe targets builders and delivery groups whose AI execution capacity has exceeded their ability to define, validate, relate, preserve, and safely reuse software knowledge.

- `CoVibe` applies when one primary human authority controls the collaboration lane.
- `CoDev` applies when multiple human-owned authorities, teams, vendors, or organizations must coordinate.

SME, solo developer, agency, product team, and enterprise unit are adoption examples, not the canonical segmentation rule.

## 5. Related

- Issue #52
- `docs/change-requests/CR-2026-08-02-Knowledge-Context-Product-Alignment.md`
- `docs/BRD-GoVibe-Platform.md`
- `docs/PRD-GoVibe-Platform-Overview.md`
- `ADR-017`, `ADR-018`, `ADR-019`
- `AGENTS.md`

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-08-02 | Boss (CEO) | Established GKS as canonical knowledge/relation authority and MSP as governed task/session context authority. |
