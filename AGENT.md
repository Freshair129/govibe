---
title: "GoVibe Agent Bridge (singular)"
doc_id: "AGENT-BRIDGE-QWEN-COMPAT"
uid: "01KVZGHVKS655M90JP2KBW39XP"
status: "draft"
version: "1.3.0+draft"
content_hash: "atom:cf3499b15f930d49"
updated: "2026-06-25"
owner: "ATHER / THESEUS"
source_of_truth: false
attributes:
  purpose: "Compatibility bridge for tools that auto-load the singular AGENT.md (qwen-cli)"
---

# GoVibe Agent Bridge (singular filename)

This file exists **only** because some tools auto-load the singular filename `AGENT.md`. The
**canonical operating contract is `AGENTS.md`** (plural) — read it before doing anything in this
repo. This file carries no rules of its own and defers entirely to `AGENTS.md`.

If your tool can load either, prefer `AGENTS.md`.

Historical bridge content (an external-agent evidence-fields schema and a context load order) was
moved to `docs/archive/snapshots-2026-06/agent-bridge-content-preserved.md` on 2026-06-25 to
eliminate triplicated content; see `audit/ai-firstify-report-2026-06-25.md` rec #4.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 1.3.0+draft | 2026-06-25 | ATHER / THESEUS | AI-firstify Phase B: trimmed to real thin bridge; unique evidence-schema + context-load-order content preserved at docs/archive/snapshots-2026-06/agent-bridge-content-preserved.md. |
| 1.2.1+draft | 2026-06-22 | ATHER / THESEUS | Reframed as a singular-filename compat bridge only; affirmed `AGENTS.md` as the standard contract. |
