# Product

## Register

product

## Users

GoVibe operators, agent builders, and the founder use this dashboard while supervising agent workflows, runtime telemetry, knowledge graphs, symbol databases, and benchmark runs.

## Product Purpose

GoVibe Mission Control is an operational command center for monitoring and controlling the GoVibe agent system. Success means users can switch domains quickly, understand live state without fake data, send commands through the configured transport, and inspect each domain's working surface from one React/Vite app.

## Brand Personality

Technical, focused, and cinematic. The interface should feel like a dense command center with enough polish to carry the GoVibe identity, while staying practical for repeated operational use.

## Anti-references

- Marketing landing pages.
- Fake telemetry or mock values presented as backend state.
- Raw HTML injection or legacy imperative scripts as the dashboard driver.
- Over-decorated controls that make dashboard tasks slower.
- Secret values or API keys embedded in static markup.

## Design Principles

- Live data first: runtime values come from `MissionSnapshot` and `MissionEvent`.
- Match the template identity without carrying its mock runtime forward.
- Keep domain navigation obvious: every domain and module must match the documented SITE_MAP.
- Favor dense, scannable panels over decorative empty space.
- Preserve operational trust: empty states must explain the missing feed instead of pretending success.

## Accessibility & Inclusion

Target WCAG AA contrast for text and controls. Support keyboard-accessible navigation, visible focus states, honest reduced-motion behavior, and clear labels for icon or code-like controls.

