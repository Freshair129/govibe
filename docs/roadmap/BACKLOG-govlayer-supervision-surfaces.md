---
title: "BACKLOG: Gov-Layer Supervision Surfaces (Mission Canvas + Agent Console)"
doc_id: "BACKLOG-GOVLAYER-SUPERVISION-SURFACES"
status: "draft"
version: "0.1.4+draft"
updated: "2026-08-17"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
planning_tier: "backlog"
related_docs:
  - "docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md"
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
  - "docs/STD-Execution-Governance.md"
  - ".agents/pm/asset/Planning-Decomposition-Standard.md"
---

# BACKLOG: Gov-Layer Supervision Surfaces (Mission Canvas + Agent Console)

## 1. Purpose

Implementation backlog for `docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md`:
the owner-approved direction that GoVibe acts as a **Gov layer + Launcher + Console**
over external coding harnesses, adding two supervision surfaces to Mission Control —
**A8 Mission Canvas** (governed workflow graph) and **A9 Agent Console** (PTY
sessions over allowlisted external CLI agents).

This is **new product surface**, so it lives in its own backlog: the production
readiness masterplan explicitly governs readiness only, not new surface
(`docs/roadmap/MASTERPLAN-govibe-production-readiness.md` §1). Sequencing still
respects that plan — the MissionSnapshot contract work here depends on the
orchestration-slice contract task (`TASK-PRD-005`) and must not race
GATE-CONTRACT.

Binding guardrails from ADR-029 apply to every task below: no owned agent loop,
no owned editor, no owned workspace lifecycle. The sidecar stays
loopback-bound; the PTY module spawns allowlisted binaries only; every session
declares an `access_scope` ceiling per ADR-021.

## Phases

| Phase | Goal | Governing SoT | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|
| PHASE-GLS-01 | Deliver the supervision surfaces defined by ADR-029 | `docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md` | GLS-001 through GLS-003 are done with recorded command evidence | planned | 0 |

## Sprints

| Sprint | Parent ID | Goal | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|
| SPR-GLS-01 | PHASE-GLS-01 | Agent Console MVP: PTY module, session contract, A9 view | A session can be started, attached, and stopped from the web with the session visible in the snapshot | planned | 0 |
| SPR-GLS-02 | PHASE-GLS-01 | Mission Canvas: read-only graph, then governed actions | The canvas renders live orchestration data and every enabled action emits an audit event | planned | 0 |
| SPR-GLS-03 | PHASE-GLS-01 | PM interoperability: canonical plan model projected to external PM tools | One canonical backlog task round-trips to a configured external PM target with declared projection fidelity | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | Priority | Owner | Status | Dependencies | Source Section |
|---|---|---|---|---|---|---|---|---|
| GLS-001 | SPR-GLS-01 | task | Agent Console MVP: sidecar PTY module, agent.session contract, A9 view | P0 | VIBE | done | TASK-PRD-005 | Task Containers TC-GLS-001 |
| GLS-002 | SPR-GLS-02 | task | Mission Canvas read-only: A8 view rendering orchestration and workflow runs | P1 | VIBE | done | GLS-001 | Task Containers TC-GLS-002 |
| GLS-003 | SPR-GLS-02 | task | Mission Canvas governed actions: approve, rerun, assign with audit events | P2 | ARCHON | planned | GLS-002 | Task Containers TC-GLS-003 |
| GLS-004 | SPR-GLS-01 | task | Node execution contract schema and STATE/contract generator with hook enforcement | P0 | ARCHON | done | - | Task Containers TC-GLS-004 |
| GLS-005 | SPR-GLS-03 | task | PmAdapter contract: outbound-first plan projection to Notion and Jira class targets | P1 | ARCHON | planned | GLS-004 | Task Containers TC-GLS-005 |

## Assignments

| Task ID | Subject ID | Subject Type | Policy Model | Assigned At | Assigned By |
|---|---|---|---|---|---|
| GLS-001 | VIBE | agent | ABAC | 2026-08-17T00:00:00Z | Boss |
| GLS-002 | VIBE | agent | ABAC | 2026-08-17T00:00:00Z | Boss |
| GLS-003 | ARCHON | agent | ABAC | 2026-08-17T00:00:00Z | Boss |
| GLS-004 | ARCHON | agent | ABAC | 2026-08-17T00:00:00Z | Boss |
| GLS-005 | ARCHON | agent | ABAC | 2026-08-17T00:00:00Z | Boss |

## Handoffs

| Task ID | From ID | To ID | Required Artifact | Note | Created At | State |
|---|---|---|---|---|---|---|
| GLS-001 | VIBE | ATHER | Impact analysis over the changed MissionSnapshot contract | Completed 2026-08-17: `calculateWorkspaceImpact` run against #150's merge commit `1321013` on `main` (6 seeds, all mission-protocol/runtime/frontend contract surfaces GLS-001 touched) reports 9 `must_update` artifacts, all previously reviewed during implementation and re-verified unchanged post-merge; ~90 `review_and_update` artifacts, none contradicting the contract. Closed as owner-directed evidence review with Boss present in session and explicitly directing closure ("จัดการปิดงานให้หมด") — per the TASK-PRD-002 precedent, this is not an independent ATHER audit reproduction | 2026-08-17T00:00:00Z | completed |
| GLS-004 | ARCHON | VIBE | Canvas defect-rendering for an invalid/missing node contract | GLS-004's DoD criterion "the canvas renders the node as a defect" is deferred, not fabricated: no Canvas exists yet to render anything. Whoever implements GLS-002/003 must consult scripts/docs/validate-roadmap-containers.mjs Checks 4-5 (or a live equivalent) and render a node lacking a schema-valid .govibe/node-contracts/&lt;task_id&gt;.json as a defect state | 2026-08-17T00:00:00Z | pending |

## Verification

| Task ID | QA Status | Audit Status | Deployment Status | Updated At |
|---|---|---|---|---|
| GLS-001 | passed | passed | n/a | 2026-08-17T00:00:00Z |
| GLS-002 | passed | passed | n/a | 2026-08-17T00:00:00Z |
| GLS-003 | pending | pending | n/a | 2026-08-17T00:00:00Z |
| GLS-004 | passed | passed | n/a | 2026-08-17T00:00:00Z |
| GLS-005 | pending | pending | n/a | 2026-08-17T00:00:00Z |

## Task Containers

### TC-GLS-001

```yaml
task_container_id: TC-GLS-001
task_id: GLS-001
parent_phase_id: PHASE-GLS-01
parent_sprint_id: SPR-GLS-01
title: Agent Console MVP - sidecar PTY module, agent.session contract, A9 view
requirement_type: FR
complexity: C-3
access_scope: H4
status: done
version: 0.2.0
pic: VIBE
executor: VIBE
approver: Boss
auditor: ATHER
symbol_links:
  code: scripts/mcp/runtime/agent-session-service.mjs
  doc: docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md
  test: scripts/mcp/runtime/agent-session-service.test.mjs
definition_of_done:
  acceptance_criteria:
    - criterion: Given the sidecar is running, when a start command names an allowlisted binary and a client workspace root, then a PTY session spawns, its output streams to the A9 view, and a stop command terminates the process
      checked: true
    - criterion: Given a start command names a binary outside the allowlist, when the sidecar receives it, then the command is rejected with an explanatory error and no process is spawned
      checked: true
    - criterion: Given a session is running, when the snapshot is read from either the TypeScript contract or the runtime, then the sessions slice reports the same fields on both sides
      checked: true
  success_criteria:
    - criterion: Given a session declares an access_scope ceiling at start, when the A9 view renders it, then the ceiling is visible and an H4 session cannot start without a recorded owner approval
      checked: true
  exit_criteria:
    - criterion: Given the composed change is complete, when npm run lint, npm test, and npm run mcp:smoke run, then all exit 0 and the impact analysis over the changed contract paths is attached to the handoff
      checked: true
changelog: Authored 2026-08-17 from ADR-029 phase 1 (Agent Console MVP). Owner ratified ADR-029 (0.2.0 accepted) and authorized the H4 override the same day. Merged to main via PR #150 (squash commit 1321013) after live verification with the real Claude Code CLI (fit-addon geometry, headless-xterm screen serialization, chunked/paste-wrapped input, Windows cmd.exe shim spawning) and a green baseline (lint, 85 files / 710 vitest + 70 node tests, mcp:smoke, build). Closed 2026-08-17 on owner-directed evidence review (Boss present in session, explicit closure instruction) per the TASK-PRD-002 precedent, with a fresh calculateWorkspaceImpact run against the merged commit attached to the ATHER handoff above.
created_at: 2026-08-17T00:00:00Z,LYRA,pending
token_telemetry:
  model_name: claude-fable-5
  context_length: 200k
  predicted_token_usage: 60000
  total_token_usage: 95000
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

### TC-GLS-002

```yaml
task_container_id: TC-GLS-002
task_id: GLS-002
parent_phase_id: PHASE-GLS-01
parent_sprint_id: SPR-GLS-02
title: Mission Canvas read-only - A8 view rendering orchestration and workflow runs
requirement_type: FR
complexity: C-2
access_scope: H2
status: done
version: 0.2.0
pic: VIBE
executor: VIBE
approver: Boss
auditor: ATHER
symbol_links:
  code: src/features/canvas/canvas-graph.ts
  doc: docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md
  test: src/features/canvas/canvas-graph.test.ts
definition_of_done:
  acceptance_criteria:
    - criterion: Given the snapshot carries orchestration waves or workflow runs, when the A8 view opens, then a node graph renders from that live data with node state encoded visually and no fabricated structure
      checked: true
    - criterion: Given the snapshot carries no orchestration data, when the A8 view opens, then an empty state names the missing feed instead of showing a placeholder graph
      checked: true
  success_criteria:
    - criterion: Given a rendered node, when it is selected, then the inspector shows its Task ID, assignee, and evidence links resolved from the snapshot, and an open-console affordance navigates to the A9 session of the assignee when one exists
      checked: true
  exit_criteria:
    - criterion: Given the composed change is complete, when npm run lint and npm test run, then both exit 0 and the view is reachable through the A-domain navigation without breaking existing views
      checked: true
changelog: Authored 2026-08-17 from ADR-029 phase 2 (Canvas read-only). Implemented and closed the same day using @xyflow/react (React Flow), chosen so the engine is reusable for B3/B4 Genesis Knowledge graph views per this container's original note. Graph derivation and inspector resolution are pure functions (src/features/canvas/canvas-graph.ts) with 12 unit tests covering: orchestration-over-workflowRuns precedence, wave/run column layout, unrecognized-status normalization to "unknown" instead of fabricated meaning, edges derived only from real roadmap.artifactLinks matches (never invented), and the "open console" affordance resolving only on an exact session.agentId match (documented gap: roadmap assignee IDs like "VIBE" are a different namespace from A9 session agentId values like "claude-code" today, so the affordance is honestly absent rather than fuzzy-matched). Live-verified against the running sidecar's real orchestration data (1 wave, 6 real MVP-BL-* tasks) in the browser: graph rendered, node selection resolved real Task ID/title/state/evidence in the inspector, and the no-live-session case rendered its honest message.
created_at: 2026-08-17T00:00:00Z,LYRA,pending
token_telemetry:
  model_name: claude-sonnet-5
  context_length: 200k
  predicted_token_usage: 40000
  total_token_usage: 60000
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

### TC-GLS-003

```yaml
task_container_id: TC-GLS-003
task_id: GLS-003
parent_phase_id: PHASE-GLS-01
parent_sprint_id: SPR-GLS-02
title: Mission Canvas governed actions - approve, rerun, assign with audit events
requirement_type: FR
complexity: C-2
access_scope: H3
status: planned
version: 0.1.0+draft
pic: ARCHON
executor: ARCHON
approver: Boss
auditor: ATHER
symbol_links:
  code: scripts/mcp/runtime-core.mjs
  doc: docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md
  test: unavailable
definition_of_done:
  acceptance_criteria:
    - criterion: Given a selected node, when an approve, rerun, or assign action is invoked, then a workflow node action command reaches the runtime and the resulting state change appears in the snapshot
      checked: false
    - criterion: Given any canvas action executes, when the audit trail is read, then an event records the actor, the Task ID, the action, and the timestamp
      checked: false
  success_criteria:
    - criterion: Given an action targets a task whose access scope requires an approval gate, when the actor lacks the recorded approval, then the action is refused with the gate named in the error
      checked: false
  exit_criteria:
    - criterion: Given the composed change is complete, when npm run lint, npm test, and npm run mcp:smoke run, then all exit 0
      checked: false
changelog: Authored 2026-08-17 from ADR-029 phase 3 (governed actions). Actions are enabled one at a time behind the ADR-021 access-scope gates.
created_at: 2026-08-17T00:00:00Z,LYRA,pending
token_telemetry:
  model_name: claude-fable-5
  context_length: 200k
  predicted_token_usage: 35000
  total_token_usage: 35000
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

### TC-GLS-004

```yaml
task_container_id: TC-GLS-004
task_id: GLS-004
parent_phase_id: PHASE-GLS-01
parent_sprint_id: SPR-GLS-01
title: Node execution contract schema and STATE/contract generator with hook enforcement
requirement_type: FR
complexity: C-2
access_scope: H2
status: done
pic: ARCHON
executor: ARCHON
approver: Boss
auditor: ATHER
version: 0.2.0
symbol_links:
  code: scripts/mcp/runtime/node-contract-generator.mjs
  doc: docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md
  test: scripts/mcp/runtime/node-contract-generator.test.mjs
definition_of_done:
  acceptance_criteria:
    - criterion: Given a plan source task, when the generator runs, then it materializes a node contract carrying node id, input and output edges, acceptance criteria, a deterministic exit gate command, a retry policy, and a rework policy, validated against a published schema
      checked: true
    - criterion: Given a node whose contract is missing or fails schema validation, when dispatch is attempted, then the dispatch is refused and the canvas renders the node as a defect
      checked: false
    - criterion: Given a node whose exit gate has not recorded passing evidence, when a handoff is attempted, then a hook blocks the handoff with the missing evidence named
      checked: true
  success_criteria:
    - criterion: Given the retry policy fires, when the exit gate fails deterministically, then the work returns to the same executor with the tool output attached and any escalation moves exactly one tier rung per the SLM routing standard
      checked: true
  exit_criteria:
    - criterion: Given the composed change is complete, when npm run lint, npm test, and npm run roadmap:validate run, then all exit 0 and the generator output for one real backlog task is committed as evidence
      checked: true
changelog: Authored 2026-08-17 from the owner's mid-session directive that every node must carry an enforced contract (AC, exit gate, retry, rework) produced by a dedicated STATE/contract generator, applying the Execution Packet schema and tiered review cascade rather than inventing a competing schema. Implemented and closed the same day (schemas/Node_Execution_Contract_Schema.json; scripts/mcp/runtime/node-contract-generator.mjs; hook enforcement wired into scripts/docs/validate-roadmap-containers.mjs as Checks 4-5, scoped to this backlog only after a live-found bug showed the unscoped version hard-failing 17 already-closed masterplan tasks). Generated and committed real contracts for GLS-001, GLS-004, and GLS-005 under .govibe/node-contracts/. Criterion 2 is left unchecked on purpose: the gate-time dispatch-refusal half is implemented and verified (scripts/docs/validate-roadmap-containers.test.mjs), but "the canvas renders the node as a defect" cannot be true yet because Mission Canvas (GLS-002/003) does not exist — marking it checked now would be a fabricated claim.
created_at: 2026-08-17T00:00:00Z,LYRA,pending
token_telemetry:
  model_name: claude-sonnet-5
  context_length: 200k
  predicted_token_usage: 30000
  total_token_usage: 55000
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

### TC-GLS-005

```yaml
task_container_id: TC-GLS-005
task_id: GLS-005
parent_phase_id: PHASE-GLS-01
parent_sprint_id: SPR-GLS-03
title: PmAdapter contract - outbound-first plan projection to Notion and Jira class targets
requirement_type: FR
complexity: C-2
access_scope: H2
status: planned
version: 0.1.0+draft
pic: ARCHON
executor: ARCHON
approver: Boss
auditor: ATHER
symbol_links:
  code: scripts/mcp/registry.mjs
  doc: docs/adr/ADR-029-Gov-Layer-Launcher-Console-Boundary.md
  test: unavailable
definition_of_done:
  acceptance_criteria:
    - criterion: Given a canonical backlog task, when export runs against a configured target platform, then an entry is created through that platform's MCP server or API carrying a backlink to the canonical Task ID and a recorded field mapping
      checked: false
    - criterion: Given a target platform cannot represent a canonical field, when export runs, then the adapter records a projection state of APPROXIMATE, PARTIAL, or UNPROJECTABLE for that field instead of claiming a complete conversion
      checked: false
    - criterion: Given a status change occurs inside the external platform, when sync pulls it, then the change lands as an observed update candidate for review and canonical state is not overwritten without an approval
      checked: false
  success_criteria:
    - criterion: Given no external PM is configured, when the same plan is used standalone, then the Roadmap Board provides full PM capability with nothing disabled
      checked: false
    - criterion: Given a second target platform is added, when its adapter is implemented, then no platform-conditional logic is required outside the adapter boundary
      checked: false
  exit_criteria:
    - criterion: Given the composed change is complete, when npm run lint, npm test, and npm run docs:validate run, then all exit 0 and the adapter contract document is registered
      checked: false
changelog: Authored 2026-08-17 from the owner's directive that GoVibe acts as the middle layer between agents and per-team PM tools (Notion, Jira) with format translation per target, outbound-first sync, observed inbound candidates, and full standalone-PM parity per ADR-029 Decision 6.
created_at: 2026-08-17T00:00:00Z,LYRA,pending
token_telemetry:
  model_name: claude-fable-5
  context_length: 200k
  predicted_token_usage: 45000
  total_token_usage: 45000
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

## Status Protocol

Status lives in the tables above; the roadmap parser reads the `Status` cells,
so editing a cell is what Mission Control renders. Allowed tokens: `planned`,
`in-progress`, `blocked`, `ready`, `assigned`, `review`, `done`. No
Definition-of-Done criterion is ticked and no task is marked `done` without
the command evidence the criterion names.

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.1.4+draft | 2026-08-17 | GLS-002 closed to done: Mission Canvas (A8) implemented with @xyflow/react, wired into A-domain navigation with an onNavigate callback threaded App -> RenderView for the open-console affordance. Graph derivation and inspector resolution are pure, unit-tested functions in src/features/canvas/canvas-graph.ts. Live-verified against the running sidecar's real orchestration data in the browser. |
| 0.1.3+draft | 2026-08-17 | GLS-004 closed to done: schemas/Node_Execution_Contract_Schema.json authored; scripts/mcp/runtime/node-contract-generator.mjs generates and validates contracts from real Task Containers; scripts/docs/validate-roadmap-containers.mjs Checks 4-5 enforce contract validity and handoff evidence at gate time, scoped to this backlog only (an unscoped first pass hard-failed 17 already-closed masterplan tasks — fixed and pinned with a regression test before landing). Contracts for GLS-001, GLS-004, and GLS-005 generated and committed under .govibe/node-contracts/. Criterion "the canvas renders the node as a defect" stays unchecked and handed off to GLS-002/003 — Canvas does not exist yet. |
| 0.1.2+draft | 2026-08-17 | GLS-001 closed to done on owner-directed evidence review (Boss present in session, explicit closure instruction): all DoD criteria ticked with command/test evidence, verification set to passed/passed, the ATHER impact-analysis handoff completed with a fresh calculateWorkspaceImpact run against merged main. GLS-001 shipped via PR #150 (squash commit 1321013). |
| 0.1.1+draft | 2026-08-17 | Owner ratified ADR-029 and authorized the H4 override: the GLS-001 ratification handoff is completed and GLS-001 moves planned → ready. No DoD criterion is ticked by this change. |
| 0.1.0+draft | 2026-08-17 | Initial backlog authored from ADR-029: five tasks (Console MVP, Canvas read-only, Canvas actions, node contract schema + generator, PmAdapter outbound projection) with containers, assignments, and the pending owner handoff gating implementation. |
