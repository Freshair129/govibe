---
title: RUNBOOK::GoVibe-Multi-Agent
summary: AI-Native Visual Vibe Code Platform and Multi agent manager
doc_id: GVDOC-3001
created: "2026-06-02T19:40:00+07:00,Boss(CEO)"
updated: "2026-06-02T19:40:00+07:00,Boss(CEO)"
version: "1.0.0b"
status: active
state: active
type: framework
vault_id: default
source_type: axiomatic
tags:
  - architecture
  - compaction
  - scaling
  - graph
  - framework
aliases:
  - "FRAMEWORK--"
  - "FRAMEWORK::"
  - "FRAMEWORK::HIERARCHY-COMPACTION-STANDARDS"
role: Governance / architectural framework
wikilink:[[FRAMEWORK--HIERARCHY-COMPACTION-STANDARDS]]
crosslink:

---
GoVibe :: AI-Native Visual Vibe Code Platform and Multi agent manager

## 1. Coordination Layers
| Layer | Scope | Key Mechanisms |
|---|---|---|
| **Layer1: Native Teams** | In-Session | Delegate Mode (Shift+Tab), Plan Approval, Hooks, Shared Task List|
| **Layer2: 3 Pillars** | Cross-Session | GitHub (Code), GoVibe (Tasks), GenesisBlockDB (Knowledge/GKS) |

## 2. Roles & Responsibility Matrix
| Role  | Resp | Can | Cannot |
|---|---|---|---|
| **USER**  | Final Gate | Approve Specs/ADR, Final PR Merge | Skip quality gates |
| **LEAD (T3)** | PM/Architect | Plan, Review, Merge, File Locks | Push to main without PR |
| **TEAMMATE (T2,T1)** | Implementer | Claim tasks, Push code, Create PR | Merge to main, skip plans |
| **AUDITOR** | Compliance | Audit PRs vs Spec/Design System | Modify production code |

## 3. Layer 1 — Runtime Controls
- 3.1. **Delegate Mode (Shift+Tab):** Lead locks into PM-only role (No Bash/Edit tools). Mandatory for teams ≥ 3.
- 3.2. **Plan Approval:** Complex tasks start in read-only mode. Lead must approve plan before implementation.
- 3.3. **Hooks:**
   - `TeammateIdle`: Auto-assign review or next task on idle.
   - `TaskCompleted`: Enforce test/lint pass before closing task.
- 3.4. **Shared Task List:** Unified board for self-claiming and dependency tracking.

## 4. Layer 2 — The 3 Pillars (Artifact-Based)
### **Pillar 1: GitHub — Code Coordination**
```
main (protected — ห้าม push ตรง)
 │
 ├── GVBR-01-Write-API-Spec-LYRA   ← Teammate A (working)
 ├── GVBR-02-Write-UI-Spec-RWANG        ← Teammate B (working)
 └── GVBR-03-Write-DB-Spec-ATHER         ← Teammate C (working)
```

**Rules:**
1. **1 Sprint = 1 Branch** 
2. **Branch → PR → Review → Squash Merge** (no direct push to main)
3. **PR Template** auto-links: 
4. **CI runs on every PR**: lint, type-check, prisma validate, edge-safe check
5. **Lead merges** — Teammates create PRs but don't merge

**Branch naming:** `GVBR-{number}-{branch-name}-{agentcodename}`

**PR as the handoff point:**
```
Teammate finishes code → creates PR (GitHub)
  → PR description links to: Phase-Sprint-Feature
  → CI runs automatically
  → Lead reviews (code + spec compliance)
  → USER reviews (if H3 and above or critical issue)
  → Lead merges → merges to main
  → GoVibe updates task status to complete and auto-closes (via GitHub integration)
```

**PR Template (`PULL_REQUEST_TEMPLATE.md`):**
```
## GitHub
<!-- Link to GoVibe Task -->
Closes GV-{X}

## Documents
- **Roadmap** `docs/roadmap/ROADMAP-govibe-mcp-runtime.md`
- **IMP:** `.eva/devlog/implement/EVA-IMP-{XXXX}.md`
- **TSK:** `.eva/devlog/tasks/EVA-TSK-{DATE}-{NNN}.md`

## Changes
<!-- What was changed and why -->

## Checklist
- [ ] Acceptance Criteria met (all [x] in TSK)
- [ ] No console errors
- [ ] Spec compliance verified
- [ ] File locks released
- [ ] Linear status synced
```


4.2. **GoVibe (Status & Management):**
- **Hierarchy:** Masterplan ➔ Roadmap ➔ Phase/Theme ➔ Epics ➔ Stories/Specs ➔ Tasks ➔ Subtasks/PRs (planning levels — not to be confused with H-axis Access Scope)
- **Labels:** `plan-review` (Yellow), `plan-approved` (Green), `file-lock` (Gray), `blocked` (Red).
- **Self-Claiming:** Teammates self-assign tasks; assignment = file lock declaration.

4.3. **GKS/Knowledge (Docs):**
- **Structure:** `docs/features/` (Specs), `docs/adr/` (Architecture), `.agents/devlog/` (Logs).
- **Flow:** Intent → Spec → SDD (Design) → IMP (Plan) → Code.

## 5. Hooks
**TeammateIdle** — Triggers when a Teammate is about to go idle
- Exit code `0` → Teammate idles normally
- Exit code `2` → Sends feedback string to Teammate, prompting more work
- Use cases: auto-assign code review, claim next Todo, run cleanup tasks

**TaskCompleted** — Triggers when a task is about to be marked complete
- Exit code `0` → Task completes
- Exit code `2` → **Blocks completion** + sends feedback explaining why
- Use cases: enforce test pass, lint clean, AC checked off, walkthrough written

**Why it matters:** Nicholas Carlini built a 100K-line C compiler that compiled
Linux 6.9 using 16 agents over ~2,000 sessions ($20K API costs) — the key was
having a strong test harness that hooks could enforce.

## 6. Shared Task List

Kanban board visible to all agents in the team:

| Mechanism | What It Does |
|---|---|
| **3 statuses** | `pending`, `in_progress`, `completed` |
| **Dependencies** | Tasks with unmet `locked_by` cannot be claimed |
| **Self-claiming** | Teammates pick next available task automatically when free |
| **File locking** | Teammate declares files; system prevents concurrent edits |
| **Toggle UI** | Press **Ctrl+T** to view task list anytime |

**Self-claiming flow:** Just like an Agile team picking tickets from the board —
no Lead intervention required for routine work distribution.

## 7. File Locking & Communication
7.1. **File Locking (GoVibe):**
- **Declare:** Comment on issue: `🔒 Claiming [ID] | Files: [paths]`.
- **Check:** Scan `In Progress` issues for overlaps before claiming.

## Agent Roles

### **T3** - Lead Agent (Architect)

| Attribute | Value |
|---|---|
| **Model** | required top tier model, ex: Opus, gemini-3-pro-preview, gpt-5.5-pro, qwen3.7-plus | high complexity decisions |
| **Responsibilities** | Plan features, create IMPs, break into tasks, review PRs, approve plans, merge to main |
| **Can do** | Write specs, create ADR, approve/reject plan, merge PR, modify GEMINI.md |
| **Cannot do** | Approve own plans (USER reviews ), push to main without PR |

### **T2+T1**  - Teammate Agent (Implementer)

| Attribute | Value |
|---|---|
| **Model** | recommended mid tier model, ex: Sonnet, gemini-2.5-flash, gpt-5.2-codex, qwen3.7-plus  |
| **Responsibilities** | Claim tasks, implement code, create PRs, write walkthroughs |
| **Can do** | Claim TODO tasks, push to feature branch, create PR |
| **Cannot do** | Merge to main, modify specs without Lead review, skip plan approval |

### Auditor Agent (optional)

| Attribute | Value |
|---|---|
| **Model** | any mid or high tier model |
| **Responsibilities** | Spec compliance check, code review, identify drift |
| **Triggers** | After PR created, before merge |

### USER (Human)

| Attribute | Value |
|---|---|
| **Role** | Product Owner + Final Approver + force-majeure override |
| **Responsibilities** | Approve specs (Gate 2), approve ADRs (Gate 3), review critical PRs |

## 6. Model Capability Matrix
### *Cloud Hosted Agent*
|                          Tier|          Anthropic |          Google AI |             OpenAI |               Qwen |
|                           ---|                ---|                ---|                ---|                ---|
|       **T3 (Architect/Lead)**| Opus 4.7    | gemini-3.1-pro-preview   |  gpt-5.5-pro     | qwen3.7-plus  |
|  **T2 (Senior Implementer)** | Sonnet 4.5  | gemini-3.5-flash  | gpt-5.3-codex      | qwen3.7-plus       |
|       **T1 (Junior/Routine)**| Haiku 4.5   | gemini-2.5-flash  | gpt-5.2-codex  | qwen3.7-plus  |
|       **Embedding**          |          -         |gemini-embedding-2 |text-embedding-3-large|          -         |

### *Local Hosted Agent ( Ollama )*
|                          Tier|               Google AI    |                     Qwen |          Ollama |                                      Jina |sillykiwi|gpustack|unsloth|
|                           ---|                         ---|                       ---|              ---|                                        ---|---|---|-|
|       **T3 (Architect/Lead)**| gemma-4:12B                |          Qwen3.0:14B     |               - |                                         - |-|-|-|
|  **T2 (Senior Implementer)** | gemma4:e2b                 |          sushirl:9B      |               - |                                         - |-|-|-|
|       **T1 (Junior/Routine)**| gemma-2-2b                 |          qwen3.5:4B      | llama3.2:1b |                                         - |-|-|-|
|       **Specialized**        | gemma4-rust-coder-Q8/Q4    | Qwen3-VL-Embedding:2B    |-|jina-embeddings-v5-omni-small-retrieval|Aroow-Rust-Coder-9B|bge-reranker-v2-m3|orpheus-3b-0.1-ft|
|       **Embedding**          |                  -         |  Qwen3-Embedding-0.6B    |                 |              jina-code-embeddings-1.5b|-|bge-m3|-|


## 7. Conflict Resolution
1. **Overlaps:** If urgent, Lead splits file sections or sequences tasks (B depends on A).
2. **Disputes:** Lead decides,User is ultimate authority for architectural/scope changes.
