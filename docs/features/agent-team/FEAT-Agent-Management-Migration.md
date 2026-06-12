# FEAT-AGENT-MIGRATION: Agent Management View Spec

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Task ID:** `GV-S203`
**Impact to:** `apps/desktop`, `packages/ui`, `@govibe/core`

---

## 1. Goal (เป้าหมาย)
Migrate หน้า **Agent Management (View A5)** จาก HTML/JS เดิม มาเป็น React Components ที่สมบูรณ์ โดยเน้นความ Interactive ของ 3D Carousel และ 3D Flip Card Config

## 2. Component Design (การออกแบบคอมโพเนนต์)

### 🧩 New Shared UI (`packages/ui`)
1.  **`InteractiveCard3D`**: คอมโพเนนต์พื้นฐานที่รองรับ Tilt effect (Perspective) และ Glare
2.  **`Carousel`**: คอมโพเนนต์สำหรับแสดงรายการ Agent ในรูปแบบ Vertical Arc

### 🤖 Desktop View Components (`apps/desktop`)
1.  **`AgentManagementView`**: Orchestrator หลักที่คุม State ของ Agent ที่ถูกเลือก
2.  **`AgentRoster`**: ฝั่งซ้ายแสดง Stats (Tasks, Accuracy, Speed) และ Carousel
3.  **`CharacterPortrait`**: ฝั่งขวาแสดงรูปภาพ/วิดีโอของ Agent พร้อมเอฟเฟกต์ 3D Flip
4.  **`AgentConfigForm`**: ด้านหลังของการ์ด (Flip) สำหรับตั้งค่า System Prompt, Model, API Key

## 3. Implementation Plan (ขั้นตอน)

1.  **Extract Agent State**: เพิ่ม `selectedAgentIdx` และ `agents` data เข้าสู่ Zustand store ใน `packages/core`
2.  **Build 3D Components**:
    *   สร้าง Hook `useMouseTilt` สำหรับคำนวณองศาการเอียงตามเมาส์
    *   สร้างคอมโพเนนต์ `FlipCard` สำหรับสลับหน้า Character และ Config
3.  **Implement Carousel Logic**: 
    *   แปลง Vertical Arc logic จาก `agents.js` มาเป็น React transition
    *   รองรับ Keyboard navigation (ArrowUp/Down)
4.  **Media Preloading**: จัดการการโหลดวิดีโอพื้นหลังของ EVA/QWEN ให้ไหลลื่น

## 4. Verification (การตรวจสอบ)
- [ ] สลับ Agent ผ่าน Carousel ได้ลื่นไหล (60 FPS)
- [ ] เอฟเฟกต์ 3D Flip Card ทำงานถูกต้องและไม่หลุด Layout
- [ ] ข้อมูลในการตั้งค่า (Config) ถูกผูกติดกับ State และบันทึกลง Store ได้จริง
- [ ] รองรับการสลับวิดีโอ (VDO Switcher) สำหรับ Agent ที่มีหลาย Feed

## 5. Template Interaction Parity Addendum

The A5 React migration must preserve these interaction styles from `GoVibe-Mission-Control-template.html`:

- `interactive-card`: preserve-3D transform style, hover border/glow elevation, and glare driven by `--mouse-x` / `--mouse-y`.
- Raycast 3D Agent Cards: `raycast-perspective-container` around `1000px`, `raycast-agent-card` glass blur, shine/glare overlay, preserve-3D child lift, agent-specific hover shadow, pointer tilt up to about `15deg`, and neutral reset on pointer leave.
- Agent drag follow-cursor: dragging a `raycast-agent-card[data-agent]` creates a fixed floating clone that follows the pointer, uses `rotate(-5deg) scale(1.05)`, fades the source card, switches to grabbing cursor state, and highlights task drop targets under the pointer.
- Character portrait console: `character-perspective` around `1500px`, `character-tilt` preserve-3D, pointer tilt up to about `6deg`, and reset easing on pointer leave.

---
**Please review and approve this Spec. Once approved, I will begin implementing the Agent Management system.**
