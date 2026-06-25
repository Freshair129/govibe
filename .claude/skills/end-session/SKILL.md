---
name: end-session
description: Close a working session cleanly — write a session_end event to the agent's session_logs, append a handoff entry to the next agent (optional), and persist TODO + self-note for the next time. Use at the END of any non-trivial Claude Code session so the next session/agent can pick up exactly where you stopped. Composes existing GoVibe conventions in `.agents/<role>/session_logs/`, `.agents/<role>/handoff/`, and `.brain/{memory,session}/`.
---

# end-session

## When to use
- Before clearing context (`/clear`) or closing a session that produced real work.
- Before handing a task off to another agent or to a future Claude Code session.
- After a milestone (epic done, PR opened, release published) so traceability evidence is captured.

If the session did nothing material (no commits, no decisions, no blockers), you do not need to
end it formally — `git log` is sufficient.

## What it writes (atomic; only the fields you supply)

This skill composes **existing GoVibe conventions** — it does not introduce a new format:

| Path | Format | When written |
|---|---|---|
| `.agents/<role>/session_logs/<session_id>.jsonl` | append `{"type":"session_end","sessionId":...,"endTime":<ms>,"agent":"...","summary":"..."}` | always |
| `.agents/<role>/handoff/log.jsonl` | append `{"timestamp":"<iso>","from":"<agent>","to":"<to>","task_id":"<id>","status":"PENDING","priority":"...","message":"<summary>"}` | only if `--handoff-to` given |
| `.brain/memory/<agent>/TODO-SESSION-<iso>-<slug>.md` | full markdown TODO block | only if `--todo` given |
| `.brain/memory/<agent>/SELFNOTE-<iso>-<slug>.md` | self-note markdown | only if `--selfnote` given |
| `.brain/session/SESSION-<iso>-<slug>.md` | session summary markdown (mirrors existing convention) | always |

`<session_id>` is generated (UUID v4) if you don't pass `--session-id`. `<slug>` is derived from
the summary's first 6-8 words (kebab-case, ascii-safe). `<iso>` is `YYYY-MM-DDTHH-mm-ssZ`.

See `references/conventions.md` for the exact field shapes, escape rules, and a worked example.

## Run

```bash
bash .claude/skills/end-session/scripts/end.sh \
  --agent <agent_id> \
  --summary "<1-3 line session summary>" \
  [--role <role-folder>] \
  [--session-id <uuid>] \
  [--todo "<markdown TODO body>"] \
  [--selfnote "<markdown self-note body>"] \
  [--handoff-to "<agent1,agent2>"] \
  [--task-id "<TASK-ID>"] \
  [--priority HIGH|MEDIUM|LOW]
```

Required: `--agent` + `--summary`.

### Examples

End a Claude Code session that finished AI-firstify Phase A–D:
```bash
bash .claude/skills/end-session/scripts/end.sh \
  --agent claude-code \
  --role claude-code \
  --summary "AI-firstify Phase A-D landed: cleanup, bridges consolidated, 5 skills, all gates green. 20 commits this session." \
  --todo "- verify .claude/skills work in a fresh session\n- consider auto-cron for engine distillation\n- Thai/SEA GTM motion still open" \
  --selfnote "the .npmrc token-format bug bit me once; documented in memory now"
```

Hand work off to ATHER for audit:
```bash
bash .claude/skills/end-session/scripts/end.sh \
  --agent LYRA \
  --role pm \
  --summary "Roadmap reality-synced; engine published as hybrid-meter@0.1.0." \
  --handoff-to ATHER \
  --task-id "AUDIT-2026-06-25" \
  --priority MEDIUM
```

## How agent_id and role work
- **`--agent`** = the actor's identity (e.g. `LYRA`, `ATHER`, `claude-code`, `claude:opus-4.7`).
  Used as `from` in handoff, `agent` field in session_end event, and the `.brain/memory/<agent>/`
  subfolder name.
- **`--role`** = which `.agents/<role>/` folder to write session_logs/handoff into. Default is
  the same as `--agent` (lowercased). Use this when one actor wears multiple role hats — e.g.
  `--agent ARCHON --role cto`. Existing roles: `pm, tech_lead, cto, doc_writer, devops, backend,
  frontend, qa, auditor, executive assistant`. New role folders are created on first write.

> **Note:** `.agents/**/session_logs/` is gitignored (per AI-firstify Phase A); session traceability
> stays local. `.agents/**/handoff/log.jsonl` is tracked — handoff IS a coordination contract.
> `.brain/memory/` and `.brain/session/` are tracked unless your project gitignores them.

## What this skill does NOT do
- It does not call `/clear` for you — that's an explicit user action.
- It does not commit anything — run `baseline-check` then `git commit` separately if needed.
- It does not generate the session summary text — you supply it; the skill just files it.
- It does not look up agent IDs from `.agents/agent-registry.yaml` — you pass them; the skill
  trusts your input.

## Don't do this
- Don't pass a multi-paragraph essay as `--summary`. Keep it 1-3 lines so the handoff is scannable.
  Long context goes in `--todo` or `--selfnote`.
- Don't reuse a `session_id` across two physical sessions — the skill will append, but the jsonl
  events will read inconsistently.
- Don't write secrets into `--selfnote` or `--todo`. `.brain/memory/` is tracked unless you
  gitignore it.
