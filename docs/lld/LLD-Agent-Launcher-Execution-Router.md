---
title: "LLD: Agent Launcher Execution Router"
doc_id: "LLD-AGENT-LAUNCHER-EXECUTION-ROUTER"
status: "approved"
version: "0.1.2"
updated: "2026-06-20"
owner: "THESEUS"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/srs/SRS-Ollama-Sidecar-Execution.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
  - "docs/api/API-003-Mission-Workflow-Event-Schema.md"
---

# LLD: Agent Launcher Execution Router

## 1. Purpose

Describe the component-level logic for routing one GoVibe agent prompt into either Codex or Ollama without duplicating prompt-building behavior.

The router lives in `scripts/agents/invoke-agent.ps1` and consumes metadata produced by `scripts/agents/build-agent-prompt.mjs`.

## 2. Inputs and Outputs

| Name | Type | Required | Notes |
|---|---|---|---|
| Agent | string | No | Optional if scope has a preferred agent. |
| Scope | string | No | Used to resolve preferred agent and context packet. |
| Task | string | Yes | Human/operator request. |
| Mode | `doc \| plan \| audit \| atomic` | Yes | Ollama path allows `atomic` only in v1. |
| Executor | `codex \| ollama` | No | Falls back to registry defaults when omitted. |
| LocalModel | string | No | Overrides tier-based local model selection. |
| RetryLargerLocalModel | switch | No | Enables or confirms retry behavior on local failure. |
| OutputFormat | `text \| json` | No | Applies to local-sidecar response contract. |

## 3. Logic

```text
invoke-agent(input):
  call build-agent-prompt in JSON mode
  read executor policy from builder result
  resolve selected executor
  validate selected executor against mode, agent, and scope policy

  if executor == ollama:
    resolve local sidecar policy
    apply local maxFiles / maxCharsPerFile if caller did not override
    rebuild prompt with local bounds if needed
    resolve local model
    append local sidecar output contract instructions
    run ollama
    if empty/failure:
      retry once with retry-tier model
    if retry fails:
      return escalation text
    return local output

  else:
    run existing codex exec flow
    return codex output
```

## 4. Edge Cases

- No explicit executor and no scope/agent preference:
  - fall back to global default executor
- Executor allowed globally but blocked for mode:
  - fail fast with a clear message
- Scope policy says `atomic_only` and caller uses another mode:
  - fail fast before execution
- Local model override points to a missing model:
  - treat as local failure and enter retry path
- Retry tier equals primary tier:
  - do not loop; escalate directly after primary failure
- Builder result contains no local sidecar configuration:
  - fail fast because executor policy is incomplete

## 5. Dependencies

- `.agents/agent-registry.yaml`
- `scripts/agents/build-agent-prompt.mjs`
- `ollama` CLI
- `codex` CLI

## 6. Test Cases

| Case | Input | Expected |
|---|---|---|
| TC-001 | prompt builder JSON, atomic mode | builder returns prompt + executor metadata |
| TC-002 | executor `codex` | existing Codex path still runs |
| TC-003 | executor `ollama`, valid atomic call | local output is returned |
| TC-004 | executor `ollama`, non-atomic mode | launcher rejects with a policy error |
| TC-005 | executor `ollama`, invalid local model + retry model available | retry executes and either succeeds or returns escalation text |
| TC-006 | local wrapper THESEUS | wrapper invokes generic launcher with `ollama` and `atomic` defaults |

## 7. Traceability

- PRD system: `SYSTEM-05::Agent-Team-Management-System`
- SRS requirement: `SRS-OLLAMA-SIDECAR-EXECUTION`
- SDD component: launcher + integration bridge orchestration layer

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.2 | 2026-06-20 | THESEUS | Signed off; promoted draft -> approved (as-built, verified against current runtime code). |
| 0.1.1 | 2026-06-20 | THESEUS | Added Changelog footer; verified inputs and routing logic against `scripts/agents/invoke-agent.ps1` and `.agents/agent-registry.yaml` — the documented `Agent` input matches the launcher's `-Agent` parameter, no content change required. |
| 0.1.0 | 2026-06-13 | THESEUS | Initial agent launcher execution router design. |
