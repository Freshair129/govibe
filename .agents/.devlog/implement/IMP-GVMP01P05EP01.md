# IMP-GVMP01P05EP01: A2 Task Container Contract

```yaml
imp_id: IMP-GVMP01P05EP01
title: A2 Roadmap Task Container Contract for Detail Dropdown
status: docs_ready_for_review
complexity: C-3
risk: HIGH
methodology: DDD + CoDev multi-agent execution
primary_pic: LYRA
design_pic: THESEUS
data_contract_pic: KIN
ui_pic: VIBE
audit_pic: ATHER
verification_pic: GHOST
created_at: 2026-06-14T17:23:58+07:00
source_refs:
  - C:/Users/freshair/Downloads/p1-mvp-core-.json
  - G:/govibe/GoVibe-Mission-Control-template.html
  - G:/govibe/docs/design/DESIGN_SYSTEM.md
  - G:/govibe/docs/design/TEMPLATE_REFERENCE.md
  - G:/govibe/docs/design/DOMAIN_DETAILS.md
  - G:/govibe/docs/design/SITE_MAP.md
target_artifacts:
  - G:/govibe/docs/roadmap/BACKLOG-p1-mvp-core.md
  - future: G:/govibe/src/App.tsx
  - future: G:/govibe/src/mission.ts
  - future: G:/govibe/src/styles.css
gate_status:
  docs_design: updated
  implementation: blocked_until_approval
  audit: pending
  verification: pending
```

## Scope

This implementation record covers the doc-first repair for the A2 roadmap detail dropdown. The repair adds a Task Container contract so A2 can render template-parity task cards without inventing symbol links, DoD, changelog, token telemetry, or responsibility fields from title-only roadmap nodes.

## Owner Chain

| Responsibility | PIC | Executor | Approver | Auditor |
|---|---|---|---|---|
| Planning and scope | LYRA | Codex | Human Owner | ATHER |
| Design contract | THESEUS | Codex | LYRA | ATHER |
| Data contract | KIN | Codex | ARCHON | ATHER |
| UI implementation | VIBE | blocked | LYRA | GHOST + ATHER |
| Verification | GHOST | blocked | LYRA | ATHER |

## Design Artifacts Updated

- `docs/design/DESIGN_SYSTEM.md`: added the A2 Task Container contract and display rules.
- `docs/design/TEMPLATE_REFERENCE.md`: expanded the A2 task dropdown reference.
- `docs/design/DOMAIN_DETAILS.md`: added A2 Task Container verification checks.
- `docs/design/SITE_MAP.md`: clarified that A2 consumes roadmap hierarchy plus task detail containers.
- `docs/roadmap/BACKLOG-p1-mvp-core.md`: created a roadmap source with task containers mapped from the P1 MVP Core export.

## Implementation Gate

No UI or runtime implementation is complete under this ImpId yet. `src/App.tsx`, `src/mission.ts`, and `src/styles.css` remain blocked until the design/data contract is approved.

## Audit Notes

- PIC and Executor are distinct fields.
- Unknown token splits are recorded as `unavailable`.
- Legacy `tokensUsed` is retained only as total token usage.
- `TSK-CVB01P0109B` remains unfinished and must not render as completed.
