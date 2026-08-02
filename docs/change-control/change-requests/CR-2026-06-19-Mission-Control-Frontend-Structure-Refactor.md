---
title: "CR: Mission Control Frontend Structure Refactor"
doc_id: "CR-2026-06-19-MISSION-CONTROL-FRONTEND-STRUCTURE-REFACTOR"
status: "draft"
version: "0.1.1"
updated: "2026-06-19"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/STD-Execution-Governance.md"
  - "docs/design/DOMAIN_DETAILS.md"
  - "docs/references/templates/TEMPLATE_REFERENCE.md"
  - ".agents/context/shared/CONTEXT-Mission-Control-Frontend-Structure-Refactor.md"
  - ".agents/cto/AGENT.md"
  - ".agents/frontend/AGENT.md"
  - ".agents/tech_lead/AGENT.md"
---

# CR: Mission Control Frontend Structure Refactor

## 1. Purpose

Open a controlled frontend structure refactor after A2 completion so the Mission Control React app is easier to extend, review, and hand off to local frontend agents.

This request is about code organization and execution routing, not new runtime behavior.

## 2. Change Classification

- Change type: `Change Request`
- Complexity: `C-3`
- Context tier: `H4`
- W-Scale: `W3`
- Risk: `MEDIUM`
- Execution mode: `CoDev`

Rationale:

- the refactor changes implementation structure across multiple frontend surfaces
- the work may split current app-level concerns into new component or feature boundaries
- the work affects delegation boundaries for local frontend agents and review flow

## 3. System Routing

- Primary impacted system: `SYSTEM-01::Mission-Control-Experience-System`
- Supporting impacted systems:
  - `SYSTEM-02::Project-Roadmap-Management-System`
  - `SYSTEM-09::Traceability-Audit-Verification-System`
- Affected product modules:
  - `A2::Roadmap Board`
  - shared Mission Control layout and view composition under `src/`
- Source-of-truth document path:
  - `docs/change-control/change-requests/CR-2026-06-19-Mission-Control-Frontend-Structure-Refactor.md`

## 4. Ownership And Execution Routing

- Approval owner: `Boss`
- Change-control owner: `LYRA`
- Architecture owner: `ARCHON`
- Implementation owner: `VIBE`
- Code review owner: `RKOI`
- Audit owner: `ATHER`
- QA owner: `GHOST`

Routing intent:

- `ARCHON` decides the approved target structure and whether an ADR is required before implementation
- `ARCHON` authors the ADR directly when the structure decision cannot be safely approved from the change request alone
- `VIBE` implements only the approved frontend refactor slices
- `RKOI` checks scope hygiene, component boundaries, and build readiness
- `ATHER` confirms traceability and governance readiness before close-out

## 5. Current Problem Statement

The A2 work is now functionally stable, but the current frontend implementation still concentrates too much view logic in broad app-level files and mixed layout concerns.

This makes the next phase harder in four ways:

- future UI changes will increase diff size and review noise
- local frontend delegation will need larger context packets than necessary
- structure-sensitive changes risk mixing feature work with organization work
- handoff quality drops when implementation boundaries are not explicit

## 6. Requested Structural Direction

Refactor the live frontend code under real workspace paths such as `src/` into clearer feature and component boundaries.

Expected direction:

- extract stable Mission Control sections into focused React modules
- reduce `src/App.tsx` responsibility to composition, routing, and shared view wiring where practical
- separate A2-specific rendering from unrelated surfaces
- preserve current runtime truth behavior and current approved UI contracts
- keep `ref/` as reference-only and never treat it as implementation truth

This CR does not pre-approve a specific folder tree. `ARCHON` must first approve the target structure and any required ADR or plan packet.

## 7. Exact In-Scope Areas

- `src/App.tsx`
- `src/styles.css`
- `src/roadmapExport.ts`
- new or updated frontend modules under `src/`
- `.agents/frontend/context/` only if the active worker packet must be updated after structure approval
- `docs/design/DOMAIN_DETAILS.md`
- `docs/references/templates/TEMPLATE_REFERENCE.md`
- any required ADR or implementation plan created from this CR

## 8. Explicit Out Of Scope

- new backend schema
- `src/mission.ts` transport or type contract changes
- fake runtime data to support refactor convenience
- product-scope expansion beyond current Mission Control behavior
- rewriting `ref/` into live source
- unrelated C4 or cross-platform architecture rewrite unless separately approved

## 9. Required Deliverables

- one approved structure proposal from `ARCHON`
- if needed, one ADR authored directly by `ARCHON`, or one implementation plan that names target folders and ownership boundaries
- one bounded implementation packet for `VIBE`
- one review report from `RKOI`
- one audit summary from `ATHER`
- verification evidence covering `lint`, `build`, and browser-level UI sanity for touched views

## 10. Required Review Questions For ARCHON

`ARCHON` must answer these before implementation starts:

- Is this refactor still best handled inside the current Vite app, or does it need an ADR first?
- If an ADR is required, what exact architecture decision must `ARCHON` document directly before implementation starts?
- What folder or feature boundaries are approved for the live `src/` tree?
- Which shared concerns must stay centralized, and which should move out of `src/App.tsx`?
- Does the proposed structure reduce delegation context without inventing a monorepo or sample-tree architecture?
- What is the safe implementation sequence so A2 stability is not regressed?

## 11. Expected Output Schema

Return Markdown with these sections:

- `Decision`
- `Complexity`
- `Context Tier`
- `W-Scale`
- `Risk`
- `Approved Target Structure`
- `Required ADR Or Plan`
- `Implementation Sequence`
- `Blocked Risks`
- `Verification Expectations`

## 12. Success Criteria

- structural direction is approved before code movement begins
- the approved structure respects real current repo paths
- A2 behavior remains intact after refactor
- local frontend delegation can load smaller, clearer context packets than before
- review ownership and verification gates are explicit before implementation

## 13. Definition Of Done

- this change request is reviewed and accepted by the planning owner
- `ARCHON` returns an approved structure decision or an explicit ADR requirement
- when ADR is required, `ARCHON` authors it directly before implementation is delegated
- a bounded implementation packet exists for the approved refactor slice
- review and audit owners are named in the resulting execution packet
- the refactor does not begin until the approved structure decision is attached

## 14. Handoff Attachment

- recommended architecture return path: `docs/change-control/change-requests/feedback/CR-2026-06-19-Mission-Control-Frontend-Structure-Refactor-feedback.md`
- recommended shared context packet: `.agents/context/shared/CONTEXT-Mission-Control-Frontend-Structure-Refactor.md`
- recommended implementation contract seed: `.agents/frontend/AGENT.md`
- recommended PM routing context: `.agents/pm/context/LYRA-Scope-Control-Context.md`

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1 | 2026-06-20 | LYRA | Added changelog footer per versioning standard. |
