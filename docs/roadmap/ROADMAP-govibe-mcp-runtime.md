---
id: RM-govibe-mcp-runtime
version: 0.1.0
status: approved
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

## Sprints
| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress |
|---|---|---|---|---|---|---|
| SPRINT-01 | PHASE-01 | Stand up sidecar runtime and live roadmap feed | 3 | Sidecar serves snapshot and A2 consumes it | done | 100 |
| SPRINT-02 | PHASE-02 | Add governed roadmap markdown export | 1 | Exported markdown preserves roadmap, phase, sprint, task, assignment, and verification data | done | 100 |

## Backlog Items
| ID | Parent ID | Type | Title | PRD System | Priority | Owner | Source Section | Dependencies | Acceptance | Status | Progress |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-001-runtime-core | SPRINT-01 | task | Build shared roadmap runtime core | SYSTEM-06 | P1 | eva | Runtime Core | docs/PRD-GoVibe-MCP-Orchestration.md | Runtime can discover, parse, and serve roadmap sources | done | 100 |
| TASK-002-mcp-bind | SPRINT-01 | task | Bind MCP tools to real launcher and roadmap services | SYSTEM-06 | P1 | atlas | MCP Tool Binding | TASK-001-runtime-core | MCP tools return live data instead of placeholder scaffold text | done | 100 |
| TASK-003-gateway-bootstrap | SPRINT-01 | task | Bootstrap Mission Control from sidecar snapshot and ws events | SYSTEM-02 | P1 | qwen | Mission Gateway | TASK-001-runtime-core | A2 renders live roadmap snapshot from sidecar | done | 100 |
| TASK-004-roadmap-md-export | SPRINT-02 | task | Export live roadmap snapshot to Markdown through MCP/runtime | SYSTEM-02 | P1 | theseus | Roadmap Markdown Export | TASK-001-runtime-core; TASK-002-mcp-bind | Runtime exports task-level markdown that can be parsed and loaded back | done | 100 |

## Task Breakdown
### TASK-003-gateway-bootstrap: Bootstrap Mission Control from sidecar snapshot and ws events
- [x] SUBTASK-003.1 Add snapshot bootstrap request in MissionGateway
  - [x] MICRO-003.1.1 Derive ws url from VITE_GOVIBE_API_URL when VITE_GOVIBE_WS_URL is missing
    - [x] ATOMIC-003.1.1.1 Fetch /mission/snapshot before opening websocket
- [x] SUBTASK-003.2 Display source metadata in A2
  - [x] MICRO-003.2.1 Show task source section in task rows
    - [x] ATOMIC-003.2.1.1 Render source section below task summary

## Assignments
| Task ID | Subject ID | Subject Type | Policy Model | Assigned At | Assigned By |
|---|---|---|---|---|---|
| TASK-001-runtime-core | eva | agent | ABAC | 2026-06-13T09:00:00Z | lyra |
| TASK-002-mcp-bind | atlas | agent | ABAC | 2026-06-13T09:10:00Z | lyra |
| TASK-003-gateway-bootstrap | qwen | agent | ABAC | 2026-06-13T09:20:00Z | lyra |
| TASK-004-roadmap-md-export | theseus | agent | ABAC | 2026-06-14T09:00:00+07:00 | lyra |

## Verification
| Task ID | QA Status | Audit Status | Deployment Status | Updated At |
|---|---|---|---|---|
| TASK-001-runtime-core | passed | passed | n/a | 2026-06-13T10:00:00Z |
| TASK-002-mcp-bind | passed | passed | n/a | 2026-06-13T21:10:20+07:00 |
| TASK-003-gateway-bootstrap | passed | passed | n/a | 2026-06-13T20:55:53+07:00 |
| TASK-004-roadmap-md-export | passed | passed | n/a | 2026-06-14T06:33:25+07:00 |
