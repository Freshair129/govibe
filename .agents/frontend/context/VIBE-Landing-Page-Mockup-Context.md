---
context_id: "VIBE-CTX-LANDING-PAGE-MOCKUP"
status: "active"
version: "0.1.2"
updated: "2026-06-21"
owner: "VIBE"
scope: "landing-page mockup (sibling artifact, not part of src/)"
---

# VIBE Context — GoVibe Landing-Page Mockup

A self-contained marketing landing page lives **outside** the Mission Control React app. Use this context when the active task touches the landing page, copy, or the deployed site.

## What it is

- **Single static HTML file** at `docs/design/LANDING-GoVibe-Mockup.html` (~73 KB, all CSS + JS inline)
- **Copy template** at `docs/design/LANDING-Copy-Template-GoVibe-Draft1.md` (16-section outline, structure inspired by https://top-workshops-645528.framer.app/)
- **Not** a React component, **not** in `src/`, **not** under Vite build. Open it directly or via the Vite dev server static path.

## What it is *not*

- Not the Mission Control dashboard. Mission Control (`src/`) remains the operational product.
- Not a replacement for the in-app design system. The landing page does not import `docs/design/DESIGN_SYSTEM.md` tokens — it uses its own self-contained color/typography vars by intent.
- Not subject to the Mission Control "live-data-only" template-parity rules in the same way. The landing page uses **placeholders** (`[N]+ Developers`, `[ราคา/เดือน]`, `[testimonial]`) until real product data lands.

## Deployment

- **GitHub:** `Freshair129/landinggovibe` (main branch tracks production)
- **Vercel:** https://govibe-landing.vercel.app (alias) · project `pornpons-projects/govibe-landing`
- **Working dir for the deployed repo:** `G:\govibe-landing\` (sibling of `G:\govibe\`, contains `index.html` copied from `docs/design/LANDING-GoVibe-Mockup.html`)
- Deploy command from `G:\govibe-landing\`: `vercel --prod`

## Structure (top → bottom)

| # | Section | id |
|---|---|---|
| 1 | Hero (rounded card on black bg, trapezoid logo notch) | `#top` |
| 2 | Trust marquee (badges) | — |
| 3 | Metrics (count-up) | — |
| 4 | Approach (3 steps) | `#approach` |
| 5 | Capabilities (row list) | `#capabilities` |
| 6 | Feature cards | — |
| 7 | Use cases | `#usecases` |
| 8 | Governance highlight | — |
| 9 | Testimonial | — |
| 10 | Pricing (toggle monthly/yearly) | `#pricing` |
| 11 | FAQ | `#faq` |
| 12 | Integrations | — |
| 13 | CTA | `#cta` |
| 14 | Footer | — |

## Fixed UI layers (z-stack)

| z | Element | Behavior |
|---:|---|---|
| 120 | `.scroll-prog` | accent progress bar tracking scrollY |
| 110 | `.site-header` | sticky mini-header, slides in after hero (~78% of hero height) |
| 108 | `.scroll-blur` (top + bottom) | progressive backdrop-blur strips with gradient mask; `.active` on scroll, melt-away 900ms after rest |
| 107 | `.sys-dock` | slim 46px status bar (MCP Online dot, keyboard hints, version); auto-tucks on scroll-down past 60% vh |
| **106** | **`.agent-chip`** | **floating Mission Control mini-widget · expandable popup · draggable by header · snaps to 4 corners** |
| 95 | `.hero-notch` | trapezoid logo banner overlapping hero card top edge |

## Motion inventory

- **Hero:** Ken Burns on background · WebGL depth-scan canvas (`<canvas id="heroFx">` with green-cyan scan beam + topographic contours + grain + vignette) · cursor-follow radial glow · staggered fade-up on load
- **Page:** scroll-progress reveal (continuous `--p` 0..1 mapped to opacity + translateY per element, NOT binary IntersectionObserver) · ambient per-section radial tint that lights on viewport entry · word-stagger reveal on `h2.sec-title` and testimonial `.quote`
- **Cards:** 3D tilt ±8° + 220px spotlight glare following cursor · content `translateZ(28px)` on hover · hover lift + accent border + sheen
- **CTAs:** magnetic pull (35% of delta within 120px range)
- **Marquee:** trust badges, 82s linear infinite, hover-paused, mask-faded edges
- **Pricing:** pill toggle with sliding indicator (`cubic-bezier(.4,0,.2,1)` 0.35s) + price fade-swap 250ms
- **Counters:** ease-out count-up triggered on viewport entry; `data-target` stores ground truth; safety finalize at 4.5s
- **Agent chip** (floating mini-widget):
  - **Reveal:** fades in after scroll past hero (~0.78 × hero height)
  - **Expand/collapse:** `aria-expanded` toggle, keyboard (Enter/Space), Esc to close, click-outside dismisses
  - **Minimize mode:** close button → shrink to 32×32 pulsing green dot (2s ease-in-out `minPulse` anim), click dot → unminimize + expand, persists via `govibe.chip.minimized` LS key
  - **Keyboard navigation:** arrow up/down cycle through agent rows when expanded; tab/enter select; all rows `tabIndex=0`
  - **Section-aware content:** detect viewport midpoint section via `data-chip-title` attribute; when expanded, auto-switch focus task to current section (future-ready)
  - **Drag by header:** pointer-based drag-to-corner snap (br/bl/tr/tl) via CSS transition 0.35s, clamped to 12px viewport margin, disabled on touch
  - **Profile swap:** click agent row → fade-swap focus block (role/narrative/progress %), 180ms opacity transition
  - **localStorage persistence:** 4 keys: `govibe.chip.opened` · `govibe.chip.selected` · `govibe.chip.corner` · `govibe.chip.minimized` — all auto-restore on reload

## Accessibility / safety

- `prefers-reduced-motion`: kills animations + transitions + scroll-progress mapping; word-reveal forced visible; smooth-scroll never engages
- `(hover: none)` (touch devices): cursor glow, tilt, magnetic, scroll-blur disabled
- `:focus-visible` outlines preserved
- All decorative motion is layered above functional content; nothing blocks interaction

## When VIBE works on this file

1. **Don't** wire it into `src/` or import React components into it — it's intentionally framework-free.
2. **Don't** swap the WebGL shader without keeping the gradient fallback path (`canvas.style.display='none'` on no-context).
3. **Don't** remove `prefers-reduced-motion` or `(hover:none)` guards — they're load-bearing.
4. **Do** keep CSS vars (`--sb-*`, `--reveal-y`, `--p`, `--mx`, `--my`, `--rx`, `--ry`, `--gx`, `--gy`, `--tcol`) as the public knobs — JS only sets these; CSS reads them.
5. **Do** preserve `--p` continuous mapping (not binary `.in`) for reveal — that's what makes it feel "buttery" vs "snap".
6. **Do** keep `--sb-fade-out` longer than `--sb-fade-in` (currently 900ms vs 280ms) — quick fade-in, slow melt-out is the spec.
7. **Agent chip localStorage keys** — don't rename without migration logic:
   - `govibe.chip.opened` → boolean `'1'` when user expanded; absence = never opened
   - `govibe.chip.selected` → agent name string (`'LYRA'`, `'ARCHON'`, etc.); default fallback = fleet profile
   - `govibe.chip.corner` → position string (`'br'`, `'bl'`, `'tr'`, `'tl'`); default fallback = `'br'`
8. **Drag-to-corner snap:** use CSS `[data-corner]` attribute selector (not inline style) to switch position anchors cleanly. Dragging sets inline `left`/`top`, release clears inlines and sets `data-corner` attr to trigger CSS rule.
9. **Pointer event handlers:** use `pointer*` (not `mouse*`/`touch*`) for unified handling. Drag handler respects `setPointerCapture()` and respects pointer type filters (`pointerType==='touch'` for rejection).
10. **Sync after edits:** when changing `docs/design/LANDING-GoVibe-Mockup.html`, copy to `G:\govibe-landing\index.html`, commit, push to `Freshair129/landinggovibe`, then `vercel --prod`.

## Placeholders awaiting real data (live-data-only)

| Where | Placeholder |
|---|---|
| Hero proof stat | `[N]+ Developers` |
| Pricing Solo + Team | `[ราคา/เดือน]` / `[ราคา/ปี]` |
| Testimonial quote + attribution | `[คำรับรอง]`, `[ชื่อ]`, `[ตำแหน่ง, บริษัท]` |
| Sticky header / FAQ response time | `[เวลา]` |
| Contact email + repo link | `[hello@govibe.dev]`, `[repo / docs link]` |

Never invent numbers, testimonials, or prices to fill these. Wait for product owner data.

## Related files

- Source HTML: `docs/design/LANDING-GoVibe-Mockup.html`
- Copy template: `docs/design/LANDING-Copy-Template-GoVibe-Draft1.md`
- Motion probe (one-off, internal): `scripts/one-off/probe-framer-motion.mjs` + `framer-motion-report.json`
- Deployed mirror: `G:\govibe-landing\` (separate git repo → GitHub `Freshair129/landinggovibe` → Vercel)
