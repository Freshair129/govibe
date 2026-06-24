---
doc_id: "API-002-SYMBOL-LINKING"
uid: "01KVXGFSJRZPCXQV05BJ5FJZVC"
title: "API-002: Symbol Linking & Search Contract"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:24969edec4f6aba1"
updated: "2026-06-24"
owner: "User (Boss)"
type: api
---
# API-002: Symbol Linking & Search Contract

**Status:** APPROVED
**Date:** 2026-06-07
**Approved By:** User (Boss)
**Protocol:** Tauri IPC
**Related Task:** GV-S210, GV-S220

---

## 📡 `search_symbols`
คำสั่งสำหรับค้นหา Data / Code Symbols แบบ Semantic หรือ Keyword Match จำลองจาก GenesisBlockDB

### 🔹 Input Request
```typescript
{
    "query": string,     // คำค้นหา เช่น "user authentication"
    "limit": number      // (Optional) จำนวนผลลัพธ์สูงสุด ค่าเริ่มต้น 10
}
```

### 🔹 Output Response (Rust -> React)
ส่งกลับเป็น Array ของ `CodeSymbol` ที่เรียงลำดับตามความแม่นยำ (`similarity`)

```typescript
[
    {
        "id": "src/core/auth.ts:login",
        "name": "login",
        "kind": "function",
        "path": "src/core/auth.ts",
        "snippet": "export const login = async (user: string) => { ... }",
        "similarity": 0.95
    },
    {
        "id": "docs/features/FEAT-Auth.md:AuthFlow",
        "name": "Auth Flow Spec",
        "kind": "doc",
        "path": "docs/features/FEAT-Auth.md",
        "snippet": "The authentication flow requires a JWT token...",
        "similarity": 0.82
    }
]
```

## 🚨 Error Handling
- หากไม่มีฐานข้อมูลหรือไม่พร้อมทำงาน ให้ตอบกลับด้วย Error string ธรรมดาผ่าน `Result::Err`
- Frontend ต้องรับค่าและจับ `try...catch` จาก `useGateway` พร้อมแสดงแจ้งเตือน (Toast/Badge)

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | User (Boss) | Brought under document governance (docs:backfill): frontmatter + changelog. |
