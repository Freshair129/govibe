# Design Verification Checklist

Use this checklist when validating Mission Control UI changes.

## Required Source Docs

- `docs/design/DESIGN_SYSTEM.md`
- `docs/design/SITE_MAP.md`
- `docs/design/DOMAIN_DETAILS.md`
- `docs/design/TEMPLATE_REFERENCE.md`
- `docs/design/TEMPLATE_MODULARIZATION.md`

## Checks

- Domain tabs match `SITE_MAP.md`.
- Sidebar modules match `SITE_MAP.md` and `DOMAIN_DETAILS.md`.
- Active domain and module labels match the source docs.
- Visual density, glassmorphism, color accents, and operational dashboard tone match `DESIGN_SYSTEM.md`.
- Migrated views preserve template behavior documented in `TEMPLATE_REFERENCE.md`.
- Agent Management uses an infinity carousel/card deck.
- Agent cards are not implemented as nested cards.
- EVA media uses sequential autoplay loop behavior for videos 1, 2, and 3 when assets exist.
- `interactive-card` glare follows pointer coordinates through `--mouse-x` / `--mouse-y`.
- Raycast 3D Agent Card style matches the template: about `1000px` perspective, glass blur, shine/glare overlay, preserve-3D child lift, agent-specific hover shadow, pointer tilt up to about `15deg`, and neutral reset on leave.
- Agent drag follow-cursor behavior matches the template: fixed floating clone follows the pointer, source card fades, cursor uses grabbing state, and task drop targets glow/elevate.
- Character console tilt matches the template: about `1500px` perspective, pointer tilt up to about `6deg`, and reset easing on pointer leave.
- Cursor glow and 3D tilt behavior are present where the template requires them.
- Mobile layout is intentionally adapted, not merely squeezed.
- Console has no `error` entries after load and after domain switching.

## Evidence To Capture

- Desktop screenshot.
- Mobile screenshot.
- Console error summary.
- View/domain switch notes.
- Template parity notes for any changed view.
