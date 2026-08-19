---
title: "FEAT: Quota-Aware Local LLM Decomposition"
doc_id: "FEAT-QUOTA-AWARE-LOCAL-LLM-DECOMPOSITION"
status: "approved"
version: "0.1.2"
updated: "2026-08-19"
owner: "LYRA / ATHER"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/features/agent-team/FEAT-Multi-Agent-Workflow-System.md"
  - "docs/features/integration-bridge/FEAT-Qwen-CLI-Model-Routing.md"
  - "docs/srs/SRS-Ollama-Sidecar-Execution.md"
  - "docs/operations/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - ".agents/pm/asset/Planning-Decomposition-Standard.md"
  - ".agents/pm/asset/Implementation-Plan-Template.md"
  - "docs/STD-Execution-Governance.md"
---

# FEAT: Quota-Aware Local LLM Decomposition

## 1. Goal

Make GoVibe reduce primary LLM quota usage by decomposing work into `micro-task` and `atomic-task` packets that are narrow enough for local LLM execution on the current operator hardware class, especially RTX 3060 12GB VRAM.

The lead agent remains responsible for planning, review, and verification. Local LLMs act only as bounded workers.

## 2. Why This Exists

Cloud or high-capacity models should not spend quota on repetitive or tightly bounded work that can be executed from a small packet.

Local models are less reliable when asked to infer broad product context. GoVibe should reduce hallucination by making local work small enough that model intelligence matters less than packet quality.

## 3. Scope

Access Scope values (`H0`, `H1`, ...) used in this doc follow the canonical Access Scope scale defined in `docs/STD-Execution-Governance.md` §3 (H-Scale: Access Scope): `H0` = subtask/PR scope (local change, no broad context required), `H1` = task/component scope, ascending to `H4` (`H5`/`H6` are abolished per `ADR-021`). Local LLM packets target `H0` (and at most `H1`) work.

Included:

- task decomposition from `task` to `sub-task`, `micro-task`, and `atomic-task`
- quota-aware executor routing hints
- qwen-cli model routing when a bounded packet can be sent to a local or OpenRouter-backed support model
- local packet limits for 8k-16k context windows
- predicted and actual token telemetry expectations
- escalation back to the lead agent when a task is too broad

Excluded:

- provider billing, subscription, or quota ownership
- autonomous local model approval
- broad local model planning beyond H0 packets
- replacing Codex, Claude, Gemini, or the lead orchestrator

## 4. Functional Requirements

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-001 | LYRA must decompose eligible work down to `micro-task` and `atomic-task` when quota savings are expected. | Implementation plans include H0 packets for local-eligible work. |
| FR-002 | A micro-task must fit in one local LLM prompt with only necessary source excerpts. | Packet declares source excerpt, target path, instruction, constraints, acceptance check, and max context. |
| FR-003 | An atomic-task must contain one action, one target, one acceptance check, and one rollback note. | Packet can be executed without broad project context. |
| FR-004 | Local LLM packets must declare model/config and token prediction before execution. | Packet includes model name, context length, predicted token usage, and owner. |
| FR-005 | Local LLM completion must record actual token/evidence fields when available. | Result includes actual input, output, tool, total tokens, start, end, and verification link when produced by an executor that exposes them. |
| FR-006 | Tasks that exceed H0 context or require cross-system judgment must escalate back to the lead agent. | Packet returns `escalate_to_lead` instead of widening context. |

## 5. Packet Policy

Micro-task packet:

```yaml
packet_type: micro-task
target_path:
source_excerpt:
instruction:
constraints:
acceptance_check:
model_name:
context_length: 8k | 16k
predicted_token_usage:
max_output_tokens:
rollback_note:
escalation_rule: escalate_to_lead_when_context_exceeds_packet
```

Atomic-task packet:

```yaml
packet_type: atomic-task
target:
single_action:
acceptance_check:
model_name:
context_length: 8k
predicted_token_usage:
max_output_tokens:
rollback_note:
escalation_rule: escalate_to_lead_when_more_than_one_action_is_required
```

## 6. Routing Rules

- Route to local LLM only when the work is H0 and has a bounded packet.
- Route through `qwen-cli` only when the model route is recorded by `FEAT-QWEN-CLI-MODEL-ROUTING`.
- Prefer local LLM for extraction, classification, one-line edits, checklist verification, and repetitive formatting.
- Do not route architecture, PRD interpretation, cross-repo integration decisions, or scope approval to local LLM.
- If a packet needs the full PRD, SDD, C4, or broad repo search, keep it at task/sub-task level and assign it to the lead agent.
- Local output is draft until verified by the lead agent, QA, or auditor.

## 7. Acceptance Criteria

- GoVibe has a canonical feature contract for quota-aware local LLM decomposition.
- The contract preserves lead-agent ownership of planning, review, and verification.
- Micro-task and atomic-task packets are bounded for 8k-16k local context windows.
- The contract explicitly supports RTX 3060 12GB VRAM as the current local hardware class without making it a hard product dependency.
- The contract rejects broad-context local execution and requires escalation.

## 8. Success Criteria

- Primary LLM quota is reserved for planning, architecture, review, and ambiguous work.
- Local LLMs can safely handle narrow H0 execution packets.
- Hallucination risk is reduced by limiting context, target, action count, and acceptance checks.
- Token prediction and actual telemetry can be compared after execution.

## 9. Definition Of Done

- Feature doc is registered in `docs/DOC-VERSION-REGISTRY.md`.
- `docs:validate` passes.
- Future implementation plans can cite this doc when creating local LLM packets.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.2 | 2026-08-19 | ATHER | Corrected abolished H-axis semantics per ADR-021/AUD-14 (TASK-PRD-022 sweep): §3 "Context Scaling Tier scale... ascending to H6" renamed "Access Scope scale... ascending to H4"; no status change. |
| 0.1.1 | 2026-06-20 | LYRA / ATHER | Signed off; promoted draft -> approved. |
| 0.1.1+draft | 2026-06-20 | LYRA / ATHER | Anchored H0/H1 context tiers to the canonical Context Scaling Tier scale in STD-Execution-Governance §3 and added it to related_docs. |
| 0.1.0+draft | 2026-06-16 | LYRA / ATHER | Added quota-aware local LLM decomposition contract for micro-task and atomic-task execution. |
