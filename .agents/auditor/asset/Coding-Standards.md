# Coding Standards

Guidelines for keeping GoVibe maintainable across React, Tauri, documentation pipelines, and agent integrations.

## Frontend: React and TypeScript
- Use functional components and hooks.
- Keep UI state local unless multiple domains need it.
- Use shared stores only for cross-view state.
- Avoid `any` unless there is a documented boundary reason.
- Keep Mission Control views component-based; do not reintroduce raw single-file dashboard runtime as the driving architecture.
- Follow `docs/design/DESIGN_SYSTEM.md`, `docs/design/SITE_MAP.md`, and `docs/design/DOMAIN_DETAILS.md` for UI fidelity.

## Backend: Rust and Tauri
- Keep Tauri commands focused and typed.
- Move reusable logic into modules rather than large command handlers.
- Return structured errors instead of panicking.
- Avoid `unwrap()` and `expect()` in production paths.
- Verify IPC shape when frontend/backend contracts change.

## Documentation Pipeline
- Human-readable SWE docs are canonical.
- PRD owns product intent and system boundaries.
- SRS owns requirements when present.
- SDD/C4 own architecture and design views.
- LLD owns component or algorithm details.
- API/MCP contracts own integration behavior.
- Runbooks own operational procedure.
- Test Plans own verification strategy.
- Atoms are derived artifacts and must not silently override source docs.

## Agent and Integration Boundaries
- GoVibe coordinates external coding tools; it does not manage provider billing, subscription, quota, or runtime ownership.
- MCP/API integrations must preserve RBAC/ABAC checks.
- Agent work must preserve traceability from source document to verification evidence.

## Testing
- Unit tests are expected for shared logic.
- Component or browser verification is expected for UI behavior.
- Contract tests or request samples are expected for API/MCP changes.
- Policy-sensitive changes require allow and deny cases.
