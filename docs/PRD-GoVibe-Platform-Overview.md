---
title: "PRD: GoVibe Platform Overview"
doc_id: "PRD-GOVIBE-PLATFORM-OVERVIEW"
status: "draft"
version: "0.5.0+draft"
updated: "2026-08-02"
owner: "Rwang (Senior Dev)"
source_of_truth: true
related_issue: 52
related_adrs: ["ADR-015", "ADR-016", "ADR-017", "ADR-018", "ADR-019", "ADR-020"]
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

Architecturally, GoVibe remains the **governance + interoperability layer** for multi-agent software development. It rides MCP/A2A instead of replacing coding tools or orchestrators. It is not a coding agent, a database competitor, or merely a knowledge graph viewer.

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

GKS is below MSP because a complete relation graph is not automatically a usable context. Unrestricted graph traversal is too broad; optional retrieval allows agents to ignore the relevant WHY.

### 1.2 Operating loops

- **Docs to Code:** human documents are validated, decomposed into candidate knowledge and relations, promoted through MSP into GKS, then rendered as bounded context, tasks, review criteria, and verification requirements.
- **Diagram to Doc:** diagrams become candidate structured knowledge and documentation, preserving source/provenance and requiring review before canonical promotion.
- **Code to Knowledge:** existing code and artifacts may be decomposed without forcing migration of the team's current documents.

### 1.3 Adoption model

The mandatory core is **GoVibe + MSP**. GKS and its canonical materialization authority are part of the governed knowledge lifecycle; GenesisBlockDB is swappable storage infrastructure behind GKS. Visual graph UI and native orchestration remain optional full-eco capabilities.

The platform exposes three coordinated surfaces:

- `Mission Control UI` as the human visual control plane
- `MCP Server` as the primary governed orchestration interface
- `GoVibe CLI` as a thin operator and automation surface

## 2. Product Positioning

GoVibe targets builders and delivery groups whose AI execution capacity has outgrown their ability to define, validate, relate, preserve, and safely reuse software knowledge.

This target condition can occur in a solo project, SME, agency, product team, vendor network, or enterprise unit. Company size is not the canonical segmentation rule.

### 2.1 CoVibe and CoDev

- **CoVibe:** single-authority collaboration. One primary human owner or authority controls the lane while agents, agent teams, or bounded support executors participate.
- **CoDev:** multi-authority collaboration. Multiple human-owned teams, clients, vendors, or organizations coordinate while retaining separate ownership and local conventions.

A small agency may need CoDev. An enterprise innovation unit may use CoVibe. The distinction is authority boundary, not firm size.

Detailed behavior:

- `docs/features/agent-team/FEAT-CoVibe-Module.md`
- `docs/features/agent-team/FEAT-CoDev-Module.md`
- `docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md`

### 2.2 Goals

- Validate human intent and software documents before agent execution.
- Detect missing requirements, constraints, actors, decisions, reason relations, assumptions, scope boundaries, and acceptance criteria.
- Preserve traceability from insight and issue through decision, ADR, requirement, feature, task, code, test, and evidence.
- Construct MSP-issued bounded context for each agent/task/session/turn.
- Keep external skills and generators replaceable while treating their outputs as candidates.
- Translate between team conventions through GKS without vocabulary migration.
- Coordinate CoVibe and CoDev collaboration without replacing provider billing or orchestrators.
- Support RBAC for humans and ABAC for agents/services.
- Reduce frontier-model usage by routing bounded work to suitable local or lower-cost executors.

### 2.3 Non-goals

- GoVibe does not replace third-party AI coding tools.
- GoVibe does not require users to write GKS atoms directly.
- GoVibe does not treat vector similarity, raw graph traversal, or a second-brain link network as sufficient runtime context policy.
- GoVibe does not allow external skills to assign canonical GKS identity or bypass MSP promotion.
- GoVibe does not build per-framework adapters where artifact and MCP contracts suffice.
- GoVibe does not infer missing WHY silently from model priors.
- GoVibe does not position CoVibe as an SME edition or CoDev as an enterprise edition.

## 3. Target Audience

Problem-qualified users include:

- founders, operators, or product owners with incomplete software-engineering vocabulary;
- solo developers performing product, BA, SA, architecture, and implementation roles simultaneously;
- teams receiving incomplete or heterogeneous requirements;
- agencies coordinating with clients or external delivery partners;
- teams using multiple agents, tools, or providers;
- regulated or high-risk teams requiring traceability and replay.

Anti-targets include disposable prototypes, isolated low-risk tasks, and teams that do not value durable knowledge, scope control, or traceability.

## 4. Agent-Usable Knowledge Contract

A document existing in the repository does not make it agent-usable.

For governed execution, the source set must provide or explicitly mark unresolved:

- source identity, version, hash, owner, and authority state;
- originating insight, issue, request, or evidence;
- actors, goals, functional requirements, and non-functional requirements;
- business rules, constraints, dependencies, and scope exclusions;
- decisions and ADR relations;
- assumptions and unresolved questions;
- acceptance criteria and expected verification evidence;
- affected systems/modules and impact relations.

When required information is missing, GoVibe must ask, propose a bounded candidate, or escalate. It must not silently convert plausible inference into approved knowledge.

## 5. Core User Journey

```text
User supplies intent, document, diagram, code, or change request
  -> GoVibe identifies sources and versions
  -> decomposes content into candidate atoms and relations
  -> validates completeness, ambiguity, conflicts, authority, and scope
  -> requests or proposes bounded clarification
  -> human/policy approval
  -> MSP authorizes canonical promotion
  -> GKS assigns canonical identities and relations
  -> MSP selects and compacts task-specific context
  -> GoVibe renders task/context packet in the destination convention
  -> agent executes within approved scope
  -> output returns as candidate artifact/evidence
  -> verification, impact analysis, and canonical update
```

## 6. Key Features

### 6.1 Mission Control Center

- project, task, agent, artifact, source, context, and verification status;
- visible WHY/source chain for governed work;
- unresolved assumption, missing relation, scope, and approval indicators;
- context packet and replay lineage inspection.

### 6.2 Docs to Code Workflow

- validate documents before extracting implementation tasks;
- separate feature, functional requirement, NFR, business rule, constraint, decision, and evidence concepts;
- preserve source/provenance and reason relations;
- construct candidates rather than immediately declaring canonical knowledge;
- generate MSP-scoped task/context packets;
- track implementation and verification against canonical relations.

### 6.3 Diagram to Doc Workflow

- normalize architecture, sequence, flow, ERD, and site-map inputs;
- preserve source image/frame/node references and provenance;
- produce candidate docs and relation sets;
- require human/policy review before promotion;
- feed the same governed Docs-to-Code pipeline.

### 6.4 Agent Team Management

- agent identity, capability, role, owner, authority boundary, task state, and handoff;
- CoVibe single-authority and CoDev multi-authority modes;
- bounded external executor packets;
- scope expansion routed through change control rather than executor inference.

### 6.5 Governance and Access Control

- RBAC for humans and ABAC for agents/services;
- fail-closed behavior when authority, source, scope, or relation requirements are unresolved;
- auditable permit/deny/obligation decisions.

### 6.6 Genesis Knowledge System

- candidate-to-canonical materialization through MSP;
- canonical atoms, containment, relations, backlinks, provenance, and graph versions;
- explicit unresolved-link evidence;
- GKS is knowledge/relation authority, not direct context authority.

### 6.7 MSP Context and Memory OS

- task, agent, workspace, run, session, and turn identity;
- source-version and hash binding;
- context profiles, permissions, privacy, relation allowlists, exclusions, radius, depth, width, and budget;
- compaction, ordering, continuity, cache, and replay lineage;
- required WHY/source chains and unresolved assumptions.

### 6.8 Execution Governance

- C-level complexity, H0-H4 access scope, R retrieval radius, D resolution/compaction depth, W fan-out, Budget, and Risk are explicit axes;
- task packets cannot widen their own context or permission;
- verification and impact analysis are required before closure for semantic/runtime changes.

### 6.9 External Provider Boundary

```text
External skill / parser / generator
  -> bounded candidate output
  -> GoVibe normalization and validation
  -> MSP authority/context/promotion gate
  -> GKS canonical materialization
```

Providers may improve generation quality but do not replace the governed lifecycle.

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

| System | Responsibility | Required alignment |
|---|---|---|
| SYSTEM-01 | Human visual control plane | Show source/WHY/context/authority and unresolved state, not feature status alone |
| SYSTEM-02 | Roadmap and task promotion | Preserve issue/insight/decision relations and promotion evidence |
| SYSTEM-03 | Docs-to-Code | Validate agent-usable knowledge, create candidates, assemble MSP-scoped packets |
| SYSTEM-04 | Diagram-to-Doc | Produce provenance-bound candidate docs/relations and review gates |
| SYSTEM-05 | Agent-team collaboration | Apply CoVibe/CoDev authority boundaries and bounded handoffs |
| SYSTEM-06 | MCP/CLI/external bridges | Accept governed packets; never grant providers canonical authority |
| SYSTEM-07 | RBAC/ABAC and policy | Enforce access, authority, privacy, source, and approval obligations |
| SYSTEM-08 | GKS/MSP knowledge-context substrate | Separate canonical graph authority from task context authority |
| SYSTEM-09 | Traceability/audit/verification | Prove insight-to-evidence relations, context lineage, drift, and impact |
| SYSTEM-10 | Execution governance | Enforce C/H/R/D/W/Budget/Risk, scope, escalation, and closure gates |

## 8. Cross-System Authority and Dependency Rules

- SYSTEM-03 and SYSTEM-04 produce candidate knowledge, not canonical identities.
- MSP mediates context and promotion before SYSTEM-08/GKS canonical materialization.
- SYSTEM-06 external providers consume bounded context and return candidate output.
- SYSTEM-09 records source, reason, context, candidate, promotion, implementation, and verification lineage.
- SYSTEM-10 prevents workers and providers from widening scope, permission, retrieval radius, or authority.
- Any non-trivial change must name primary/supporting systems, source issue/insight, decision/ADR relation, owner, reviewers, expected evidence, and impact scope.

## 9. Success Criteria

- a new reader can identify the originating user/problem insight before reading the feature map;
- core features trace to issue/insight/decision/ADR relations;
- required context packets bind source versions, scope, exclusions, and WHY chains;
- agents escalate rather than invent missing authority or rationale;
- out-of-scope implementation and rework decrease;
- external providers cannot create canonical knowledge;
- CoVibe/CoDev are selected by authority boundary;
- replay distinguishes context reproducibility, execution reproducibility, and identical output.

## 10. Definition of Done for Product-Level Semantic Changes

- authority issue/change request exists;
- BRD, PRD, related ADRs, FEAT docs, AGENTS contract, C4/API projections, and registry are impact-reviewed;
- all must-update documents are changed;
- review-only documents carry a recorded decision;
- docs validation and CI pass;
- approval evidence is linked before canonical promotion.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.5.0+draft | 2026-08-02 | Rwang / Boss | Added shared failure pattern, agent-usable knowledge contract, GKS/MSP authority boundary, authority-based CoVibe/CoDev segmentation, core user journey, and provider candidate boundary. |
| 0.4.3+draft | 2026-06-23 | Rwang | Previous platform overview and ten-system map. |
| 0.4.2+draft | 2026-06-22 | Rwang | Repositioned governance + interop identity per ADR-016/017/019. |
| 0.4.1+draft | 2026-06-20 | Rwang | Frontmatter/title normalization. |
| 0.4.0 | 2026-06-16 | Rwang | Expanded Platform System Map. |
| 0.3.0 | 2026-06-16 | Rwang | Added product-level modules and routing. |
| 0.2.1 | 2026-06-17 | Rwang | Added CoDev/CoVibe module references. |
| 0.2.0 | 2026-06-16 | Rwang | Added CoDev/CoVibe terminology. |
| 0.1.0 | 2026-06-15 | Rwang | Added canonical doc_id metadata. |
