---
doc_id: "ROADMAP-GOVIBE-MCP-RUNTIME"
id: RM-govibe-mcp-runtime
version: "0.4.1"
updated: "2026-06-18"
status: approved
owner: "LYRA"
source_of_truth: true
---

# ROADMAP: GoVibe MCP Runtime

**Source PRD:** docs/PRD-GoVibe-Platform-Overview.md
**Owner:** LYRA
**Roadmap Source Path:** docs/roadmap/ROADMAP-govibe-mcp-runtime.md
**Mission Control Render:** A2 Roadmap Board reads document-derived RoadmapSnapshot.

## Product Goal

Bind the shared MCP/runtime layer to Mission Control and replace roadmap blueprint state with document-fed live workflow state.

## Phases
| Phase | Goal | PRD Systems | Required Docs | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| PHASE-01 | Bind MCP runtime and roadmap document ingestion | SYSTEM-02, SYSTEM-05, SYSTEM-06 | PRD, SRS, LLD, API | Mission Control A2 renders from docs/roadmap sources | done | 100 |
| PHASE-02 | Export live roadmap snapshots back to Markdown artifacts | SYSTEM-02, SYSTEM-06 | PRD, SRS, LLD, API | Runtime can export a task-level roadmap markdown artifact and load it back | done | 100 |
| PHASE-03 | Add bi-temporal roadmap versioning | SYSTEM-02, SYSTEM-06, SYSTEM-09 | FEAT, API, ERD | Runtime can query current and historical roadmap state | done | 100 |
| PHASE-04 | Migrate Mission Control UI from hardcoded operational state to approved runtime truth | SYSTEM-02, SYSTEM-03, SYSTEM-09 | FEAT, IMP, Test Plan | A2, A3, A5, and D3 render approved runtime truth or honest empty states without fake execution | done | 100 |

## Sprints
| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| SPRINT-01 | PHASE-01 | Stand up sidecar runtime and live roadmap feed | 3 | Sidecar serves snapshot and A2 consumes it | done | 100 |
| SPRINT-02 | PHASE-02 | Add governed roadmap markdown export | 1 | Exported markdown preserves roadmap, phase, sprint, task, assignment, and verification data | done | 100 |
| SPRINT-03 | PHASE-03 | Add temporal history and as-of query support | 1 | MCP smoke covers current, historical, future-valid, and export round trip behavior | done | 100 |
| SPRINT-04 | PHASE-04 | Remove A2 fake state and prepare bounded migrations for remaining views | 5 | Approved source gating, honest empty state, tests, hardcode inventory, and QA evidence are complete | done | 100 |
| SPRINT-05 | PHASE-04 | Replace A5 template agents with registry-derived MissionSnapshot agents | 5 | Registered agents and provenance render without fake runtime/config state | done | 100 |
| SPRINT-06 | PHASE-04 | Replace A3 capability blueprints and D3 campaign-log blueprint rows with runtime truth | 5 | Capability records come from MissionSnapshot and empty campaign logs show no fake rows | done | 100 |

## Backlog Items
| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-001-runtime-core | SPRINT-01 | task | Build shared roadmap runtime core | SYSTEM-06 | P1 | eva | Runtime Core | docs/PRD-GoVibe-MCP-Orchestration.md | Runtime can discover, parse, and serve roadmap sources | done | 100 |
| TASK-002-mcp-bind | SPRINT-01 | task | Bind MCP tools to real launcher and roadmap services | SYSTEM-06 | P1 | atlas | MCP Tool Binding | TASK-001-runtime-core | MCP tools return live data instead of placeholder scaffold text | done | 100 |
| TASK-003-gateway-bootstrap | SPRINT-01 | task | Bootstrap Mission Control from sidecar snapshot and ws events | SYSTEM-02 | P1 | qwen | Mission Gateway | TASK-001-runtime-core | A2 renders live roadmap snapshot from sidecar | done | 100 |
| TASK-004-roadmap-md-export | SPRINT-02 | task | Export live roadmap snapshot to Markdown through MCP/runtime | SYSTEM-02 | P1 | theseus | Roadmap Markdown Export | TASK-001-runtime-core; TASK-002-mcp-bind | Runtime exports task-level markdown that can be parsed and loaded back | done | 100 |
| TASK-005-bi-temporal-versioning | SPRINT-03 | task | Add bi-temporal versioning to roadmap runtime state | SYSTEM-09 | P1 | ather | Bi-Temporal Versioning | TASK-004-roadmap-md-export | Runtime preserves temporal history and supports as-of roadmap queries | done | 100 |
| TASK-006-a2-diff-audit | SPRINT-04 | task | Audit the A2 real-state migration diff for residual fake state and scope drift | SYSTEM-09 | P0 | codex | Lead fallback after QWEN-LOCAL-01 block | IMP-GVMP01P07EP01 | Read-only findings reference exact diff evidence | done | 100 |
| TASK-007-a2-real-state-ui | SPRINT-04 | task | Remove hardcoded A2 roadmap, progress, assignment, and agent fallback state | SYSTEM-02 | P0 | codex | A2 Real-State UI | TASK-006-a2-diff-audit | A2 renders approved runtime truth or an honest empty state | done | 100 |
| TASK-008-approved-source-gate | SPRINT-04 | task | Enforce approved roadmap source selection in runtime | SYSTEM-03 | P0 | codex | Roadmap Promotion Gate | IMP-GVMP01P07EP01 | Draft source is rejected and approved source is selected | done | 100 |
| TASK-009-a2-focused-tests | SPRINT-04 | task | Add focused tests for source approval and A2 live/empty states | SYSTEM-09 | P0 | codex | Lead fallback after Qwen packet failure | TASK-007-a2-real-state-ui; TASK-008-approved-source-gate | Existing test workflow covers the migration without new dependencies | done | 100 |
| TASK-010-ui-hardcode-inventory | SPRINT-04 | task | Inventory remaining hardcoded operational state outside A2 | SYSTEM-02 | P1 | qwen-local-03 | QWEN-LOCAL-03 | IMP-GVMP01P07EP01 | Ranked evidence-backed migration list exists | done | 100 |
| TASK-011-a5-migration-review | SPRINT-05 | task | Review bounded A5 registry-state migration risks and acceptance checks | SYSTEM-09 | P0 | qwen-local-04 | QWEN-LOCAL-04 | TASK-010-ui-hardcode-inventory | Draft evidence is reviewed by the lead | done | 100 |
| TASK-012-agent-registry-snapshot | SPRINT-05 | task | Load registered agent metadata into MissionSnapshot | SYSTEM-05 | P0 | codex | Agent Registry Snapshot | TASK-011-a5-migration-review | Agents preserve registry role, authority, and source refs with registered status | done | 100 |
| TASK-013-a5-real-agent-ui | SPRINT-05 | task | Remove A5 template-agent and fake config/deploy state | SYSTEM-02 | P0 | codex | A5 Registered Fleet UI | TASK-012-agent-registry-snapshot | A5 renders only MissionSnapshot agents or an honest empty state | done | 100 |
| TASK-014-a5-focused-tests | SPRINT-05 | task | Extend smoke coverage for registry-derived agents | SYSTEM-09 | P0 | codex | Lead fallback | TASK-012-agent-registry-snapshot | Existing smoke workflow verifies registered status and source refs | done | 100 |
| TASK-015-a5-browser-qa | SPRINT-05 | task | Verify A5 registered fleet UI and metadata interaction | SYSTEM-09 | P0 | ghost | Browser QA | TASK-013-a5-real-agent-ui; TASK-014-a5-focused-tests | No template agents or fake live status appear | done | 100 |
| TASK-016-a3-d3-review | SPRINT-06 | task | Review the bounded A3/D3 migration packet and acceptance checks | SYSTEM-09 | P0 | qwen-local-05 | QWEN-LOCAL-05 | TASK-015-a5-browser-qa | Draft evidence is reviewed by the lead | done | 100 |
| TASK-017-capability-snapshot | SPRINT-06 | task | Add capability snapshot data to MissionSnapshot and runtime bootstrap | SYSTEM-05 | P0 | codex | Capability Snapshot | TASK-016-a3-d3-review | Runtime exposes registered capability records | done | 100 |
| TASK-018-a3-real-capability-ui | SPRINT-06 | task | Render A3 capability records and honest D3 empty state | SYSTEM-02 | P0 | codex | A3 Capability and D3 Campaign Logs | TASK-017-capability-snapshot | A3/D3 show runtime truth only | done | 100 |
| TASK-019-a3-d3-focused-tests | SPRINT-06 | task | Extend smoke coverage for capability records and D3 empty state | SYSTEM-09 | P0 | codex | Lead fallback | TASK-017-capability-snapshot | Existing smoke workflow verifies capability records and empty campaign state | done | 100 |
| TASK-020-a3-d3-browser-qa | SPRINT-06 | task | Verify A3 capability records and D3 empty campaign state | SYSTEM-09 | P0 | ghost | Browser QA | TASK-018-a3-real-capability-ui; TASK-019-a3-d3-focused-tests | No blueprint controls or fake log rows appear | done | 100 |

## Task Breakdown
### TASK-003-gateway-bootstrap: Bootstrap Mission Control from sidecar snapshot and ws events
- [x] SUBTASK-003.1 Add snapshot bootstrap request in MissionGateway
  - [x] MICRO-003.1.1 Derive ws url from VITE_GOVIBE_API_URL when VITE_GOVIBE_WS_URL is missing
    - [x] ATOMIC-003.1.1.1 Fetch /mission/snapshot before opening websocket
- [x] SUBTASK-003.2 Display source metadata in A2
  - [x] MICRO-003.2.1 Show task source section in task rows
    - [x] ATOMIC-003.2.1.1 Render source section below task summary

### TASK-007-a2-real-state-ui: Remove hardcoded A2 operational state
- [x] SUBTASK-007.1 Remove blueprint roadmap rows and fake progress fallback
  - [x] MICRO-007.1.1 Render zero-state metrics without approved data
    - [x] ATOMIC-007.1.1.1 Remove legacy A2 fallback arrays and renderer
- [x] SUBTASK-007.2 Replace template agent roster with mission snapshot agents
  - [x] MICRO-007.2.1 Show an honest empty roster when no agent event exists
    - [x] ATOMIC-007.2.1.1 Remove template agent options from live assignment rows
- [ ] SUBTASK-007.3 Complete QA and audit closure

### TASK-008-approved-source-gate: Enforce approved roadmap promotion
- [x] SUBTASK-008.1 Select only roadmap sources whose parsed approval status is approved
- [x] SUBTASK-008.2 Reject an explicitly requested draft source
- [ ] SUBTASK-008.3 Add durable focused regression coverage

### TASK-018-a3-real-capability-ui: Render A3 capability records and honest D3 empty state
- [x] SUBTASK-018.1 Populate capability records from runtime tool catalog
  - [x] MICRO-018.1.1 Add capabilities to MissionSnapshot
    - [x] ATOMIC-018.1.1.1 Map tool catalog entries to registered capability records
- [x] SUBTASK-018.2 Remove blueprint capability controls from A3
  - [x] MICRO-018.2.1 Render capability records only
    - [x] ATOMIC-018.2.1.1 Drop Inspect and Wire Event blueprint actions
- [x] SUBTASK-018.3 Remove blueprint campaign-log rows from D3
  - [x] MICRO-018.3.1 Render honest empty state when no logs exist
    - [x] ATOMIC-018.3.1.1 Replace fake campaign logs with empty-state messaging

## Assignments
| Task ID | Subject ID | Subject Type | Policy Model | Assigned At | Assigned By |
|---|---|---|---|---|---|
| TASK-001-runtime-core | eva | agent | ABAC | 2026-06-13T09:00:00Z | lyra |
| TASK-002-mcp-bind | atlas | agent | ABAC | 2026-06-13T09:10:00Z | lyra |
| TASK-003-gateway-bootstrap | qwen | agent | ABAC | 2026-06-13T09:20:00Z | lyra |
| TASK-004-roadmap-md-export | theseus | agent | ABAC | 2026-06-14T09:00:00+07:00 | lyra |
| TASK-005-bi-temporal-versioning | ather | agent | ABAC | 2026-06-14T07:28:37+07:00 | lyra |
| TASK-006-a2-diff-audit | qwen-local-01 | agent | ABAC | 2026-06-18T08:00:00+07:00 | lyra |
| TASK-007-a2-real-state-ui | codex | agent | ABAC | 2026-06-18T07:45:00+07:00 | lyra |
| TASK-008-approved-source-gate | codex | agent | ABAC | 2026-06-18T07:45:00+07:00 | lyra |
| TASK-009-a2-focused-tests | qwen-local-02 | agent | ABAC | 2026-06-18T08:00:00+07:00 | lyra |
| TASK-010-ui-hardcode-inventory | qwen-local-03 | agent | ABAC | 2026-06-18T08:00:00+07:00 | lyra |
| TASK-011-a5-migration-review | qwen-local-04 | agent | ABAC | 2026-06-18T12:50:00+07:00 | lyra |
| TASK-012-agent-registry-snapshot | codex | agent | ABAC | 2026-06-18T12:52:00+07:00 | lyra |
| TASK-013-a5-real-agent-ui | codex | agent | ABAC | 2026-06-18T12:52:00+07:00 | lyra |
| TASK-014-a5-focused-tests | codex | agent | ABAC | 2026-06-18T12:55:00+07:00 | lyra |
| TASK-015-a5-browser-qa | ghost | agent | ABAC | 2026-06-18T12:55:00+07:00 | lyra |
| TASK-016-a3-d3-review | qwen-local-05 | agent | ABAC | 2026-06-18T14:10:00+07:00 | lyra |
| TASK-017-capability-snapshot | codex | agent | ABAC | 2026-06-18T14:12:00+07:00 | lyra |
| TASK-018-a3-real-capability-ui | codex | agent | ABAC | 2026-06-18T14:12:00+07:00 | lyra |
| TASK-019-a3-d3-focused-tests | codex | agent | ABAC | 2026-06-18T14:12:00+07:00 | lyra |
| TASK-020-a3-d3-browser-qa | ghost | agent | ABAC | 2026-06-18T14:12:00+07:00 | lyra |

## Verification
| Task ID | QA Status | Audit Status | Deployment Status | Updated At |
|---|---|---|---|---|
| TASK-001-runtime-core | passed | passed | n/a | 2026-06-13T10:00:00Z |
| TASK-002-mcp-bind | passed | passed | n/a | 2026-06-13T21:10:20+07:00 |
| TASK-003-gateway-bootstrap | passed | passed | n/a | 2026-06-13T20:55:53+07:00 |
| TASK-004-roadmap-md-export | passed | passed | n/a | 2026-06-14T06:33:25+07:00 |
| TASK-005-bi-temporal-versioning | passed | passed | n/a | 2026-06-14T07:28:37+07:00 |
| TASK-006-a2-diff-audit | passed | passed | n/a | 2026-06-18T12:41:14+07:00 |
| TASK-007-a2-real-state-ui | passed | passed | n/a | 2026-06-18T12:41:14+07:00 |
| TASK-008-approved-source-gate | passed | passed | n/a | 2026-06-18T12:41:14+07:00 |
| TASK-009-a2-focused-tests | passed | passed | n/a | 2026-06-18T12:41:14+07:00 |
| TASK-010-ui-hardcode-inventory | passed | passed | n/a | 2026-06-18T12:41:14+07:00 |
| TASK-011-a5-migration-review | passed | passed | n/a | 2026-06-18T13:02:00+07:00 |
| TASK-012-agent-registry-snapshot | passed | passed | n/a | 2026-06-18T13:02:00+07:00 |
| TASK-013-a5-real-agent-ui | passed | passed | n/a | 2026-06-18T13:02:00+07:00 |
| TASK-014-a5-focused-tests | passed | passed | n/a | 2026-06-18T13:02:00+07:00 |
| TASK-015-a5-browser-qa | passed | passed | n/a | 2026-06-18T13:02:00+07:00 |
| TASK-016-a3-d3-review | passed | passed | n/a | 2026-06-18T14:10:00+07:00 |
| TASK-017-capability-snapshot | passed | passed | n/a | 2026-06-18T14:12:00+07:00 |
| TASK-018-a3-real-capability-ui | passed | passed | n/a | 2026-06-18T14:12:00+07:00 |
| TASK-019-a3-d3-focused-tests | passed | passed | n/a | 2026-06-18T14:12:00+07:00 |
| TASK-020-a3-d3-browser-qa | passed | passed | n/a | 2026-06-18T14:12:00+07:00 |

## Changelog

| Version | Date | Summary |
|---|---|---|
| 0.4.1 | 2026-06-18 | Closed Sprint 06 with registry-backed capabilities, honest D3 empty state, and browser QA verification. |
| 0.4.0 | 2026-06-18 | Closed Sprint 06 with capability records, D3 honest empty state, smoke checks, and browser QA in progress. |
| 0.3.1 | 2026-06-18 | Closed Sprint 05 with registry-derived agent smoke assertions and A5 browser interaction verification. |
| 0.3.0 | 2026-06-18 | Added Sprint 05 for A5 registry-derived agent state, bounded Qwen review, runtime/UI implementation, and QA gates. |
| 0.2.1 | 2026-06-18 | Closed Sprint 04 with A2 real-state UI, approved-source enforcement, focused smoke coverage, Qwen inventory evidence, and browser QA. |
| 0.2.0 | 2026-06-18 | Added Phase 4 UI real-state migration, bounded Qwen local-agent assignments, current execution status, and verification placeholders. |
| 0.1.0 | 2026-06-15 | Added canonical doc_id metadata to align the roadmap with the document versioning governance standard. |
