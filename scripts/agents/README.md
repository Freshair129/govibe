# Agent Launcher Scripts

This folder provides a lightweight launcher layer for GoVibe agent contracts.

The source of truth for context injection is:

- `.agents/agent-registry.yaml`

The launcher pipeline is:

```text
scope + task
  -> registry lookup
  -> global context
  -> role contract
  -> scope context
  -> prompt build
  -> optional executor route
```

## Files

- `invoke-agent.ps1` - generic launcher
- `build-agent-prompt.mjs` - registry loader and prompt builder
- `run-theseus.ps1` - preset wrapper for THESEUS
- `run-lyra.ps1` - preset wrapper for LYRA
- `run-ather.ps1` - preset wrapper for ATHER
- `run-theseus-local.ps1` - Ollama atomic wrapper for THESEUS
- `run-lyra-local.ps1` - Ollama atomic wrapper for LYRA
- `run-ather-local.ps1` - Ollama atomic wrapper for ATHER

## Generic Usage

Build prompt only:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\invoke-agent.ps1" `
  -Agent theseus `
  -Scope "docs/features/agent-team" `
  -Task "Normalize agent-team into a system-level FEAT" `
  -Mode doc `
  -AsJson
```

Invoke Codex directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\invoke-agent.ps1" `
  -Agent theseus `
  -Scope "docs/features/agent-team" `
  -Task "Normalize agent-team into a system-level FEAT" `
  -Mode doc `
  -InvokeCodex `
  -Ephemeral
```

Invoke Ollama sidecar directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\invoke-agent.ps1" `
  -Agent theseus `
  -Scope "docs/features/agent-team" `
  -Task "Summarize the workflow deltas as an atomic task" `
  -Mode atomic `
  -Executor ollama `
  -RetryLargerLocalModel
```

## Preset Wrappers

### THESEUS

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-theseus.ps1" `
  -Scope "docs/features/agent-team" `
  -Task "Normalize agent-team into a system-level FEAT" `
  -Mode doc `
  -InvokeCodex `
  -Ephemeral
```

### LYRA

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-lyra.ps1" `
  -Scope "docs/features/project-roadmap" `
  -Task "Create a roadmap decomposition for the current system" `
  -Mode plan `
  -InvokeCodex `
  -Ephemeral
```

### ATHER

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-ather.ps1" `
  -Scope "docs/features/agent-team" `
  -Task "Audit system-level feature docs for SSOT drift" `
  -Mode audit `
  -InvokeCodex `
  -Ephemeral
```

### THESEUS Local

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-theseus-local.ps1" `
  -Scope "docs/features/agent-team" `
  -Task "Summarize the workflow deltas as an atomic task" `
  -RetryLargerLocalModel
```

### LYRA Local

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-lyra-local.ps1" `
  -Scope "docs/features/project-roadmap" `
  -Task "Decompose this roadmap item into atomic tasks only" `
  -RetryLargerLocalModel
```

### ATHER Local

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-ather-local.ps1" `
  -Scope "docs/features/agent-team" `
  -Task "Audit this single workflow spec for drift" `
  -RetryLargerLocalModel
```

## Modes

- `doc` - full authoring/document context
- `plan` - planning-oriented context
- `audit` - adds verification/audit context
- `atomic` - reduced context for focused execution packets

## Executors

- `codex` - default lead-orchestrator executor
- `ollama` - bounded local sidecar executor for atomic work only

Local sidecar defaults come from `.agents/agent-registry.yaml`:

- tiny checks/classify: `llama3.2:1b`
- default atomic docs/code/checklist work: `qwen3.5:4b`
- retry tier: `gemma4:e2b`

## Notes

- The launcher reads current repo truth from `.agents/agent-registry.yaml`.
- `preferred_agent` is resolved automatically from the scope when `-Agent` is omitted in `invoke-agent.ps1`.
- `-InvokeCodex` uses `codex exec` with stdin prompt injection.
- `-Executor ollama` uses `ollama run` with the same prompt-building path and the atomic context policy from the registry.
- Local sidecars are intentionally bounded to atomic-mode context in v1.
- Local sidecar output is expected to include task summary, assumptions or blockers, files inspected, and recommended next step.
- Codex runtime warnings may still appear depending on the local Codex environment.
- The launcher intentionally does not auto-stage or auto-commit repository changes.
