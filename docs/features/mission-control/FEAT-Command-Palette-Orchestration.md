# FEAT-COMMAND-PALETTE: Global Command Palette & Terminal FX

**Task ID:** GV-S410
**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Complexity:** C-2
**Context Tier:** H2
**Author:** VIBE (Agent)

---

## 1. Vision
สร้างระบบ **Command Palette (Cmd + K)** เพื่อเป็นศูนย์กลางการสั่งการแอปพลิเคชันแบบ Search-driven (เลียนแบบ Raycast) และเพิ่มความสวยงามระดับพรีเมียมให้ **Floating Terminal** ด้วยเอฟเฟกต์ 3D Tilt

## 2. User Experience (Visual Vibe)
- **Command Palette**:
    - **Trigger**: กด `Cmd + K` (หรือ `Ctrl + K` บน Windows) เพื่อเปิด-ปิด
    - **Aesthetic**: พื้นหลัง **Semi-translucent Black** เข้มข้น พร้อม `blur(24px)`
    - **Fuzzy Search**: ผลลัพธ์อัปเดตทันทีขณะพิมพ์ พร้อมคีย์ลัดสำหรับเข้าถึงเร็ว
- **Floating Terminal FX**:
    - **3D Tilt**: ตัวหน้าต่าง Terminal จะเอียงตามตำแหน่งเมาส์ (Subtle Tilt) เพื่อให้ดูมีความลึก

## 3. Acceptance Criteria
- [x] ติดตั้ง Global Keyboard Listener สำหรับ `Cmd/Ctrl + K`
- [ ] สร้างคอมโพเนนต์ `CommandPalette` แบบ Modal ที่แสดงผลทับทุกส่วนของแอป
- [ ] ระบบค้นหาสามารถเข้าถึงรายการ Domains, SubModules และรายชื่อ Agent ได้
- [ ] คอมโพเนนต์ `FloatingTerminal` รองรับ Hook `useMouseTilt`
- [ ] เมื่อกดเลือกคำสั่งใน Palette ระบบจะเปลี่ยน View หรือทำ Action นั้นทันที

## 4. Technical Architecture
- **State**: เพิ่ม `isCommandPaletteOpen: boolean` ใน Zustand `@govibe/core`
- **Hook**: ใช้ `useEffect` ที่ระดับ `App.tsx` เพื่อจับเหตุการณ์กดปุ่ม
- **UI Components**: 
    - `packages/ui/src/CommandPalette.tsx`
    - อัปเดต `apps/desktop/src/components/FloatingTerminal.tsx`

## 5. Domain Mapping
- Domain: **Global Orchestration**
- Interface: **Command Center**

## 6. Testing Strategy
- [ ] **Hotkey Test**: ยืนยันว่า Cmd+K เปิด/ปิด Modal ได้จริง
- [ ] **Search Test**: ตรวจสอบการทำงานของ Fuzzy Search (พิมพ์ "agent" แล้วต้องเจอ View A5)
- [ ] **Visual Test**: ตรวจสอบเอฟเฟกต์ Tilt บน Terminal ว่าไม่รบกวนการพิมพ์คำสั่ง

## 7. Out of Scope
- การเพิ่มคำสั่งใหม่ๆ (Custom Commands) ในเฟสนี้ (เน้นโครงสร้างก่อน)
- การบันทึกประวัติการค้นหา

## 8. Out-of-Task Dependencies
- **GV-S203** (Agent Management) - สำเร็จแล้ว
- **GV-S101** (Global State) - สำเร็จแล้ว
