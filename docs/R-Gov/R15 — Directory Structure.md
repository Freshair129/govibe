## R15 — Directory Structure (v1.0)

**Title:** Directory Structure Convention  
**Summary:** โครงสร้างไดเรกทอรีมาตรฐานของ GoVibe Monorepo  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Convention  
**wikilink:** [[R15-Directory-Structure]]  
**crosslink:** [[R13-Project-Overview]] · [[R20-Design-First-Mandate]]  
**source:** สกัดจาก `GEMINI.md` § Directory Structure

---

### โครงสร้างหลัก

```
apps/
  desktop/          # Tauri v2 + React main application
  mobile/           # Capacitor mobile shell (Future)

packages/
  ui/               # Shared Glassmorphism components (migrated from /components)
  core/             # Platform-agnostic business logic
  genesis-db/       # Rust backend logic and GenesisBlockDB integration
  config/           # Shared configurations (ESLint, TS, Tailwind)

docs/
  design/
    DESIGN_SYSTEM.md   # Visual vibe, colors, and component tokens
    SITE_MAP.md        # Application hierarchy and domain routing
  (other)              # Centralized documentation (ADRs, Specs, RCAs)

standards/          # Project standards and methodology SSOTs
templates/          # Documentation templates and generator scripts
UI Components/      # Reference UI assets for migration

GoVibe-Mission-Control.html   # Master template for UI/Logic reference
```

---

### หลักการ

- ไฟล์ใหม่ต้องวางตาม directory convention นี้ — ห้ามสร้าง top-level directory ใหม่โดยไม่ได้อนุมัติ
- Frontend design reference ต้องดูจาก `docs/design/` เสมอ (ดู [[R20-Design-First-Mandate]])

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` § Directory Structure |
