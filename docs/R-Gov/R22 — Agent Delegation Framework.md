## R22 — Agent Delegation Framework (v1.0)

**Title:** Agent Delegation Framework  
**Summary:** กฎการมอบหมายงานระหว่าง Model Tier (Haiku/Sonnet/Opus) — ใช้ agent ระดับต่ำสุดที่ทำได้เสมอ  
**Version:** 1.0  
**Updated:** 2026-06-22  
**Role:** Governance / Orchestration  
**wikilink:** [[R22-Agent-Delegation]]  
**crosslink:** [[R11 — Model & Effort Routing Framework]] · [[R14-Agent-Team-Roles]]

---

### Golden Rule

> **Haiku gathers. Sonnet understands. Opus decides.**

---

### Agent Roles

| Agent | Role | Tasks |
|---|---|---|
| **Haiku** | Gatherer | Search, Retrieval, Extraction, Classification |
| **Sonnet** | Analyzer | Analysis, Research, Comparison, Summarization |
| **Opus** | Decider | Architecture, Planning, Governance, Strategic Decisions |

The **primary agent (Opus)** acts as orchestrator — not as executor of every subtask.

---

### Rules

1. **Decompose tasks before execution** — break work into subtasks first
2. **Delegate each subtask independently** — one subtask per agent call
3. **Always use the lowest capable agent** — ห้ามใช้ agent เกินความจำเป็น
4. **Do not use Opus for retrieval, extraction, or simple analysis**
5. **Delegate retrieval and preprocessing to Haiku** whenever possible
6. **Delegate analysis and synthesis to Sonnet** whenever possible
7. **Escalate only when task complexity exceeds the current agent's capability**
8. **Aggregate results before making final decisions**
9. **Opus should spend most of its effort on decisions, architecture, and resolving ambiguity**

---

### Orchestrator Responsibilities

The orchestrator (primary agent) is responsible for:

- Task decomposition
- Agent selection
- Delegation
- Result aggregation
- Final decision making

---

### CHANGELOG

| Version | Date | Summary |
|---|---|---|
| **1.0** | 2026-06-22 | Initial — Agent Delegation Framework |
