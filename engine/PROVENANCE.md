# Engine Provenance — G-orchestra (forked)

This `engine/` directory is **GoVibe's own fork** of the G-orchestra hybrid-orchestration
engine. From this point on, GoVibe develops it independently; G-Maiden keeps its own copy and
evolves it separately. The two are no longer the same codebase.

## Source

- **Forked from:** `G:\G-Maiden\` — folders `orchestration/` and `hybrid-meter/`
- **Source commit:** `86c8141` on branch `chore/hybrid-cost-meter` (plus uncommitted working-tree
  changes that carried the RM-003 / RM-004 work below)
- **Fork date:** 2026-06-25
- **Roadmap reference:** `docs/roadmap/ROADMAP-hybrid-mvp.md` — the "G-orchestra engine" this
  roadmap says to *package, not rebuild*.

## What this fork carries (PHASE-HYB-02 work already applied)

- **RM-003** — `hybrid-meter run "<task>"` subcommand wired in `hybrid-meter/cli.mjs` (drives
  `orchestration/run.mjs` then renders the cost meter over `orchestration/usage.jsonl`).
- **RM-004** — repo-agnostic prompts: `orchestration/engine.mjs` `buildPrompt` reads a new
  `project` block from `orchestration/config.json` (with fallbacks); `planner.mjs` axum
  detection bug removed.

## What was intentionally NOT forked

Excluded to keep the engine lean and to avoid polluting GoVibe's Docs-First governance:

- `orchestration/docs/` (~22 MB of G-Maiden Dota2 architecture docs)
- `orchestration/logs/`, `orchestration/brain/`, `state.json`, `usage.jsonl` (gitignored runtime
  artifacts)
- `orchestration/poc/`, `r4_results.json`, `bench2.py`, `bench_r4.py` (benchmark scratch)

## G-Maiden couplings still present — to neutralize as GoVibe develops the fork

These are inherited from the source and are **not yet generalized for GoVibe**:

- `orchestration/config.json` → `project` block still holds G-Maiden values (name, repoRoot
  `G:/G-Maiden`, Rust/Tauri stack). Repoint to GoVibe / make it detected.
- `orchestration/config.json` + `store/knowledge.mjs` → GenesisDB `bindingPath`
  `G:/GenesisBlock_Dev/...` (best-effort; degrades silently if absent).
- `orchestration/backlog.json` → sample tasks are G-Maiden Dota2 work, not GoVibe scope.
- `orchestration/providers.mjs` → OpenRouter `HTTP-Referer` / `X-Title` reference G-Maiden.
- `orchestration/vram-mode.mjs` → Dota2/game VRAM assumptions and a hardcoded local Ollama path.
- `orchestration/config.json` → `coder` role preferred list contains Rust-tuned local SLMs.

## Integration notes for GoVibe

- The engine is plain Node ESM (`.mjs`); it is **not** compiled by GoVibe's `tsc` (`npm run lint`)
  and its tests are not under `scripts/**`, so it does not interfere with the existing
  build/lint/test gates.
- `engine/orchestration/.gitignore` is preserved so runtime artifacts stay untracked here too.
- Before committing on a Docs-First branch, check `npm run diff:check` — new source under
  `engine/` may need a governance note or registry entry.
