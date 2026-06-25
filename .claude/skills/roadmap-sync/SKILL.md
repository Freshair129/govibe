---
name: roadmap-sync
description: Reality-sync a roadmap doc — verify each task's claimed status against actual git/test evidence, then bump the roadmap via docs-bump. Use after a sprint, after a backlog item lands, or before a stakeholder update. Prevents roadmaps from claiming tasks are "done" when commits/tests don't back the claim.
---

# roadmap-sync

## When to use
- A backlog item / sprint / phase just landed (or just slipped) — the roadmap should reflect it.
- Before a stakeholder update or PR description that cites roadmap progress.
- After a "honest metric" event: live proof captured, benchmark recorded, a partial slice shipped.

The skill enforces the **reality check** rule from `AGENTS.md`: a roadmap may **not** mark a task
`done` unless there is concrete evidence (commit hash, test pass, deployment artifact). Aspirational
status is recorded as `in_progress` with a percentage.

## What it does (in order)
1. **Verify evidence.** For each task whose status will move toward `done`, confirm at least one of:
   - a commit/PR that implements it (referenced in the Acceptance / UI Traceability column),
   - a test result that asserts the acceptance (e.g. `node --test ...test.mjs`),
   - a deployment artifact (e.g. npm tarball URL, build URL).
2. **Update the doc.** Edit the Phases / Sprints / Backlog Items / Task Breakdown / Acceptance
   Criteria tables to match the verified evidence. Mark partials as `in_progress` with a real %.
3. **Append an honest-metric note** if the work shipped but the headline number is unflattering
   (e.g. "~0% saved because review tax dominated on a 1-task run"). Don't hide it.
4. **Bump via `docs-bump`** — version + content_hash + changelog + registry all in sync.
5. **Verify** `npm run docs:validate` PASSES.

## Run

```bash
# Roadmap doc whose body you've already edited to match reality:
bash .claude/skills/docs-bump/scripts/bump.sh \
  docs/roadmap/ROADMAP-<slug>.md <patch|minor|major> "<one-line summary of what changed>"
```

This skill is mostly judgement: the mechanical step is the `docs-bump` wrap above. The judgement
is **what counts as evidence** and **what to write in Acceptance Criteria notes** — see the
patterns below.

## Patterns to follow (from real session evidence)

- ✅ "RM-005 V1 proof: live run 2026-06-25: plan claude:opus $0.074 -> execute ollama:qwen3 ($0,
  on-device) -> Verify Gate -> real `add()` diff in external repo; meter 50% on-device, 100% code
  local"  ← exact cost numbers, dated, names the model, names the artifact.
- ✅ "Honest-metric note: on the trivial single-task proof, savings were ~0% because the frontier
  Verify-Gate review ($0.64) dominated a $0 on-device execute — the review tax is the next lever."
  ← admits the unflattering number, names the next lever.
- ✅ "Live: `recordOutcome` tags each lesson with tier + role; `distill` is invokable on the real
  failure-log via `store.distillRole(role)` and the `orchestrator distill [role]` CLI."  ← names
  the actual function + the CLI surface, not just "feature done".
- ❌ "RM-005 done" with no evidence — would fail the rule.
- ❌ Marking phase `done` when only contracts/tests are in place but live integration isn't —
  use `in_progress` with a real % and list what's left.

## Don't do this
- Don't bump the roadmap version without first editing the body to match evidence.
- Don't mark `done` based on a contract or test alone if the spec also requires live integration.
- Don't strip an honest-metric note to make the roadmap look better — it survives across versions
  in the changelog and is the project's credibility.
