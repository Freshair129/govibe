---
title: "IMP: Restore Local Toolchain Verification Gate"
doc_id: "IMP-GVMP01P06EP01"
status: "draft"
version: "0.1.1+draft"
updated: "2026-06-17"
owner: "LYRA"
pic: "JANUS"
auditor: "ATHER"
source_of_truth: false
---

# IMP: Restore Local Toolchain Verification Gate

**SSOT Reference:** [.agents/pm/asset/Planning-Decomposition-Standard.md](../../pm/asset/Planning-Decomposition-Standard.md)  
**Quota-Aware Local LLM Reference:** [docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md](../../../docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md)  
**Qwen Routing Reference:** [docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md](../../../docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md)  
**Tier:** H1-H0 (Execution)

```yaml
ImpId: IMP-GVMP01P06EP01
Source Spec: docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md
Methodology: DDD + CoDev multi-agent execution
Complexity: C-2
Risk: MEDIUM
Gate: Doc/spec first -> qwen shared-context review -> minimal implementation -> verification
Status: WIP
Progression: 35%
Target: task, sub-task, micro-task, atomic-task
```

## Goal

Restore the local GoVibe verification gate so `docs:validate`, `diff:check`, and later `baseline:check` can run from the current Windows/PowerShell workspace again.

This slice is only about local toolchain verification. It must not expand into GKS bridge design, UI work, roadmap implementation, or dependency upgrades.

## Scope

In scope:

- Diagnose why `node`, `npm`, and `npm.cmd` are not visible in the current shell.
- Identify the smallest safe fix for local verification commands.
- Preserve current GoVibe docs-first and evidence-first gates.
- Verify `npm run docs:validate` and `npm run diff:check` after the toolchain path is restored.

Out of scope:

- Installing or upgrading project dependencies unless required to restore the existing scripts.
- Changing application code.
- Changing Mission Control UI.
- Importing GKS/cognitive-system knowledge blocks.
- Creating new architecture beyond the local verification gate.

## Execution Table

| Status | Task ID | Task Details | Pt | Mode | Dependency | Symbollink | Assign To | Model Name | Context | Verification Link | Predicted Tokens | Actual Input | Actual Output | Tool Calling | Total Tokens | Start | End |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| done | TSK-GVMP01P06EP01-01 | Diagnose missing Node/npm visibility in current PowerShell environment | 2 | PARALLEL | - | `package.json`, `scripts/docs/validate-docs.mjs` | JANUS | `google/gemma-4-31b-it:free` via qwen-cli | shared external + git hygiene | [Qwen Assignment Log](#qwen-assignment-log) | 2500 | unavailable | unavailable | unavailable | unavailable | 2026-06-17 | 2026-06-17 |
| done | TSK-GVMP01P06EP01-02 | Propose minimal verification gate restoration path without dependency churn | 2 | PARALLEL | TSK-01 | `package.json`, `scripts/docs/*.mjs` | KIN | `qwen/qwen3-coder:free` via qwen-cli, fallback `google/gemma-4-31b-it:free` | shared external | [Qwen Assignment Log](#qwen-assignment-log) | 3000 | unavailable | unavailable | unavailable | unavailable | 2026-06-17 | 2026-06-17 |
| done | TSK-GVMP01P06EP01-03 | Audit scope boundary and evidence preservation before implementation | 1 | PARALLEL | - | `AGENTS.md`, `.agents/context/shared/*` | ATHER | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` via qwen-cli, fallback local `qwen3.5:4b` | shared external | [Qwen Assignment Log](#qwen-assignment-log) | 3000 | unavailable | unavailable | unavailable | unavailable | 2026-06-17 | 2026-06-17 |
| blocked | TSK-GVMP01P06EP01-04 | Implement smallest local toolchain fix | 3 | SERIAL | TSK-01, TSK-02, TSK-03 | local environment only unless doc update required | JANUS / Codex | Codex lead | repo evidence | pending | 4000 | - | - | - | - | - | - |
| blocked | TSK-GVMP01P06EP01-05 | Verify docs gates and update evidence | 2 | SERIAL | TSK-04 | `npm run docs:validate`, `npm run diff:check` | GHOST / ATHER | Codex lead | repo evidence | pending | 2000 | - | - | - | - | - | - |

## Task Breakdown

### TSK-GVMP01P06EP01-01: Diagnose Missing Node/npm
- [x] S-01 Confirm current shell PATH and executable discovery.
  - [x] M-01 Run bounded discovery for `node.exe`, `npm.cmd`, package manager shims, and likely install locations.
    - [x] A-01 Record exact commands and evidence.

### TSK-GVMP01P06EP01-02: Minimal Restoration Path
- [x] S-02 Compare options: PATH repair, existing installed runtime path, or local runtime install.
  - [x] M-02 Recommend the smallest reversible fix.
    - [x] A-02 Reject any dependency upgrade not required for existing scripts.

### TSK-GVMP01P06EP01-03: Audit Scope Boundary
- [x] S-03 Verify the fix does not touch protected docs, inbound evidence, or feature scope.
  - [x] M-03 Produce auditor accept/block recommendation.
    - [x] A-03 Record unresolved blockers before implementation.

### TSK-GVMP01P06EP01-04: Implement Smallest Fix
- [ ] S-04 Apply the chosen local toolchain fix.
  - [ ] M-04 Prefer environment/path fix before repo edits.
    - [ ] A-04 If repo edit is required, update only docs/runbook evidence.

### TSK-GVMP01P06EP01-05: Verify Gates
- [ ] S-05 Run `docs:validate` and `diff:check`.
  - [ ] M-05 Capture pass/fail evidence.
    - [ ] A-05 Update this IMP with actual verification links or summaries.

## Definition of Done

### Acceptance Criteria

- [x] The current shell can locate a working Node.js runtime or the blocker is documented with evidence.
- [x] The chosen fix is the smallest reversible option.
- [x] Qwen external-agent feedback is captured as draft evidence, not final approval.
- [x] No GKS import, UI work, or unrelated feature scope is added.

### Success Criteria

- [ ] `npm run docs:validate` runs from `G:\govibe`.
- [ ] `npm run diff:check` runs from `G:\govibe`.
- [ ] If `baseline:check` cannot run, the remaining blocker is explicit and evidence-backed.

### Exit Criteria

- [ ] Git worktree is clean or only approved evidence remains.
- [ ] ATHER audit passes the scope boundary.
- [ ] Verification results are recorded in this IMP.

## Local LLM Packets (H0 Tier)

### Micro-task Packet: M-GVMP01P06EP01-01
```text
source excerpt: package.json scripts and current command failure
target path: no repo edit expected
instruction: Identify the smallest likely cause of node/npm not being visible in the current PowerShell shell from supplied evidence.
constraints: Do not recommend dependency upgrades, app code changes, UI changes, or GKS import.
acceptance check: Output one recommended diagnostic path and one safest fix path.
model name: qwen3.5:4b or google/gemma-4-31b-it:free
max context: 8k
predicted token usage: 1500
max output tokens: 600
rollback note: No changes should be made by the local model.
escalation rule: escalate_to_lead_when_context_exceeds_packet
```

## Qwen Assignment Log

External agent feedback was collected through `qwen-cli` with shared GoVibe context.

### JANUS Feedback

```yaml
model_name: google/gemma-4-31b-it:free
route: qwen-cli / OpenRouter
task: TSK-GVMP01P06EP01-01
result: accepted
risk: LOW
finding: "Node.js runtime is not installed on the system or is missing from all standard installation paths and user directories."
evidence:
  - "Get-Command node/npm/npm.cmd returned no command."
  - "where.exe npm returned no files."
  - "C:\\Program Files\\nodejs was empty or unavailable."
  - "Recursive search under C:\\Users\\freshair and Program Files found no node.exe."
recommended_next_action: "Install Node.js LTS via official installer or nvm-windows."
do_not_touch:
  - "Application code"
  - "Mission Control UI"
  - "GKS/cognitive-system knowledge blocks"
  - "Existing project dependencies"
```

### KIN Feedback

```yaml
primary_model: qwen/qwen3-coder:free
primary_result: "blocked_by_executor_error: 429 Too Many Requests"
fallback_model: google/gemma-4-31b-it:free
route: qwen-cli / OpenRouter
task: TSK-GVMP01P06EP01-02
result: accepted
finding: "The environment has a working Python/qwen-cli toolchain but is missing the Node.js runtime required for project verification gates."
recommended_decision: "Install Node.js LTS to restore runtime environment; no repo-level changes required."
blockers:
  - "Admin rights may be required."
  - "Network access may be required to download Node.js."
```

### ATHER Feedback

```yaml
primary_model: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
primary_result: "block: requested more evidence"
fallback_model: qwen3.5:4b
route: qwen-cli / local Ollama
task: TSK-GVMP01P06EP01-03
result: accepted
confidence: "95%"
recommended_decision: "accept"
required_evidence:
  - "git status --short output"
  - "where.exe node / node --version after fix"
  - "confirmation no protected files or PRD/system docs are modified outside this IMP"
do_not_touch:
  - "GKS bridge design/code"
  - "Mission Control UI code/assets"
  - "project dependency versions unless runtime discovery proves otherwise"
  - "application source logic"
```

## Implementation Decision

Proceed to TSK-GVMP01P06EP01-04 only with the smallest environment/runtime restoration path. Do not modify application code or project dependencies unless Node.js installation/discovery proves impossible.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.1+draft | 2026-06-17 | LYRA / JANUS / ATHER | Added qwen-cli parallel assignment feedback from JANUS, KIN, and ATHER. |
| 0.1.0+draft | 2026-06-17 | LYRA / JANUS / ATHER | Created implementation plan for restoring local toolchain verification gate. |
