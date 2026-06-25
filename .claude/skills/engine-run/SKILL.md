---
name: engine-run
description: Run hybrid-meter against a target repo end-to-end — plan with a frontier model, execute on a local SLM, gate the output through L0 deterministic + L2 frontier review, render the cost meter. Use to ship a task into ANY repo (not just GoVibe) with the hybrid cost-wedge active. Wraps `node engine/hybrid-meter/cli.mjs run --repo`.
---

# engine-run

## When to use
- You want to apply a task to a repo using the GoVibe hybrid loop.
- You want a real cost-meter readout for a multi-task plan.
- You want to validate the L0 gate is catching deterministic failures before the paid reviewer.

## Prerequisites
Run the `engine-doctor` skill first; do not proceed unless it reports **Ready: yes** (or you
intentionally want a degraded paid run).

## What it does
For one `--repo PATH`, in order:

1. `summarizeRepo` — sniffs the target's stack (Cargo / src-tauri / package.json / pyproject /
   requirements.txt) and writes a 1-line summary used by the planner.
2. `planTasks` — frontier model (default `claude:opus`) atomizes the user's freeform task into
   engine tasks with `{id, title, type, accept, deps}`.
3. Detect language → pick a configured local model from `config.localModelByLang` (e.g. Rust →
   `gemma4-rust-coder`, TS/JS → `qwen3`).
4. Detect L0 checks for the target stack — `cargo build --quiet` / `npx tsc --noEmit` / `npm run -s
   lint|build` — and run them after each worker output. L0 fails route to rework at $0.
5. Per task: route → execute on local SLM ($0 on-device) → L0 gate → L1 SLM escalate-only filter
   (if enabled, low-stakes tasks may skip the paid reviewer) → L2 frontier review → done.
6. Apply the resulting diff to the target repo. Engine board/state/usage stay anchored to
   `engine/orchestration/` (not the target).
7. Render the cost meter over `engine/orchestration/usage.jsonl` — savings %, on-device %, review
   tax, and L0-averted line.

## Run

```bash
node engine/hybrid-meter/cli.mjs run "<task>" --repo "<path>" [--max N] [--exec-model provider:model]
```

Examples:
```bash
# Real run on a real repo, capped at 1 task to limit blast radius:
node engine/hybrid-meter/cli.mjs run "Add a /health endpoint to the sidecar" \
  --repo "C:/myproject" --max 1

# Pin a specific local model (override per-language routing):
node engine/hybrid-meter/cli.mjs run "Refactor the auth flow" \
  --repo "/path/to/repo" --exec-model ollama:qwen3:latest
```

## Reading the meter (final output)
```
=== hybrid run ===
task : Add a /health endpoint to the sidecar
repo : stack: Node:app, React | top-level dirs: ...
local model : typescript -> ollama:qwen3:latest (per-language routing)
target repo : C:/myproject
L0 gate     : npm run -s lint

planned 1 tasks via claude:opus ($0.0740)
  T1 [code] Add GET /health route in sidecar-server.mjs

▶ T1 [ollama:qwen3:latest] Add GET /health route in sidecar-server.mjs
  → done

--- this run ---
plan (frontier) : $0.0740
execute+review  : $0.6397   (1/2 runs on-device at $0)

GoVibe · Hybrid Cost Meter  2 runs
  ~$0 saved (≈0%, est.)   50% on-device · $0   100% code local
  produce/plan $0.00  ·  review $0.64 (100% = next lever)
```

If the meter shows `~$0 saved (≈0%)` on a 1-task run, that's expected — savings need ≥3-5 tasks
per frontier review to amortize the review tax. Use the `savings-report.mjs` for steady-state numbers.

## Don't do this
- Don't run without `--repo` on this repo — engine will self-target, which can rewrite the engine
  itself.
- Don't omit `--max N` on a new repo until you've sized the plan — the planner can emit 10+ tasks
  for a vague prompt.
- Don't claim "saved $X" without showing the meter output — the README hero number is an estimate.

## Verification after the run
- `git -C <target-repo> diff --stat` — real code change landed.
- `node engine/orchestration/savings-report.mjs` — review-tax %, L0-averted, on-device share.
- `engine/orchestration/brain/failures.jsonl` (gitignored) — failure lessons accumulated.
