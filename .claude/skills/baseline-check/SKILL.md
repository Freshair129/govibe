---
name: baseline-check
description: Run the GoVibe governance baseline gate (docs:validate + lint + build) and report any failures in actionable form. Use BEFORE committing substantive changes, BEFORE pushing, and AFTER doc edits to confirm the pre-commit hook will let the commit through. Equivalent to `npm run baseline:check` but with structured failure triage.
---

# baseline-check

## When to use
- Before a non-trivial commit, to confirm `[govibe] governance pre-commit gate` will pass.
- After editing any governed doc (frontmatter, content_hash, registry).
- After moving / renaming source files (path references may break).
- Before opening a PR.

## What it does (in order)
1. `npm run docs:validate` — frontmatter, required sections, path refs, content drift.
2. `npm run roadmap:validate` — Task Container completeness, dependency resolution, criteria testability.
3. `npm run lint` — `tsc --noEmit` with strict, no-unused-locals, no-unused-parameters.
4. `npm run build` — `vite build` (catches runtime import errors).

The first three already run in the pre-commit hook (`.githooks/pre-commit`); this skill adds
`build` and structured failure reporting.

## Run

```bash
bash .claude/skills/baseline-check/scripts/run.sh
```

The script returns exit 0 only if all four stages pass. If anything fails it prints which stage,
the first 30 lines of relevant output, and a fix hint.

## Common failures and fixes

| Failure | Likely cause | Fix |
|---|---|---|
| `Content drifted: body no longer matches content_hash` | edited a governed doc by hand | `node scripts/docs/bump-doc.mjs <file> --patch --summary "..."` (see skill `docs-bump`) |
| `Registry version mismatch` | bumped frontmatter without running `bump-doc.mjs` | revert frontmatter version, then run `bump-doc.mjs` |
| `Referenced path does not exist` | renamed/moved a file referenced from a doc | update the doc or `git mv` the file back |
| `Task Container 'X' has unresolved dependency 'Y'` | added a dep id that isn't in the same backlog | add Y or remove the dep line |
| `tsc` unused-locals | the gate flags unused imports/vars | remove the unused symbol; do **not** prefix with `_` |
| `vite build` import error | path/case-sensitivity mismatch | check the import path against the actual filename |

## Verification
After running this skill, the message `[govibe] governance gate passed.` from `git commit` is
the canonical proof that the gate accepts the change.
