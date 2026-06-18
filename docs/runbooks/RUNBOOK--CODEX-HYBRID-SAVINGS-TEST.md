---
title: "RUNBOOK — Codex Hybrid Savings Test"
doc_id: "RUNBOOK-CODEX-HYBRID-SAVINGS-TEST"
version: "0.1.1"
updated: "2026-06-19"
status: "active"
owner: "JANUS"
type: "runbook"
---

# RUNBOOK — Codex Hybrid Savings Test

Use this when you want to compare:

- Codex-only flow: plan + coding + output
- Hybrid flow: Codex plan + local coding + Codex review + Codex hotfix

This runbook uses the current GoVibe launcher scripts as the source of truth for prompt footprint estimates.

## What this measures

1. Estimated prompt footprint from the current launcher system
2. Estimated API-style cost proxy using input/output token assumptions
3. Optional observed Codex usage reduction if you manually record `Usage remaining` before and after each run

## Command

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\measure-codex-hybrid-savings.ps1"
```

## Short wrapper: 4 numbers per round

If you do not want to enter all 8 before/after values at once, use the round recorder.

Round 1:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\record-codex-hybrid-round.ps1" `
  -SessionId "a2-test-01" `
  -MicrotaskId "MT-A2-04" `
  -Flow "codex-only" `
  -DailyBefore 52 `
  -DailyAfter 49 `
  -WeeklyBefore 64 `
  -WeeklyAfter 61
```

Round 2:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\record-codex-hybrid-round.ps1" `
  -SessionId "a2-test-01" `
  -MicrotaskId "MT-A2-04" `
  -Flow "hybrid" `
  -DailyBefore 52 `
  -DailyAfter 50 `
  -WeeklyBefore 64 `
  -WeeklyAfter 62
```

Rules:

- Use the same `SessionId` for both rounds.
- Each run only needs 4 numbers: daily before/after and weekly before/after.
- The wrapper stores local state in your temp folder, not in the repo.
- Add `-Reset` on a run if you want to throw away the previous stored round for that session.

## Interactive one-script flow

If you want a single script that:

1. asks for `before` values,
2. runs the selected flow automatically,
3. asks for `after` values,
4. asks for `model`, `mode`, and `context window tokens used`,
5. records the round and prints the comparison when both flows exist,

use:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\run-codex-savings-round.ps1"
```

What it runs:

- `codex-only`
  - Codex plan via `run-lyra.ps1`
  - Codex coding via `invoke-agent.ps1`

- `hybrid`
  - Codex plan via `run-lyra.ps1`
  - local coding via `run-vibe-microtask-local.ps1`
  - Codex review via `invoke-agent.ps1`
  - Codex hotfix via `invoke-agent.ps1`

Notes:

- The script records one flow per run.
- Use the same `SessionId` for the `codex-only` run and the `hybrid` run.
- `Context window tokens used` is stored as manual evidence from the Codex UI.
- For fast experiments, you can skip some hybrid steps with optional switches such as `-SkipReview` or `-SkipHotfix`.
- The launcher resolves Codex Desktop from `%LOCALAPPDATA%\OpenAI\Codex\bin` when the double-click shell does not inherit the Codex PATH entry.
- The resolved executable is propagated through `CODEX_EXE` so LYRA, VIBE, and ATHER subprocesses use the same CLI binary.

## Changelog

| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 0.1.1 | 2026-06-19 | active | Documented Codex Desktop fallback discovery and subprocess propagation. | pending | ATHER |
| 0.1.0 | 2026-06-19 | active | Added the initial Codex-only versus hybrid savings test workflow. | aad75cd | JANUS |

## Optional manual quota comparison

If you want to compare the Codex UI `Usage remaining` values directly, record:

- Codex-only before
- Codex-only after
- Hybrid before
- Hybrid after

Then pass them to the script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "G:\govibe\scripts\agents\measure-codex-hybrid-savings.ps1" `
  -CodexOnlyDailyBefore 74 `
  -CodexOnlyDailyAfter 70 `
  -HybridDailyBefore 74 `
  -HybridDailyAfter 72 `
  -CodexOnlyWeeklyBefore 68 `
  -CodexOnlyWeeklyAfter 64 `
  -HybridWeeklyBefore 68 `
  -HybridWeeklyAfter 66
```

## Interpretation

- Estimated savings uses prompt/token proxies and output token assumptions.
- Observed savings uses the delta from the Codex UI remaining percentages.
- Estimated savings and observed savings do not have to match exactly.
- Observed savings is the stronger signal for plan quota behavior.

## Current caveats

- OpenAI does not publicly document Codex plan quota accounting as a simple token formula.
- Cached input may affect provider-side billing, but this runbook does not assume it reduces plan quota directly.
- The local coding step can reduce provider billing while still increasing Codex input reads during review and hotfix.
