---
title: "BACKLOG: Production Readiness Execution (Local-Packet Pilot)"
doc_id: "BACKLOG-PRODUCTION-READINESS-EXECUTION"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-06"
owner: "LYRA"
auditor: "ATHER"
source_of_truth: true
planning_tier: "backlog"
related_docs:
  - "docs/roadmap/MASTERPLAN-govibe-production-readiness.md"
  - "docs/features/agent-team/FEAT-Tiered-Review.md"
  - "docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md"
  - "docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md"
  - ".agents/pm/asset/Planning-Decomposition-Standard.md"
  - "docs/STD-Execution-Governance.md"
  - "docs/STD-SLM-Tiered-Routing.md"
---

# BACKLOG: Production Readiness Execution (Local-Packet Pilot)

## 1. Purpose

Execution-level decomposition for `docs/roadmap/MASTERPLAN-govibe-production-readiness.md`.
The masterplan owns WHAT and stays the plan of record; this backlog owns HOW for the tasks that
are eligible for bounded local-model execution, decomposed to `micro-task` and `atomic-task`
packets per `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md` (approved).

Pilot scope, chosen by the quota-aware rule (narrow packets that save primary-model quota
without increasing risk):

- **EXEC-001** decomposes masterplan `TASK-PRD-005` (orchestration contract slice) — P0
- **EXEC-002** decomposes masterplan `TASK-PRD-008` (sidebar label reconciliation) — P2

Remaining eligible masterplan tasks are decomposed here only after this pilot proves the loop.
Tasks the decomposition standard forbids for local packets (architecture, authority, cross-repo
truth: `TASK-PRD-007` design, `TASK-PRD-009`) stay lead-agent work in the masterplan.

## 2. Review Gate — Tiered, Local First

This backlog does not invent a review model. It applies the canonical cascade from
`docs/features/agent-team/FEAT-Tiered-Review.md` as the internal structure of the Verify Gate:

| Tier | Reviewer | Cost | Authority |
|---|---|---|---|
| **L0 — Deterministic** | typecheck, targeted vitest, packet acceptance_check | zero tokens | may trigger rework |
| **L1 — Local SLM** | local model, escalate-only | zero tokens | may only pass or escalate, never rework |
| **L2 — Frontier** | lead model, once per composed change | paid | final sign-off |

Routing (token-economy rules of this backlog):

1. Every packet output runs **L0 first**. A deterministic failure returns to the local worker with
   the tool output attached. **No LLM — local or frontier — reviews output that fails L0.**
2. L0 failure escalates **one tier rung at a time** per `docs/STD-SLM-Tiered-Routing.md` §5.3
   (`T0 → T1 → T1.5 → T2 → T3`, see §3). The local `T0 → T1` rung is `retryLargerLocalModel` on
   `govibe.agent.run`; escalation past the local rungs goes to the lead with L0 evidence attached,
   and the lead decides whether the cloud or frontier rung is warranted.
3. L0 pass routes to **L1** local-SLM review. L1 emits `pass` or `escalate` only (FEAT-Tiered-Review
   FR-002); it never sends work back to the writer on its own.
4. **L2** frontier review happens once per composed pull request, not per packet. Low-stakes packets
   (EXEC-002 label renames) that clear L0+L1 may skip per-packet L2 under FR-004; the skip is
   logged in the Verification table, never silent.
5. Nothing is sent to a paid model without attached L0 evidence (command exit status and output).
   L0 evidence is also the only thing that may tick a packet acceptance check.

L0 commands used by this pilot (all exist today):

```bash
npm run lint
```

```bash
npx vitest run src/mission/snapshot-reducer.test.ts src/missionContract.test.ts
```

## 3. Execution Model

Per `docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md`: the lead agent plans,
composes, and verifies; local models act only as bounded workers on H0-scope packets sized for the
RTX 3060 12GB hardware class (8k–16k context). Dispatch goes through `govibe.agent.run` with its
`localModel` / `retryLargerLocalModel` arguments (already implemented in
`scripts/mcp/runtime-core.mjs`). Model routing follows
`docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md`.

**Packets never pin a concrete model as a requirement.** Model selection follows
`docs/STD-SLM-Tiered-Routing.md` — the GoVibe canonical SLM routing standard (upstreamed from the
RWANG-PROMAX tiered-swarm skill, whose reference files are now distribution mirrors):

- The escalation ladder is `T0 local-SLM → T1 local-mid → T1.5 cloud-open-weights → T2 Claude-mid
  → T3 Claude-frontier`; a failed verify gate escalates exactly one rung.
  `retryLargerLocalModel` on `govibe.agent.run` implements the local `T0 → T1` rung.
- **Cheap-eligibility keystone:** a packet may enter the local ladder only because it carries a
  deterministic verify command — here, its `l0_gate` — whose result is unambiguous pass/fail at
  ~$0. A task with no such check never enters the ladder and starts at `T2`.
- Packets therefore declare a `tier_hint` (`T0` for single-string edits, `T1` for bounded code and
  test authoring) and `model_name: resolved-by-router`; the router or operator maps the tier to a
  concrete model from the lookup table at dispatch time.

Every packet declares model, context length, and predicted tokens before execution (FR-004), and
escalates instead of widening context (FR-006). H below is Access Scope per
`docs/STD-Execution-Governance.md` v2.4.0+ga; packet context limits are Budget, not H.

### 3.1 Context profiles per role

Context assembly follows the canonical profiles in `AGENTS.md` §5 — the profile is declared by the
packet, never inferred from role, and every dispatched turn retains `contextId`/`cacheId` lineage
per `AGENTS.md` §6:

| Role | Profile | Rationale |
|---|---|---|
| Local packet worker (execute) | `T-ctx` | system + task/event only; no private history loaded, which is both the safety boundary and the cheapest context |
| L1 local-SLM reviewer | `T-ctx` | reviews one packet output against its acceptance check; needs no vault memory |
| Lead compose / escalation handling | `W-ctx` | needs the one active workflow plus own vault memory |
| L2 frontier sign-off and audit | `M-ctx` | review/audit gates run on synchronized context with diff lineage |

A packet that turns out to need more than `T-ctx` does not widen its own context — that is exactly
the `escalate_to_lead` condition.

## Sprints

| Sprint | Goal | Exit Criteria | Status | Progress |
|---|---|---|---|---|
| SPR-EXEC-01 | Prove the local-packet loop on two masterplan tasks with the tiered review gate | Both parent tasks close with L0 evidence per packet and one L2 sign-off per composed change | planned | 0 |

## Backlog Items

| ID | Parent ID | Type | Title | Priority | Owner | Status | Dependencies | Source Section |
|---|---|---|---|---|---|---|---|---|
| EXEC-001 | SPR-EXEC-01 | task | Close the orchestration contract slice via local packets | P0 | VIBE | planned | TASK-PRD-005 | Packets EXEC-001 |
| EXEC-002 | SPR-EXEC-01 | task | Reconcile sidebar labels via local packets | P2 | VIBE | planned | TASK-PRD-008 | Packets EXEC-002 |

## Nodes

| ID | Parent ID | Type | Title | Summary | State | Progress | Assignee | Source Section |
|---|---|---|---|---|---|---|---|---|
| EXEC-001-A1 | EXEC-001 | atomic-task | Add orchestration field to MissionSnapshot type | One edit in src/mission/domain.ts | planned | 0 | local-slm | Packets EXEC-001 |
| EXEC-001-M1 | EXEC-001 | micro-task | Initialize and merge orchestration in the snapshot reducer | Default value plus merge path in src/mission/snapshot-reducer.ts | planned | 0 | local-slm | Packets EXEC-001 |
| EXEC-001-M2 | EXEC-001 | micro-task | Author the frontend-backend snapshot parity test | Key-set comparison with a documented orphan allowlist | planned | 0 | local-slm | Packets EXEC-001 |
| EXEC-002-A1 | EXEC-002 | atomic-task | Rename B1 sidebar entry to the rendered view title | One string in src/mission/navigation.ts | planned | 0 | local-slm | Packets EXEC-002 |
| EXEC-002-A2 | EXEC-002 | atomic-task | Correct the B2 view header to Business Specifications | One string in the specifications view | planned | 0 | local-slm | Packets EXEC-002 |
| EXEC-002-A3 | EXEC-002 | atomic-task | Rename A4 sidebar entry to the rendered view title | One string in src/mission/navigation.ts | planned | 0 | local-slm | Packets EXEC-002 |
| EXEC-002-M1 | EXEC-002 | micro-task | Author the navigation-versus-header sync test with allowlist | D1 recorded as an intentional difference | planned | 0 | local-slm | Packets EXEC-002 |

## Execution Packets

Packet schemas follow FEAT-Quota-Aware-Local-LLM-Decomposition §5. `l0_gate` expands the
`acceptance_check` into the exact deterministic commands the gate runs.

### EXEC-001-A1

```yaml
packet_type: atomic-task
context_profile: T-ctx
packet_id: EXEC-001-A1
tier_hint: T1
parent_task: EXEC-001
target: src/mission/domain.ts
single_action: >
  Add an exported MissionOrchestrationWave type ({ id: string; label: string; status: string })
  and an optional orchestration field ({ waves: MissionOrchestrationWave[]; updatedAt: string })
  to the MissionSnapshot type.
acceptance_check: npm run lint exits 0 and the orchestration field exists on MissionSnapshot
l0_gate:
  - npm run lint
model_name: resolved-by-router
context_length: 8k
predicted_token_usage: 900
max_output_tokens: 400
rollback_note: revert src/mission/domain.ts to HEAD
escalation_rule: escalate_to_lead_when_more_than_one_action_is_required
```

### EXEC-001-M1

```yaml
packet_type: micro-task
context_profile: T-ctx
packet_id: EXEC-001-M1
tier_hint: T1
parent_task: EXEC-001
target_path: src/mission/snapshot-reducer.ts
source_excerpt: emptyMissionSnapshot literal and mergeMissionSnapshot field list
instruction: >
  Initialize orchestration as { waves: [], updatedAt: "" } in emptyMissionSnapshot and carry the
  field through mergeMissionSnapshot with the same patch-wins-else-current pattern used by the
  neighbouring fields.
constraints:
  - do not change any other field default
  - match the existing single-line formatting style of the file
acceptance_check: npx vitest run src/mission/snapshot-reducer.test.ts exits 0
l0_gate:
  - npm run lint
  - npx vitest run src/mission/snapshot-reducer.test.ts
model_name: resolved-by-router
context_length: 8k
predicted_token_usage: 1400
max_output_tokens: 600
rollback_note: revert src/mission/snapshot-reducer.ts to HEAD
escalation_rule: escalate_to_lead_when_context_exceeds_packet
```

### EXEC-001-M2

```yaml
packet_type: micro-task
context_profile: T-ctx
packet_id: EXEC-001-M2
tier_hint: T1
parent_task: EXEC-001
target_path: src/mission/snapshot-parity.test.ts
source_excerpt: emptyMissionSnapshot keys and createRuntimeSnapshot keys from scripts/mcp/runtime/snapshot-store.mjs
instruction: >
  Author a vitest test that imports both snapshot factories and asserts their key sets are equal
  after removing entries in a documented KNOWN_ORPHANS allowlist. Seed the allowlist with heatmap
  and masterPlanPreview, each annotated with the masterplan task that owns its resolution
  (TASK-PRD-006).
constraints:
  - the test must fail when either side gains a key the other lacks
  - the allowlist must be an exported named constant so removal is a reviewed change
acceptance_check: npx vitest run src/mission/snapshot-parity.test.ts exits 0 and fails when a key is added on one side only
l0_gate:
  - npm run lint
  - npx vitest run src/mission/snapshot-parity.test.ts
model_name: resolved-by-router
context_length: 16k
predicted_token_usage: 2400
max_output_tokens: 900
rollback_note: delete src/mission/snapshot-parity.test.ts
escalation_rule: escalate_to_lead_when_context_exceeds_packet
```

### EXEC-002-A1

```yaml
packet_type: atomic-task
context_profile: T-ctx
packet_id: EXEC-002-A1
tier_hint: T0
parent_task: EXEC-002
target: src/mission/navigation.ts
single_action: change the B1 subModule name from "AST Hierarchy Tree" to "AST Tree & Preview"
acceptance_check: npm run lint exits 0 and the B1 entry reads AST Tree & Preview
l0_gate:
  - npm run lint
model_name: resolved-by-router
context_length: 8k
predicted_token_usage: 600
max_output_tokens: 200
rollback_note: revert src/mission/navigation.ts to HEAD
escalation_rule: escalate_to_lead_when_more_than_one_action_is_required
```

### EXEC-002-A2

```yaml
packet_type: atomic-task
context_profile: T-ctx
packet_id: EXEC-002-A2
tier_hint: T0
parent_task: EXEC-002
target: src/features/specs/BusinessSpecificationsView.tsx
single_action: >
  Change the ViewHeader title from "Functional Specifications" to "Business Specifications" so the
  header matches both the component name and the C-domain navigation entry.
acceptance_check: npm run lint exits 0 and the header reads Business Specifications
l0_gate:
  - npm run lint
model_name: resolved-by-router
context_length: 8k
predicted_token_usage: 600
max_output_tokens: 200
rollback_note: revert src/features/specs/BusinessSpecificationsView.tsx to HEAD
escalation_rule: escalate_to_lead_when_more_than_one_action_is_required
```

### EXEC-002-A3

```yaml
packet_type: atomic-task
context_profile: T-ctx
packet_id: EXEC-002-A3
tier_hint: T0
parent_task: EXEC-002
target: src/mission/navigation.ts
single_action: change the A4 subModule name from "Brain & Config" to "Vault, Context & Impact"
acceptance_check: npm run lint exits 0 and the A4 entry reads Vault, Context & Impact
l0_gate:
  - npm run lint
model_name: resolved-by-router
context_length: 8k
predicted_token_usage: 600
max_output_tokens: 200
rollback_note: revert src/mission/navigation.ts to HEAD
escalation_rule: escalate_to_lead_when_more_than_one_action_is_required
```

### EXEC-002-M1

```yaml
packet_type: micro-task
context_profile: T-ctx
packet_id: EXEC-002-M1
tier_hint: T1
parent_task: EXEC-002
target_path: src/mission/navigation-labels.test.ts
source_excerpt: missionDomains from src/mission/navigation.ts and the first ViewHeader title of each feature view file
instruction: >
  Author a vitest test that reads each feature view source file, extracts the first ViewHeader
  title, and compares it with the navigation subModule name for that ViewId. Differences are
  failures unless listed in an exported INTENTIONAL_LABEL_DIFFERENCES allowlist. Seed the
  allowlist with D1 (navigation "Reactor Run Trigger" versus header "System Execution Safety and
  Triggers"), annotated with the reason the shorter navigation label is kept.
constraints:
  - read files with node:fs at test time; do not render components
  - the allowlist must be an exported named constant so changes are reviewed
acceptance_check: npx vitest run src/mission/navigation-labels.test.ts exits 0 and fails when a label desynchronises outside the allowlist
l0_gate:
  - npm run lint
  - npx vitest run src/mission/navigation-labels.test.ts
model_name: resolved-by-router
context_length: 16k
predicted_token_usage: 2200
max_output_tokens: 900
rollback_note: delete src/mission/navigation-labels.test.ts
escalation_rule: escalate_to_lead_when_context_exceeds_packet
```

## Assignments

| Task ID | Subject ID | Subject Type | Policy Model | Assigned At | Assigned By |
|---|---|---|---|---|---|
| EXEC-001 | VIBE | agent | ABAC | 2026-08-06T00:00:00Z | LYRA |
| EXEC-002 | VIBE | agent | ABAC | 2026-08-06T00:00:00Z | LYRA |

## Handoffs

| Task ID | From ID | To ID | Required Artifact | Note | Created At | State |
|---|---|---|---|---|---|---|
| EXEC-001 | VIBE | ATHER | L0 evidence per packet plus one L2 sign-off on the composed change | Contract change is not low-stakes; L2 is mandatory once at compose | 2026-08-06T00:00:00Z | pending |
| EXEC-002 | VIBE | ATHER | L0 evidence per packet plus logged L2-skip decision | Low-stakes renames may skip per-packet L2 under FEAT-Tiered-Review FR-004; the skip must be logged | 2026-08-06T00:00:00Z | pending |

## Verification

| Task ID | QA Status | Audit Status | Deployment Status | Updated At |
|---|---|---|---|---|
| EXEC-001 | pending | pending | n/a | 2026-08-06T00:00:00Z |
| EXEC-002 | pending | pending | n/a | 2026-08-06T00:00:00Z |

## Task Containers

### TC-EXEC-001

```yaml
task_container_id: TC-EXEC-001
task_id: EXEC-001
parent_phase_id: PHASE-PRD-02
parent_sprint_id: SPR-EXEC-01
title: Close the orchestration contract slice via local packets
requirement_type: FR
complexity: C-2
access_scope: H2
status: planned
version: 0.1.0+draft
pic: VIBE
executor: local SLM packets under VIBE lead
approver: Boss
auditor: ATHER
symbol_links:
  code: src/mission/domain.ts
  doc: docs/roadmap/MASTERPLAN-govibe-production-readiness.md
  test: src/mission/snapshot-reducer.test.ts
definition_of_done:
  acceptance_criteria:
    - criterion: Given packets A1 and M1 land, when npm run lint and the reducer test run, then both exit 0 with orchestration declared and initialised on the frontend snapshot
      checked: false
  success_criteria:
    - criterion: Given packet M2 lands, when either snapshot factory gains a key the other lacks, then the parity test fails
      checked: false
  exit_criteria:
    - criterion: Given all three packets pass L0, when the composed change is reviewed, then exactly one L2 frontier sign-off is recorded and masterplan TASK-PRD-005 can be marked done from this evidence
      checked: false
changelog: Pilot decomposition of masterplan TASK-PRD-005 into three local packets.
created_at: 2026-08-06T00:00:00Z,LYRA,pending
token_telemetry:
  model_name: resolved-by-router
  context_length: 16k
  predicted_token_usage: 4700
  total_token_usage: 4700
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

### TC-EXEC-002

```yaml
task_container_id: TC-EXEC-002
task_id: EXEC-002
parent_phase_id: PHASE-PRD-03
parent_sprint_id: SPR-EXEC-01
title: Reconcile sidebar labels via local packets
requirement_type: NFR
complexity: C-1
access_scope: H1
status: planned
version: 0.1.0+draft
pic: VIBE
executor: local SLM packets under VIBE lead
approver: Boss
auditor: ATHER
symbol_links:
  code: src/mission/navigation.ts
  doc: docs/features/agent-team/FEAT-Tiered-Review.md
  test: src/missionContract.test.ts
definition_of_done:
  acceptance_criteria:
    - criterion: Given packets A1 to A3 land, when npm run lint runs, then it exits 0 and the three corrected labels match their rendered view titles
      checked: false
  success_criteria:
    - criterion: Given packet M1 lands, when any label desynchronises outside the allowlist, then the sync test fails
      checked: false
  exit_criteria:
    - criterion: Given all packets pass L0 and L1, when the L2 skip decision is taken for these low-stakes renames, then the skip is logged in the Verification table and masterplan TASK-PRD-008 can be marked done from this evidence
      checked: false
changelog: Pilot decomposition of masterplan TASK-PRD-008 into four local packets.
created_at: 2026-08-06T00:00:00Z,LYRA,pending
token_telemetry:
  model_name: resolved-by-router
  context_length: 16k
  predicted_token_usage: 4000
  total_token_usage: 4000
ui_state:
  dropdown_default: expanded
  expanded: true
  disabled_reason: ""
```

## 9. Status Protocol

Same live rules as masterplan §11: edit the Status cells above (parser tokens only: `planned`,
`in-progress`, `blocked`, `ready`, `assigned`, `review`, `done`), tick a criterion only with its
L0 evidence attached, and re-run `npm run docs:validate` plus `npm run roadmap:validate` after any
edit. Closing EXEC-001 / EXEC-002 is what permits marking masterplan TASK-PRD-005 / TASK-PRD-008
done — the masterplan row is updated in the same change, citing this backlog.

## Changelog

| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 0.1.0+draft | 2026-08-06 | draft | Initial local-packet execution backlog: pilot decomposition of TASK-PRD-005 and TASK-PRD-008 into seven micro/atomic packets, bound to the canonical L0/L1/L2 tiered review gate (FEAT-Tiered-Review), the approved quota-aware packet policy (FEAT-Quota-Aware-Local-LLM-Decomposition), T-ctx worker context (AGENTS.md §5), and RWANG tiered-swarm routing: packets carry tier_hint plus a deterministic l0_gate (the cheap-eligibility keystone) and never pin a concrete model. | pending | Claude Fable 5 |
