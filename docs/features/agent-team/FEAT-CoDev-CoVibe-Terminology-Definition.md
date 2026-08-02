---
title: "FEAT: CoDev and CoVibe Terminology Definition"
doc_id: "FEAT-CODEV-COVIBE-TERMINOLOGY-DEFINITION"
status: "approved"
version: "0.2.0"
updated: "2026-08-02"
owner: "THESEUS"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
supporting_prd_systems:
  - "SYSTEM-06::Integration-Bridge-System"
  - "SYSTEM-09::Traceability-Audit-Verification-System"
  - "SYSTEM-10::Execution-Governance-System"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/change-control/change-requests/CR-2026-08-02-Knowledge-Context-Product-Alignment.md"
  - "docs/architecture/C4-GoVibe-Platform.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/agent-team/FEAT-CoDev-Module.md"
  - "docs/features/agent-team/FEAT-CoVibe-Module.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md"
  - "docs/change-control/change-requests/feedback/CR-2026-06-15-CoDev-CoVibe-Positioning-Review-feedback.md"
---

# FEAT: CoDev and CoVibe Terminology Definition

## 1. Goal

Define `CoDev` and `CoVibe` as narrow GoVibe collaboration modes classified by **authority boundaries**, not by company size, market tier, or pricing package.

This document does not introduce a new top-level PRD system, runtime container, protocol, or separate platform brand. Detailed behavior remains in `FEAT: CoDev Module` and `FEAT: CoVibe Module`.

## 2. Shared target condition

Both modes serve builders and delivery groups whose AI-assisted execution capacity has outgrown their ability to consistently define, validate, relate, preserve, and safely reuse the software knowledge required to control that execution.

Typical participants may include solo builders, SMEs, agencies, product teams, platform teams, vendors, and enterprise groups. Those are examples, not the segmentation rule.

The classification question is:

> How many independent authorities own scope, approval, knowledge, or delivery in this collaboration?

## 3. Definitions

### 3.1 CoVibe

`CoVibe` means the GoVibe collaboration mode with one principal authority.

The principal authority may be one person, one delegated owner, or one team-level authority. Supporting agents and executors may participate, but they do not become independent product authorities.

```text
[Principal Authority]
   <=GoVibe / CoVibe=>
[Lead Agent or Agent Team]
   <=bounded support=>
[Support Agent / External Executor]
```

Canonical meaning:

- single-authority collaboration;
- one governing scope and approval lane;
- relation-first validation of intent and documents;
- MSP-scoped context for lead and support agents;
- bounded support execution and evidence return;
- escalation to the principal authority when WHY, scope, or assumptions are unresolved.

CoVibe may be used inside a solo project, SME, agency, enterprise team, or other environment. Organization size does not determine the mode.

### 3.2 CoDev

`CoDev` means the GoVibe collaboration mode with more than one independent authority.

Each authority may bring its own human owners, agent team, workflow, convention, toolchain, approval rules, and private/shared knowledge boundaries.

```text
[Authority A + Agent Team A]
        <=GoVibe / CoDev=>
[Authority B + Agent Team B]
```

Canonical meaning:

- multi-authority collaboration;
- owner-separated scope and approval lanes;
- convention translation through GKS;
- MSP-scoped context per authority and task;
- explicit handoff, conflict, dependency, review, and evidence coordination;
- preservation of issue, insight, decision, ADR, requirement, and source relations across boundaries.

CoDev may occur between two small teams, an agency and client, vendors, departments, or enterprises. Organization size does not determine the mode.

## 4. Classification rule

| Question | CoVibe | CoDev |
|---|---|---|
| Independent scope/approval authorities | One | More than one |
| Knowledge boundary | One governing authority with bounded private/support context | Shared and private knowledge across separate authority lanes |
| Primary risk | Agents invent missing WHY or widen scope under one owner | Meaning, authority, and provenance are lost or disputed across owners |
| Context model | MSP-scoped packet under one authority | MSP-scoped packet per authority/task with shared-boundary controls |
| Handoff | Lead-to-support and back | Cross-authority handoff with acceptance and evidence |
| Company size | Not a criterion | Not a criterion |

When authority count is unclear, classify as unresolved and request clarification. Do not infer the mode from labels such as SME, enterprise, solo, team, department, or vendor alone.

## 5. Product and system boundaries

`CoDev` and `CoVibe` are collaboration-mode terms. `GoVibe` remains the platform identity.

Current ownership remains:

- `SYSTEM-05::Agent-Team-Management-System`
  - authority and team coordination;
  - assignment and handoff;
  - collaboration-mode state;
  - lead/support and cross-owner participation.

- `SYSTEM-06::Integration-Bridge-System`
  - MCP/API/webhook/local bridge connectivity;
  - external execution-provider integration;
  - governed transport behavior.

- `SYSTEM-09::Traceability-Audit-Verification-System`
  - source, decision, requirement, handoff, and evidence traceability.

- `SYSTEM-10::Execution-Governance-System`
  - scope, access, fan-out, review, QA, and closure gates.

## 6. Knowledge and context boundary

Both modes use the same hierarchy:

```text
Agent / Executor
  -> GoVibe governed validation and execution surface
  -> MSP memory/context authority
  -> GKS canonical knowledge/relation authority
  -> GenesisBlockDB
```

GKS preserves canonical knowledge and relations. MSP determines which subset is required, permitted, excluded, compacted, and replayed for each agent, task, authority, workspace, session, and turn.

Neither CoVibe nor CoDev grants an agent unrestricted graph traversal or authority to promote external-skill output as canonical knowledge.

## 7. What These Terms Do Not Mean

`CoVibe` does not mean:

- an SME-only or solo-only edition;
- a separate platform brand;
- a bypass of execution governance;
- unrestricted GKS access;
- unbounded autonomous execution;
- permission for support agents to invent product authority.

`CoDev` does not mean:

- an enterprise-only edition;
- a new top-level PRD system;
- a guaranteed A2A implementation;
- ownership of provider billing or quota;
- forced migration of each party's local conventions;
- collapse of multiple authorities into one lead agent.

## 8. Placement guidance

Use `CoVibe` when one principal authority can resolve scope, assumptions, and approval for all participating agents.

Use `CoDev` when two or more independent authorities must negotiate or separately approve scope, meaning, handoff, or evidence.

If a proposal changes system ownership, the MSP/GKS boundary, runtime authority, or protocol posture, escalate to ADR before changing PRD or C4 terminology.

## 9. Acceptance Criteria

- `CoVibe` is defined as single-authority collaboration.
- `CoDev` is defined as multi-authority collaboration.
- Company size is explicitly rejected as the classification rule.
- Both modes use MSP-scoped context over GKS canonical knowledge.
- Missing authority is reported rather than inferred.
- No new top-level PRD system or protocol is created by this terminology refinement.

## 10. Success Criteria

- A reader can classify the collaboration mode without guessing from company size.
- Product, architecture, and agent documents use the same authority-based definitions.
- Agents do not silently convert solo/SME/enterprise labels into CoVibe/CoDev decisions.
- Handoffs preserve meaning, source relations, scope, authority, and evidence.

## 11. Definition Of Done

- Terminology and module documents agree on authority-based classification.
- BRD and PRD propagation is completed under the linked knowledge-context alignment CR.
- Architecture and API projections preserve the same boundary.
- Registry versions are synchronized.
- `docs:validate` passes.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-02 | THESEUS / Boss | Reclassified CoVibe and CoDev by single-versus-multiple authority; rejected SME/enterprise segmentation; added MSP/GKS context and relation-preservation rules. |
| 0.1.1 | 2026-06-20 | THESEUS | Signed off; promoted draft -> approved. |
| 0.1.1+draft | 2026-06-17 | THESEUS | Added module-level feature references for CoDev and CoVibe. |
| 0.1.0 | 2026-06-15 | THESEUS | Defined the CoDev and CoVibe terminology note. |
