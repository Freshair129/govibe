---
doc_id: "FEAT-AI-BENCHMARK-HEATMAP"
uid: "01KVXGFVYTHBGQQWE0MGZ8ZKGK"
title: "FEAT-AI-BENCHMARK: Cyber Reactor Heatmap Spec"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:99a446bfdd7cac7b"
updated: "2026-06-24"
owner: "VIBE (Agent)"
type: feature
---
# FEAT-AI-BENCHMARK: Cyber Reactor Heatmap Spec

**Task ID:** GV-S310, GV-S311
**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Complexity:** C-2
**Context Tier:** H2
**Author:** VIBE (Agent)

---

## 1. Vision
สร้างระบบ **Cyber Reactor Heatmap (View D2)** เพื่อเป็นศูนย์กลางการตรวจสอบความปลอดภัยของฮาร์ดแวร์ (Hardware Safety) และติดตามประสิทธิภาพการรัน AI แบบเรียลไทม์ โดยเน้นการแสดงผลที่เข้าใจง่ายและรวดเร็ว

## 2. User Experience (Visual Vibe)
- **Heatmap Grid**: 
    - ตารางขนาด 8x8 แสดงโหนดความร้อน
    - สีเปลี่ยนตามอุณหภูมิ: Blue (เย็น) -> Amber (อุ่น) -> Red Pulse (ร้อนจัด)
- **Telemetry HUD**:
    - แสดงอุณหภูมิ GPU/CPU ปัจจุบัน
    - แสดงค่า "Thermal Headroom" (อุณหภูมิที่เหลืออยู่ก่อนถึงขีดจำกัด)
- **Reactor Control**:
    - ปุ่ม "Ignite Reactor" สำหรับเริ่มการทดสอบ Benchmark

## 3. Acceptance Criteria
- [ ] สามารถแสดงตาราง Grid 64 ช่องที่อัปเดตสีตามข้อมูลจำลอง (หรือข้อมูลจริง) ได้
- [ ] Backend (Rust) มีคำสั่ง `get_hardware_telemetry` เพื่อดึงค่าความร้อน
- [ ] ระบบมีระบบแจ้งเตือน (Critical Alert) เมื่ออุณหภูมิเกิน 75°C
- [ ] กราฟใน Dashboard (A1) ต้องซิงค์กับข้อมูลจากระบบ Benchmark
- [ ] UI มีเอฟเฟกต์ "Scanline" และ "Glow" เพื่อคงความเป็น Cyberpunk 

## 4. Technical Architecture
- **Backend (Rust)**:
    - คำสั่ง `get_hardware_telemetry`
    - (Option) ใช้ไลบรารี `sysinfo` ในอนาคตเพื่อดึงค่าจริง
- **Frontend (React)**:
    - คอมโพเนนต์ `HeatmapGrid.tsx`
    - คอมโพเนนต์ `TelemetryHUD.tsx`
- **State**: จัดเก็บ `telemetryHistory` ใน Zustand `@govibe/core`

## 5. Domain Mapping
- Domain: **D (AI Benchmark)**
- SubModule: **D2 (Cyber Reactor Heatmap)**

## 6. Testing Strategy
- [ ] **Data Sync Test**: ตรวจสอบว่า UI อัปเดตเมื่อ Backend ส่งค่าอุณหภูมิใหม่มา
- [ ] **Threshold Test**: ตรวจสอบว่าสีเปลี่ยนเป็นสีแดงเมื่อค่าอุณหภูมิสูงกว่าที่กำหนด
- [ ] **Performance Test**: ตรวจสอบว่าการอัปเดต Grid ถี่ๆ ไม่ทำให้ UI หน่วง

## 7. Out of Scope
- การเก็บประวัติความร้อนลงฐานข้อมูลถาวร
- การควบคุมรอบพัดลม (Fan Control)

## 8. Out-of-Task Dependencies
- **GV-S301** (Backend Gateway) - สำเร็จแล้ว
- **GV-S002** (Desktop App) - สำเร็จแล้ว

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | VIBE (Agent) | Brought under document governance (docs:backfill): frontmatter + changelog. |
