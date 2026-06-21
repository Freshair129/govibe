# GoVibe Landing Page — Release v0.1.2

**Date:** 2026-06-21  
**Status:** Stable (production deployed)  
**Repo:** `Freshair129/landinggovibe`  
**Live:** https://govibe-landing.vercel.app

---

## What's new in v0.1.2

### Polish Round 3 — Interactive Agent Chip

**Agent Fleet Chip** — mini Mission Control widget pinned to the right of the viewport (bottom-right by default).

#### Features

1. **Expandable popup** — click to expand to 342×434px panel showing:
   - 5 GoVibe agents (LYRA, ARCHON, THESEUS, GHOST, VIBE)
   - Current focus task (sprint title, progress bar 78%, task count)
   - 3-item activity feed (staggered reveal, timestamps)
   - Footer: governance posture (MCP · ABAC · context tier)

2. **Minimize mode (new v0.1.2)** — close button → shrink to 32×32px pulsing green dot
   - 2s ease-in-out pulse animation
   - Click dot → expand again
   - State persists across reloads

3. **Keyboard navigation (new v0.1.2)** — when expanded:
   - Arrow up/down → cycle through agent rows
   - Tab/Enter → select agent
   - All rows are keyboard-focusable (tabIndex=0)

4. **Section-aware content (new v0.1.2)** — future-ready:
   - Detects viewport midpoint section via `data-chip-title` attribute
   - Auto-switches focus task to current section when expanded
   - Currently not wired to sections (markup update pending)

5. **Profile selection** — click agent row → swap focus block to that agent's profile:
   - Role title (Planning Lead, Systems Architect, etc.)
   - Current narrative (what they're working on)
   - Progress % · task count

6. **Drag to any corner** — grab by header, drag to viewport edge, release to snap:
   - 4 positions: bottom-right (br, default), bottom-left (bl), top-right (tr), top-left (tl)
   - CSS snap transition 0.35s
   - Clamped to 12px margin during drag

#### Persistent State (localStorage)

All user interactions saved and restored on page reload:

| Key | Value | Scope |
|---|---|---|
| `govibe.chip.opened` | `'1'` | expand state |
| `govibe.chip.selected` | agent name (`'LYRA'`, etc.) | selected profile |
| `govibe.chip.corner` | `'br'`, `'bl'`, `'tr'`, `'tl'` | corner position |
| `govibe.chip.minimized` | `'1'` | minimize state |

---

## Summary of all motion (v0.1.1+0.1.2)

| Layer | Feature | Trigger |
|---|---|---|
| Hero | Ken Burns · WebGL depth-scan · cursor glow · fade-up | load |
| Global | scroll-blur strips (top+bot) · scroll-progress bar · sticky header | scroll |
| Content | word-stagger headlines · scroll-progress reveal · section tints · count-up metrics | scroll + viewport |
| Cards | 3D tilt ±8° + spotlight · magnetic CTAs · marquee badges · pricing toggle | hover / interaction |
| **Chip** | **expand/collapse · minimize dot · keyboard nav · drag-snap · profile swap · activity feed reveal** | **interaction + auto-restore** |

---

## Accessibility / Safety

- ✅ `prefers-reduced-motion` — all animations disabled, expand state forced visible
- ✅ `(hover: none)` (touch) — drag handler, cursor effects disabled
- ✅ ARIA labels + `aria-expanded` state tracking
- ✅ Keyboard navigation (arrow keys, tab, Esc, Enter)
- ✅ Click-outside dismissal (chip close)
- ✅ Focus management (tabIndex, auto-focus on selection)

---

## Architecture

**Single HTML file:** `docs/design/LANDING-GoVibe-Mockup.html`
- 76 KB uncompressed
- All CSS + JS inline (no build step)
- CSS custom properties (vars) as public knobs
- localStorage for persistence (no backend)

**Deployment:** GitHub `Freshair129/landinggovibe` (main) → Vercel production  
**Sync workflow:** govibe repo → copy HTML → landing repo → push → `vercel --prod`

---

## Known gaps / future work

- Section-aware chip content: markup needs `data-chip-title="..."` on `<section>` elements
- Chip tooltips: could add hover hints ("drag to move", "arrow keys to navigate")
- Multi-device testing: verified on 1440×900 desktop + 375 mobile, edge cases untested
- Animation tuning: polish parameters (durations, easing) open to refinement per UX feedback

---

## Testing checklist (manual)

- [ ] Expand chip, verify popup layout + feed stagger
- [ ] Click agent row, confirm profile swap + localStorage save
- [ ] Arrow up/down keyboard nav, verify row selection + focus
- [ ] Drag chip by header to all 4 corners, verify snap animation
- [ ] Close chip (× button / Esc), verify transitions
- [ ] Minimize (close button → minimize dot), verify pulse
- [ ] Click minimize dot, verify unminimize + auto-open
- [ ] Refresh page, verify all state restored (chip position, selected agent, open/minimize state)
- [ ] Test on mobile (375), verify chip hidden (@media max-width 760px)
- [ ] Test with prefers-reduced-motion: reduce, verify no animations

---

## Commits in this release

- `8a990fa` — feat: polish chip — minimize + kbd nav + section-aware
- `a4e2db4` — docs(agents): update VIBE landing-page context
- `a3d4e4e` — feat: landing-page agent chip drag-to-corner + persistent UI state
- `22221c1` — docs(design): landing-page motion polish + register VIBE landing context

---

## Next iteration ideas

- **Custom domain:** CNAME to GoVibe domain (currently vercel.app alias)
- **Copy refresh:** fill live-data-only placeholders (testimonials, pricing, contact email) once product team confirms
- **CMS integration:** fetch section content from docs/roadmap programmatically (roadmap board → chip context)
- **Mobile polish:** expand to full-screen modal on small screens, optimize gesture handling
- **Analytics:** track chip interactions (open/close/minimize/profile switches) for usage insights

---

**Approval:** ✅ v0.1.2 Ready for production  
**Date:** 2026-06-21  
**Owner:** VIBE (GoVibe Frontend)
