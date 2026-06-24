## R2 — Key Technologies / Target Stack (v1.0)

**Source:** `GEMINI.md` § Key Technologies (Target Stack)

---

| Layer | Technology |
|---|---|
| **Architecture** | Monorepo (Turborepo + npm Workspaces) |
| **Frontend** | Vite + React 19 (TypeScript) + Tailwind CSS v4 + Lucide Icons |
| **Backend (Desktop)** | Tauri v2 (Rust-based) |
| **Database** | GenesisBlockDB (HNSW-simulated vector storage in Rust) |
| **Testing** | Vitest (Unit) + Playwright (E2E) |
| **Native** | Capacitor (for mobile deployment) |
