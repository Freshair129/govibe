---
title: "FEAT: Qwen CLI Model Routing"
doc_id: "FEAT-QWEN-CLI-MODEL-ROUTING"
status: "approved"
version: "0.1.4"
updated: "2026-08-19"
owner: "KIN / LYRA / ATHER"
source_of_truth: true
prd_system: "SYSTEM-06::Integration-Bridge-System"
supporting_prd_systems:
  - "SYSTEM-05::Agent-Team-Management-System"
  - "SYSTEM-09::Traceability-Audit-Verification-System"
related_docs:
  - "docs/features/agent-team/FEAT-Quota-Aware-Local-LLM-Decomposition.md"
  - "AGENT.md"
  - ".agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md"
  - ".agents/context/shared/CONTEXT-GoVibe-Git-Hygiene.md"
  - ".agents/context/CONTEXT-Bounded-External-Executor.md"
  - "docs/operations/runbooks/RUNBOOK-Bounded-External-Executor-Workflow.md"
  - "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md"
  - "docs/STD-Execution-Governance.md"
---

# FEAT: Qwen CLI Model Routing

## 1. Goal

Define how GoVibe may route bounded support work through `qwen-cli` using local Ollama models or OpenRouter free models while preserving lead-agent ownership, evidence capture, and quota-aware execution.

`qwen-cli` is an executor bridge. It is not a product owner, final approver, or source of project truth.

## 2. Current Capability Snapshot

Verified on 2026-06-17 from `G:\govibe` and `C:\Users\freshair\qwen-cli\README.md`:

```yaml
qwen_cli_available: true
qwen_cli_source_root: "C:\\Users\\freshair\\qwen-cli"
qwen_help_supports:
  - "--model"
  - "--key"
  - "--code"
  - "--review"
  - "--test"
  - "--doc"
  - "--no-stream"
  - "--list"
readme_claims:
  engine: "local Ollama and OpenRouter"
  direct_cli_example: "qwen --model qwen/qwen3-coder:free \"Write code\""
  api_key_config: "OPENROUTER_API_KEY in ~/.qwen/.env or qwen --key"
  auto_system_prompt_file: "AGENT.md"
openrouter_key_present: false
local_ollama_models_present: true
local_smoke_test:
  command: "qwen --model qwen3.5:4b --no-stream \"Return exactly: QWEN_OK\""
  exit_code: 0
  stdout: "QWEN_OK"
previous_local_qwen_cli_issue:
  error: "NameError: name 'query_ollama' is not defined"
  current_interpretation: "stale entrypoint or pre-fix runtime behavior; current local smoke test passed"
```

Important boundary: `qwen-cli` auto-loads `AGENT.md`, not `AGENTS.md`. GoVibe must not assume the universal `AGENTS.md` contract was loaded unless the run evidence shows a dedicated `AGENT.md` bridge, an explicit `--system` prompt, or a bounded context packet was passed.

## 3. Shared Context Loading

GoVibe routes qwen executor work through shared context instead of one-off prompt text.

Minimum shared packet:

```text
AGENTS.md
AGENT.md
.agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md
.agents/context/CONTEXT-Bounded-External-Executor.md
```

Git hygiene packets must also load:

```text
.agents/context/shared/CONTEXT-GoVibe-Git-Hygiene.md
```

The supported wrapper is:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-qwen-agent-review.ps1" `
  -Role "JANUS / ATHER" `
  -Mode git `
  -Task "Audit current git state and recommend safe cleanup"
```

## 4. Routing Policy

| Work Type | Preferred Model | Route | Allowed Output | Approval |
|---|---|---|---|---|
| Architecture boundary review | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | OpenRouter through `qwen-cli` | Draft review, risks, missing pieces | ARCHON / ATHER |
| General doc synthesis | `google/gemma-4-31b-it:free` | OpenRouter through `qwen-cli` | Draft summary, doc critique | THESEUS / ATHER |
| Code-oriented implementation review | `qwen/qwen3-coder:free` | OpenRouter through `qwen-cli` | Draft patch plan or code review | RKOI / GHOST |
| Broad alternative reasoning | `openai/gpt-oss-120b:free` | OpenRouter through `qwen-cli` | Draft second opinion | Lead agent |
| Local small worker task | `qwen3.5:4b` or `qwen3:latest` | local Ollama through `qwen-cli` | H0 draft output only | Lead agent |

Fallback rule:

- If OpenRouter key is missing, return `blocked_by_missing_evidence` for OpenRouter routes.
- If local `qwen-cli` execution fails, return `blocked_by_executor_error` and include stderr.
- If `AGENT.md` or an explicit `--system` prompt was not supplied, treat the output as generic model output, not GoVibe-governed agent output.
- If the task requires broad repo search, PRD authority, architecture approval, or cross-repo truth, do not route it to H0/local worker mode.

## 5. Required Invocation Evidence

Every `qwen-cli` run used by GoVibe must record:

```yaml
executor: qwen-cli
route: openrouter | local_ollama
model_name:
model_source: qwen_list | operator_override
prompt_purpose: review | doc | code | test | microtask
repo_root_checked:
git_status_summary:
context_files_read:
context_source_used: AGENT.md | explicit_system_prompt | bounded_packet | none
command:
started_at:
ended_at:
exit_code:
stdout_summary:
stderr_summary:
token_usage_predicted:
token_usage_actual:
recommended_decision: accept_reference | revise_packet | retry_with_different_model | blocked_by_missing_evidence | blocked_by_executor_error
confidence:
```

## 6. Model Selection Rules

- Use `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` first for reasoning-heavy review packets.
- Use `google/gemma-4-31b-it:free` for concise documentation synthesis when an OpenRouter key is configured.
- Use `qwen/qwen3-coder:free` only for code-facing review or bounded implementation advice.
- Use local models only for H0/H1 packets with narrow file scope and explicit acceptance checks. Access Scope values (`H0` = subtask/PR, `H1` = task/component) follow the canonical Access Scope scale in `docs/STD-Execution-Governance.md` §3 (H0-H4; `H5`/`H6` are abolished per `ADR-021`); see also `FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION`.
- `qwen-cli` mode may rely on `AGENT.md`, `--system`, or a bounded packet, but the evidence must name which context source was used.
- Do not use any free model as final approval evidence.
- Do not retry endlessly across free models; after two failed executor attempts, escalate to the lead agent.

## 7. Acceptance Criteria

- GoVibe has a documented model routing policy for `qwen-cli`.
- The policy distinguishes OpenRouter models from local Ollama models.
- Missing API key and executor runtime errors are explicit blockers, not silent fallback success.
- Every route requires evidence fields before output can influence GoVibe decisions.
- Free models can assist but cannot approve scope, architecture, release, or source truth.
- Shared context is loaded from files, not recreated manually in an ad hoc prompt.

## 8. Success Criteria

- LYRA can assign a bounded review packet to a model class without guessing.
- KIN can later implement a wrapper around `qwen-cli` without changing governance semantics.
- ATHER can audit model choice, command evidence, and failure behavior.
- Primary LLM quota is conserved for lead reasoning and final review.

## 9. Definition Of Done

- This feature is registered in `docs/DOC-VERSION-REGISTRY.md`.
- Quota-aware local LLM decomposition references this routing policy.
- Bounded external executor context references this routing policy.
- Shared external-agent context and git hygiene context are registered.
- `scripts/agents/run-qwen-agent-review.ps1` can build a context-backed qwen packet.
- `npm run docs:validate` passes.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.4 | 2026-08-19 | ATHER | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): §6 "Context Scaling Tier scale" renamed "Access Scope scale" and range capped at H4; no status change. |
| 0.1.3 | 2026-06-20 | KIN / LYRA / ATHER | Signed off; promoted draft -> approved. |
| 0.1.3+draft | 2026-06-20 | KIN / LYRA / ATHER | Linked H0/H1 context tiers to the canonical Context Scaling Tier scale in STD-Execution-Governance §3 and added it to related_docs. |
| 0.1.2+draft | 2026-06-17 | KIN / LYRA / ATHER | Added shared context loading contract and qwen wrapper path. |
| 0.1.1+draft | 2026-06-17 | KIN / LYRA / ATHER | Added README-derived configuration evidence, AGENT.md context boundary, and local qwen smoke result. |
| 0.1.0+draft | 2026-06-17 | KIN / LYRA / ATHER | Added qwen-cli model routing policy for OpenRouter free models and local Ollama worker routes. |
