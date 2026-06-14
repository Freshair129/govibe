---
title: "FEAT: Visual Agent Fleet System"
doc_id: "FEAT-visual-agent-fleet-system"
status: "draft"
version: "0.1.0"
updated: "2026-06-14"
owner: "THESEUS"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
complexity: "C-2"
context_tier: "H4"
risk: "MEDIUM"
related_docs:
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/project-roadmap/FEAT-Document-Driven-Roadmap-Source.md"
  - "docs/adr/ADR-012-Visual-Agent-Fleet-Governance.md"
  - "docs/architecture/SDD-Visual-Agent-Fleet.md"
  - ".agents/context/CONTEXT-Visual-Agent-Fleet-Scope.md"
---

# FEAT: Visual Agent Fleet System

## 1. Overview

Visual Agent Fleet makes GoVibe agent roles explicit, traceable, and visible in Mission Control A5 without changing protected human development source material.

The system maps each agent identity to a fleet role, job-title equivalent, domain, cluster, responsibility, authority, scope boundary, approval gate, and source references. It derives agent-readable context from `.agents/Visual-Agent-Fleet-Scope/` while preserving that folder as read-only human-dev knowledge.

## 2. Goals and Non-Goals

### Goals

- Define a hybrid one-to-one fleet role model for agents with clear authority or gates.
- Keep BA and PO material as context-only guidance in v1.
- Add minimal registry metadata for routing and A5 display.
- Extend A5 Agent Management as the v1 visualization surface.
- Require LYRA scope control before accepting new or expanded work.
- Preserve traceability from protected source docs to derived context, registry metadata, A5 display, and audit review.

### Non-Goals

- Do not edit, delete, normalize, or rewrite `.agents/Visual-Agent-Fleet-Scope/`.
- Do not create a standalone BA agent in v1.
- Do not move Visual Agent Fleet to a new A6 route in v1.
- Do not make GoVibe manage third-party provider billing, quotas, or runtime ownership.

## 3. User Stories

| ID | Role | Story |
|---|---|---|
| US-01 | Human Owner | As a human owner, I want each agent's role and authority visible so that I can assign work without guessing responsibility. |
| US-02 | LYRA | As PM, I want scope and change-request gates available before planning so that I do not expand scope without impact assessment. |
| US-03 | THESEUS | As documentation owner, I want protected human docs derived into role context so that agents can use them without mutating source material. |
| US-04 | ATHER | As auditor, I want source refs and authority boundaries preserved so that I can block drift before work is marked done. |
| US-05 | GHOST | As QA, I want A5 to expose role metadata without fake execution state so that verification can distinguish configuration from live work. |

## 4. Requirements

### Functional Requirements

- FR-01: The system must represent agent identity, fleet role, job-title equivalent, domain, cluster, responsibility, authority, source refs, approval gate, scope boundary, and out-of-scope limits.
- FR-02: The system must treat `.agents/Visual-Agent-Fleet-Scope/` as protected human-dev source that can only be read, referenced, or summarized into derived context.
- FR-03: The system must derive role context packets for LYRA, THESEUS, ATHER, GHOST, RKOI, and context-only BA/PO guidance.
- FR-04: The system must add minimum registry metadata without replacing existing `role`, `contract`, `execution_policy`, `default_context`, or `allowed_scopes`.
- FR-05: A5 Agent Management must be the v1 UI consumer for Visual Agent Fleet metadata.
- FR-06: LYRA must require impact assessment and approval owner before accepting scope expansion.
- FR-07: ATHER must block completion when protected source edits, missing source refs, missing authority boundaries, or missing scope-change assessment are detected.

### Non-Functional Requirements

- NFR-01: Derived context must be compact and reusable, not a full copy of protected source docs.
- NFR-02: Registry metadata must stay readable YAML and compatible with current executor routing.
- NFR-03: A5 display must not imply live execution unless data comes from an approved MissionSnapshot or event source.
- NFR-04: Token-efficient workshop flow must use decision cards with no more than three decision questions per round.

## 5. Technical Details

- Frontend: A5 can render fleet role cards from agent registry or normalized MissionSnapshot agent metadata.
- Backend/Data: Registry metadata remains in `.agents/agent-registry.yaml`; future runtime payloads may normalize the same shape into MissionSnapshot.
- Documentation: FEAT and SDD are source docs; `.agents/context/` and role packet files are derived context.
- Decision record: `docs/adr/ADR-012-Visual-Agent-Fleet-Governance.md` owns the architecture decision for protected-source derivation, registry metadata, and A5 as the v1 consumer.
- Audit: ATHER uses protected-source and scope-control checks before done state.

## 6. PRD System Mapping

- Primary system: `SYSTEM-05::Agent-Team-Management-System`
- Secondary systems: `SYSTEM-02::Project-Roadmap-Management-System`, `SYSTEM-07::Governance-Access-Control-System`, `SYSTEM-09::Traceability-Audit-Verification-System`, `SYSTEM-10::Execution-Governance-System`

## 7. Acceptance Criteria

- [ ] Protected source files under `.agents/Visual-Agent-Fleet-Scope/` remain unchanged.
- [ ] FEAT and SDD distinguish agent identity, fleet role, job title, responsibility, authority, and scope boundary.
- [ ] LYRA context requires impact assessment before accepting scope expansion.
- [ ] BA/PO material is represented as context-only guidance in v1.
- [ ] Registry metadata can support routing or display without changing executor behavior.
- [ ] A5 design can show Visual Agent Fleet metadata without implying fake live execution.

## 8. Success Criteria

- [ ] THESEUS can derive role context from protected source paths without editing those sources.
- [ ] LYRA can identify whether new work is in scope, a change request, or blocked by missing requirement input.
- [ ] ATHER can trace source doc to derived context to registry metadata to A5 display.
- [ ] GHOST can verify A5 role metadata and mobile fit before UI acceptance.

## 9. Verification

- Run `npm run docs:validate`.
- Run `npm run baseline:check` before close-out.
- Audit protected source paths with `git diff -- .agents/Visual-Agent-Fleet-Scope`.
- Review `.agents/agent-registry.yaml` to confirm existing executor policy fields remain intact.

## 10. Definition of Done

- [ ] FEAT and SDD exist and link to each other.
- [ ] Central context container exists under `.agents/context/`.
- [ ] Role context packets exist for PM, doc writer, auditor, QA, tech lead, and BA/PO context-only guidance.
- [ ] Agent registry includes minimum Visual Agent Fleet metadata.
- [ ] Validation commands pass or any failures are documented with root cause.

## 11. Open Questions

- Should BA become a standalone agent after v1 if requirement workshop volume grows?
- Should A6 Visual Dev Office consume the same fleet metadata after A5 stabilization?
