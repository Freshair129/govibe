---
title: "BACKLOG: P1 MVP Core Task Containers"
doc_id: "BACKLOG-P1-MVP-CORE"
status: "draft"
version: "0.1.0+draft"
updated: "2026-06-16"
owner: "LYRA"
source_of_truth: true
prd_system: "SYSTEM-02::Project-Roadmap-Management-System"
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/features/project-roadmap/FEAT-Document-Driven-Roadmap-Source.md"
  - "docs/features/project-roadmap/FEAT-Roadmap-Promotion-Contract.md"
  - "docs/design/DESIGN_SYSTEM.md"
---

# BACKLOG: P1 MVP Core Task Containers

**ImpId:** IMP-GVMP01P05EP01  
**Source Export:** `C:/Users/freshair/Downloads/p1-mvp-core-.json`  
**Source Phase:** p1, MVP Core  
**Primary Systems:** SYSTEM-02::Project-Roadmap-Management-System, SYSTEM-03::Docs-to-Code-System  
**Planning PIC:** LYRA  
**Data Contract PIC:** KIN  
**Design PIC:** THESEUS  
**UI PIC:** VIBE  
**Audit PIC:** ATHER  
**Verification PIC:** GHOST  
**Status:** draft  
**Backlog Source Path:** `docs/roadmap/BACKLOG-p1-mvp-core.md`  
**Mission Control Render:** A2 Roadmap Board consumes roadmap hierarchy plus Task Container detail records.

## Goal

Represent the P1 MVP Core export as a GoVibe roadmap source with Task Container records that can drive the A2 task detail dropdown without inventing data in React.

## Phases

| Phase | Parent ID | Goal | Status | Progress | Recorded At |
|---|---|---|---|---:|---|
| PHA-GVMP01P01 | GVMP01 | MVP Core room and music sharing foundation | planned | 92 | 2026-06-14T17:23:58+07:00 |

## Sprints

| Sprint | Parent ID | Goal | Task Count | Exit Criteria | Status | Progress | Recorded At |
|---|---|---|---:|---|---|---:|---|
| SPR-GVMP01P01EP01-1A | PHA-GVMP01P01 | WebSocket and core architecture | 7 | Room creation, join flow, QR/share, presence, and mobile-first UI are represented as task containers | planned | 100 | 2026-06-14T17:23:58+07:00 |
| SPR-GVMP01P01EP01-1B | PHA-GVMP01P01 | Playback and queue synchronization | 6 | Queue, current track, playback controls, auto-next, and volume controls are represented as task containers | planned | 83 | 2026-06-14T17:23:58+07:00 |

## Backlog Items

| ID | Parent ID | Type | Title | PRD System | Priority | PIC | Executor | Approver | Auditor | Source Section | Dependencies | Acceptance | Status | Progress | Legacy Code | Token Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|---:|
| TSK-CVB01P0101A | SPR-GVMP01P01EP01-1A | task | React and Vite project setup | SYSTEM-02 | P1 | LYRA | Codex or frontend agent | LYRA | ATHER | p1-s1a-1 | - | Task container includes symbol links, DoD, changelog, and telemetry | done | 100 | TSK-CVB01P0101A | 9400 |
| TSK-CVB01P0102A | SPR-GVMP01P01EP01-1A | task | Backend Node.js TypeScript WebSocket room state | SYSTEM-02 | P1 | KIN | Codex or backend agent | ARCHON | ATHER | p1-s1a-2 | - | Task container preserves backend symbol link and DoD | done | 100 | TSK-CVB01P0102A | 11000 |
| TSK-CVB01P0103A | SPR-GVMP01P01EP01-1A | task | Rider creates room and receives QR code | SYSTEM-02 | P1 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1a-3 | TSK-CVB01P00020 | Task container preserves dependency and UI source link | done | 100 | TSK-CVB01P0103A | 8900 |
| TSK-CVB01P0104A | SPR-GVMP01P01EP01-1A | task | QR generator and share link | SYSTEM-02 | P1 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1a-4 | - | Task container preserves share-link acceptance state | done | 100 | TSK-CVB01P0104A | 5400 |
| TSK-CVB01P0105A | SPR-GVMP01P01EP01-1A | task | Passenger scans QR and joins room | SYSTEM-02 | P1 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1a-5 | - | Task container preserves passenger join acceptance state | done | 100 | TSK-CVB01P0105A | 9200 |
| TSK-CVB01P0106A | SPR-GVMP01P01EP01-1A | task | Participant presence connected and disconnected | SYSTEM-02 | P1 | KIN | Codex or backend agent | ARCHON | ATHER | p1-s1a-6 | - | Task container preserves server source link and DoD | done | 100 | TSK-CVB01P0106A | 7800 |
| TSK-CVB01P0107A | SPR-GVMP01P01EP01-1A | task | Thai UI foundation, dark mode, mobile-first layout | SYSTEM-02 | P1 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1a-7 | - | Task container preserves style source link and UI DoD | done | 100 | TSK-CVB01P0107A | 10500 |
| TSK-CVB01P0108B | SPR-GVMP01P01EP01-1B | task | YouTube link parser and IFrame API integration | SYSTEM-02 | P1 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1b-1 | - | Task container preserves parser source link and DoD | done | 100 | TSK-CVB01P0108B | 9100 |
| TSK-CVB01P0109B | SPR-GVMP01P01EP01-1B | task | Queue add, remove, and reorder | SYSTEM-02 | P1 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1b-2 | - | Task container visibly marks doc, code, and test as incomplete | planned | 0 | TSK-CVB01P0109B | 11500 |
| TSK-CVB01P0110B | SPR-GVMP01P01EP01-1B | task | Current track state on server | SYSTEM-02 | P1 | KIN | Codex or backend agent | ARCHON | ATHER | p1-s1b-3 | - | Task container preserves server timestamp state | done | 100 | TSK-CVB01P0110B | 8300 |
| TSK-CVB01P0111B | SPR-GVMP01P01EP01-1B | task | Play, pause, skip, and seek sync over WebSocket | SYSTEM-02 | P1 | KIN | Codex or backend agent | ARCHON | ATHER | p1-s1b-4 | - | Task container preserves playback sync DoD | done | 100 | TSK-CVB01P0111B | 12500 |
| TSK-CVB01P0112B | SPR-GVMP01P01EP01-1B | task | Auto-next when track ends | SYSTEM-02 | P2 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1b-5 | - | Task container preserves auto-next DoD | done | 100 | TSK-CVB01P0112B | 6200 |
| TSK-CVB01P0113B | SPR-GVMP01P01EP01-1B | task | Per-device volume control | SYSTEM-02 | P2 | VIBE | Codex or frontend agent | LYRA | ATHER | p1-s1b-6 | - | Task container preserves volume-control DoD | done | 100 | TSK-CVB01P0113B | 4500 |

## Task Breakdown

### TSK-CVB01P0101A: React and Vite project setup

- [x] S-TSK-CVB01P0101A Capture legacy task identity and source links.
  - [x] M-TSK-CVB01P0101A Normalize one complete task container for A2 detail dropdown.
    - [x] A-TSK-CVB01P0101A Verify code, doc, test, DoD, changelog, token total, and task ID fields.

### TSK-CVB01P0109B: Queue add, remove, and reorder

- [ ] S-TSK-CVB01P0109B Mark unfinished task state from source export.
  - [ ] M-TSK-CVB01P0109B Build local Ollama review packet for missing docs, code, and tests.
    - [ ] A-TSK-CVB01P0109B Verify A2 dropdown displays incomplete DoD without pretending completion.

## Task Containers

### TC-TSK-CVB01P0101A

```yaml
task_container_id: TC-TSK-CVB01P0101A
task_id: TSK-CVB01P0101A
legacy_task_id: p1-s1a-1
legacy_code: TSK-CVB01P0101A
parent_phase_id: PHA-GVMP01P01
parent_sprint_id: SPR-GVMP01P01EP01-1A
title: React and Vite project setup
requirement_type: NFR
complexity: normal
status: stable
version: 1.0.0
pic: LYRA
executor: Qwen Coder
approver: LYRA
auditor: ATHER
assignee: none
completed_by: Unassigned
symbol_links:
  code: package.json
  doc: GEMINI.md
  test: tests/sync.test.js
definition_of_done:
  acceptance_criteria:
    - criterion: Spec approved
      checked: true
    - criterion: Docs updated
      checked: true
  success_criteria:
    - criterion: Code complete
      checked: true
    - criterion: Lints clean
      checked: true
  exit_criteria:
    - criterion: Tests passed
      checked: true
    - criterion: Regression free
      checked: true
changelog: Initialized project directory structure with Vite React template.
created_at: 2026-06-05T09:35:00+07:00,Qwen Coder,g9j0k1l
last_update: 2026-06-05T16:22:00+07:00,Rwang,d4e5f6g
token_telemetry:
  model_name: unknown/legacy
  context_length: unavailable
  predicted_token_usage: unavailable
  actual_input_tokens: unavailable
  actual_output_tokens: unavailable
  tool_calling_tokens: unavailable
  total_token_usage: 9400
export:
  json: enabled
  yaml: enabled
  markdown: enabled
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

### TC-TSK-CVB01P0109B

```yaml
task_container_id: TC-TSK-CVB01P0109B
task_id: TSK-CVB01P0109B
legacy_task_id: p1-s1b-2
legacy_code: TSK-CVB01P0109B
parent_phase_id: PHA-GVMP01P01
parent_sprint_id: SPR-GVMP01P01EP01-1B
title: Queue add, remove, and reorder
requirement_type: FR
complexity: high
status: stable
version: 1.0.0
pic: VIBE
executor: Qwen Coder
approver: LYRA
auditor: ATHER
assignee: none
completed_by: Unassigned
symbol_links:
  code: src/App.tsx
  doc: unavailable
  test: unavailable
definition_of_done:
  acceptance_criteria:
    - criterion: Spec approved
      checked: false
    - criterion: Docs updated
      checked: false
  success_criteria:
    - criterion: Code complete
      checked: false
    - criterion: Lints clean
      checked: false
  exit_criteria:
    - criterion: Tests passed
      checked: false
    - criterion: Regression free
      checked: false
changelog: Created state reducer tracking mutations in play queue array.
created_at: 2026-06-05T10:15:00+07:00,Qwen Coder,o7r8s9t
last_update: 2026-06-05T16:22:00+07:00,Rwang,d4e5f6g
token_telemetry:
  model_name: unknown/legacy
  context_length: unavailable
  predicted_token_usage: unavailable
  actual_input_tokens: unavailable
  actual_output_tokens: unavailable
  tool_calling_tokens: unavailable
  total_token_usage: 11500
export:
  json: enabled
  yaml: enabled
  markdown: enabled
ui_state:
  dropdown_default: collapsed
  expanded: false
  disabled_reason: Docs, code, and tests are incomplete in the source export.
```

## Local LLM Packets

| ID | Target Context | Max Input | Target Path | Model Name | Predicted Token Usage | Instruction | Acceptance |
|---|---|---:|---|---|---:|---|---|
| M-TSK-CVB01P0101A | 8k/16k | 2k-6k | `docs/roadmap/BACKLOG-p1-mvp-core.md` | local-ollama/TBD | TBD-before-start | Normalize one complete legacy task as a Task Container | Container includes links, DoD, changelog, token total, and PIC fields |
| A-TSK-CVB01P0101A | 8k | 500-2k | `docs/roadmap/BACKLOG-p1-mvp-core.md` | local-ollama/TBD | TBD-before-start | Verify visible A2 dropdown fields for one complete task | PASS/FAIL note can cite every required field |
| M-TSK-CVB01P0109B | 8k/16k | 2k-6k | `docs/roadmap/BACKLOG-p1-mvp-core.md` | local-ollama/TBD | TBD-before-start | Build review packet for the unfinished queue task | Packet identifies missing docs, code, and tests |
| A-TSK-CVB01P0109B | 8k | 500-2k | `docs/roadmap/BACKLOG-p1-mvp-core.md` | local-ollama/TBD | TBD-before-start | Verify unfinished state is not rendered as done | `disabled_reason` and unchecked DoD are present |

## Assignments

| Task ID | Subject ID | Subject Type | Policy Model | Assigned At | Assigned By | Recorded At |
|---|---|---|---|---|---|---|
| TSK-CVB01P0101A | LYRA | agent | ABAC | 2026-06-14T17:23:58+07:00 | human-owner | 2026-06-14T17:23:58+07:00 |
| TSK-CVB01P0109B | VIBE | agent | ABAC | 2026-06-14T17:23:58+07:00 | LYRA | 2026-06-14T17:23:58+07:00 |

## Verification

| Task ID | QA Status | Audit Status | Deployment Status | Last Updated At | Recorded At |
|---|---|---|---|---|---|
| TSK-CVB01P0101A | pending | pending | n/a | 2026-06-14T17:23:58+07:00 | 2026-06-14T17:23:58+07:00 |
| TSK-CVB01P0109B | pending | pending | n/a | 2026-06-14T17:23:58+07:00 | 2026-06-14T17:23:58+07:00 |

## UI Traceability

| Task ID | Source Section | Agent Assignment | Artifact | Review | Verification |
|---|---|---|---|---|---|
| TSK-CVB01P0101A | p1-s1a-1 | LYRA | TC-TSK-CVB01P0101A | ATHER pending | GHOST pending |
| TSK-CVB01P0109B | p1-s1b-2 | VIBE | TC-TSK-CVB01P0109B | ATHER pending | GHOST pending |

## Acceptance Criteria

- [x] A2 has a documented Task Container contract.
- [x] Task dropdown/detail card has a documented data source.
- [x] PIC is separate from Executor.
- [x] `p1-mvp-core-.json` mapping can populate at least one complete task container.
- [x] UI implementation remains blocked until docs/design and data contract are approved.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-16 | LYRA | Added canonical frontmatter and roadmap-promotion metadata so the backlog can be governed as a board-eligible roadmap source. |
