# Mission Control Template Modules

Generated from `GoVibe-Mission-Control-template.html` by `scripts/extract-mission-template.mjs`.

This folder is an extraction of the original single-file template. The intent is modular ownership while preserving the original code blocks as source material.

## Layout

- `layout/body-before-views.html`: body shell before the view blocks.
- `views/A-D/*.html`: extracted view blocks, one file per module ID.
- `layout/body-after-views-before-runtime.html`: shell after views, before runtime.
- `styles/template.css`: original inline CSS.
- `scripts/mission-control.runtime.js`: original final runtime script.
- `config/tailwind.config.inline.js`: original inline Tailwind config.
- `scripts/00-console-warn-filter.js`: original early console warning filter.

## Rule

Do not manually rewrite these modules when the goal is parity with the template. Update `GoVibe-Mission-Control-template.html` or the extractor, then rerun:

```powershell
node scripts/extract-mission-template.mjs
```
