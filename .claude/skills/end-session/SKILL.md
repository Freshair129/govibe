---
name: end-session
description: Wrap up the current GoVibe working session — write a session summary to .brain/session/, refresh the rolling self-note at .brain/memory/todo-next.md, reconcile CLAUDE.md/AGENTS.md against real repo state, verify a clean tree, and commit/push only if asked. Use when the user says "end session", "wrap up", "ปิด session", or signals the work should be recorded for the next session.
---

# End Session (GoVibe)

Close out the current session by persisting durable memory so the **next** session resumes
with full context. Adapted 2026-07-19 from the G-Maiden end-session protocol (proven over
30+ sessions) as part of the RWANG↔GoVibe unification — this revives `.brain/`, which had
been orphaned since 2026-06-19.

Run these steps in order. Skip a step only if it clearly does not apply, and say so.

## 1. Write a session summary → `.brain/session/`

Create `.brain/session/<YYYY-MM-DD>[-<B/C…>]-<short-slug>.md` (lowercase date-slug). Never
overwrite a prior session's record — add a `-B`/`-C` suffix for same-day sessions. Include:

- **Entry point** — one line: what the session started from.
- **Arc** — narrative of what happened and *why*: decisions, the user's corrections,
  dead-ends, gotchas — not just a changelog.
- **สิ่งที่ทำ** — grouped by file/area, with commit hash if committed (else "uncommitted").
- **Verify** — gates actually run (`npm run docs:validate`, `npm run lint`, `npm test`,
  `npm run baseline:check`) with real pass/fail — never claim a gate that wasn't run.
- **State ปลาย turn** — branch, working-tree state, honest pending/deferred list.

> Note: the legacy `SESSION-<ISO8601>-Title.md` format (YAML gate/PIC blocks) is still valid
> for multi-agent fleet runs — the narrative core above is the mandatory part either way.

## 2. Refresh the rolling self-note → `.brain/memory/todo-next.md`

This is a **single rolling file** (not one-per-session — the old `TODO-SESSION-*` files are
frozen history, leave them). Update it:

- Bump the "อัปเดตล่าสุด: <YYYY-MM-DD>" line + one-line reason.
- Mark finished items **DONE** (keep the trail).
- Add hard-won facts / "do not repeat" corrections discovered this session.
- Keep a **ranked "highest-leverage next work"** list.
- Convert relative dates to absolute. Don't duplicate what git already records.

## 3. Reconcile the shared-context files (CLAUDE.md / AGENTS.md)

Audit against **actual repo state** (verify, don't trust memory): versions claimed vs real,
sections describing removed/renamed things, new merged capabilities missing. Report drift as
a short list; **fix only when the user asks** — otherwise record in todo-next.md.
Known past example: AGENTS.md §3 taught H0-H6 for weeks after STD 2.3.0 abolished H5/H6.

## 4. Verify state, then commit & push ONLY if asked

- `git status` — confirm the tree is clean except intended leftovers. `.brain/` is
  git-tracked; brain writes show up as changes.
- Registry rule: if any governed doc changed this session, `npm run docs:validate` must pass
  before commit (registry row + frontmatter + changelog all synced).
- Commit only on explicit ask; logically-grouped commits; never push without an ask.

## 5. Confirm and close

Short close-out: paths written · live/irreversible actions taken · commit range ·
shared-context drift found · top 1–3 next-session items from todo-next.md.

## Notes

- Be honest: failed gates, skipped steps, unverified claims go in as-is.
- The canonical Execution Governance standard (C/H/W, Access Scope H0-H4) lives in
  **RWANG PROMAX** `references/EXECUTION-GOVERNANCE.md`; `docs/STD-Execution-Governance.md`
  here is a mirror.
