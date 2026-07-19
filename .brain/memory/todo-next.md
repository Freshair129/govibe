# TODO / self-note - next session (GoVibe)

อัปเดตล่าสุด: **2026-07-19** · ไฟล์นี้ถูก seed โดย unification Mechanical #5 (ฟื้น `.brain/` ที่ถูกทิ้งร้าง
ตั้งแต่ 2026-06-19) — เป็น **rolling file ไฟล์เดียว**: อัปเดตทับ ไม่สร้างใหม่ต่อ session
(ไฟล์ `TODO-SESSION-*` เก่าเป็น frozen history) · protocol เต็ม: `.claude/skills/end-session/SKILL.md`

## 🔴 งานถัดไปเรียงตาม leverage (2026-07-19 — จากรายงานเทียบ G:\G-Maiden\docs\research\2026-07-19-govibe-gmaiden-governance-comparison.md)

1. **แก้ถ้อยคำ positioning ใน PRD/BRD** (Boss เคาะแล้วผ่านโมเดล succession): เลิกคำ
   "central governance layer" → "dev-time multi-agent platform hosting the RWANG engine" —
   แก้ `docs/PRD-GoVibe-Platform-Overview.md` + `docs/BRD-GoVibe-Platform.md` ตาม Step-5 SOP
   (bump version + changelog + registry sync + `npm run docs:validate`)
2. **A1 runs-view** (spec อยู่ `G:\Rwang\specs\A1-runs-view.yaml`) — สะพานรับช่วง RWANG→GoVibe:
   Mission Control อ่าน `runs/*/progress.json` read-only, retire monitor.html
3. **รอ Boss เคาะ 2 decision ค้าง**: (a) ชะตากรรม SDD desktop shell (Tauri ที่ไม่มีจริง —
   descope หรือเป็น module ใน G-Orchestra?) (b) branding `G-` prefix
4. Adopt cross-session auto-memory pattern จาก G-Maiden (MEMORY.md index + one-fact-per-file)
   — ยังไม่ได้ทำ เป็นข้อเดียวของ Mechanical #5 ที่เหลือ

## ข้อเท็จจริงที่ session ใหม่ต้องรู้ (hard-won, 2026-07-19)

- **Canonical STD ย้ายบ้านแล้ว**: Execution Governance (C/H/W, Access Scope H0-H4) canonical =
  RWANG PROMAX `D:\rwang\RWANG-PROMAX-skills\skills\rwang\references\EXECUTION-GOVERNANCE.md`;
  `docs/STD-Execution-Governance.md` ที่นี่คือ **mirror 2.3.1+ga** — แก้ที่ canonical แล้ว sync มา
- **AGENTS.md 1.4.0**: §3 เป็น Access Scope H0-H4 แล้ว (H5/H6 ยกเลิก; radius=R, compaction=CH) —
  อย่าอ้าง H0-H6 อีก
- **Registry discipline**: แตะ governed doc ใด ๆ = bump frontmatter + changelog + registry row +
  registry self-row + `npm run docs:validate` ต้องผ่าน (มี pre-existing errors 3 ตัวใน
  `.agents/.devlog/` + `.agents/frontend/context/` — ไม่ใช่ของใหม่ อย่าตกใจ แต่ก็ควรเก็บกวาดสักวัน)
- **บทบาทตาม succession model**: GoVibe = platform รับช่วง operational surface จาก RWANG
  (Mission Control, MCP/A2A, translator, vault hosting) — **ห้าม re-implement orchestration loop**
  (engine = RWANG ตลอดไป; runtime governor บนเครื่องผู้ใช้ = G-Orchestra)
- Repo state: feature freeze ตั้งแต่ 2026-06-22 (หลังจากนั้น docs/governance ล้วน); สิ่งที่รันจริง =
  Mission Control UI + MCP scaffold + translator slice; Tauri shell ใน SDD ไม่มีจริง
