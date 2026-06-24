## R16 — Build & Run Commands (v1.0)

**Title:** Build & Run Commands  
**Summary:** คำสั่งมาตรฐานสำหรับ build, dev, lint, format ของ GoVibe workspace  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / DevOps  
**wikilink:** [[R16-Build-Run-Commands]]  
**crosslink:** [[R13-Project-Overview]]  
**source:** สกัดจาก `GEMINI.md` § Building and Running

---

### Key Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies for the entire workspace |
| `npm run dev` | Start all applications in development mode (`turbo dev`) |
| `npm run build` | Build all applications and packages (`turbo build`) |
| `npm run lint` | Run linting across the workspace (`turbo lint`) |
| `npm run format` | Format code using Prettier |

---

### หลักการ

- ใช้ **Turborepo** เป็น task orchestrator — ห้ามรัน build/dev/lint โดยตรงใน sub-package โดยไม่ผ่าน turbo
- ก่อน push ให้รัน `npm run build` + `npm run lint` เพื่อตรวจสอบ

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | สกัดจาก `GEMINI.md` § Building and Running |
