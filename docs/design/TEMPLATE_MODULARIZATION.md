# GoVibe Mission Control Template Modularization

**Version:** 0.1.0  
**Status:** Active extraction reference  
**Source:** `GoVibe-Mission-Control-template.html`  
**Output:** `comp/mission-control-template`

## Purpose

This document records the legacy-template modular split for the single-file Mission Control HTML.

The goal is to preserve the original code blocks while making the template easier to inspect, compare, and migrate. This is not a React rewrite and should not introduce new UI logic.

## Extraction Rules

- Treat `GoVibe-Mission-Control-template.html` as the source of truth for this extraction.
- Use `scripts/extract-mission-template.mjs` to regenerate modules.
- Do not manually rewrite generated modules when parity is required.
- Existing hand-split files in `comp/` are left untouched. Generated output lives under `comp/mission-control-template/`.

## Generated Structure

| Path | Role |
| --- | --- |
| `layout/body-before-views.html` | Body shell before the view blocks |
| `views/A/*.html` | Domain A view blocks A1-A5 |
| `views/B/*.html` | Domain B view blocks B1-B4 |
| `views/C/*.html` | Domain C view blocks C1-C5 |
| `views/D/*.html` | Domain D view blocks D1-D3 |
| `layout/body-after-views-before-runtime.html` | Shell after the view blocks and before runtime |
| `styles/template.css` | Original inline style block |
| `scripts/mission-control.runtime.js` | Original final runtime script |
| `config/tailwind.config.inline.js` | Original inline Tailwind config |
| `scripts/00-console-warn-filter.js` | Original early console warning filter |
| `manifest.json` | Generated index, source byte count, and view line ranges |

## Verification

Run:

```powershell
node scripts/extract-mission-template.mjs
```

Expected current result:

- 17 extracted view modules.
- Source byte count: `438952`.
- Output root: `comp/mission-control-template`.

## Follow-up

If the next step is executable modular HTML, add an assembler that stitches the generated modules back into one HTML file and compares it against the original source.
