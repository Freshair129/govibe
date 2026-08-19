---
title: "MASTERPLAN: GoVibe MVP Developer Trial"
doc_id: "MASTERPLAN-GOVIBE-MVP-DEVELOPER-TRIAL"
status: "approved"
version: "0.2.1"
updated: "2026-08-19"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
access_scope: "H4"
primary_goal: "MVP for developer trial use"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/agent-team/FEAT-CoDev-CoVibe-Terminology-Definition.md"
  - "docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md"
  - ".agents/context/CONTEXT-Bounded-External-Executor.md"
  - "docs/roadmap/ROADMAP-govibe-mcp-runtime.md"
  - "docs/roadmap/ROADMAP-task-scoped-context-injection.md"
  - "docs/roadmap/BACKLOG-p1-mvp-core.md"
  - "docs/roadmap/BACKLOG-task-scoped-context-injection.md"
  - ".agents/pm/asset/Planning-Decomposition-Standard.md"
---

# MASTERPLAN: GoVibe MVP Developer Trial

## 1. Purpose

Define the MVP path for letting developers try GoVibe as a documentation-driven coordination layer for project planning, roadmap visibility, agent-team workflow, and bounded external executor support.

This master plan is scoped to a developer trial MVP. It does not redefine the platform system map and does not replace MCP, C4, PRD, or existing governance standards.

## 2. MVP Product Goal

A developer can run GoVibe locally, load document-driven roadmap/task state, inspect agent-team coordination context, and execute one bounded external-executor review packet with traceable feedback and validation evidence.

## 3. Target Developer Trial

The MVP trial is for:

- solo developers using one main agent plus bounded support executors
- small dev teams where each person may bring their own agent workflow
- maintainers validating whether GoVibe can turn approved documents into visible work state

The trial should prove:

- GoVibe can show project state from approved docs, not hardcoded rows
- docs, roadmap items, tasks, assignments, and feedback are traceable
- `CoDev` and `CoVibe` remain collaboration modes, not new product systems
- bounded external executors such as Gemini CLI can assist without becoming final approvers

## 4. MVP Scope

### 4.1 In Scope

- local developer setup and validation commands
- document version registry as audit sitemap
- PRD terminology for `CoDev` and `CoVibe`
- A2 roadmap source and Task Container contract
- A5 agent-team visibility for role, authority, and handoff state
- bounded external executor workflow for Gemini CLI review packets
- traceability from source docs to feedback artifacts
- validation through `npm run docs:validate` and `npm run baseline:check`

### 4.2 Out Of Scope

- provider billing management
- enterprise tenant provisioning
- production RBAC or ABAC enforcement beyond documented contract and MVP checks
- automatic final approval by any external executor
- C4 rewrite unless opened by a separate approved change request
- replacing MCP with another protocol name or concept

## 5. Master Plan Themes

| Theme | Outcome | Primary Systems | Success Metric |
|---|---|---|---|
| Document-Driven Control Plane | Approved docs drive visible work state | SYSTEM-02, SYSTEM-03, SYSTEM-09 | A2 can render roadmap/task evidence from docs or approved snapshots |
| Agent-Team Governance | Developers can see who owns, executes, reviews, and audits work | SYSTEM-05, SYSTEM-10 | A5 can display agent role, authority, PIC, executor, and handoff state |
| External Executor Support | Gemini CLI can perform bounded support work under lead review | SYSTEM-05, SYSTEM-06, SYSTEM-10 | One pilot packet returns structured feedback plus token telemetry |
| Developer Trial Packaging | A dev can run and validate the MVP locally | SYSTEM-01, SYSTEM-06, SYSTEM-09 | Setup, validation, and trial checklist pass on a clean checkout |

## 6. MVP Phases

| Phase | Goal | PRD Systems | Required Docs | Exit Criteria | Status |
|---|---|---|---|---|---|
| PHASE-00-GOV | Lock governance and source-of-truth baseline | SYSTEM-09, SYSTEM-10 | PRD, version registry, master plan, execution governance | `docs:validate` passes and active MVP docs are registered | in_progress |
| PHASE-01-ROADMAP | Make roadmap and task detail visible from documents | SYSTEM-02, SYSTEM-03, SYSTEM-09 | roadmap, backlog, Task Container contract, design docs | A2 can show roadmap hierarchy and task detail without fake data | planned |
| PHASE-02-AGENTS | Show agent team role, authority, PIC, executor, and handoff state | SYSTEM-05, SYSTEM-07, SYSTEM-10 | agent-team FEAT docs, Visual Agent Fleet docs, registry metadata | A5 can display agent-team governance context for developer trial use | planned |
| PHASE-03-EXECUTOR | Prove bounded external executor support | SYSTEM-05, SYSTEM-06, SYSTEM-10 | runbook, context container, PILOT-01 CR, feedback artifact | Gemini CLI pilot returns scoped output, token telemetry, and lead review notes | in_progress |
| PHASE-04-TRIAL | Package the MVP for developer trial | SYSTEM-01, SYSTEM-02, SYSTEM-05, SYSTEM-06 | quickstart, smoke checklist, trial notes | A developer can install, run, validate, inspect A2/A5, and replay one packet | planned |

## 7. High-Level Sprint Plan

| Sprint | Parent Phase | Goal | Task Count | Exit Criteria |
|---|---|---:|---:|---|
| SPR-MVP-00 | PHASE-00-GOV | Register MVP docs and validate governance baseline | 4 | version registry includes MVP master plan and active executor docs |
| SPR-MVP-01 | PHASE-01-ROADMAP | Connect A2 trial surface to roadmap and task containers | 5 | at least one complete and one incomplete task container render correctly |
| SPR-MVP-02 | PHASE-02-AGENTS | Prepare A5 developer-facing agent governance view | 5 | role, authority, PIC, executor, handoff, and scope status are visible |
| SPR-MVP-03 | PHASE-03-EXECUTOR | Run and document bounded external executor pilot | 4 | feedback artifact, telemetry, and scope-control assessment exist |
| SPR-MVP-04 | PHASE-04-TRIAL | Package dev trial and smoke verification | 5 | clean checkout trial path is documented and repeatable |

## 8. MVP Backlog Seed

| ID | Type | Title | System | C/H | Priority | PIC | Executor | Model Name | Context | Predicted Tokens | Status |
|---|---|---|---|---|---|---|---|---|---|---:|---|
| MVP-BL-001 | doc | Register MVP master plan and active executor docs | SYSTEM-09 | C-2/H4 | P0 | LYRA | THESEUS | GPT-5 | 128k | 6000 | in_progress |
| MVP-BL-002 | feature | Render A2 roadmap and Task Container detail from approved source | SYSTEM-02 | C-3/H4 | P0 | LYRA | VIBE/KIN | GPT-5 | 128k | 18000 | planned |
| MVP-BL-003 | feature | Render A5 agent-team governance and handoff context | SYSTEM-05 | C-3/H4 | P0 | LYRA | VIBE/THESEUS | GPT-5 | 128k | 16000 | planned |
| MVP-BL-003A | feature | Deliver task-scoped context injection planning and execution chain | SYSTEM-05 | C-3/H4 | P0 | LYRA | ARCHON/ATHER | GPT-5 | 128k | 14000 | planned |
| MVP-BL-004 | pilot | Run bounded external executor packet with Gemini CLI | SYSTEM-06 | C-3/H3 | P1 | LYRA | CODEX + Gemini CLI | gemini-3.1-flash-lite | 1m | 52000 | in_progress |
| MVP-BL-005 | trial | Write and verify developer trial quickstart | SYSTEM-01 | C-2/H3 | P0 | LYRA | THESEUS/GHOST | GPT-5 | 128k | 10000 | planned |

## 9. Developer Trial Flow

```text
Clone repo
  -> install dependencies
  -> npm run docs:validate
  -> npm run baseline:check
  -> start Mission Control and MCP runtime
  -> inspect A2 roadmap/task detail
  -> inspect A5 agent governance context
  -> run one bounded external-executor review packet
  -> record feedback, telemetry, and audit notes
```

## 10. UI Traceability

| Roadmap Item ID | Source Section | Mission Control Surface | Progress Source | Evidence Link |
|---|---|---|---|---|
| MVP-BL-002 | Section 8 | A2 Project Overview | `docs/roadmap/BACKLOG-p1-mvp-core.md` | Task Container dropdown verification |
| MVP-BL-003 | Section 8 | A5 Agent Management | agent registry and Visual Agent Fleet docs | role and authority display verification |
| MVP-BL-003A | Section 8 | A2 Project Overview | `docs/roadmap/ROADMAP-task-scoped-context-injection.md` and `docs/roadmap/BACKLOG-task-scoped-context-injection.md` | task-scoped context packet planning chain verification |
| MVP-BL-004 | Section 8 | A5 or runbook view | `docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md` | PILOT-01 feedback artifact |
| MVP-BL-005 | Section 9 | Developer quickstart | quickstart and smoke checklist | `docs:validate` and `baseline:check` logs |

> Note: `docs/roadmap/BACKLOG-p1-mvp-core.md` is a legacy import fixture used to exercise the A2 Task Container / telemetry schema, not canonical MVP product scope. Its progress values are legacy-imported telemetry, not live state.

## 11. Acceptance Criteria

- [x] Active MVP master plan is registered in `docs/DOC-VERSION-REGISTRY.md`.
- [ ] Developer trial scope is limited to document-driven state, agent-team visibility, and bounded external executor support.
- [ ] A2 trial data comes from roadmap/task source docs or approved snapshots, not fake UI rows.
- [ ] A5 trial view can distinguish PIC, executor, approver, auditor, role, and authority.
- [ ] One Gemini CLI bounded external executor packet can be replayed or reviewed with telemetry.
- [ ] `npm run docs:validate` passes before the MVP is marked trial-ready.

## 12. Success Criteria

- [ ] A developer can understand the MVP trial path from this master plan and linked docs.
- [ ] The trial demonstrates both `CoDev` and `CoVibe` terminology without adding a new PRD system.
- [ ] External executor output remains draft support work pending lead review.
- [ ] MVP evidence can be traced from PRD -> master plan -> roadmap/backlog -> runbook/context -> feedback artifact.

## 13. Definition Of Done

- [ ] Master plan, roadmap/backlog, runbook, and context docs are versioned.
- [ ] Version registry points to the active MVP planning docs.
- [ ] MVP trial has a repeatable validation checklist.
- [ ] GHOST verification and ATHER audit notes exist for the trial path.
- [ ] Known warnings are documented or separated from MVP blockers.

## 14. Exit Criteria

- [ ] `npm run docs:validate` passes.
- [ ] `npm run baseline:check` passes.
- [ ] Mission Control can be started by a developer from documented commands.
- [ ] At least one A2 roadmap/task detail and one A5 agent-team view are verified.
- [ ] At least one bounded external executor pilot result is linked with token telemetry.

## 15. Risks And Controls

| Risk | Impact | Control |
|---|---|---|
| Scope expands into platform rewrite | MVP slips | Keep `CoDev` and `CoVibe` as collaboration modes only |
| External executor output is treated as final | Governance failure | Require lead review, QA, and audit before closure |
| UI shows fake progress | Developer trust loss | Use document-derived state or explicit unavailable values |
| Version registry drifts | Audit failure | Update registry with each active canonical MVP doc |
| Baseline warnings hide real blockers | Release confusion | Separate warnings from MVP blockers in trial notes |

## Changelog
| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 0.2.1 | 2026-08-19 | approved | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): frontmatter `planning_tier: "H5"` renamed to `access_scope: "H4"`; MVP-BL-001 row `C-2/H5` corrected to `C-2/H4`. Semantic correction only under PHASE-PRD-04/GATE-SEMANTIC authority; approved status unchanged. | pending | ATHER |
| 0.2.0 | 2026-07-31 | approved | Boss approved the MVP scope; the plan is now eligible to drive the A2 active roadmap through the existing promotion contract. | pending | LYRA |
| 0.1.1+draft | 2026-06-20 | draft | Added a one-line note qualifying BACKLOG-p1-mvp-core as a legacy import fixture in UI Traceability; no other content changed. | pending | LYRA |
| 0.1.0+draft | 2026-06-16 | draft | Initial MVP master plan for developer trial scope, phases, backlog seed, traceability, and validation gates. | pending | Codex |
