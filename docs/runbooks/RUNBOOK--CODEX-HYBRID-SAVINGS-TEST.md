---
title: "RUNBOOK — Codex Hybrid Savings Test"
doc_id: "RUNBOOK-CODEX-HYBRID-SAVINGS-TEST"
version: "0.1.0"
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
