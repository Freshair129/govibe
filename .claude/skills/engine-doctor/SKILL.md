---
name: engine-doctor
description: Probe whether the hybrid-meter engine can run end-to-end on this machine — is Ollama up? are local models pulled? is a frontier provider enabled? Reports ready / degraded / not-ready with concrete fix steps. Use BEFORE the first `hybrid-meter run`, after a fresh checkout, or when troubleshooting a failed run.
---

# engine-doctor

## When to use
- First-time setup on a new machine.
- After a fresh `git clone` of the repo (or `npm install -g hybrid-meter`).
- A `hybrid-meter run "..."` failed with a provider / model error and you don't know which side is broken.
- Before a benchmarking session — you want to confirm both the frontier planner and local executor are reachable.

## What it checks
1. **Ollama reachable** — pings `http://127.0.0.1:11434/api/tags` with a 4-second timeout.
2. **Local model pulled** — counts how many models Ollama has; warns if zero.
3. **Frontier provider enabled** — checks `engine/orchestration/config.json` for any of
   `claude`, `codex`, `openrouter`, `antigravity` with `enabled: true`.
4. **Ready state** — `ready` (both halves up), `degraded` (frontier-only, paid), or `not-ready`
   (no path forward).

## Run

```bash
node engine/orchestration/orchestrator.mjs doctor
```

Or via the wrapper script (same thing but prints the next-step hints inline):

```bash
bash .claude/skills/engine-doctor/scripts/doctor.sh
```

## Reading the output

```
hybrid-meter doctor
Ollama   : reachable  (40 local models)
Frontier : enabled
Ready    : yes
```

| Output | Meaning | Next step |
|---|---|---|
| `Ready: yes` | both halves work | proceed to `engine-run` |
| `Ready: degraded (frontier-only, paid)` | local SLM missing; runs will all be paid | `ollama pull qwen3` then re-doctor |
| `Ready: no` | no frontier provider configured | install the `claude` CLI on PATH, or set an API key in config |
| `Ollama: NOT reachable` | Ollama isn't running | install/start from <https://ollama.com> |
| no local model listed | Ollama up, nothing pulled | `ollama pull qwen3:latest` (or the language-specific coder in `config.localModelByLang`) |

## Why this exists
The engine degrades gracefully — `summarizePreflight` in `engine/orchestration/preflight.mjs`
never throws, and `run.mjs` will fall back to frontier-only execution if local is missing. This
skill makes the silent degradation **explicit** so you don't accidentally rack up paid runs that
you thought were going to a local model.
