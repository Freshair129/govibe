# Legacy P1 MVP Import Reference

> **Source**: Archived from the former PM asset plan template, which is no longer retained in this repository.
> **Date**: 2026-06-14
> **Status**: Reference Only

---

# GoVibe Standard Implementation Plan: Import P1 MVP Core Backlog With Model Telemetry
```yaml
Source: `C:/Users/freshair/Downloads/p1-mvp-core-.json`
Methodology: DDD + CoDev multi-agent execution
Complexity: C-3
Risk: HIGH
Gate: Doc/spec first -> approval -> implementation
Status: pending,WIP,Done,hold,Rejected
Progression: 0 %
Total Task: 6
ETA: 3-4 weeks
Target: system,subs-system,module,sub-module,feature,task,sub-task,micro-task,atomic-task
```
## Phase 1: CoDev Backlog Telemetry Standardization Duration: 4 week [=====-----] 50%  [downloadplan] 

Goal: ใช้ `p1-mvp-core-.json` เป็นตัวอย่าง/fixture จริงในการยกระดับ GoVibe backlog ให้รองรับ `Sprint -> Task -> Sub-task -> Micro-task -> Atomic-task` พร้อม model config และ token telemetry ทั้งก่อนเริ่มและหลังจบงาน

## Epic 1A: Backlog Import and Telemetry Schema

### Sprint 1A: P1 MVP Core Backlog Normalization
**Taget: [system,subs-system,module,sub-module,feature]**
**Total Task: 6**
**Duration: 1 week**

| Status | Task ID | Task | Pt | Mode | Dependency | Symbollink | Assign To | Model Name | Context Length |  |  
|---|---|---|---|---|---|---|---|---|---|---|
| waiting | TSK-GVMP01P05EP01SPR01-01 | Inspect P1 MVP JSON and define import mapping | 3 | SERIAL | - | <path> | LYRA | GPT-5/Codex | 128k |  |  |  | unavailable | unavailable | unavailable | from `tokensUsed` |
| waiting | TSK-GVMP01P05EP01SPR01-02 | Add telemetry column standard to backlog docs | 3 | SERIAL | TSK-GVMP01P05EP01SPR01-01 | <path> | THESEUS | GPT-5/Codex | 128k |  |  |  | unavailable | unavailable | unavailable |  |
| waiting | TSK-GVMP01P05EP01SPR01-03 | Convert legacy task codes to GoVibe standard hierarchy | 5 | PARALLEL-A | TSK-GVMP01P05EP01SPR01-01 | <path> | LYRA | GPT-5/Codex | 128k |  |  |  | unavailable | unavailable | unavailable |  |
| waiting | TSK-GVMP01P05EP01SPR01-04 | Create local Ollama micro/atomic packets for unfinished work | 5 | PARALLEL-A | TSK-GVMP01P05EP01SPR01-03 | <path> | LYRA | N/A | N/A |  |  |  | unavailable | unavailable | unavailable |  |
| waiting | TSK-GVMP01P05EP01SPR01-05 | Audit token telemetry provenance and unknown fields | 3 | LOCK | TSK-GVMP01P05EP01SPR01-02, TSK-GVMP01P05EP01SPR01-04 | <path> | ATHER | GPT-5/Codex | 128k |  |  |  | unavailable | unavailable | unavailable |  |
| waiting | TSK-GVMP01P05EP01SPR01-06 | Validate docs and baseline | 2 | LOCK | TSK-GVMP01P05EP01SPR01-05 | <path> | GHOST | GPT-5/Codex | 128k |  |  |  | unavailable | unavailable | unavailable |  |

## Import Mapping

Existing JSON fields:
```yaml
phaseId: phase_id
phaseTitle: phase_title
tasks[].id: legacy_task_id
tasks[].code: legacy_task_code
tasks[].text: task
tasks[].symbolLink: symbol_link
tasks[].complexity: complexity
tasks[].type: requirement_type
tasks[].status: status
tasks[].tokensUsed: legacy_total_token_usage
tasks[].assignee: assignee
tasks[].completionState: completion_state
tasks[].definitionOfDone: dod
```

Telemetry interpretation:
- `tokensUsed` becomes `legacy_total_token_usage`
- Do not split `tokensUsed` into input/output/tool tokens
- `actual_input_tokens`, `actual_output_tokens`, and `tool_calling_tokens` must be `unavailable` unless a real execution log exists
- `model_name` comes from `created_at` agent/model text only if reliable; otherwise use `unknown/legacy`
- New work must record prediction before execution and actual usage after execution

## Task Breakdown

### TSK-GVMP01P05EP01SPR01-03
Sub-task:
- S-TSK-GVMP01P05EP01SPR01-03: Convert `p1-s1a-*` into Sprint S1a task rows
- S-TSK-GVMP01P05EP01SPR01-03A: Convert `p1-s1b-*` into Sprint S1b task rows
- S-TSK-GVMP01P05EP01SPR01-03B: Preserve original `TSK-CVB*` as `legacy_code`

Micro-task for local Ollama:
- M-TSK-GVMP01P05EP01SPR01-03: Normalize one legacy task row into the new telemetry table format

Atomic-task for local Ollama:
- A-TSK-GVMP01P05EP01SPR01-03: Verify one row has `legacy_code`, `symbol_link`, `DoD`, `model_name`, `predicted_token_usage`, and actual token fields

### TSK-GVMP01P05EP01SPR01-04
Sub-task:
- S-TSK-GVMP01P05EP01SPR01-04: Identify unfinished tasks from `completionState.overall = false`
- S-TSK-GVMP01P05EP01SPR01-04A: Create micro/atomic packets only for unfinished or audit-needed tasks

Micro-task for local Ollama:
- M-TSK-GVMP01P05EP01SPR01-04: Break unfinished queue task into doc/code/test review packets

Atomic-task for local Ollama:
- A-TSK-GVMP01P05EP01SPR01-04: Mark `TSK-CVB01P0109B` as unfinished and requiring fresh AC/SC/Exit verification

## Definition of Done

Acceptance Criteria:
- [_] `p1-mvp-core-.json` is represented as a GoVibe-standard backlog doc
- [_] Legacy task codes are preserved, not overwritten
- [_] Task table includes model/config/token telemetry columns
- [_] `tokensUsed` is treated as legacy total token usage only
- [_] Unknown token splits are recorded as `unavailable`, not guessed

Success Criteria:
- [_] Sprint S1a and S1b are visible as separate sections
- [_] Unfinished tasks are clearly flagged
- [_] Local Ollama packets exist only for micro/atomic work
- [_] LYRA can use the table for planning and token prediction
- [_] ATHER can audit prediction vs actual token usage

Exit Criteria:
- [_] `npm run docs:validate` passes
- [_] `npm run baseline:check` passes or reports only known pre-existing warnings
- [_] No runtime code is added
- [_] No protected source under `.agents/Visual-Agent-Fleet-Scope/**` is edited
