---
title: "FEAT: CoDev Module"
doc_id: "FEAT-CODEV-MODULE"
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
  - "docs/change-requests/CR-2026-08-02-Knowledge-Context-Product-Alignment.md"
  - "docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md"
  - "docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md"
---

# FEAT: CoDev Module

## 1. Goal

Define the GoVibe `CoDev` module as the **multi-authority collaboration mode** for separate human-owned delivery parties and their agent teams to coordinate through GoVibe without collapsing ownership, meaning, approval, or evidence into a single authority lane.

`CoDev` is not an enterprise edition. It applies whenever software knowledge, approval, execution, or delivery responsibility crosses independent authorities, regardless of company size.

The module sits on top of `SYSTEM-05::Agent-Team-Management-System` and uses bridge behavior from `SYSTEM-06::Integration-Bridge-System` when external executors or separate agent ecosystems participate.

## 2. Why This Exists

Cross-party software work does not fail only because teams use different tools. It fails because each party may hold a different part of the WHY, use a different document convention, approve different scopes, or interpret the same feature through different prior knowledge.

Without CoDev, teams may exchange documents and tasks while losing the relations that explain:

- which insight or issue originated the work;
- which decision and ADR govern it;
- which party owns each assumption and approval;
- what is shared, private, canonical, candidate, or unresolved;
- why a feature must be implemented in one posture rather than another.

CoDev exists to preserve meaning and authority across owner boundaries, not merely to move messages between agents.

## 3. Module Boundary

`CoDev` means multi-authority coordination across separate human-owned delivery parties and their agent teams.

Canonical shape:

```text
[Authority A + Agent Team A]
        <=GoVibe / CoDev=>
[Authority B + Agent Team B]
```

An authority lane may be a founder, SME, agency, client, vendor, product team, enterprise unit, or independent organization. Company size does not determine the mode.

What belongs here:

- intake that spans more than one independent authority;
- shared but owner-separated knowledge and roadmap visibility;
- translation between team conventions through GKS;
- MSP-scoped context packets for each party and task;
- assignment and handoff between independent authority lanes;
- inter-team review, conflict, dependency, and approval coordination;
- explicit source, decision, and evidence relations;
- bounded external executor participation when a party chooses to use one.

What does not belong here:

- provider billing or subscription management;
- a new top-level PRD system;
- a replacement for `MCP`;
- unrestricted shared access to all GKS relations;
- silent collapse of multiple authorities into one lead agent;
- external skills assigning canonical identities or resolving approval conflicts;
- unbounded autonomous execution.

## 4. Module Responsibilities

| Responsibility | Description |
|---|---|
| Authority separation | Keep independent human-owned delivery parties, approval rights, and private/shared boundaries visible. |
| Meaning preservation | Preserve issue, insight, decision, ADR, requirement, scope, and evidence relations across handoffs. |
| Convention translation | Translate through GKS while rendering each party's accepted vocabulary and document format. |
| Context isolation | Use MSP to issue party- and task-specific context rather than exposing the whole graph. |
| Shared planning | Share roadmap and dependency context without erasing ownership. |
| Handoff control | Preserve explicit source, target, authorized scope, exclusions, and evidence for every transfer. |
| Conflict and review routing | Route semantic, scope, and approval conflicts to the correct authorities. |
| External bridge control | Allow bounded external executors only through governed bridge packets. |

## 5. Module Components

- authority and party registry;
- multi-authority intake classifier;
- convention/language-pack resolver;
- shared-versus-private knowledge boundary;
- MSP context request per authority lane;
- shared roadmap and backlog projection;
- inter-team handoff record;
- decision, issue, ADR, and requirement relation bundle;
- dependency, conflict, and review coordination;
- evidence and audit trail links;
- bridge packet loader for external executors.

## 6. Inputs And Outputs

### Inputs

- PRD, change request, issue, insight, decision, or ADR;
- roadmap and backlog documents;
- party, owner, and approval metadata;
- source document versions and hashes;
- convention/language-pack identity;
- task, context, and handoff artifacts;
- evidence packets from supporting agents or external executors.

### Outputs

- authority-separated assignments;
- party-specific MSP context packets;
- translated but relation-preserving documents or task packets;
- handoff and approval state;
- dependency and conflict visibility;
- missing-relation and unresolved-assumption reports;
- review-ready evidence;
- traceable execution packets.

## 7. Workflow Contract

```text
Request / shared artifact
  -> identify all independent authorities
  -> resolve source, issue, insight, decision, ADR, and requirement relations
  -> classify shared, private, candidate, canonical, and unresolved knowledge
  -> request MSP-scoped context for each authority lane
  -> translate conventions through GKS without discarding provenance
  -> decompose into authority-owned work packets
  -> assign per lane
  -> track handoff, conflict, approval, and evidence
  -> close with cross-authority audit trail
```

If governing relations, authority ownership, or scope conflict is unresolved, CoDev must stop the affected handoff and route the conflict to the relevant human authorities. A lead agent may coordinate but may not silently decide for all parties.

## 8. Acceptance Criteria

- `CoDev` is defined as the multi-authority collaboration mode.
- Organization size is not used to classify CoDev.
- Independent human-owned delivery parties remain separate and visible.
- Handoffs preserve WHY, authority, source, scope, exclusions, and evidence.
- Each party receives MSP-scoped context rather than unrestricted graph access.
- Translation through GKS preserves provenance and unresolved relations.
- External skills and executors produce candidates or evidence, not canonical authority.
- The module does not create a new top-level PRD system.

## 9. Success Criteria

- Multi-authority work can be planned without ambiguity about who owns meaning, scope, approval, and delivery.
- Teams using different conventions can collaborate without losing the relation chain behind requirements and decisions.
- Handoffs between authority lanes stay explicit, scoped, and auditable.
- Reviewers can reconstruct why implementation occurred without reading hidden runtime state or relying on model inference.

## 10. Definition Of Done

- Module doc is linked from the CoDev/CoVibe terminology note.
- Module doc is registered in the document version registry.
- The PRD system map or collaboration section references this module.
- Context, translation, handoff, and evidence contracts preserve authority and relation fields.
- `docs:validate` passes after registry propagation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-02 | THESEUS / Boss | Refined CoDev from a company-size-shaped collaboration description to the canonical multi-authority mode; added relation preservation, MSP-scoped context, GKS convention translation, conflict routing, and candidate-only external skills. |
| 0.1.0 | 2026-06-20 | THESEUS | Signed off; promoted draft -> approved. |
| 0.1.0+draft | 2026-06-17 | THESEUS | Defined the CoDev collaboration module for multi-owner and multi-team coordination. |
