---
title: "SEQ: Ollama Sidecar Flow"
doc_id: "SEQ-OLLAMA-SIDECAR-FLOW"
status: "draft"
version: "0.1.0"
updated: "2026-06-13"
owner: "THESEUS"
source_of_truth: false
source_prd: "docs/PRD-GoVibe-Platform-Overview.md"
related_docs:
  - "docs/srs/SRS-Ollama-Sidecar-Execution.md"
  - "docs/lld/LLD-Agent-Launcher-Execution-Router.md"
  - "docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md"
---

# SEQ: Ollama Sidecar Flow

## 1. Purpose

Show the runtime interaction flow for bounded Ollama sidecar execution inside the GoVibe multi-agent workflow.

## 2. Sequence Flow

```mermaid
sequenceDiagram
    participant Human as Human or Lead Agent
    participant Launcher as invoke-agent.ps1
    participant Builder as build-agent-prompt.mjs
    participant Registry as agent-registry.yaml
    participant Ollama as Ollama CLI
    participant Codex as Codex Lead Orchestrator

    Human->>Launcher: run local atomic task
    Launcher->>Builder: build prompt in JSON mode
    Builder->>Registry: resolve agent, scope, mode, context
    Registry-->>Builder: prompt context + executor policy
    Builder-->>Launcher: prompt + execution metadata
    Launcher->>Launcher: validate ollama + atomic policy
    Launcher->>Ollama: ollama run <default local model>
    alt local output succeeds
        Ollama-->>Launcher: bounded 4-section result
        Launcher-->>Human: local sidecar result
    else local output fails or is empty
        Launcher->>Ollama: ollama run <retry model>
        alt retry succeeds
            Ollama-->>Launcher: bounded 4-section result
            Launcher-->>Human: retry result
        else retry fails
            Launcher-->>Codex: structured escalation handoff
            Codex-->>Human: higher-context follow-up path
        end
    end
```

## 3. Runtime Notes

- Codex remains the lead orchestrator.
- Ollama is a bounded sidecar executor for `atomic` mode only in v1.
- The prompt builder remains shared between Codex and Ollama paths.
- Registry policy decides executor defaults, local bounds, and model tiers.

## 4. Traceability Matrix

| PRD/SRS Requirement | Container | Component | Supporting Doc |
|---|---|---|---|
| bounded local sidecar execution | launcher scripts | execution router | `docs/lld/LLD-Agent-Launcher-Execution-Router.md` |
| shared prompt-building path | launcher scripts | prompt builder | `docs/srs/SRS-Ollama-Sidecar-Execution.md` |
| retry and escalation flow | multi-agent workflow | local sidecar executor | `docs/runbooks/RUNBOOK-GoVibe-Multi-Agent.md` |
