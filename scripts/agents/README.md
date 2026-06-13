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
  -> optional codex exec
```

## Files

- `invoke-agent.ps1` - generic launcher
- `build-agent-prompt.mjs` - registry loader and prompt builder
- `run-theseus.ps1` - preset wrapper for THESEUS
- `run-lyra.ps1` - preset wrapper for LYRA
- `run-ather.ps1` - preset wrapper for ATHER

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

## Modes

- `doc` - full authoring/document context
- `plan` - planning-oriented context
- `audit` - adds verification/audit context
- `atomic` - reduced context for focused execution packets

## Notes

- The launcher reads current repo truth from `.agents/agent-registry.yaml`.
- `preferred_agent` is resolved automatically from the scope when `-Agent` is omitted in `invoke-agent.ps1`.
- `-InvokeCodex` uses `codex exec` with stdin prompt injection.
- Codex runtime warnings may still appear depending on the local Codex environment.
- The launcher intentionally does not auto-stage or auto-commit repository changes.
