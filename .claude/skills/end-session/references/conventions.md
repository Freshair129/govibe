# Conventions composed by `end-session`

This skill does not invent a format — it composes existing GoVibe conventions verbatim. This
reference fixes them so the skill's writes round-trip with any existing reader (`runtime-core.mjs`,
mission-control snapshots, the multi-agent runbook).

## 1. Session jsonl event

**Path:** `.agents/<role>/session_logs/<session_id>.jsonl` (one file per session, append-only).

**Existing `session_start` event (verbatim from a real log):**
```json
{"type":"session_start","sessionId":"003c12b7-4a97-4cd9-b4cd-6f69f7c06490","startTime":1782139424960}
```

**This skill appends `session_end`:**
```json
{"type":"session_end","sessionId":"<uuid>","endTime":<epoch_ms>,"agent":"<agent_id>","summary":"<one-line>"}
```

Rules:
- `sessionId` matches the start event's `sessionId`. If no start event exists (skill called
  without `--session-id`), the skill generates a new UUID and the jsonl will have only an end event.
- `endTime` is `Date.now()` in ms (matches `startTime` units).
- `summary` is a single line — escape internal newlines.

## 2. Handoff event

**Path:** `.agents/<role>/handoff/log.jsonl` (one log per role, append-only, **tracked in git**).

**Existing handoff event (verbatim from devops/handoff/log.jsonl):**
```json
{"timestamp": "2026-06-13T14:45:00+07:00", "from": "THESEUS", "to": "JANUS", "task_id": "TASK-INFRA-FIX", "status": "PENDING", "priority": "HIGH", "message": "Local sidecar execution is encountering IO Pipe/Stream hanging issues..."}
```

Rules:
- `timestamp` is ISO 8601 with timezone offset (e.g. `+07:00`); the skill uses local tz.
- `from` is the session-ending agent. `to` may be a single id (`"ATHER"`) or comma-separated
  (`"LYRA,ARCHON,THESEUS"`) — both forms exist in the wild.
- `task_id` is free-form but conventionally `TASK-<topic>`, `CR-<date>-<topic>`, or
  `AUDIT-<date>-<topic>`.
- `status` ∈ {`PENDING`, `PENDING_REVIEW`, `SUCCESS`, `FAILED`, `BLOCKED`}.
- `priority` ∈ {`HIGH`, `MEDIUM`, `LOW`}.

## 3. TODO file

**Path:** `.brain/memory/<agent>/TODO-SESSION-<iso>-<slug>.md`

**Existing example (filename only — there is currently one flat file at .brain/memory/):**
`TODO-SESSION-2026-06-16T00-08-23+07-00-CoDev-CoVibe-Terminology-and-Executor.md`

The skill writes the same filename convention but under a per-agent subfolder so multiple agents
can accumulate notes without colliding. The `<iso>` uses `-` separators in the time portion (no
colons) so the filename is filesystem-safe on Windows.

**Body shape (markdown):**
```markdown
# TODO — session ended <iso>
**Agent:** <agent>   **Session:** <session_id>

<the markdown body the skill received via --todo, verbatim>
```

## 4. Self-note file

**Path:** `.brain/memory/<agent>/SELFNOTE-<iso>-<slug>.md`

Same shape as TODO; intended for the agent's own reminders (gotchas, observations, "things I
learned this session").

## 5. Session summary file

**Path:** `.brain/session/SESSION-<iso>-<slug>.md`

**Existing examples:**
- `SESSION-2026-06-16T00-08-23+07-00-CoDev-CoVibe-Terminology-and-Executor.md`
- `SESSION-2026-06-21-Draft-Doc-Conflict-Refinement-And-Signoff.md`

**Body shape (markdown):**
```markdown
# Session: <slug>
**Date:** <iso>
**Agent:** <agent>
**Session ID:** <session_id>

## Summary
<summary, verbatim from --summary>

## Handoff
- to: <handoff_to or "none">
- task_id: <task_id or "n/a">
- priority: <priority or "n/a">

## Files referenced
<git log --oneline since this session's start, if --session-id matches a start event>
```

## 6. Slug derivation

From the summary text:
1. Lowercase.
2. Replace anything that isn't `[a-z0-9]` with `-`.
3. Collapse runs of `-` to a single `-`. Trim leading/trailing `-`.
4. Truncate to 8 words (joined by `-`), then to 60 characters.

Example: `"AI-firstify Phase A-D landed: 5 skills, all gates green."` → `ai-firstify-phase-a-d-landed-5-skills`

## 7. UUID generation

Node's built-in: `crypto.randomUUID()` (v4). 36-char canonical with hyphens.
