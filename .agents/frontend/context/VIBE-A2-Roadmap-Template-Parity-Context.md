---
title: "VIBE Context: A2 Roadmap Template Parity"
doc_id: "CTX-VIBE-A2-ROADMAP-TEMPLATE-PARITY"
status: "active"
version: "0.2.0"
updated: "2026-06-18"
owner: "VIBE"
source_of_truth: false
---

# VIBE Context: A2 Roadmap Template Parity

## Assignment

Bring the React Mission Control A2 Roadmap Board closer to the approved legacy template header contract while preserving runtime-backed state.

## Trigger history

The approved legacy reference at `GoVibe-Mission-Control-template.html` was updated so the A2 header says:

- `GoVibe Development Roadmap`
- `Feature ทั้งหมด`
- `พร้อมใช้งาน / IMP แล้ว`
- `Task ใน Backlog`

The historical React drift in `src/App.tsx` originally rendered:

- `CoVibe Development Roadmap`
- `Total items`
- `Completed`
- `Active`

That drift has already been corrected in the shipped A2 React surface.

## Current use of this packet

This document now serves as the parent context for follow-up parity work and local frontend delegation.

## Required behavior

1. Update the React A2 title from `CoVibe Development Roadmap` to `GoVibe Development Roadmap`.
2. Update the A2 metric labels to match the template wording:
   - total features
   - ready / implemented features
   - backlog tasks
3. Do not hardcode the template values `27`, `22`, or `4` in React.
4. Derive React counts from the approved `RoadmapSnapshot` already used by `RoadmapBoard`.
5. Preserve approved-source gating: unapproved roadmap sources must not drive live UI state.
6. Keep C4 untouched.
7. For local small-model delegation, keep this packet read-only background context and move active implementation slicing into `VIBE-A2-Visual-Parity-Microtasks.md`.

## Counting guidance

Use the current roadmap snapshot fields already available to `RoadmapBoard`.

Recommended interpretation:

- `Feature ทั้งหมด`: actionable roadmap nodes whose type is `task`, `sub-task`, `micro-task`, or `atomic-task`.
- `พร้อมใช้งาน / IMP แล้ว`: actionable nodes in a done/completed state.
- `Task ใน Backlog`: actionable nodes that are not done/completed.

If the approved snapshot later exposes explicit backlog metadata, prefer that source and keep the fallback calculation small.

## Scope

In scope:

- `src/App.tsx`
- `src/styles.css` only if label layout needs a small visual adjustment.

Out of scope:

- `GoVibe-Mission-Control-template.html`
- C4 / Database ERD
- new runtime schemas unless absolutely required
- unrelated visual refactors
- rewriting this packet into a large historical changelog

## Verification

Run:

- `npm run lint`
- `npm run build`
- `npm run diff:check`

If code changes without docs, update the relevant implementation/roadmap docs or explain why the diff guard allows the change.

## Expected VIBE output

```markdown
### VIBE Frontend Output

**Scope:** A2 Roadmap Board template parity
**Complexity:** C-1
**Context Tier:** H1
**Risk:** LOW
**Verification:** lint | build | diff guard

Summary:
- [what changed]
- [template contract honored]
- [verification run]
```

## Notes for local worker delegation

- Treat header title and stat wording as already solved unless a human explicitly reopens them.
- If a worker proposes redoing the old CoVibe-to-GoVibe rename or stat-label rename, reject that plan as stale.
- Use this packet to preserve the rationale for runtime-derived counts and approved-source gating, not to reopen completed A2 header work.
