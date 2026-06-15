---
title: "FEAT: CoDev and CoVibe Terminology Definition"
doc_id: "FEAT-CODEV-COVIBE-TERMINOLOGY-DEFINITION"
status: "draft"
version: "0.1.0"
updated: "2026-06-15"
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
  - "docs/architecture/C4-GoVibe-Platform.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/integration-bridge/FEAT-MCP-Integration-Bridge.md"
  - "docs/change-requests/CR-2026-06-15-CoDev-CoVibe-Positioning-Review.md"
  - "docs/change-requests/feedback/CR-2026-06-15-CoDev-CoVibe-Positioning-Review-feedback.md"
---

# FEAT: CoDev and CoVibe Terminology Definition

## 1. Goal

Define `CoDev` and `CoVibe` as narrow GoVibe collaboration terms so future planning, feature placement, and product language stay consistent without forcing premature PRD or C4 restructuring.

This document is a terminology-definition note only. It does not introduce a new top-level PRD system, new runtime container, or new protocol posture.

## 2. Why This Exists

Current GoVibe product and architecture documents already support:

- multiple developer-owned agent teams
- external coding-tool integration
- workflow, handoff, and coordination governance

However, discussions about `CoDev` and `CoVibe` have begun to mix:

- collaboration pattern
- product positioning
- system ownership
- tool and protocol boundaries

Without a narrow terminology definition, the same words may be used to mean different layers of the product and create scope creep.

## 3. Definitions

### 3.1 CoDev

`CoDev` means the GoVibe collaboration mode where more than one human-owned delivery party participates and each party may bring its own agent team, workflow, toolchain, or local governance.

Canonical interpretation:

```text
[Human / Team A + Agent Team A]
        <=GoVibe / CoDev=>
[Human / Team B + Agent Team B]
```

Meaning:

- inter-owner or inter-team coordination
- shared delivery visibility
- handoff, assignment, review, and evidence coordination
- optional participation of external execution providers through existing bridge mechanisms

### 3.2 CoVibe

`CoVibe` means the GoVibe collaboration mode where one primary owner, solo founder, or solo developer operates with one main agent or main agent team and uses supporting agents or supporting executors to accelerate work.

Canonical interpretation:

```text
[Human]
   <=GoVibe / CoVibe=>
[Main Agent / Main Agent Team]
   <=support=>
[Support Agent / Support Executor]
```

Meaning:

- intra-owner orchestration
- personal or solo-founder flow
- main-agent-led execution with supporting agents
- bounded support execution without implying multi-party governance by default

## 4. Boundary Rules

### 4.1 Product boundary

`CoDev` and `CoVibe` are terminology layers for collaboration mode, not separate platform names.

`GoVibe` remains the platform identity.

### 4.2 System boundary

This terminology definition does not create new top-level PRD systems.

Current ownership remains:

- `SYSTEM-05::Agent-Team-Management-System`
  - workflow semantics
  - team coordination
  - assignment
  - handoff
  - multi-agent participation

- `SYSTEM-06::Integration-Bridge-System`
  - MCP/API/webhook/local bridge connectivity
  - external execution-provider integration
  - governed integration behavior

### 4.3 Protocol boundary

This document does not replace `MCP` as the current orchestration interface.

If future work introduces `A2A` or another interoperability protocol, that must be evaluated separately and must not be implied by the terms `CoDev` or `CoVibe` alone.

## 5. Mapping To Existing GoVibe Systems

| Term | Primary meaning | Primary system | Secondary system involvement |
|---|---|---|---|
| `CoDev` | inter-team or inter-owner coordination mode | `SYSTEM-05` | `SYSTEM-06`, `SYSTEM-09`, `SYSTEM-10` |
| `CoVibe` | intra-owner or solo orchestration mode | `SYSTEM-05` | `SYSTEM-06`, `SYSTEM-10` |

Guidance:

- `CoDev` becomes active when coordination semantics between multiple human-owned delivery parties matter.
- `CoVibe` becomes active when the main distinction is between a primary owner and supporting agents or supporting executors.
- Both terms sit on top of the current system map rather than replacing it.

## 6. What These Terms Do Not Mean

`CoDev` does not mean:

- a new top-level PRD system
- a guaranteed A2A implementation
- ownership of third-party provider billing or quota
- a forced rewrite of local governance inside each participant team

`CoVibe` does not mean:

- a separate platform brand
- a bypass of execution governance
- unbounded autonomous execution
- a replacement for document-driven planning and approval gates

## 7. Placement Guidance For Future Work

Use `CoDev` when the work primarily concerns:

- multi-party collaboration
- cross-team handoff
- shared visual office coordination
- external executor participation in a governed team flow

Use `CoVibe` when the work primarily concerns:

- solo-founder or single-owner orchestration
- main-agent and support-agent flow
- bounded support execution
- token or quota optimization within one owner's working loop

If a future proposal changes system ownership, runtime boundaries, or protocol posture, escalate to ADR before updating PRD or C4 terminology.

## 8. Out Of Scope

This document does not:

- update the PRD system map
- update the C4 container map
- approve a new protocol
- approve a new feature implementation
- define final PO sign-off language

## 9. Acceptance Criteria

- `CoDev` and `CoVibe` each have one canonical definition.
- Both terms are explicitly mapped back to current PRD systems.
- The doc states that no new top-level PRD systems are created in this phase.
- The doc states that `MCP` is not replaced by this terminology note.
- The doc gives future authors a simple placement rule for choosing between the two terms.

## 10. Success Criteria

- Future planning and review discussions can use `CoDev` and `CoVibe` without redefining system boundaries each time.
- The team can decide whether PRD and C4 wording should be refined without first debating product identity from scratch.
- Terminology drift risk is reduced before any broader document propagation begins.

## 11. Definition Of Done

- Terminology note is written and linked to the current CR and feedback packet.
- The note preserves current `SYSTEM-05` and `SYSTEM-06` ownership boundaries.
- The note is queued for hierarchical review before PRD or C4 wording changes are proposed.
- `docs:validate` passes baseline after the note is added.

## 12. Review Request

Reviewers should confirm:

- whether the `CoDev` definition is narrow enough to avoid top-level PRD expansion
- whether the `CoVibe` definition is clear without implying a separate platform
- whether the placement guidance is sufficient for the next PRD/C4 refinement step
- whether ADR is still unnecessary as long as this remains a terminology-only layer
