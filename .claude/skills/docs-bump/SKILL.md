---
name: docs-bump
description: Bump a governed GoVibe doc's version, recompute its content_hash, and propagate the change to the DOC-VERSION-REGISTRY + the doc's own changelog — all four places in one atomic step. Use whenever you edit a doc that has frontmatter with `doc_id` + `version` + `content_hash` (PRD, SDD, STD, ADR, FEAT, MASTERPLAN, ROADMAP, etc.). Wraps the existing `scripts/docs/bump-doc.mjs` and adds pre/post checks.
---

# docs-bump

## When to use
- **You edited a governed doc by hand** (any file with `doc_id` + `content_hash` in frontmatter).
- `baseline-check` (or the pre-commit hook) reports `Content drifted: body no longer matches content_hash`.
- `docs:validate` reports `Registry version mismatch`.

If the doc is **not** governed (no `doc_id` in frontmatter, not in `docs/DOC-VERSION-REGISTRY.md`),
do **not** use this skill — just commit the edit normally.

## What it does
The underlying `scripts/docs/bump-doc.mjs` atomically updates **four** places that must stay in
sync, in one transaction:

1. The doc's frontmatter `version` (e.g. `0.1.0+draft` → `0.1.1+draft`)
2. The doc's frontmatter `content_hash` (recomputed from the body)
3. A new row in the doc's own `## Changelog` table
4. The matching row in `docs/DOC-VERSION-REGISTRY.md` + the registry's own version/changelog

Doing any one of those by hand is the silent-drift surface this closes.

## Run

```bash
bash .claude/skills/docs-bump/scripts/bump.sh <file.md> <patch|minor|major> "<summary>"
```

Examples:
```bash
bash .claude/skills/docs-bump/scripts/bump.sh docs/roadmap/ROADMAP-hybrid-mvp.md patch "RM-005 done: live proof captured."
bash .claude/skills/docs-bump/scripts/bump.sh docs/adr/ADR-020-Per-Agent-Memory-Unit.md minor "Added LCA conflict resolution rule."
```

## Required body shape
The doc body **must** have a `## Changelog` section ending in a Markdown table; `bump-doc.mjs`
appends a new row above the previous newest. If the section is missing, the script errors with
`no Changelog section found.` — add the section (see references/changelog-template.md) and re-run.

## After the bump
1. `git status` will show the doc + `docs/DOC-VERSION-REGISTRY.md` modified.
2. `npm run docs:validate` should PASS.
3. Stage **both** files together (`git add <doc> docs/DOC-VERSION-REGISTRY.md`) — partial staging
   re-triggers the drift error.

## Don't do this
- Don't edit `content_hash` or `version` in frontmatter by hand. The script computes them.
- Don't append to the changelog table by hand. The script does it.
- Don't bump `docs/DOC-VERSION-REGISTRY.md` itself — `bump-doc.mjs` bumps the registry as a
  consequence of bumping any registered doc.

See `references/changelog-template.md` for the exact section shape every governed doc needs.
