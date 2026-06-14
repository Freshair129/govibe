# Roadmap: Mission Control Stabilization
**ID:** `GV-SYS1A-ROADMAP-01`
**Status:** Approved
**Owner:** ARCHON (CTO)

---

## Phase 1: Real-time Data Hydration
**Goal:** เชื่อมต่อ UI Shell เข้ากับ GenesisBlockDB โดยตรง

### Backlog
- **Task T1: Data Service (GKS)** - สร้าง Service ดึงข้อมูลผ่าน MCP
- **Task T2: Store Binding** - เชื่อม Zustand Store เข้ากับ Service
- **Task T3: UI Hydration** - ผูก UI เข้ากับ Store จริง

### Criteria
- **AC:** MC UI โหลดข้อมูลจาก DB ได้จริง, UI อัปเดตแบบ Real-time
- **SC:** ลบ Mock Data ออกจากซอร์สโค้ดทั้งหมด, UI Latency < 200ms
- **Exit C:** Validator ผ่านการตรวจสอบ Schema สำหรับ Real-data bindings

---

## Phase 2: Agent Telemetry Overlay
**Goal:** แสดงผลข้อมูลจาก `SessionTracker` ใน UI

### Backlog
- **Task T4: Telemetry Pipeline** - ต่อ Event Stream จาก Runtime เข้า MCP
- **Task T5: Agent Pulse UI** - สร้าง Dashboard แสดงสถานะ Agent (Token/Latency)
- **Task T6: Alerting Overlay** - แสดงผลแจ้งเตือนเมื่อเกิด Critical Error

### Criteria
- **AC:** ผู้ใช้เห็นข้อมูลสถานะ Agent จริงใน UI
- **SC:** 100% ของ Trace Logs เชื่อมโยงกับ Session ID
- **Exit C:** Security Audit ผ่าน (ไม่มี PII รั่วไหลใน Log)

---

## Phase 3: Operational Control
**Goal:** เปลี่ยน UI ให้เป็น Command Center ที่สั่งงาน Agent ได้

### Backlog
- **Task T7: Action Integration** - ผูกปุ่ม UI กับ MCP Tools (`msp_candidate`, `agent.run`)
- **Task T8: State Machine** - บังคับ Workflow สถานะงานใน DB
- **Task T9: Human-in-the-loop Gate** - ระบบ Approve PR/Review ผ่าน Dashboard

### Criteria
- **AC:** ทุกปุ่มต้องทำงานบน Action จริงใน DB, ห้ามกดข้าม Phase
- **SC:** ระบบใช้งานได้ครบจบในหน้าเดียว (End-to-End)
- **Exit C:** Audit Log บันทึกทุกความเคลื่อนไหวจาก UI
