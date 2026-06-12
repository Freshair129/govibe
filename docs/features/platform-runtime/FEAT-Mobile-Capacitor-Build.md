# FEAT-MOBILE-DEPLOY: Capacitor Build Spec

**Task ID:** GV-S511
**Status:** DRAFT
**Complexity:** C-3
**Context Tier:** H3
**Author:** TURBO (DevOps Specialist)

---

## 1. Vision
ขยายขีดความสามารถของ GoVibe จาก Desktop สู่ **iOS และ Android** โดยใช้ **Capacitor** เพื่อสร้างแอปแบบ Hybrid ที่ยังคงความพรีเมียมของ Glassmorphism ไว้ได้ และรองรับการดูสถานะงาน (Mission Control) ได้ทุกที่

## 2. Technical Strategy

### 📱 Native Shell (Capacitor)
- **Integration**: ติดตั้ง `@capacitor/core`, `@capacitor/cli`, และ `@capacitor/android/@capacitor/ios`
- **Asset Sync**: ใช้โฟลเดอร์ `dist` ของ Vite Desktop เป็นแหล่งข้อมูลหลัก (Shared Codebase)
- **Plugin Strategy**: ในเฟสแรกจะใช้ Web-based functionality เป็นหลัก และเตรียมความพร้อมสำหรับ Native APIs ในอนาคต

### ⚡ Performance & UI Adaptation
- **Adaptive Glass**: ตรวจสอบอุปกรณ์ Mobile หากเป็น Low-end จะทำการปรับลด Blur จาก `24px` เป็น `12px` อัตโนมัติ (Performance Mode)
- **Touch-first UI**: ปรับขนาดปุ่มใน Sidebar และ Header ให้รองรับการกดด้วยนิ้ว (Touch Targets)
- **Responsive Domains**: ปรับ Grid จาก 3-column (Desktop) เป็น 1-column (Mobile) สำหรับหน้าจอ Office และ Dashboard

## 3. Acceptance Criteria
- [ ] ติดตั้ง Capacitor และ Initialized โครงสร้างไฟล์ใน Monorepo ได้สำเร็จ
- [ ] สามารถสั่ง `npm run build` และ `npx cap sync` โดยไม่มี Error
- [ ] แอปสามารถรันบน Android Emulator หรือ iOS Simulator ได้
- [ ] ระบบ Navigation (Domain A-D) ทำงานได้ถูกต้องบนหน้าจอแนวตั้ง
- [ ] เอฟเฟกต์ 3D Tilt ถูกปิดการใช้งานบน Mobile (เปลี่ยนเป็น Gyroscope ในเฟสถัดไป)

## 4. Domain Mapping
- Domain: **RELEASE (Phase 5)**
- SubModule: **Mobile Build (GV-S511)**

## 5. Implementation Plan
1.  **Dependency Setup**: ติดตั้ง Capacitor และแพลตฟอร์มที่เกี่ยวข้อง
2.  **Configuration**: สร้าง `capacitor.config.ts` และเชื่อมโยงกับ `apps/desktop/dist`
3.  **UI Polish (Mobile)**: ปรับแต่ง CSS Media Queries ให้รองรับหน้าจอขนาดเล็ก
4.  **Native Build**: รันคำสั่งสร้าง Android Project และทดสอบรันเบื้องต้น

## 6. Out of Scope
- การเชื่อมต่อ Native Rust Commands ในเวอร์ชัน Mobile (จะใช้ Mock Data แทนในเฟสนี้)
- การทำระบบ Push Notification

---
**Please review and approve this Mobile Build Spec. Once approved, I will begin the Capacitor integration.**
