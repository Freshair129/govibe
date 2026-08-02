---
title: "CR: Knowledge-Context Product Alignment"
doc_id: "CR-2026-08-02-KNOWLEDGE-CONTEXT-PRODUCT-ALIGNMENT"
status: "proposed"
version: "0.1.0+draft"
updated: "2026-08-02"
owner: "Boss (CEO)"
source_of_truth: true
related_issue: "#52"
related_docs:
  - "docs/BRD-GoVibe-Platform.md"
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/adr/ADR-017-GoVibe-Governance-Translator-GKS-Interlingua.md"
  - "docs/adr/ADR-018-Structural-Decomposition-Containment-Wikilink.md"
  - "docs/adr/ADR-019-Universal-Code-In-MCP-Out.md"
  - "AGENTS.md"
---

# CR: Knowledge-Context Product Alignment

## 1. Trigger

A live review of the GoVibe BRD and PRD reproduced the product failure that GoVibe is intended to prevent.

The reviewer could see product artifacts and feature names, but the relation chain from originating insight and issue to decision, ADR, requirement, feature, implementation posture, and verification was not explicit enough. The missing relations allowed the reviewer to invent a plausible but incorrect WHY from model priors.

Observed interpretation failures included:

- classifying GoVibe as an enterprise-first governance suite;
- treating CoVibe and CoDev as SME-versus-enterprise editions;
- treating generic Doc-to-Code skills as substitutes for the GKS-integrated product core;
- treating GKS retrieval as sufficient without MSP context authority;
- inventing non-existent product terms.

This CR treats those failures as evidence, not merely copy-editing feedback.

## 2. Canonical insight

AI-assisted software failure is often caused not only by missing documents, but by missing, unavailable, or unenforced relationships between artifacts.

```text
human intent / observation
  -> insight
  -> issue
  -> decision
  -> ADR
  -> BRD / PRD requirement
  -> feature / architecture contract
  -> task / context packet
  -> code
  -> test
  -> evidence
```

When an agent receives WHAT without the governing WHY, authority, scope, and source lineage, it fills the missing reasoning from training priors. The output may be technically plausible while being wrong for the product.

GoVibe therefore exists to reduce the amount of product and engineering meaning that agents must guess.

## 3. Product target condition

GoVibe is not segmented primarily by company size.

The shared target condition is:

> AI-assisted execution capacity has outgrown the user's or team's ability to define, validate, relate, preserve, and safely reuse the software knowledge required to control that execution.

Typical adopters may include solo builders, SMEs, agencies, product teams, platform teams, and enterprise delivery groups. Organization size is an example attribute, not the root segmentation rule.

### 3.1 CoVibe

`CoVibe` is the single-authority operating mode.

It applies when one principal owner or authority controls scope and approval, regardless of organization size, while a lead agent coordinates bounded support agents or executors.

### 3.2 CoDev

`CoDev` is the multi-authority operating mode.

It applies when knowledge, approval, execution, or delivery responsibility crosses owners, teams, vendors, or organizations. It requires explicit authority separation, translation, handoff, conflict resolution, and evidence.

## 4. Knowledge authority and context authority

### 4.1 GKS

GKS is the canonical knowledge and relation authority.

It owns or resolves:

- canonical knowledge identities;
- atoms and semantic types;
- primary containment ownership;
- relations and graph versions;
- provenance-bearing candidate-to-canonical mappings;
- source and decision relations required for traceability.

GKS answers:

> What knowledge exists, what is canonical, and how is it related?

GKS is not the direct context authority for an agent turn.

### 4.2 MSP

MSP is the memory and context authority above GKS.

It owns or resolves:

- agent, task, workspace, session, and turn identity;
- private/shared memory boundaries;
- source versions and replay lineage;
- retrieval radius and relation traversal policy;
- required, supporting, optional, excluded, and blocked knowledge;
- permission, privacy, budget, and compaction obligations;
- context continuity and exact replay behavior.

MSP answers:

> Which subset of canonical knowledge may and must this agent use for this task now?

### 4.3 Mandatory hierarchy

```text
Executor / Agent
  -> GoVibe validation and governed execution surface
  -> MSP memory/context authority
  -> GKS canonical knowledge/relation authority
  -> GenesisBlockDB graph/vector/storage execution
```

The hierarchy exists because a complete relation graph is not a safe or useful context packet. Relations may connect through many valid domains and expand without a task-specific boundary. MSP must scope and compact the graph before agent execution.

## 5. Core product consequence

The core is not generic document or code generation.

Replaceable external skills may perform extraction, generation, review, diagram conversion, or code production. Their outputs remain untrusted provider outputs or candidate artifacts until they conform to GoVibe contracts.

An external skill must not:

- assign canonical GKS identities;
- bypass MSP context policy;
- promote knowledge directly;
- decide scope from a feature label alone;
- discard unresolved assumptions or source relations;
- treat a generated document as agent-usable merely because it exists.

The governed core is the lifecycle that converts incomplete or heterogeneous intent and artifacts into validated, related, scoped, reusable, and traceable software knowledge for CoVibe and CoDev execution.

## 6. Required document changes

### Gate G1: Product authority

- revise the BRD problem statement, target condition, value chain, and segmentation;
- revise the PRD vision, core journey, agent-usable knowledge definition, and MSP/GKS boundary;
- create or approve the canonical ADR for knowledge authority versus context authority.

### Gate G2: Architecture propagation

- clarify ADR-017, ADR-018, and ADR-019;
- update AGENTS.md with relation-first interpretation and MSP-scoped retrieval;
- update CoVibe and CoDev feature documents;
- update architecture/C4 and relevant API contracts.

### Gate G3: Enforcement and proof

- add validation for required source relations and unresolved assumptions;
- ensure context resolution records traversal policy, exclusions, source hashes, and authority;
- add tests proving agents cannot bypass MSP or promote external-skill output as canonical;
- add an end-to-end evidence chain from issue/insight to code/test/verification.

## 7. Agent rules introduced by this CR

Until canonical propagation is complete, all GoVibe agents must apply these rules:

1. Do not infer WHY from a feature, system, or document title.
2. Resolve issue, insight, decision, ADR, requirement, and source relations before recommending implementation posture.
3. If governing relations are absent, report `missing_relation` or `unresolved_assumption`; do not silently fill the gap.
4. Do not perform unrestricted GKS graph traversal.
5. Use MSP-issued context scope, relation policy, source versions, and budget.
6. Treat external skill output as candidate or provider output until normalized, validated, authorized, and materialized through MSP/GKS.
7. CoVibe/CoDev classification is based on authority boundaries, not company size.

## 8. Impact set

| Artifact | Relation | Required action |
|---|---|---|
| BRD | defines business problem and target condition | must update |
| PRD | defines product behavior and systems | must update |
| ADR-017 | defines GKS interlingua | review and update |
| ADR-018 | defines graph topology | review and update |
| ADR-019 | defines universal code-in/MCP-out | review and update |
| AGENTS.md | enforces agent interpretation | must update |
| CoVibe/CoDev FEAT docs | define operating modes | review and update |
| Context/materialization/replay APIs | enforce context and authority | review and update |
| Architecture/C4 | projects system boundaries | review and update |

## 9. Approval gates

This is a C-3 product and architecture meaning change.

- Gate G1 requires Boss approval of the canonical problem and target condition.
- Gate G2 requires architecture and document review.
- Gate G3 requires contract tests and runtime evidence before claiming enforcement.

No document may claim that this alignment is fully implemented merely because this CR exists.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-02 | Boss / THESEUS | Captured the reproduced relation-loss failure, defined GKS knowledge authority versus MSP context authority, and authorized bounded BRD/PRD/ADR/agent-contract propagation. |
