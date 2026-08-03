---
doc_id: "BRD-GOVIBE-PLATFORM"
title: "GoVibe — Business Requirements Document & Business Overview"
status: "draft"
version: "0.3.0+draft"
updated: "2026-08-03"
owner: "Boss (CEO)"
source_of_truth: true
type: brd
tags: [business, governance, knowledge, context, agentic-ai, semantic-ir]
related_issue: 91
related_adrs: ["ADR-017", "ADR-018", "ADR-019", "ADR-023", "ADR-025"]
---

# GoVibe — BRD & Business Overview

> **One-liner:** GoVibe turns incomplete, fragmented, or weakly related software intent into validated, traceable, agent-usable knowledge, then governs how the right subset of that knowledge is used across agents, tasks, sessions, teams, owners, and destination views.

GoVibe remains a **governance + interoperability layer for multi-agent software development**, riding open protocols such as MCP/A2A rather than replacing coding tools, orchestrators, or database products. The Genesis Knowledge System (GKS) is the canonical knowledge/interlingua authority; the Memory & Soul Passport (MSP) is the memory and context authority that makes GKS knowledge usable within a bounded task.

GoVibe semantic meaning is storage-backend independent. GenesisBlockDB is a separate standalone database product and one supported backend through an adapter. GoVibe is not its only client; NotiKeeper and future clients may use GenesisBlockDB with independent schemas and domain rules.

## 1. Business Problem

AI agents can generate software faster than many users and teams can define, validate, relate, preserve, and safely reuse the knowledge required to guide that generation.

A repository may contain a PRD, feature list, issue, architecture note, diagram, or chat history while still exposing only **WHAT exists**. If it does not preserve and enforce **WHY it exists**, who approved it, what scope it belongs to, which constraints apply, and what remains unresolved, an agent fills the gaps from training priors.

The recurring failure chain is:

```text
incomplete or weakly related intent
  -> implicit assumptions
  -> agent inference from model priors
  -> scope or architecture drift
  -> inconsistent artifacts
  -> lost traceability and rework
```

A second recurring failure is representation fragmentation:

```text
one product intent
  -> PRD, ADR, SRS, Roadmap, Backlog, issues, agent packets
  -> independently edited copies
  -> identity drift, conflicting obligations and manual synchronization
```

GoVibe does not try to make the agent guess better. It reduces what the agent is allowed or required to guess, and compiles approved canonical knowledge into governed destination views rather than allowing each view to become an independent semantic authority.

## 2. Shared Target Condition

The target is defined by a shared problem condition, not company size.

GoVibe targets builders and delivery groups where:

- AI agents are used for real software delivery;
- source intent comes from people or systems with uneven software-engineering vocabulary;
- requirements, decisions, constraints, and acceptance criteria are incomplete or heterogeneous;
- more than one agent, tool, contributor, or owner must reuse the knowledge;
- interpretation errors cause meaningful rework, risk, or loss of trust;
- durable context and traceability matter more than a disposable chat answer;
- several document or work-management views describe the same underlying intent.

Typical adopters may include solo founders, solo developers, SMEs, agencies, product teams, vendors, platform teams, and enterprise delivery units. These are examples, not the segmentation rule.

### 2.1 CoVibe

`CoVibe` is the single-authority collaboration mode. One primary human owner or authority remains the center of control while agents, agent teams, or bounded support executors participate.

### 2.2 CoDev

`CoDev` is the multi-authority collaboration mode. Multiple human-owned teams, clients, vendors, or organizations coordinate while retaining distinct ownership and local conventions.

A small agency may require CoDev. An enterprise innovation unit with one owner may use CoVibe.

## 3. Business Problems

| ID | Problem | Business impact |
|---|---|---|
| P1 | AI execution capacity exceeds the ability to define complete software knowledge | guessing, hidden assumptions, scope expansion, rework |
| P2 | Documents lack relations to insight, issue, decision, ADR, approval, and evidence | teams know that a feature exists but not why or how it must be implemented |
| P3 | Existing relations are stored but not obligatorily used for the task | agents ignore relevant WHY and fall back to model priors |
| P4 | Unrestricted graph retrieval is too broad | context overflow, noise, inconsistent execution |
| P5 | External generators do not conform to canonical identity, provenance, scope, and promotion contracts | fluent output becomes silently authoritative |
| P6 | Multiple agents or owners interpret the same intent differently | handoff failure, drift, duplicated systems |
| P7 | PRD, SRS, ADR, Roadmap, Backlog, issues and agent packets are maintained as independent truths | split-brain state, conflicting requirements and synchronization cost |
| P8 | Application semantics are coupled to one storage product | backend lock-in and leakage of client ontology into shared infrastructure |

## 4. Solution and Authority Model

GoVibe provides four connected responsibilities:

1. **Knowledge construction and relation preservation** — decompose artifacts into candidate atoms and relations, validate them, and promote canonical knowledge through MSP into GKS.
2. **Governed context construction** — MSP selects, authorizes, scopes, compacts, versions, and preserves the subset of GKS knowledge required by a specific agent, task, workspace, session, and turn.
3. **Governed execution and interoperability** — GoVibe packages context, routes work, validates outputs, preserves traceability, and renders knowledge into the convention used by each participant.
4. **Canonical semantic compilation** — normalize source representations into Candidate Semantic IR, resolve identity, canonicalize approved knowledge, and project regenerable destination views with reverse semantic deltas.

```text
Human intent / documents / diagrams / code / evidence
  -> GoVibe validation and governed execution
  -> Candidate Semantic IR
  -> MSP memory, context and promotion authority
  -> GKS canonical knowledge and relation authority
  -> backend-neutral persistence port
  -> GenesisBlockDB adapter or another compatible backend
```

Return path:

```text
GKS canonical knowledge
  -> MSP selection, authorization, compaction, and continuity
  -> GoVibe task/context packet and convention rendering
  -> Agent execution or destination view
  -> candidate output / semantic delta / verification
  -> canonical update path
```

### 4.1 GKS

GKS owns canonical knowledge identity, versions, containment, semantic relations, backlinks, provenance, and graph versions. It answers what exists, where it came from, and how it relates.

GKS is not direct agent context and is not a database implementation. A graph can be complete and still be unusable if the agent receives the wrong neighborhood.

### 4.2 MSP

MSP is the Memory OS and context authority. It determines what knowledge is required now, who may access it, which source versions apply, how far relations may be followed, what is excluded, how context is compacted, and how continuity/replay is preserved.

### 4.3 GoVibe

GoVibe validates intent and documents, detects missing relations, constructs governed work, routes agents, enforces execution policy, validates candidate output, preserves traceability, and compiles approved knowledge into destination conventions.

### 4.4 External skills and providers

External decomposition, extraction, diagram parsing, and generation providers return candidates only:

```text
provider output
  -> GoVibe normalization and validation
  -> MSP scope/authority/promotion gate
  -> GKS canonical materialization
```

They cannot assign canonical identity, widen approved scope, or bypass MSP/GKS.

### 4.5 Persistence backends

Persistence backends store and query canonical records through a backend-neutral contract. They do not own GoVibe semantic identity, planning meaning, context policy, or promotion authority.

GenesisBlockDB is one standalone supported backend. It also serves independent clients such as NotiKeeper and therefore SHALL NOT require GoVibe ontology in its core.

## 5. Differentiation

| Layer | Role |
|---|---|
| Relation-preserving lifecycle | preserves WHY from insight and issue through decision, implementation, test, and evidence |
| Canonical semantic compilation | separates source representations, candidate IR, canonical identity, and regenerable views |
| Reversible governed projections | produces destination views and accepts edits as semantic delta candidates rather than silent truth |
| MSP-governed context | makes relation use mandatory, bounded, authorized, reproducible, and task-aware |
| Governance-over-execution | prevents unapproved scope and requires evidence before promotion/closure |
| GKS translation pivot | supports heterogeneous conventions with N mappings instead of N² pairwise translation |
| External generators | replaceable enabling providers whose output remains governed |
| Storage adapters | preserve semantic portability across compatible persistence products |

The moat is not merely storing more links or using one database. A second brain with many relations does not improve an agent if runtime retrieval remains optional or unbounded, and a fast database does not own the client's meaning.

## 6. Business Requirements

| ID | Business Requirement | Priority |
|---|---|---|
| BR-1 | Validate intent/documents for completeness, ambiguity, relation coverage, scope, constraints, and assumptions before execution | MUST |
| BR-2 | Preserve insight/issue → decision/ADR → requirement/feature → task/code/test/evidence traceability | MUST |
| BR-3 | Keep GKS as canonical knowledge/relation authority and MSP as task/session context authority | MUST |
| BR-4 | Require MSP-issued bounded context packets for governed execution | MUST |
| BR-5 | Fail closed or escalate when WHY, authority, scope, source version, or relation is unresolved | MUST |
| BR-6 | Treat external provider output as candidates | MUST |
| BR-7 | Support team conventions through the GKS pivot without vocabulary migration | MUST |
| BR-8 | Support CoVibe and CoDev on the same knowledge/context core | MUST |
| BR-9 | Use MCP-first interfaces without replacing orchestrators | MUST |
| BR-10 | Support zero-migration artifact ingestion and swappable storage | SHOULD |
| BR-11 | Support Thai/SEA and mixed-skill authoring as first-class conditions | SHOULD |
| BR-12 | Treat PRD, SRS, ADR, Roadmap, Backlog, issues and agent packets as governed source or destination views over canonical semantic identities | MUST |
| BR-13 | Preserve semantic identity when source wording, location, ordering or template changes without changing meaning | MUST |
| BR-14 | Support provenance-preserving projection and reverse semantic deltas without silent data loss | MUST |
| BR-15 | Prevent stale or conflicting destination edits from becoming silent canonical updates | MUST |
| BR-16 | Keep GoVibe semantic and authority contracts independent of the selected persistence backend | MUST |
| BR-17 | Integrate GenesisBlockDB as one standalone supported backend without imposing GoVibe ontology on its other clients | MUST |

## 7. Scope

**In:** document/intent validation, relation construction, candidate promotion, Canonical Semantic IR, identity resolution, multi-view projection, reverse semantic deltas, MSP context selection, execution governance, CoVibe/CoDev, impact analysis, drift detection, replay lineage, backend-neutral persistence adapters.

**Out:** competing with frontier code generation, unbounded autonomy, raw graph traversal as context policy, per-framework adapters where artifact/MCP contracts suffice, direct provider writes to canonical GKS, ownership of GenesisBlockDB or NotiKeeper domain schemas.

## 8. Success Metrics

- execution packets with explicit source versions, scope, exclusions, and required reason chains;
- core features traceable from originating insight/issue to verification evidence;
- unresolved assumptions caught before implementation;
- reduction in out-of-scope agent work and rework;
- required knowledge included while irrelevant graph expansion is excluded;
- context and replay reproducibility;
- CoVibe/CoDev handoffs without authority ambiguity;
- adoption without replacing existing agent tools;
- semantic identity preservation rate;
- false-merge and false-convergence rates;
- untouched-field preservation through round-trip compilation;
- deterministic view regeneration rate;
- conflict detection before canonical mutation;
- one semantic conformance suite passing against an in-memory reference backend and GenesisBlockDB adapter.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Users resist validation | progressive questioning and risk-based gates |
| GKS graph becomes too broad | MSP relation policy, exclusions, radius, depth, width, and budget |
| Complete knowledge still yields bad context | context contracts, coverage tests, replay, escalation |
| Provider output appears authoritative | candidate-only boundary and promotion controls |
| Product is misread as enterprise-only | problem-condition positioning and authority-based modes |
| Documents lose their own WHY | issue/ADR relations and fail-closed agent contract |
| Similar wording creates false canonical merges | multi-signal identity resolution and human review |
| Views drift into independent truth | view manifests, graph revisions, reverse-delta gates and regeneration tests |
| Storage implementation leaks into semantic contracts | ADR-025, persistence port and adapter conformance suite |
| GenesisBlockDB is misread as a GoVibe-owned component | standalone product language and client-neutral integration contract |

## 10. Phased Direction

1. Validate knowledge before execution.
2. Define Candidate Semantic IR and canonicalization contracts.
3. Prove identity preservation and conflict safety.
4. Compile and regenerate governed views.
5. Enforce MSP-issued context.
6. Govern candidate output, verification, reverse deltas, and impact.
7. Deepen CoVibe single-authority delivery.
8. Expand CoDev multi-authority translation and handoff.
9. Validate backend portability through reference and GenesisBlockDB adapters.

## 11. Glossary

| Term | Meaning |
|---|---|
| Agent-usable knowledge | validated knowledge with scope, relations, constraints, authority, sources, assumptions, and acceptance criteria |
| Candidate Semantic IR | structured but unpromoted semantic representation produced before canonical identity and authority decisions |
| Canonical Semantic IR | backend-neutral canonical semantic representation governed by GKS authority |
| GKS | canonical knowledge and relation authority; internal semantic pivot, not a database implementation |
| MSP | Memory OS and task/session-specific context authority |
| GoVibe | validation, governance, interoperability, semantic compilation, execution, and traceability surface |
| CoVibe | single-authority collaboration mode |
| CoDev | multi-authority collaboration mode |
| Candidate | unpromoted output without canonical GKS identity |
| Context packet | MSP-issued bounded knowledge selection for a task and agent turn |
| View | regenerable destination representation bound to graph and template revisions |
| Semantic delta | proposed canonical mutation derived from an edited view |
| Persistence backend | independent storage/query product accessed through an adapter; GenesisBlockDB is one supported backend |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.0+draft | 2026-08-03 | Boss / ARCHON / ATHER | Added Canonical Semantic IR, reversible views, backend independence, and GenesisBlockDB standalone-client boundary. |
| 0.2.0+draft | 2026-08-02 | Boss (CEO) | Reframed target by shared knowledge/context failure; established ADR-023 authority boundary and authority-based CoVibe/CoDev segmentation. |
| 0.1.1+draft | 2026-06-22 | Boss (CEO) | Clarified GKS visibility and CoDev wording. |
| 0.1.0+draft | 2026-06-22 | Boss (CEO) | Initial BRD. |