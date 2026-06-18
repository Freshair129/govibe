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
- `run-vibe-microtask-local.ps1` - strict Ollama microtask wrapper for VIBE A2 parity work
- `run-qwen-agent-review.ps1` - shared-context wrapper for bounded qwen-cli / OpenRouter review

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

### VIBE Local Microtask

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-vibe-microtask-local.ps1" `
  -TaskId "MT-A2-01" `
  -Profile "balanced"
```

This wrapper is stricter than the generic Ollama launcher:

- injects real file contents for the assigned A2 microtask
- strips `<think>` blocks and terminal ANSI noise
- validates the VIBE output contract
- returns `BLOCKED` if the local model drifts outside the required microtask shape

Profiles:

- `fast` -> `qwen3.5:4b` for cheap bounded checks
- `balanced` -> `sushirl:latest` as the default UI microtask profile
- `ui-heavy` -> `qwen3:latest` for heavier layout/context reasoning

You can still override the exact model directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-vibe-microtask-local.ps1" `
  -TaskId "MT-A2-03" `
  -Model "sushirl:latest"
```

## Modes

- `doc` - full authoring/document context
- `plan` - planning-oriented context
- `audit` - adds verification/audit context
- `atomic` - reduced context for focused execution packets

## Executors

- `codex` - default lead-orchestrator executor
- `ollama` - bounded local sidecar executor for atomic work only
- `qwen-cli` - bounded external review executor using shared context packets

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

## Qwen Shared Context Review

Use this when GoVibe needs an external model opinion without losing governance context:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-qwen-agent-review.ps1" `
  -Role "JANUS / ATHER" `
  -Mode git `
  -Task "Audit current git state and recommend safe cleanup"
```

The wrapper loads:

- `AGENTS.md`
- `AGENT.md`
- `.agents/context/shared/CONTEXT-GoVibe-Shared-External-Agent.md`
- `.agents/context/CONTEXT-Bounded-External-Executor.md`
- `.agents/context/shared/CONTEXT-GoVibe-Git-Hygiene.md` when the task is git-related

Qwen output remains draft evidence. It cannot approve scope, release, architecture, or destructive cleanup.
