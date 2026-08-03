---
title: "RUNBOOK: GoVibe First Use"
doc_id: "RUNBOOK-GOVIBE-FIRST-USE"
status: "draft"
version: "0.1.2+draft"
updated: "2026-08-03"
owner: "GoVibe"
source_of_truth: true
prd_system: "SYSTEM-05::Agent-Team-Management-System"
related_docs:
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md"
  - "docs/roadmap/MASTERPLAN-govibe-mvp-developer-trial.md"
---

# RUNBOOK: GoVibe First Use

## 1. ใช้คู่มือนี้เมื่อไร

ใช้สำหรับการเปิด GoVibe ครั้งแรกเพื่อดู Master Plan และสแกน workspace ด้วย 12 stages. คู่มือนี้อธิบายเฉพาะความสามารถที่มีใน MVP ปัจจุบัน:

- Mission Control แสดงสถานะ run, stage, provider และหลักฐานอ้างอิง
- Master Plan เปิดดูได้ในโหมด review-only
- GoVibe รัน deep scan 12 stages ตามลำดับตายตัว
- GKS เก็บ knowledge และ MSP เก็บ evidence ผ่าน MCP adapters

GoVibe ไม่แทนที่ GKS/MSP, ไม่เขียนฐานข้อมูลของสองระบบโดยตรง, และไม่อนุมัติแผนงานแทน owner.

## 2. สิ่งที่ต้องเตรียม

1. ใช้ checkout ที่ติดตั้ง dependencies แล้ว หรือรัน `npm ci` ที่ root ของ GoVibe.
2. เลือก workspace ที่จะสแกน และอนุญาต root ของมันให้ runtime ก่อนเริ่มงาน.
3. สำหรับ deep scan จริง ให้ตั้งค่า MSP MCP writer ที่ผ่านการอนุมัติแล้ว. MSP เป็นผู้เชื่อม GKS/storage; GoVibe ไม่มี direct GKS configuration. หากยังไม่มี adapter ระบบจะรายงาน degraded/failure ตามสัญญา ไม่สร้างที่เก็บ knowledge หรือ evidence ปลอมใน GoVibe.

ตัวอย่าง PowerShell สำหรับอนุญาตเฉพาะ root ที่ต้องการ (เปลี่ยนค่า placeholder ก่อนใช้):

```powershell
$env:GOVIBE_ALLOWED_WORKSPACE_ROOTS = '["C:\\workspaces"]'
```

ต้องเป็น JSON array ที่ไม่ว่างและใช้ absolute paths. runtime ปฏิเสธ path ที่อยู่นอก allowlist นี้.

## 3. เปิด Mission Control

เปิดสอง terminal ที่ root ของ GoVibe:

```powershell
# Terminal 1: runtime และ Mission sidecar
npm run mission:dev

# Terminal 2: หน้าเว็บ
npm run dev
```

The Mission sidecar now fails closed unless both processes share a local
authentication token. Copy `.env.example` to the ignored `.env.local`, replace
the placeholder with a random value, and keep these two values identical:

```dotenv
GOVIBE_MCP_TOKEN=<random-local-token>
VITE_GOVIBE_MCP_TOKEN=<same-random-local-token>
```

`GOVIBE_MCP_TOKEN` protects HTTP and WebSocket access. The `VITE_` value lets
Mission Control attach that credential before the application imports. Never
commit `.env.local`, print the token, or put it in a MissionSnapshot. The
default allowlist accepts Vite on localhost/127.0.0.1 ports 1420 and 5173. For
a different development origin, set `GOVIBE_MCP_ALLOWED_ORIGINS` to an explicit
comma-separated list; wildcard origins are not supported.

เปิด URL ที่ Vite แสดงใน terminal (ค่าเริ่มต้นคือ `http://localhost:1420`). terminal แรกจะพิมพ์ URL ของ Mission sidecar เมื่อพร้อมใช้งาน. หากหน้าเว็บยังไม่เชื่อมต่อ ให้ตรวจว่า terminal ทั้งสองยังทำงานอยู่ก่อน.

## 4. ดู Master Plan ก่อนเริ่มงาน

1. เปิดเมนู **A2 / Roadmap**.
2. ในแผง **Master Plan** เลือกเอกสารที่ต้องการแล้วกด **Open review**.
3. ตรวจ title, สถานะ approval และ phase ที่ parse ได้.

Master Plan ที่เป็น `draft` เปิดดูได้ แต่ยังไม่ขับเคลื่อน execution board. ต้องให้ LYRA/owner อนุมัติเอกสารตาม governance ก่อนจึงจะใช้เป็น active roadmap ได้. ปุ่มนี้ไม่แก้ไฟล์, ไม่ promote และไม่อนุมัติแผน.

## 5. รัน 12-stage workspace scan

1. เปิด **Real-time Dashboard**.
2. ในแผง **12-stage Workspace Scan** ใส่ absolute path ของ workspace ที่อยู่ใน `GOVIBE_ALLOWED_WORKSPACE_ROOTS`.
3. กด **Run 12 stages**.
4. รอให้รายการ stage และ `Graph validation` แสดงผล แล้วตรวจสถานะของแต่ละ stage.

ลำดับที่ระบบใช้และห้ามสลับคือ:

1. Scan
2. Structure
3. Markdown Parse
4. COBOL Parse
5. Symbolic Parse
6. Routes
7. Tools
8. ORM
9. Cross-File Resolution
10. MRO
11. Communities
12. Processes

ผลลัพธ์จะถูกเก็บเป็น workflow state ใน GoVibe พร้อม references ไปยัง GKS/MSP; payload ของ knowledge/evidence ไม่ถูกคัดลอกมาเป็น source of truth ใน GoVibe.

## 6. อ่านผลลัพธ์อย่างถูกต้อง

| สถานะ | ความหมาย | การทำต่อ |
|---|---|---|
| `complete` | stage มีผลลัพธ์และ references ที่ตรวจผ่าน | ตรวจ Graph validation ก่อนปิด run |
| `not_applicable` | ไม่มีเนื้อหาประเภทนั้นใน inventory และมีหลักฐาน exclusion | ใช้ได้ ไม่ต้อง rerun stage นั้น |
| `incomplete` | parser/coverage ยังให้ผลลัพธ์ที่ยืนยันไม่ได้ | แก้หรือเพิ่ม parser แล้ว resume/retry |
| `failed` | stage หรือ external writer ทำงานไม่สำเร็จ | ตรวจ error และความพร้อมของ adapter แล้ว retry |
| `degraded` | provider หรือ integration บางส่วนไม่พร้อม | ใช้เฉพาะ capability ที่สถานะพร้อม; อย่าถือว่าหลักฐานถูกบันทึกแล้ว |

run จะถือว่า `complete` ได้เมื่อทั้ง 12 stages เป็น `complete` หรือ `not_applicable` และ Graph validation ผ่านเท่านั้น. `incomplete` หรือ `failed` ห้ามถูกตีความว่าเสร็จแล้ว.

## 7. ตั้งค่า MSP สำหรับ deep scan

GoVibe เรียก **MSP parent** ผ่าน stdio MCP เพียงเส้นทางเดียว:

- MSP: `GOVIBE_MSP_COMMAND`, `GOVIBE_MSP_ARGS`, `GOVIBE_MSP_CWD`

`*_ARGS` ต้องเป็น JSON array ของ strings. ใช้เฉพาะ command และ paths ของ adapters ที่ owner อนุมัติแล้ว; ห้ามชี้ GoVibe ไป import source จาก checkout ของระบบอื่นโดยตรง. เมื่อ adapter ไม่พร้อมหรือ schema ไม่ตรง ให้แก้ integration ที่ owner ของ GKS/MSP แทนการสร้าง fallback ใน GoVibe.

การตั้งค่า command ถูกต้องยังไม่เท่ากับ MSP/GKS/storage พร้อมใช้งาน: ต้องให้ parent call สำเร็จก่อนจึง dispatch งาน governed ได้. หากไม่มี `GOVIBE_MSP_COMMAND`, ตัวแปรไม่ถูกต้อง, หรือ parent call ล้มเหลว ให้ถือว่า KB ไม่พร้อมและห้ามอ้างว่า scan/promotion/retrieval สำเร็จ.

## 8. แก้ปัญหาเบื้องต้น

- **สแกนไม่ได้เพราะ path ถูกปฏิเสธ:** ตรวจค่า `GOVIBE_ALLOWED_WORKSPACE_ROOTS` แล้ว restart Mission runtime.
- **ไม่มี Master Plan ให้เปิด:** วาง source ที่ governed ชื่อ `MASTERPLAN-*.md` ไว้ใต้ `docs/roadmap/`, มี frontmatter และเปิด runtime ใหม่.
- **Master Plan แสดง review only:** เป็นพฤติกรรมปกติสำหรับเอกสารที่ยังไม่ `approved`; ขอ owner อนุมัติก่อนใช้งานเป็น roadmap.
- **stage เป็น incomplete/failed:** เปิดรายละเอียด run และตรวจ parser coverage, GKS/MSP adapter หรือ source workspace; อย่าประกาศผล scan ว่าสมบูรณ์.
- **provider แสดง degraded:** runtime ยังเปิดได้ แต่ provider นั้นไม่พร้อม. ตรวจ command, args, working directory และ logs ของ provider แล้วจึง retry.

## 9. Checklist ก่อนส่งต่อผล

- [ ] Master Plan ที่อ้างอิงถูก review และสถานะ approval ถูกต้อง
- [ ] workspace อยู่ใน allowlist และเป็น path ที่ตั้งใจสแกน
- [ ] GKS/MSP adapters ที่จำเป็นพร้อมใช้งาน
- [ ] ทั้ง 12 stages มีสถานะ terminal
- [ ] ไม่มี `incomplete` หรือ `failed` หากจะรายงานว่า scan complete
- [ ] Graph validation ผ่าน
- [ ] ส่งต่อ run ID และ GKS/MSP references แทนการคัดลอก payload

## 10. ขอบเขต MVP

คู่มือนี้ไม่อนุญาตให้ archive RWANG, bypass policy, promote Master Plan, หรือแก้ข้อมูลใน GKS/MSP โดยตรง. RWANG ยังเป็น parity reference จนกว่าจะผ่าน cutover และ approval gates ครบ.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.2+draft | 2026-08-03 | GoVibe | Removed obsolete direct GKS configuration; clarified MSP-only preflight and non-dispatchable configuration states. |
| 0.1.1+draft | 2026-08-02 | GoVibe | Documented the required local sidecar token and explicit browser-origin trust boundary. |
| 0.1.0+draft | 2026-07-30 | GoVibe | First-use SOP for Mission Control, Master Plan review, and the 12-stage scan MVP. |
