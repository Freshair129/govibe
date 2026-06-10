# API-001: GoVibe Backend IPC Gateway Contract

**Status:** `APPROVED`
**Date:** 2026-06-06
**Approved By:** User (Boss)
**Task ID:** `GV-S301`
**Protocol:** Tauri IPC (JSON-RPC over WebView Bridge)

---

## 1. Overview (ภาพรวม)
เปลี่ยนการดึงข้อมูลจาก Mock Constants มาเป็นการดึงข้อมูลผ่าน **Tauri Rust Commands** เพื่อจำลองการเชื่อมต่อกับระบบจริง (Real Entry Point) ก่อนที่จะต่อกับฐานข้อมูล GenesisBlockDB ต่อไป

## 2. Command Definitions (ชุดคำสั่ง Rust)

### 📡 `get_system_state`
ดึงสถานะเริ่มต้นของแอปพลิเคชัน (Active Domain, Global Config)
- **Input:** None
- **Output:** `SystemState` JSON

### 🤖 `get_agents`
ดึงรายการ Agent ทั้งหมดจาก Backend
- **Input:** None
- **Output:** `Vec<Agent>` JSON

### 📋 `get_roadmap`
ดึงรายการ Task และสถานะความคืบหน้า
- **Input:** None
- **Output:** `RoadmapData` JSON

### ⚡ `update_task_status`
ส่งคำสั่งอัปเดตสถานะงานไปยัง Backend
- **Input:** `taskId: String`, `status: String`
- **Output:** `Result<bool, String>`

## 3. Frontend Integration (`packages/core`)
เราจะสร้าง Hook **`useGateway`** เพื่อทำหน้าที่เป็น "Single Entry Point" ในการเชื่อมต่อกับ Rust Backend

```typescript
// Example usage in React
const { syncData, isOnline } = useGateway();
useEffect(() => { syncData(); }, []);
```

## 4. UI Fixes & Optimization
- [ ] แก้ไข Runtime Error ในการดึงรูปภาพ (ตรวจสอบ path รูปภาพใน `CharacterPortrait`)
- [ ] ป้องกัน Component Re-render โดยใช้ `useMemo` ในส่วนของการคำนวณ Progress
- [ ] เพิ่มสถานะ "Loading" ขณะรอข้อมูลจาก Rust Backend

---
**Please review and approve this API Contract. Once approved, I will implement the Rust Commands and the Frontend Bridge.**
