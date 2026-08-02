---
title: "PRD: GoVibe Platform Overview"
doc_id: "PRD-GOVIBE-PLATFORM-OVERVIEW"
status: "draft"
version: "0.5.0+draft"
updated: "2026-08-02"
owner: "Rwang (Senior Dev)"
source_of_truth: true
related_issue: 52
related_adrs: ["ADR-015", "ADR-016", "ADR-017", "ADR-018", "ADR-019", "ADR-023"]
block_manifest:
  core:
    id: "[[DOC::PRD_PLATFORM_OVERVIEW]]"
    block_id: "[[GKS::GENESIS_BLOCK_V3]]"
    context_scaling_tier: "H4"
---

# PRD: GoVibe Platform Overview

**Status:** `DRAFT`
**Author:** Rwang (Senior Dev)
**Updated:** 2026-08-02

## 1. Product Vision

GoVibe turns incomplete, fragmented, or weakly related software intent into **validated, traceable, agent-usable knowledge**, then governs how the correct subset of that knowledge is used across agents, tasks, sessions, teams, and owners.

The shared failure pattern is:

```text
incomplete or weakly related intent
  -> missing WHY / scope / authority / constraints
  -> agent fills gaps from model priors
  -> scope or architecture drift
  -> inconsistent artifacts and rework
```

GoVibe does not attempt to make agents guess better. It preserves the relations and context required so they do not need to guess.

Architecturally, GoVibe is the **governance + interoperability layer** for multi-agent software development. It rides MCP/A2A instead of replacing coding tools or orchestrators. It is not a coding agent, database competitor, or knowledge-graph viewer.

### 1.1 Core authority chain

```text
Human intent / documents / diagrams / code / evidence
  -> GoVibe validation and governed execution surface
  -> MSP memory and context authority
  -> GKS canonical knowledge and relation authority
  -> GenesisBlockDB storage and graph/vector execution
```

Return path:

```text
GKS canonical knowledge
  -> MSP task/session-specific selection, authorization, compaction, and continuity
  -> GoVibe task/context packet and convention rendering
  -> Agent execution
  -> candidate output, verification, and traceability
```

- **GKS** answers what knowledge exists, where it came from, and how it is related.
- **MSP** answers which subset must be used now, by which agent, under what scope, permission, source version, relation policy, budget, and continuity rules.
- **GoVibe** validates input, detects missing relations, packages governed work, routes execution, validates candidate output, and preserves traceability.

GKS is below MSP because a complete relation graph is not automatically usable context. Unrestricted traversal is too broad; optional retrieval allows agents to ignore relevant WHY.

### 1.2 Operating loops

- **Docs to Code:** validate human documents, create candidate knowledge/relations, promote through MSP into GKS, and render bounded task/context/verification packets.
- **Diagram to Doc:** transform visual sources into provenance-bound candidate documentation and relations, reviewed before canonical promotion.
- **Code to Knowledge:** decompose existing code/artifacts without forcing migration of current documents.

### 1.3 Adoption model

The mandatory core is GoVibe + MSP over the governed knowledge lifecycle. GKS owns canonical materialization. GenesisBlockDB is swappable infrastructure behind GKS. Visual graph UI and native orchestration are optional full-eco capabilities.

Surfaces:

- Mission Control UI
- MCP Server
- GoVibe CLI

## 2. Product Positioning

GoVibe targets builders and delivery groups whose AI execution capacity has outgrown their ability to define, validate, relate, preserve, and safely reuse software knowledge.

This can occur in a solo project, SME, agency, product team, vendor network, or enterprise unit. Company size is not the canonical segmentation rule.

### 2.1 CoVibe and CoDev

- **CoVibe:** single-authority collaboration. One primary human owner or authority controls the lane while agents or bounded support executors participate.
- **CoDev:** multi-authority collaboration. Multiple human-owned teams, clients, vendors, or organizations coordinate while retaining separate ownership and local conventions.

A small agency may need CoDev. An enterprise innovation unit may use CoVibe.

Detailed behavior:

- `docs/features/agent-team/FEAT-CoVibe-Module.md`
- `docs/features/agent-team/FEAT-CoDev-Module.md`
- `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md`

### 2.2 Goals

- Validate human intent and documents before execution.
- Detect missing requirements, constraints, actors, decisions, reason relations, assumptions, scope boundaries, and acceptance criteria.
- Preserve insight/issue → decision/ADR → requirement/feature → task/code/test/evidence traceability.
- Construct MSP-issued bounded context for every governed agent/task/session/turn.
- Keep external skills replaceable while treating outputs as candidates.
- Translate conventions through GKS without vocabulary migration.
- Coordinate CoVibe and CoDev without replacing provider billing or orchestrators.
- Support RBAC for humans and ABAC for agents/services.

### 2.3 Non-goals

- replacing third-party coding tools;
- requiring users to author GKS atoms;
- treating vector similarity, raw graph traversal, or a second-brain network as sufficient context policy;
- allowing external skills to assign canonical identity or bypass MSP;
- building per-framework adapters where artifact/MCP contracts suffice;
- silently inferring missing WHY;
- mapping CoVibe/CoDev to SME/enterprise editions.

## 3. Target Audience

Problem-qualified users include founders, operators, product owners, solo developers, mixed-skill teams, agencies, vendor networks, and high-risk teams that need durable context, bounded execution, and traceability.

Anti-targets include disposable prototypes, isolated low-risk tasks, and teams that do not value durable knowledge or scope control.

## 4. Agent-Usable Knowledge Contract

A document existing in the repository does not make it agent-usable.

Governed execution requires or explicitly marks unresolved:

- source identity, version, hash, owner, and authority state;
- originating insight, issue, request, or evidence;
- actors, goals, functional and non-functional requirements;
- business rules, constraints, dependencies, and scope exclusions;
- decisions and ADR relations;
- assumptions and unresolved questions;
- acceptance criteria and expected verification;
- affected systems/modules and impact relations.

When required information is missing, GoVibe asks, proposes a bounded candidate, or escalates. Plausible inference does not become approved knowledge silently.

## 5. Core User Journey

```text
User supplies intent, document, diagram, code, or change request
  -> identify sources and versions
  -> create candidate atoms and relations
  -> validate completeness, ambiguity, conflicts, authority, and scope
  -> clarify or propose bounded candidates
  -> human/policy approval
  -> MSP authorizes promotion
  -> GKS assigns canonical identities and relations
  -> MSP selects and compacts task-specific context
  -> GoVibe renders destination-convention packet
  -> agent executes within scope
  -> output returns as candidate artifact/evidence
  -> verification, impact analysis, canonical update
```

## 6. Key Features

### 6.1 Mission Control

- project, task, agent, artifact, source, context, and verification status;
- visible WHY/source chain;
- unresolved assumption, missing relation, scope, and approval indicators;
- context/replay lineage inspection.

### 6.2 Docs to Code

- validate before extracting tasks;
- distinguish feature, function, NFR, business rule, constraint, decision, and evidence;
- preserve provenance and reason relations;
- create candidates before canonical promotion;
- generate MSP-scoped context/task packets;
- track implementation and evidence against canonical relations.

### 6.3 Diagram to Doc

- normalize architecture, sequence, flow, ERD, and site-map sources;
- preserve source/frame/node references;
- produce candidate docs/relations;
- require review before promotion;
- feed the same governed Docs-to-Code pipeline.

### 6.4 Agent Team Management

- agent identity, capability, role, owner, authority boundary, task state, and handoff;
- CoVibe single-authority and CoDev multi-authority modes;
- bounded external executor packets;
- scope expansion through change control.

### 6.5 Governance and Access

- RBAC and ABAC;
- fail closed when authority, source, scope, or relation requirements are unresolved;
- auditable permit/deny/obligation decisions.

### 6.6 GKS

- candidate-to-canonical materialization through MSP;
- canonical atoms, containment, relations, backlinks, provenance, graph versions;
- explicit unresolved-link evidence;
- knowledge/relation authority, not direct context authority.

### 6.7 MSP Context and Memory OS

- task, agent, workspace, run, session, turn identity;
- source-version/hash binding;
- context profile, permission, privacy, relation policy, exclusions, radius, depth, width, budget;
- compaction, continuity, cache, and replay;
- required WHY chains and unresolved assumptions.

### 6.8 Execution Governance

- explicit C/H/R/D/W/Budget/Risk axes;
- no worker self-expansion of context or permission;
- verification and impact analysis before closure.

### 6.9 External Provider Boundary

```text
External skill / parser / generator
  -> bounded candidate output
  -> GoVibe normalization and validation
  -> MSP authority/context/promotion gate
  -> GKS canonical materialization
```

## 7. Platform System Map

```text
PRD::GoVibe-Platform
+-- SYSTEM-01::Mission-Control-Experience-System
+-- SYSTEM-02::Project-Roadmap-Management-System
+-- SYSTEM-03::Docs-to-Code-System
+-- SYSTEM-04::Diagram-to-Doc-System
+-- SYSTEM-05::Agent-Team-Management-System
+-- SYSTEM-06::Integration-Bridge-System
+-- SYSTEM-07::Governance-Access-Control-System
+-- SYSTEM-08::Genesis-Knowledge-HCS-System
+-- SYSTEM-09::Traceability-Audit-Verification-System
+-- SYSTEM-10::Execution-Governance-System
```

| System | Required alignment |
|---|---|
| SYSTEM-01 | show source/WHY/context/authority and unresolved state |
| SYSTEM-02 | preserve issue/insight/decision relations and promotion evidence |
| SYSTEM-03 | validate agent-usable knowledge, create candidates, assemble MSP packets |
| SYSTEM-04 | create provenance-bound candidate docs/relations and review gates |
| SYSTEM-05 | apply CoVibe/CoDev authority boundaries and bounded handoffs |
| SYSTEM-06 | accept governed packets; never grant providers canonical authority |
| SYSTEM-07 | enforce access, authority, privacy, source, and approval obligations |
| SYSTEM-08 | separate GKS canonical graph authority from MSP context authority |
| SYSTEM-09 | prove insight-to-evidence relations, context lineage, drift, and impact |
| SYSTEM-10 | enforce C/H/R/D/W/Budget/Risk, scope, escalation, and closure |

## 8. Cross-System Rules

- SYSTEM-03/04 produce candidates, not canonical IDs.
- MSP mediates context and promotion before GKS materialization.
- SYSTEM-06 providers consume bounded context and return candidates.
- SYSTEM-09 records source, reason, context, candidate, promotion, implementation, and evidence lineage.
- SYSTEM-10 prevents widening scope, permission, retrieval radius, or authority.
- Non-trivial changes name impacted systems, source issue/insight, decision/ADR, owner, reviewers, evidence, and impact scope.

## 9. Success Criteria

- readers identify the originating insight before the feature map;
- core features trace to issue/insight/decision/ADR;
- context packets bind source versions, scope, exclusions, and WHY chains;
- agents escalate instead of inventing rationale;
- out-of-scope work and rework decrease;
- providers cannot create canonical knowledge;
- CoVibe/CoDev are selected by authority boundary;
- replay separates context reproducibility, execution reproducibility, and identical output.

## 10. Definition of Done for Semantic Changes

- authority issue/change request exists;
- BRD, PRD, ADRs, FEAT docs, AGENTS, architecture/API projections, and registry are impact-reviewed;
- all must-update documents are changed;
- review-only decisions are recorded;
- docs validation and CI pass;
- approval evidence is linked before promotion.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.5.0+draft | 2026-08-02 | Rwang / Boss | Added shared failure pattern, agent-usable knowledge, ADR-023 GKS/MSP boundary, authority-based CoVibe/CoDev, user journey, and provider candidate boundary. |
| 0.4.3+draft | 2026-06-23 | Rwang | Previous platform overview and ten-system map. |
| 0.4.2+draft | 2026-06-22 | Rwang | Governance + interop positioning. |
| 0.4.1+draft | 2026-06-20 | Rwang | Metadata normalization. |
| 0.4.0 | 2026-06-16 | Rwang | Expanded system map. |
| 0.3.0 | 2026-06-16 | Rwang | Added module routing. |
| 0.2.1 | 2026-06-17 | Rwang | Added CoDev/CoVibe modules. |
| 0.2.0 | 2026-06-16 | Rwang | Added collaboration terminology. |
| 0.1.0 | 2026-06-15 | Rwang | Added canonical doc_id. |
