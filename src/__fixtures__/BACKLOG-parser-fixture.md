---
title: "BACKLOG: Parser Fixture"
doc_id: "BACKLOG-PARSER-FIXTURE"
status: approved
version: 0.1.0
updated: 2026-06-20
owner: TEST
---

# BACKLOG: Parser Fixture

**Purpose:** Deterministic test fixture for roadmap-parser.mjs unit tests.

## Phases

| Phase | Parent ID | Goal | Status | Progress | Recorded At |
|---|---|---|---|---:|---|
| PHA-FIX-01 | RM-backlog-parser-fixture | Core parser test phase | planned | 0 | 2026-06-20T00:00:00Z |

## Sprints

| Sprint | Parent ID | Goal | Exit Criteria | Status | Progress | Recorded At |
|---|---|---|---|---|---:|---|
| SPR-FIX-01A | PHA-FIX-01 | Establish fixture baseline | All fixture nodes parse correctly | planned | 0 | 2026-06-20T00:00:00Z |

## Backlog Items

| ID | Parent ID | Type | Title | Status | Progress |
|---|---|---|---|---|---:|
| TASK-FIX-01 | SPR-FIX-01A | task | Complete fixture task | planned | 0 |
| TASK-FIX-02 | SPR-FIX-01A | task | Incomplete fixture task | planned | 0 |

## Task Breakdown

### TASK-FIX-01: Complete fixture task

- [x] S-FIX-01.1 Verify the packet shell is assembled correctly
  - [ ] M-FIX-01.1 Build baseline policy block

## Acceptance Criteria

- [x] The fixture is honest
- [x] Local packets stay bounded
- [x] Parser skips prose bullets correctly

## Task Containers

### TC-TASK-FIX-01

```yaml
task_container_id: TC-TASK-FIX-01
task_id: TASK-FIX-01
title: Complete fixture task
requirement_type: FR
complexity: medium
status: stable
version: 1.0.0
pic: TEST-AGENT
executor: codex
approver: LEAD
auditor: ATHER
symbol_links:
  code: src/__fixtures__/example.ts
  doc: docs/references/templates/TEMPLATE_REFERENCE.md
  test: src/__fixtures__/BACKLOG-parser-fixture.md
definition_of_done:
  acceptance_criteria:
    - criterion: Packet shell fields are all present
      checked: true
    - criterion: Symbol links are non-empty
      checked: false
  success_criteria:
    - criterion: Parser returns complete flag as true
      checked: false
  exit_criteria:
    - criterion: No missing fields reported
      checked: false
changelog: Initial complete container for parser fixture.
created_at: 2026-06-20T00:00:00Z
last_update: 2026-06-20T00:00:00Z
token_telemetry:
  model_name: codex
  context_length: 16k
  predicted_token_usage: 800
  actual_input_tokens: unavailable
  actual_output_tokens: unavailable
  tool_calling_tokens: unavailable
  total_token_usage: 800
export:
  json: enabled
  yaml: enabled
  markdown: enabled
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

### TC-TASK-FIX-02

```yaml
task_container_id: TC-TASK-FIX-02
task_id: TASK-FIX-02
title: Incomplete fixture task
requirement_type: FR
status: planned
version: 1.0.0
pic: TEST-AGENT
executor: codex
approver: LEAD
auditor: ATHER
symbol_links:
  code: src/__fixtures__/example.ts
  doc: docs/references/templates/TEMPLATE_REFERENCE.md
  test: src/__fixtures__/BACKLOG-parser-fixture.md
definition_of_done:
  acceptance_criteria:
    - criterion: Basic acceptance criterion present
      checked: false
  success_criteria:
    - criterion: Basic success criterion present
      checked: false
changelog: Deliberately incomplete container — missing complexity and exit_criteria.
created_at: 2026-06-20T00:00:00Z
last_update: 2026-06-20T00:00:00Z
token_telemetry:
  model_name: codex
  context_length: 16k
  predicted_token_usage: 400
  actual_input_tokens: unavailable
  actual_output_tokens: unavailable
  tool_calling_tokens: unavailable
  total_token_usage: 400
export:
  json: enabled
  yaml: enabled
  markdown: enabled
ui_state:
  dropdown_default: collapsed
  expanded: false
  disabled_reason: Incomplete — missing complexity and exit_criteria.
```
