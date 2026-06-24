## R4 — Directory Structure (v1.0)

**Source:** `GEMINI.md` § Directory Structure

---

- `apps/`
  - `desktop/`: Tauri v2 + React main application.
  - `mobile/`: Capacitor mobile shell (Future).
- `packages/`
  - `ui/`: Shared Glassmorphism components (migrated from `/components`).
  - `core/`: Platform-agnostic business logic.
  - `genesis-db/`: Rust backend logic and GenesisBlockDB integration.
  - `packages/config/`: Shared configurations (ESLint, TS, Tailwind).
  - `docs/design/`:
    - `DESIGN_SYSTEM.md`: Visual vibe, colors, and component tokens.
    - `SITE_MAP.md`: Application hierarchy and domain routing.
  - `docs/`: Centralized documentation (ADRs, Specs, RCAs).
- `standards/`: Project standards and methodology SSOTs.
- `templates/`: Documentation templates and generator scripts.
- `UI Components/`: Reference UI assets for migration.
- `GoVibe-Mission-Control.html`: The master template for UI/Logic reference.
