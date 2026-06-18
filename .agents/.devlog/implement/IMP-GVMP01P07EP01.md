---
title: "IMP: Mission Control UI Real-State Migration"
doc_id: "IMP-GVMP01P07EP01"
status: "approved"
version: "0.5.1"
updated: "2026-06-18"
owner: "LYRA"
approved_by: "Boss"
pic: "VIBE / KIN"
executor: "qwen-cli local worker"
auditor: "ATHER"
source_of_truth: false
---

# IMP: Mission Control UI Real-State Migration

```yaml
ImpId: IMP-GVMP01P07EP01
Source Specs:
  - docs/features/project-roadmap/FEAT-Roadmap-Board-Migration.md
  - docs/features/project-roadmap/FEAT-Document-Driven-Roadmap-Source.md
  - docs/features/project-roadmap/FEAT-Roadmap-Promotion-Contract.md
  - docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md
Methodology: DDD + CoVibe bounded local execution
Complexity: C-3
Risk: HIGH
Approval: Human owner approved UI migration and local-agent assignment on 2026-06-18
Target: A2 roadmap UI first, then remaining Mission Control views
```

## Goal

Remove hardcoded operational state from Mission Control and render repository/runtime truth instead. The approved sequence is A2 roadmap state followed by A5 registered-agent state. Codex remains lead and final reviewer. `qwen-cli` with local Ollama is a bounded CoVibe executor for narrow H0/H1 tasks only.

## Scope

In scope:

- Remove hardcoded roadmap rows, progress, phase labels, assignments, and agent roster fallback from A2.
- Require approved roadmap sources before they can drive active board state.
- Preserve the current visual layout while exposing source path, approval state, connection state, and honest empty states.
- Continue migrating other views only through separately bounded tasks.
- Populate A5 from `.agents/agent-registry.yaml` through the MissionSnapshot boundary.
- Represent registry agents as `registered`, never `online`, until a runtime event says otherwise.
- Replace A3 capability blueprint cards with runtime-registered capability records.
- Replace D3 blueprint campaign logs with honest empty state plus real campaign log data when present.
- Replace A4 template config controls with an honest empty-state runtime config panel.
- Replace B3 placeholder graph nodes with an honest empty-state graph studio.
- Replace B1 template AST/source sample with graph-driven state or an honest empty state.
- Remove B4 inert graph controls that do not affect runtime state.
- Replace C2 static intelligence roster with MissionSnapshot agents and capabilities.
- Replace B2 static business specification fallback with an honest empty state.
- Remove C3 unwired query controls and keep only the real MissionEvent ingest path.
- Remove C5 simulation layer controls without vector layer data.
- Remove D1 inert regulator/audio controls while preserving the real reactor command.
- Replace D2 fake heatmap fallback cells with an honest empty state.

Out of scope:

- Architecture changes.
- New product features.
- Editing C4.
- Treating a local model as approver, auditor, or source of truth.
- Broad refactoring of `src/App.tsx`.
- Dependency additions.

## Execution Plan

| Status | Task ID | Task | Mode | Dependency | Allowed Files | Assigned To | Verification |
|---|---|---|---|---|---|---|---|
| done | TSK-GVMP01P07EP01SPR01-01 | Audit the current A2 diff for remaining hardcoded operational state and scope drift | PARALLEL | - | read-only: `src/App.tsx`, `src/mission.ts`, `scripts/mcp/runtime-core.mjs` | Codex fallback after QWEN-LOCAL-01 block | Evidence-backed findings; no writes |
| done | TSK-GVMP01P07EP01SPR01-02 | Remove A2 hardcoded roadmap/task/agent fallback and render approved runtime state | SERIAL | TSK-01 review | `src/App.tsx` | Codex lead; Qwen review | `npm run lint`, `npm run build`, browser A2 check |
| done | TSK-GVMP01P07EP01SPR01-03 | Enforce approved roadmap source selection in runtime | PARALLEL | - | `scripts/mcp/runtime-core.mjs` | Codex lead; Qwen review | MCP smoke + explicit draft rejection test |
| done | TSK-GVMP01P07EP01SPR01-04 | Add focused automated checks for approved source selection and A2 empty/live states | SERIAL | TSK-02, TSK-03 | existing test location only; no new framework | Codex fallback after Qwen packet failure | Existing test command passes |
| done | TSK-GVMP01P07EP01SPR01-05 | Inventory hardcoded operational state in A1/A3/A4/A5/B/C/D and propose next migration order | PARALLEL | - | read-only `src/` | QWEN-LOCAL-03 (`qwen3.5:4b`) | Ranked inventory with file/line evidence |
| done | TSK-GVMP01P07EP01SPR01-06 | Final QA, audit, and closure evidence | SERIAL | TSK-02 through TSK-05 | no implementation writes | GHOST / ATHER / Codex | docs validation, lint, build, MCP smoke, browser verification |
| done | TSK-GVMP01P07EP01SPR02-01 | Review the bounded A5 registry-state migration decision | PARALLEL | TSK-SPR01-05 | read-only evidence packet | QWEN-LOCAL-04 (`qwen3.5:4b`) | Risks and acceptance checks |
| done | TSK-GVMP01P07EP01SPR02-02 | Load registered agent identity and fleet metadata into MissionSnapshot | SERIAL | TSK-SPR02-01 | `scripts/mcp/runtime-core.mjs`, `src/mission.ts` | Codex lead | Runtime registry assertion |
| done | TSK-GVMP01P07EP01SPR02-03 | Remove A5 template-agent fallback and fake config/deploy state | SERIAL | TSK-SPR02-02 | `src/App.tsx` | Codex lead | UI renders registry agents only |
| done | TSK-GVMP01P07EP01SPR02-04 | Extend existing smoke coverage for registry-derived agents | SERIAL | TSK-SPR02-02 | `scripts/mcp/smoke-test.mjs` | Codex fallback | MCP smoke passes |
| done | TSK-GVMP01P07EP01SPR02-05 | Browser QA and A5 slice closure | SERIAL | TSK-SPR02-03, TSK-SPR02-04 | no implementation writes | GHOST / ATHER / Codex | A5 metadata and interactions verified |
| done | TSK-GVMP01P07EP01SPR03-01 | Review the bounded A3/D3 migration packet and acceptance checks | PARALLEL | TSK-GVMP01P07EP01SPR02-05 | read-only evidence packet | QWEN-LOCAL-05 (`qwen3.5:4b`) | Risks and acceptance checks |
| done | TSK-GVMP01P07EP01SPR03-02 | Add capability snapshot data to MissionSnapshot and runtime bootstrap | SERIAL | TSK-GVMP01P07EP01SPR03-01 | `src/mission.ts`, `scripts/mcp/runtime-core.mjs` | Codex lead | Runtime exposes registered capability records |
| done | TSK-GVMP01P07EP01SPR03-03 | Render A3 capability records and honest D3 empty state | SERIAL | TSK-GVMP01P07EP01SPR03-02 | `src/App.tsx` | Codex lead | A3/D3 show runtime truth only |
| done | TSK-GVMP01P07EP01SPR03-04 | Extend smoke coverage for capability records and D3 empty state | SERIAL | TSK-GVMP01P07EP01SPR03-02 | `scripts/mcp/smoke-test.mjs` | Codex fallback | MCP smoke passes |
| in_progress | TSK-GVMP01P07EP01SPR03-05 | Browser QA and A3/D3 slice closure | SERIAL | TSK-GVMP01P07EP01SPR03-03, TSK-GVMP01P07EP01SPR03-04 | no implementation writes | GHOST / ATHER / Codex | Capability records and empty campaign state verified |
| done | TSK-GVMP01P07EP01SPR04-01 | Replace A4 template config controls with honest empty-state runtime config | SERIAL | TSK-GVMP01P07EP01SPR03-05 | `src/App.tsx` | Codex lead | A4 does not present fake config sliders or template model toggles |
| done | TSK-GVMP01P07EP01SPR04-02 | Replace B3 placeholder graph nodes with honest empty-state graph studio | SERIAL | TSK-GVMP01P07EP01SPR04-01 | `src/App.tsx` | Codex lead | B3 does not invent graph nodes when the snapshot is empty |
| done | TSK-GVMP01P07EP01SPR04-03 | Replace B1 template AST/source sample with graph-driven state | SERIAL | TSK-GVMP01P07EP01SPR04-02 | `src/App.tsx` | Codex lead | B1 does not render calculateDrift or blueprint AST nodes without graph data |
| done | TSK-GVMP01P07EP01SPR04-04 | Remove B4 inert graph controls | SERIAL | TSK-GVMP01P07EP01SPR04-03 | `src/App.tsx` | Codex lead | B4 no longer presents Sync Graph or fake depth controls |
| done | TSK-GVMP01P07EP01SPR04-05 | Replace C2 static intelligence roster with snapshot records | SERIAL | TSK-GVMP01P07EP01SPR04-04 | `src/App.tsx` | Codex lead | C2 renders registered agents and MCP capabilities |
| done | TSK-GVMP01P07EP01SPR05-01 | Replace B2 static spec fallback with honest empty state | SERIAL | TSK-GVMP01P07EP01SPR04-05 | `src/App.tsx` | Codex lead | B2 renders snapshot specs or an empty state only |
| done | TSK-GVMP01P07EP01SPR05-02 | Remove C3 unwired query controls | SERIAL | TSK-GVMP01P07EP01SPR05-01 | `src/App.tsx` | Codex lead | C3 exposes only the real MissionEvent ingest path |
| done | TSK-GVMP01P07EP01SPR05-03 | Remove C5 simulation layer controls | SERIAL | TSK-GVMP01P07EP01SPR05-02 | `src/App.tsx` | Codex lead | C5 renders graph nodes or an empty state only |
| done | TSK-GVMP01P07EP01SPR05-04 | Remove D1 inert regulator and audio controls | SERIAL | TSK-GVMP01P07EP01SPR05-03 | `src/App.tsx` | Codex lead | D1 preserves the real reactor command only |
| done | TSK-GVMP01P07EP01SPR05-05 | Replace D2 heatmap fallback cells with honest empty state | SERIAL | TSK-GVMP01P07EP01SPR05-04 | `src/App.tsx` | Codex lead | D2 renders heatmap data or an empty state only |

## Local Agent Packets

### QWEN-LOCAL-01 — Current Diff Audit

```yaml
task_id: TSK-GVMP01P07EP01SPR01-01
executor: qwen-cli
route: local_ollama
model: qwen3.5:4b
mode: review
write_permission: none
files:
  - src/App.tsx
  - src/mission.ts
  - scripts/mcp/runtime-core.mjs
checks:
  - No fake roadmap rows or percentages remain in A2.
  - A2 does not display unapproved roadmap data as live state.
  - Empty states disclose missing runtime data.
  - Diff is surgical and does not alter unrelated views.
output:
  - findings
  - evidence
  - blockers
  - recommended_next_step
```

### QWEN-LOCAL-02 — Focused Test Proposal

```yaml
task_id: TSK-GVMP01P07EP01SPR01-04
executor: qwen-cli
route: local_ollama
model: qwen3.5:4b
mode: code
write_permission: proposal_only
constraints:
  - Use the existing test/runtime structure.
  - Do not add dependencies.
  - Do not refactor production modules.
acceptance:
  - Approved roadmap is selected.
  - Explicit draft roadmap is rejected.
  - Missing approved source yields no live roadmap.
```

### QWEN-LOCAL-03 — Remaining Hardcode Inventory

```yaml
task_id: TSK-GVMP01P07EP01SPR01-05
executor: qwen-cli
route: local_ollama
model: qwen3.5:4b
mode: review
write_permission: none
scope: src/
acceptance:
  - Distinguish visual template data from operational state.
  - Rank migrations by user impact and dependency readiness.
  - Do not propose architecture or new features.
```

## Acceptance Criteria

- A2 uses only an approved `RoadmapSnapshot` for active state.
- A2 displays `0` and an honest empty state when no approved source exists.
- Hardcoded blueprint roadmap rows and fake project progress are removed.
- The roster does not present template agents as live runtime agents.
- Explicit unapproved sources are rejected by the runtime.
- Local-agent output remains draft evidence reviewed by Codex.
- A5 agent identities and role metadata come from `.agents/agent-registry.yaml`.
- Registry-derived agents use `registered` status and unavailable operational metrics.
- A5 does not expose fake configuration or deployment controls as working operations.

## Success Criteria

- `npm run docs:validate` passes.
- `npm run lint` passes.
- `npm run build` passes.
- `npm run mcp:smoke` passes.
- Browser verification shows approved source path and calculated live progress without console errors.

## Exit Criteria

- All changed lines trace to this IMP.
- Qwen assignment evidence is attached below.
- ATHER/GHOST verification is recorded.
- Remaining hardcoded views are listed as separate pending work, not silently migrated.

## Qwen Assignment Evidence

```yaml
task_id: TSK-GVMP01P07EP01SPR01-01
executor: qwen-cli
route: local_ollama
model: qwen3.5:4b
status: blocked
attempts:
  - result: blocked_before_executor
    evidence: "PowerShell passed ExtraContext as one combined path."
  - result: blocked_before_executor
    evidence: "The wrapper exceeded the Windows command-line length limit."
  - result: executor_timeout
    evidence: "Full governed packet exceeded qwen-cli local HTTP read timeout of 120 seconds."
  - result: blocked_by_missing_context
    evidence: "Reduced retry completed but correctly refused to review without the complete AGENTS.md and shared context packet."
files_modified_by_qwen: []
recommended_decision: revise_packet
lead_response: "Keep the assignment blocked and do not treat partial local output as review evidence."
```

### QWEN-LOCAL-03 Result

```yaml
task_id: TSK-GVMP01P07EP01SPR01-05
executor: qwen-cli
route: local_ollama
model: qwen3.5:4b
context_source_used: explicit_system_prompt + factual_scan
status: completed_as_draft_evidence
exit_code: 0
files_modified_by_qwen: []
accepted_findings:
  - "A5 still uses templateAgents as visible fallback state."
  - "D3 campaign logs still render blueprint log rows when no live feed exists."
  - "A3 capability cards remain blueprint-driven."
lead_review:
  - "Heatmap color thresholds are presentation logic, not operational hardcode by themselves."
  - "A5 template-agent removal is the highest-value next migration after A2 closes."
recommended_next_task: "Create a bounded A5 real-agent-state migration packet."
```

### QWEN-LOCAL-04 Result

```yaml
task_id: TSK-GVMP01P07EP01SPR02-01
executor: qwen-cli
route: local_ollama
model: qwen3.5:4b
context_source_used: explicit_system_prompt + bounded_factual_packet
status: completed_as_draft_evidence
exit_code: 0
files_modified_by_qwen: []
accepted_risks:
  - "Registry metadata must not imply live execution capability."
accepted_checks:
  - "MissionSnapshot agents are populated from registry identity and role fields."
  - "No template agents render when registry data is absent."
  - "Runtime initialization and A5 consume the same MissionSnapshot boundary."
```

### QWEN-LOCAL-05 Result

```yaml
task_id: TSK-GVMP01P07EP01SPR03-01
executor: qwen-cli
route: local_ollama
model: qwen3.5:4b
context_source_used: explicit_system_prompt + bounded_factual_packet
status: completed_as_draft_evidence
exit_code: 0
files_modified_by_qwen: []
accepted_risks:
  - "Capability records should stay registered and read-only unless runtime evidence says otherwise."
  - "D3 empty state must not imply campaign execution when no live log feed exists."
accepted_checks:
  - "MissionSnapshot gains a capabilities field without breaking current consumers."
  - "Runtime maps toolCatalog entries into registered capability records."
  - "A3 renders runtime capability records and removes blueprint controls."
  - "D3 renders campaign logs only, then falls back to an honest empty state."
```

## Verification Evidence

```yaml
docs_validate:
  result: passed
  notes: "Existing repository warnings remain unchanged."
lint:
  command: npm run lint
  result: passed
build:
  command: npm run build
  result: passed
mcp_smoke:
  command: npm run mcp:smoke
  result: passed
  added_checks:
    - "Explicit approved roadmap loads."
    - "Automatic selection resolves the approved roadmap."
    - "Explicit draft backlog source is rejected."
browser_qa:
  url: http://127.0.0.1:1420/
  view: A2 Roadmap Board
  result: passed
  evidence:
    - "Approved Markdown source path is visible."
    - "26 actionable items render from the current roadmap after reload."
    - "20 completed and 6 active items produce 86 percent live progress."
    - "Legacy Feasibility Spike blueprint fallback is absent."
    - "No relevant console errors or warnings."
a5_browser_qa:
  url: http://127.0.0.1:1420/
  view: A5 Agent Management
  result: passed
  evidence:
    - "9 registered agents render from agent-registry.yaml."
    - "THESEUS, LYRA, ATHER, JANUS, RKOI, ARCHON, GHOST, KIN, and VIBE are visible."
    - "All registry-derived records display registered status and unavailable operational metrics."
    - "EVA and other template-only identities are absent."
    - "Deploy Agent is replaced with disabled Deploy unavailable."
    - "Next-agent interaction changes selection from THESEUS to LYRA and updates the counter from 1/9 to 2/9."
    - "No relevant console errors or warnings."
a3_d3_browser_qa:
  url: http://127.0.0.1:1420/
  views:
    - "A3 Capability Plugins"
    - "D3 EABS-01 Campaign Logs"
  result: passed
  evidence:
    - "A3 shows registry-backed capability records with REGISTERED status and no blueprint controls."
    - "A3 includes govibe.agent.run and the other MCP registry entries sourced from scripts/mcp/registry.mjs."
    - "D3 shows the honest No campaign logs connected empty state when no campaign feed exists."
    - "D3 does not render blueprint campaign rows."
a4_b1_b3_b4_c2_browser_qa:
  url: http://127.0.0.1:1420/
  views:
    - "A4 Brain & Config"
    - "B1 AST Hierarchy Tree"
    - "B3 Interactive Graph"
    - "B4 Live Call Graph"
    - "C2 Intelligence Zoo"
  result: passed
  evidence:
    - "A4 shows No runtime config connected and no template config sliders."
    - "B1 shows No AST graph connected and no calculateDrift or blueprint AST nodes."
    - "B3 shows No graph nodes connected and no Room Sync/IFrame Player/Drift Monitor placeholders."
    - "B4 no longer presents Sync Graph or fake depth controls."
    - "C2 renders registry agents and MCP capability records, with the static EVA/Qwen/UAT/Local Runner roster absent."
final_residual_browser_qa:
  url: http://127.0.0.1:1420/
  views:
    - "B2 Business Specifications"
    - "C3 SRS-G Debugger"
    - "C5 HNSW Vector Space Map"
    - "D1 Reactor Run Trigger"
    - "D2 Cyber Reactor Heatmap"
  result: passed
  evidence:
    - "B2 shows No functional specs connected and no static business protocol rows."
    - "C3 keeps MissionEvent JSON ingest and removes unwired query/RAG controls."
    - "C5 shows No vector map and no simulation layer controls."
    - "D1 keeps Start Safety Campaign Run and removes inert regulator/audio controls."
    - "D2 shows No heatmap feed connected and no fake heatmap grid."
remaining_scope:
  - "No remaining in-scope UI fake-state migration items found by residual scan. C4 remains untouched by scope guard."
```

## Version Diff

| Version | Status | Change |
|---|---|---|
| none | - | No dedicated UI real-state migration IMP existed. |
| 0.1.0 | approved | Added bounded CoVibe plan, task decomposition, Qwen assignments, gates, and verification contract. |
| 0.1.1 | approved | Recorded Qwen execution outcomes, focused regression coverage, browser QA, and A2 slice completion. |
| 0.2.0 | approved | Added the A5 registry-state migration, Qwen review packet, runtime/UI tasks, and verification gates. |
| 0.2.1 | approved | Closed A5 with registry smoke assertions and browser interaction evidence. |
| 0.3.0 | approved | Added the A3 capability-record migration, D3 honest campaign-log empty state, and verification hooks. |
| 0.3.1 | approved | Closed A3/D3 with browser verification after runtime restart and registry-backed capability rendering. |
| 0.4.0 | approved | Added the A4 empty-state config slice and B3 empty-state graph studio follow-on tasks. |
| 0.4.1 | approved | Added B1, B4, and C2 residual fake-state follow-on tasks. |
| 0.4.2 | approved | Closed A4, B1, B3, B4, and C2 follow-on migrations with verification evidence. |
| 0.5.0 | approved | Added final residual fake-state tasks for B2, C3, C5, D1, and D2. |
| 0.5.1 | approved | Closed final residual fake-state tasks for B2, C3, C5, D1, and D2 with browser evidence. |

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.3.1 | 2026-06-18 | VIBE / KIN / ATHER | Closed A3/D3 with browser verification after runtime restart and registry-backed capability rendering. |
| 0.3.0 | 2026-06-18 | VIBE / KIN / ATHER | Added A3 capability records, D3 honest empty state, smoke assertions, and pending browser QA. |
| 0.4.0 | 2026-06-18 | VIBE / KIN / ATHER | Added A4 empty-state config and B3 empty-state graph studio follow-on tasks. |
| 0.4.1 | 2026-06-18 | VIBE / KIN / ATHER | Added B1, B4, and C2 residual fake-state follow-on tasks. |
| 0.4.2 | 2026-06-18 | VIBE / KIN / ATHER | Closed A4, B1, B3, B4, and C2 follow-on migrations with verification evidence. |
| 0.5.0 | 2026-06-18 | VIBE / KIN / ATHER | Added final residual fake-state tasks for B2, C3, C5, D1, and D2. |
| 0.5.1 | 2026-06-18 | VIBE / KIN / ATHER | Closed final residual fake-state tasks for B2, C3, C5, D1, and D2 with browser evidence. |
| 0.2.1 | 2026-06-18 | VIBE / KIN / ATHER | Closed A5 registered-agent migration with smoke and browser verification. |
| 0.2.0 | 2026-06-18 | VIBE / KIN / ATHER | Added A5 registered-agent migration and removed template-agent execution state. |
| 0.1.1 | 2026-06-18 | VIBE / KIN / ATHER | Closed the A2 real-state slice with automated approval-gate tests, Qwen inventory evidence, and browser QA. |
| 0.1.0 | 2026-06-18 | LYRA / Boss | Approved A2-first real-state migration and bounded local Qwen task assignments. |
