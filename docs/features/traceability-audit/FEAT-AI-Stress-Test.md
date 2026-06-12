# FEAT-AI-STRESS-TEST: Reactor Run Controller Spec

**Task ID:** GV-S312
**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Complexity:** C-2
**Context Tier:** H2
**Author:** VIBE (Agent)

---

## 1. Vision
สร้างระบบ **Reactor Run Controller (View D1)** เพื่อเป็นหน้าจอหลักในการเริ่มและควบคุม "แคมเปญการทดสอบ AI" (Benchmark Campaigns) โดยให้ผู้ใช้สามารถเลือก Agent, กำหนดจำนวน Iterations และติดตามผลลัพธ์การประมวลผล (Success/Fail) ได้แบบเรียลไทม์

## 2. User Experience (Visual Vibe)
- **Control Dashboard**:
    - **Ignition Console**: แผงควบคุมสไตล์ห้องแล็บนิวเคลียร์สำหรับเริ่มการทำงาน
    - **Live Counters**: แสดงจำนวน Request ที่สำเร็จ, ล้มเหลว, และค่าเฉลี่ย Tokens/Sec
- **Campaign Configuration**:
    - เลือก Agent ที่จะรัน (ARCHON, VIBE, etc.)
    - ปรับความเข้มข้นของการ Stress Test (Request Volume)
- **Aesthetic**:
    - ใช้เอฟเฟกต์ **Amber / Warning Orange** เป็นหลัก
    - ปุ่มกดมีระบบ **Haptic Feedback (Visual)** และเสียงจำลอง (ถ้าเปิดใช้งาน)

## 3. Acceptance Criteria
- [ ] สามารถตั้งค่าและเริ่มแคมเปญทดสอบผ่าน UI ได้จริง
- [ ] Backend (Rust) รองรับคำสั่ง `start_ai_campaign` และส่งสถานะกลับมาเป็น Stream หรือ Event
- [ ] แสดงกราฟแท่ง (Bar Chart) แสดงอัตราความสำเร็จ (Success Rate) แบบ Real-time
- [ ] ระบบตัดการทำงานอัตโนมัติ (Auto-Emergency Stop) เมื่อความร้อน GPU เกิน 80°C (เชื่อมกับ GV-S311)
- [ ] มีระบบสรุปผล (Final Report) หลังจบแคมเปญ

## 4. Technical Architecture
- **State Management**:
    - `campaignState`: 'idle' | 'igniting' | 'running' | 'stopping' | 'emergency'
    - `campaignMetrics`: { success: number, fail: number, avgSpeed: number }
- **Backend IPC**:
    - `tauri::event`: ใช้การส่ง Events จาก Rust มาที่ React แทนการ Invoke ปกติเพื่อให้ได้ข้อมูลแบบสตรีมมิ่ง
- **UI Components**: 
    - `ReactorConsole.tsx`
    - `MetricCounter.tsx`

## 5. Domain Mapping
- Domain: **D (AI Benchmark)**
- SubModule: **D1 (Reactor Run Trigger)**

## 6. Testing Strategy
- [ ] **State Machine Test**: ตรวจสอบว่า Campaign เปลี่ยนสถานะได้ถูกต้องและไม่เกิดสถานะซ้อนกัน
- [ ] **Emergency Stop Test**: จำลองความร้อนสูงและตรวจสอบว่าระบบหยุดรันอัตโนมัติ
- [ ] **Visual Verification**: ตรวจสอบความสวยงามของแผงควบคุม Amber HUD

## 7. Out of Scope
- การรัน Model AI จริงๆ ในตัวแอป (ในเฟสนี้เน้นการ Simulate Load และรัน Mock Evaluation)

---
**Please review and approve this Spec. Once approved, I will implement the AI Stress Test Controller.**
