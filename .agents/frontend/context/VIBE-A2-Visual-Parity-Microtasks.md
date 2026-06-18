---
title: "VIBE Context: A2 Visual Parity Microtasks"
doc_id: "CTX-VIBE-A2-VISUAL-PARITY-MICROTASKS"
status: "active"
version: "0.1.0"
updated: "2026-06-18"
owner: "VIBE"
source_of_truth: false
---

# VIBE Context: A2 Visual Parity Microtasks

## Purpose

This packet adapts the codegen microtask runner idea to the GoVibe A2 Roadmap Board so a local 9B-class frontend agent can work safely on small, verifiable slices.

The 9B agent is a worker, not the decider.

## Worker policy

The local frontend agent must follow these constraints:

1. Change only the files named in the assigned microtask.
2. Do not add or change runtime schema in `src/mission.ts`.
3. Do not invent new roadmap fields or fake live data.
4. If template detail has no runtime source yet, render `unavailable` or disabled UI.
5. Keep C4 untouched.
6. Prefer one behavior change per microtask.
7. Stop and escalate if the task requires:
   - new task container schema
   - new backend transport fields
   - cross-domain refactor
   - changes outside A2 scope

## Verification gate

Every microtask must pass:

- `npm run lint`
- `npm run build`
- `npm run diff:check`

If code changes trigger the diff guard, update only the smallest relevant design doc.

## Worker output contract

The 9B worker must answer in this exact shape:

```markdown
### VIBE Frontend Output

**Task ID:** [id]
**Scope:** [single microtask only]
**Complexity:** C-1 | C-2
**Risk:** LOW | MEDIUM

Summary:
- [smallest safe change]
- [files to edit]
- [why no schema change is needed]

Implementation Plan:
1. ...
2. ...
3. ...

Blockers:
- none

Verification:
- npm run lint
- npm run build
- npm run diff:check
```

If the worker cannot stay within scope, it must output `BLOCKED` instead of inventing detail.

## Current truth before assignment

- A2 header wording and semantic counts already match the approved GoVibe template contract.
- A2 header now includes live `Export` and `Reset Board` behavior from approved roadmap snapshot data.
- A2 now includes the sprint shell fallback, denser task rows, and an expandable task detail skeleton with explicit unavailable placeholders.
- The remaining parity gap is mainly richer runtime-backed task-container data, mobile polish, and small code-quality cleanup, not new roadmap math.

## Microtask backlog

| ID | Name | Complexity | Risk | Files | Goal |
| --- | --- | --- | --- | --- | --- |
| MT-A2-01 | Phase and sprint shell parity | C-1 | LOW | `src/App.tsx`, `src/styles.css` | Restructure A2 so the phase area visually includes a sprint shell and duration/progress surface before task rows. |
| MT-A2-02 | Task row badge parity | C-1 | LOW | `src/App.tsx`, `src/styles.css` | Make each roadmap task row denser with template-like badges, controls, and unavailable placeholders without adding schema. |
| MT-A2-03 | Task detail dropdown skeleton | C-2 | MEDIUM | `src/App.tsx`, `src/styles.css`, `docs/design/TEMPLATE_REFERENCE.md`, `docs/design/DOMAIN_DETAILS.md` | Add expandable task detail blocks for symbol links, metadata, DoD, changelog, and export placeholders using runtime fields or explicit `unavailable`. |
| MT-A2-04 | A2 mobile density polish | C-1 | LOW | `src/styles.css` | Tighten spacing and wrapping of A2 header, roster, and task areas on smaller widths without changing semantics. |
| MT-A2-05 | Export helper extraction | C-1 | LOW | `src/App.tsx` plus one new helper under `src/` | Improve code quality by moving roadmap export serialization out of the main app component after the A2 UI structure is stable. |

## Assignment order

Run in this order:

1. `MT-A2-01`
2. `MT-A2-02`
3. `MT-A2-03`
4. `MT-A2-04`
5. `MT-A2-05`

Do not skip ahead unless a human explicitly reprioritizes.

## Task packet: MT-A2-01

### Scope

Bring the A2 phase area closer to the template hierarchy:

```text
Phase container
  -> Sprint shell
    -> Task rows
```

### Allowed evidence

- `src/App.tsx`
- `src/styles.css`
- `docs/design/TEMPLATE_REFERENCE.md`
- `docs/design/DOMAIN_DETAILS.md`
- `GoVibe-Mission-Control-template.html`

### Rules

- Reuse existing `RoadmapSnapshot` nodes only.
- If no sprint node exists in runtime data, derive a visual sprint shell from the current phase context and label it honestly.
- Do not create fake duration numbers. Use `unavailable` when missing.
- Keep assignment selects disabled if there is no live assignment action yet.

### Acceptance

- A2 still renders from approved roadmap snapshots only.
- The phase section shows a distinct sprint shell before task rows.
- No new TypeScript types are introduced in `src/mission.ts`.
- `npm run lint`
- `npm run build`
- `npm run diff:check`

### Prompt for SushiRL / Ollama

```text
You are VIBE, the GoVibe frontend worker.

Task ID: MT-A2-01
Scope: A2 Roadmap Board phase and sprint shell parity
Complexity: C-1
Risk: LOW

Read and follow:
- G:\govibe\.agents\frontend\AGENT.md
- G:\govibe\.agents\frontend\context\VIBE-A2-Roadmap-Template-Parity-Context.md
- G:\govibe\.agents\frontend\context\VIBE-A2-Visual-Parity-Microtasks.md
- G:\govibe\docs\design\TEMPLATE_REFERENCE.md
- G:\govibe\docs\design\DOMAIN_DETAILS.md
- G:\govibe\src\App.tsx
- G:\govibe\src\styles.css

Implement only MT-A2-01.

Rules:
- Touch only src/App.tsx and src/styles.css.
- Do not change src/mission.ts.
- Do not invent backend fields or fake live values.
- If sprint duration/progress is missing, show unavailable honestly.
- Keep C4 untouched.

Deliver:
1. Exact file edit plan.
2. Smallest implementation diff strategy.
3. Risks or blockers.
4. Verification checklist.
5. Follow the Worker output contract exactly. Do not explain generic agile hierarchy. Do not restate the prompt. If you drift from scope, output BLOCKED.
```

## Task packet: MT-A2-02

### Scope

Upgrade each task row so it looks closer to the template card header density before adding full detail dropdowns.

### Acceptance

- Task row shows stronger title/badge grouping.
- Row keeps runtime-backed status and assignment.
- Missing template data shows `unavailable` or disabled indicators.

### Prompt for SushiRL / Ollama

```text
You are VIBE, the GoVibe frontend worker.

Task ID: MT-A2-02
Scope: A2 task row badge parity
Complexity: C-1
Risk: LOW

Read:
- G:\govibe\.agents\frontend\AGENT.md
- G:\govibe\.agents\frontend\context\VIBE-A2-Roadmap-Template-Parity-Context.md
- G:\govibe\.agents\frontend\context\VIBE-A2-Visual-Parity-Microtasks.md
- G:\govibe\docs\design\TEMPLATE_REFERENCE.md
- G:\govibe\docs\design\DOMAIN_DETAILS.md
- G:\govibe\src\App.tsx
- G:\govibe\src\styles.css

Implement only MT-A2-02.

Rules:
- Touch only src/App.tsx and src/styles.css.
- Do not add new runtime schema.
- Use unavailable placeholders rather than invented detail.
- Do not implement dropdown detail yet.

Deliver:
1. Exact UI changes.
2. Minimal code locations to edit.
3. Verification checklist.
4. Follow the Worker output contract exactly. If you drift from scope, output BLOCKED.
```

## Task packet: MT-A2-03

### Scope

Add the first honest task detail dropdown skeleton for A2 using current runtime fields and explicit unavailable placeholders where task container data does not yet exist.

### Acceptance

- Task row can expand and collapse.
- Expanded area includes sections for symbol links, metadata, DoD, changelog, and export controls.
- Any missing data is explicitly labeled unavailable.
- Relevant design docs are updated if code changes require diff-guard companionship.

### Prompt for SushiRL / Ollama

```text
You are VIBE, the GoVibe frontend worker.

Task ID: MT-A2-03
Scope: A2 task detail dropdown skeleton
Complexity: C-2
Risk: MEDIUM

Read:
- G:\govibe\.agents\frontend\AGENT.md
- G:\govibe\.agents\frontend\context\VIBE-A2-Roadmap-Template-Parity-Context.md
- G:\govibe\.agents\frontend\context\VIBE-A2-Visual-Parity-Microtasks.md
- G:\govibe\docs\design\TEMPLATE_REFERENCE.md
- G:\govibe\docs\design\DOMAIN_DETAILS.md
- G:\govibe\src\App.tsx
- G:\govibe\src\styles.css

Implement only MT-A2-03.

Rules:
- Use current roadmap fields first.
- Show unavailable when the template expects task-container detail that runtime does not yet provide.
- Keep changes scoped to A2.
- Do not change mission transport or schema.

Deliver:
1. UI sections to add.
2. Placeholder policy for missing data.
3. Smallest safe diff strategy.
4. Verification checklist.
5. Follow the Worker output contract exactly. If you drift from scope, output BLOCKED.
```
