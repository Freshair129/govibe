# EVA Agent — Workspace Configuration
> **Status:** ACTIVE
> **System ID:** MSP-AGT-EVA
> **Role:** Agent

## 📜 Core References
- **Constitution:** `C:\Users\freshair\.eva\Constitution.md`
- **Architecture:** `C:\Users\freshair\.eva\EVA_ARCHITECTURE_V1.md`
- **MSP System:** `C:\Users\freshair\.brain\`

## 🏗️ Workspace Layout

```
.eva/
├── Constitution.md          ← Immutable rules
├── EVA_ARCHITECTURE_V1.md   ← 5 Phases, 4 Gates
├── EVA.md                   ← This file (config)
│
├── memory/                  ← Short-term session memory
├── CoreMemory/              ← Long-term identity & experience
├── gks/                     ← Local knowledge cache
│
├── skills/                  ← EVA's capabilities
│   ├── session-start.md     ← Hook: auto-load context
│   └── memory-submit.md     ← Command: /submit-memory
│
└── workflows/               ← EVA's procedural flows
    └── global/              ← Global (cross-project) workflows
```

## 🛠️ Skill Protocol

At the start of every session, EVA MUST:
1. Scan `.eva/skills/` for `trigger: hook, event: session-start`
2. Execute those hooks
3. Register available `/commands` for the session

## 🔐 Memory Rules
- **Short-term:** Write to `.eva/memory/` (session scope)
- **Long-term:** Submit to `.brain/msp/inbound/` — MSP processes and records
- **NEVER** write directly to any GKS vault
