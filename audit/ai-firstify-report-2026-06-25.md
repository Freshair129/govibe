# AI-Firstify Assessment Report

**Project:** GoVibe Mission Control (`G:\govibe`)
**Date:** 2026-06-25
**Mode:** Audit (read-only) — Re-engineer phases pending user approval
**Auditor:** Claude (Opus 4.7) under the `ai-firstify` skill
**Revision:** v2 (incorporates adversarial sub-agent review — see "Skeptic Review Adjustments" at end)

## Overall Score

| Dimension | Score | Summary |
|-----------|-------|---------|
| 1. Project Structure | 🟡 YELLOW | CLAUDE.md / .gitignore / git ทุกอย่างดี; **top-level พลุกพล่าน 30+ files** (15 ad-hoc .md, 14 .log, .cjs/.html scratch) ที่ควรย้ายหรือลบ |
| 2. Agent Architecture | 🟢 GREEN | **ไม่มี embedded agent / LLM SDK / agent framework เลย** — `.agents/` คือ governance docs + session logs ไม่ใช่ runtime; MCP server คือ standard protocol |
| 3. Skill Usage | 🔴 RED | **`.claude/skills/` ไม่มี** เลย ทั้งที่มี 10+ repeated workflows ใน `scripts/docs/` ที่ควร wrap เป็น skill (bump-doc, hash, validate, derive-crosslinks, msp-evidence) |
| 4. Scope & Complexity | 🟡 YELLOW | React/Vite dashboard มี rationale (operational command center) แต่ก็ใหญ่ — 18M `.agents/`, multiple ad-hoc summary docs, scope ครอบหลายเรื่อง (dashboard + MCP + governance + engine + agent registry) |
| 5. Context Hygiene | 🔴 RED | CLAUDE.md 105 บรรทัดดี **แต่** AGENT.md (64) + AGENTS.md (98) + GEMINI.md (**142, เนื้อหาจริงไม่ใช่ stub**) = 304 บรรทัดซ้ำซ้อน + top-level pollution (15 ad-hoc .md + 11 .log) + 138 session_logs.jsonl tracked ใน git tree |
| 6. Safety | 🟢 GREEN | .gitignore ครบ (.env*, .npmrc, credentials); ไม่พบ secret hardcoded; pre-commit governance gate; human-in-the-loop ตอน publish |
| 7. Workflow Design | 🟡 YELLOW | Governance gate + prescriptive doc lifecycle = ดีมาก **แต่** vitest จริงมีแค่ ~28 cases ใน 4 ไฟล์ครอบ React dashboard ที่ใหญ่ → coverage บาง; ไม่มี `.claude/settings.json` permissions/hooks; ไม่มี baked-in sub-agent review pattern |

**ภาพรวม:** GoVibe เป็นโปรเจกต์ที่ **engineering discipline สูงและซื่อสัตย์** (governance, testing, no-mock-data rule) แต่ขาด **skill-first orientation** ตามที่ AI-firstify ออกแบบมาบังคับ — `.claude/skills/` ว่าง, workflows ที่ repeat อยู่ใน `scripts/docs/*.mjs` ไม่ได้ถูก lift ขึ้นเป็น Claude Code skill, และ top-level รก ตามด้วยการมี 3 AI-guidance files ที่ซ้ำซ้อน

## Priority Recommendations

1. **[HIGH]** สร้าง `.claude/skills/` พร้อม 3 skill หลัก wrap workflows ที่ใช้บ่อย (docs-bump, baseline-check, roadmap-sync) — reuse `scripts/docs/*.mjs` เป็น skill `scripts/` validation tools — **effort: ~4-6 ชม.** (ไม่มี skill pattern เดิมใน repo ให้ copy ต้องออกแบบ schema จาก template `ai-firstify` เอง)
2. **[HIGH]** ลบ runtime artifacts ออกจาก git tree: **138 session_logs.jsonl ใน `.agents/`** + 11 `*.log` ที่ root — gitignore + `git rm --cached` — **effort: ~30 นาที** *(single largest source of repo bloat; เคย CI/clone friction)*
3. **[HIGH]** กวาด top-level ad-hoc docs: ย้าย E2E_*, SETUP_COMPLETE, TEST_RESULTS_SUMMARY, FINAL_SUMMARY, GITHUB_ACTIONS_SETUP, GoVibe_Implementation_Plan, implementation_plan_template, README_E2E_TESTS ลง `docs/archive/snapshots-2026-06/` — **effort: ~30 นาที** *(⚠ อย่าลบ `index.html` = Vite entrypoint; อย่าลบ `fix.cjs` ก่อนยืนยัน — เป็น one-shot Thai-encoding fixer (Latin1→UTF-8) อาจยังใช้)*
4. **[HIGH]** Consolidate AGENT.md + AGENTS.md + GEMINI.md — GEMINI.md มี **142 บรรทัดของเนื้อหาจริง** (ไม่ใช่ thin bridge ตามที่ CLAUDE.md บอก) ต้องอ่านว่า Gemini CLI โหลดอะไร, ย้ายเนื้อหาที่ duplicate ออก, รักษา compat — **effort: ~45-60 นาที**
5. **[MEDIUM]** สร้าง skill สำหรับ engine workflow (`hybrid-meter doctor` + `run --repo`) — `.claude/skills/engine-doctor/` + `engine-run/` — **effort: ~1.5 ชม.**
6. **[MEDIUM]** สร้าง `.claude/settings.json` กำหนด permissions/hooks ที่เหมาะกับ govibe (governance gate hook, allow scripts/docs/* etc.) — ตอนนี้ MISSING — **effort: ~30 นาที**
7. **[LOW]** Document scope ของ `.agents/` (governance docs ไม่ใช่ runtime), `scripts/mcp/*` (MCP = standard protocol) และ `ref/` (= reference subtree?) ใน CLAUDE.md เพื่อกัน reviewer ตีความผิด — **effort: ~15 นาที**

## Detailed Findings

### Dimension 1: Project Structure (🟡 YELLOW)

**ดี:**
- `CLAUDE.md` 105 บรรทัด — ต่ำกว่า 200 (green threshold), focused, มี Commands / Architecture / Conventions ครบ
- `.gitignore` มี entries ครบทั้ง runtime, secrets, IDE noise, build artifacts
- Git active — 5 commits ใน 6 ชม. ที่ผ่านมา, recent message style ดี (Conventional Commits)
- packages/govibe-core/ เริ่มมี monorepo discipline

**ต้องแก้:**
- **Top-level พลุกพล่าน:** 15 .md ไฟล์ (ad-hoc summaries) + 14 .log + `fix.cjs` + standalone HTMLs
- ad-hoc summary docs ที่ควรย้ายหรือลบ:
  ```
  E2E_IMPLEMENTATION_CHECKLIST.md   E2E_QUICK_START.md      E2E_TESTING.md
  FINAL_SUMMARY.md                  SETUP_COMPLETE.md       TEST_RESULTS_SUMMARY.md
  GITHUB_ACTIONS_SETUP.md           README_E2E_TESTS.md     implementation_plan_template.md
  GoVibe_Implementation_Plan.md     covibe-roadmap-export*.json
  ```
- Log files ใน root (11 ไฟล์ sidecar-*.log, vite-*.log) — gitignore เพิ่งใส่ แต่ไฟล์เก่ายังอยู่ใน working tree, ต้อง `git rm --cached`
- `fix.cjs` = Thai-encoding repair script (Latin1→UTF-8) — verify แล้วเป็น one-shot utility; **ไม่ใช่ scratch**, อย่าลบโดยไม่ถาม
- `index.html` = Vite entrypoint, **ไม่ใช่ pollution**
- `GoVibe-Domain-A-Project-Overview.html` + `GoVibe-Mission-Control-template.html` = standalone HTMLs ใน root — ยังไม่ verify ว่า Vite-referenced หรือเป็น static demos

### Dimension 2: Agent Architecture (🟢 GREEN)

**Verified — ไม่ใช่ embedded agent:**
- `grep -E '"(openai|anthropic|langchain|llamaindex|autogen|crewai)"' package.json` → **เปล่า**
- `grep chat/completions src/` → **เปล่า**
- `scripts/mcp/govibe-mcp-server.mjs` import เฉพาะ runtime-core/sidecar-server/handlers (in-house Node), ไม่มี LLM SDK
- `.agents/` แม้จะมี 18MB และ 160 .md กับ role-based folders (auditor/backend/cto/devops/frontend/pm/qa/tech_lead) แต่ดูเนื้อหาแล้วทั้งหมดเป็น **governance documentation + per-role contracts (AGENT.md) + context packets + session traceability** ไม่ใช่ runtime

> ⚠️ ระดับ AI-firstify ภายนอกอาจตีความว่า `.agents/` เป็น "custom agent framework" จาก folder names ที่เลียนแบบ org chart — แนะนำเขียน note สั้นใน CLAUDE.md ระบุชัดว่า `.agents/` = governance docs ไม่ใช่ runtime

### Dimension 3: Skill Usage (🔴 RED — ประเด็นใหญ่สุด)

**สถานะปัจจุบัน:**
- `.claude/` มีแค่ `launch.json` (สำหรับ preview server)
- **ไม่มี `.claude/skills/` เลย**
- ไม่มี SKILL.md, ไม่มี references/, ไม่มี progressive disclosure

**แต่มี workflows ที่ควรเป็น skill อย่างชัดเจน:**
| Existing workflow | ที่อยู่ปัจจุบัน | ควรเป็น skill |
|---|---|---|
| Bump doc version + content_hash + registry | `scripts/docs/bump-doc.mjs` | `.claude/skills/docs-bump/` |
| Baseline gate (docs:validate + lint + build) | `package.json: baseline:check` | `.claude/skills/baseline-check/` |
| Roadmap reality-sync + bump | ทำซ้ำมาก ๆ ใน session นี้ | `.claude/skills/roadmap-sync/` |
| Create new governed doc | `scripts/docs/create-doc.mjs` | `.claude/skills/doc-create/` |
| Engine `hybrid-meter run --repo` | manual | `.claude/skills/engine-run/` |
| Engine `doctor` preflight | `engine/orchestration/orchestrator.mjs doctor` | `.claude/skills/engine-doctor/` |

**ผลกระทบ:** Claude (และ subagent) ตอนเจอ task ใน govibe ต้องอ่าน CLAUDE.md + ค้นใน scripts/ เอง → ทำซ้ำ overhead ทุก session แทนที่จะใช้ prescriptive skill ที่มี validation tool ในตัว

### Dimension 4: Scope & Complexity (🟡 YELLOW)

**ความซับซ้อนที่มี rationale:**
- React/Vite dashboard — Mission Control เป็น operational command center ที่ตั้งใจให้ visualize agent fleet/roadmap/governance → ไม่ใช่ over-engineering
- MCP server — โปรโตคอลมาตรฐาน, จำเป็นสำหรับ tool catalog
- Live-data-only rule (PRODUCT.md) — discipline ดี ป้องกัน feature creep ผ่าน mock

**ความซับซ้อนที่ควรลด:**
- `.agents/` 18MB กับ session_logs ใน git tree — runtime artifact ที่ควรอยู่นอก repo
- Scope ครอบหลายเรื่อง: dashboard + MCP server + governance + engine fork + agent registry → CLAUDE.md ครอบ 3-4 architecture พร้อมกัน
- Top-level checklists/summaries เกินจำเป็น (15 .md)

### Dimension 5: Context Hygiene (🟡 YELLOW)

**ดี:**
- CLAUDE.md focused (105 lines)
- มี `docs/` แยกเป็น subdirectories (architecture/, adr/, features/, roadmap/) — progressive disclosure ระดับ docs ทำได้ดี
- governance-rules.mjs เป็น single source of truth

**ปัญหา:**
- **3 AI-guidance files ซ้ำซ้อน:** CLAUDE.md, AGENTS.md, AGENT.md, GEMINI.md — CLAUDE.md บอกเองว่า "AGENT.md และ GEMINI.md เป็น compatibility bridges" แต่ก็ต้อง maintain 4 ฉบับ
- Top-level pollution จาก ad-hoc snapshots
- session_logs.jsonl 232 ไฟล์ใน `.agents/` — context pollution ถ้า Claude อ่าน

### Dimension 6: Safety (🟢 GREEN)

**ดี:**
- `.gitignore` excludes `.env*`, `.npmrc`, `node_modules/`, build output
- Secret scan (regex AIza/sk-/npm_) → ไม่มีใน source
- Pre-commit hook `docs:validate + roadmap:validate` — governance gate
- Human-in-the-loop verified ใน session นี้ตอน publish (Claude หยุดและถาม approval ก่อน publish, ก่อนแตะ G-Maiden)
- `.npmrc` เพิ่งเพิ่มเข้า gitignore (commit `28c97f0`)

**สังเกตเตือน (ไม่ใช่ปัญหา):**
- `audit/` directory มีอยู่แต่ยังไม่มีไฟล์ — ดีถ้าจะเก็บ audit reports ในนี้

### Dimension 7: Workflow Design (🟢 GREEN)

**ดี:**
- Prescriptive doc lifecycle (create → bump → ratify) ผ่าน scripts
- Pre-commit governance gate (ไม่ผ่าน commit ไม่ได้)
- 42 engine tests (`node --test`) เขียวจริง (verified)
- Commit discipline: surgical, message ดี, ทุก commit ผ่าน gate
- Validation tools: docs:validate, roadmap:validate, baseline:check, diff:check

**ปรับปรุงได้:**
- **Vitest coverage บาง:** ของจริง src/ มีแค่ ~28 cases ใน 4 ไฟล์ (roadmapParser, roadmapSelectors, missionContract, roadmapExport) — React dashboard ใหญ่กว่ามาก, integration/component tests แทบไม่มี (ก่อนหน้านี้ผมเคยอ้าง 92 → conflate กับ `ref/` ซึ่งเป็น reference subtree ไม่ใช่ active code)
- ไม่มี `.claude/settings.json` กำหนด permissions/hooks
- Workflows ที่ดียังไม่ wrap เป็น Claude Code skill (ดู Dimension 3) → next AI session ต้อง rediscover ทุกครั้ง
- ไม่มี sub-agent review pattern ใน workflow (เพิ่ง spawn ใน session นี้ — ไม่ใช่ baked-in)

## Still Needs Human Decision

- [ ] **Skill scope:** จะสร้างกี่ skill ในรอบแรก? (แนะนำ 3 ตัว: docs-bump, baseline-check, roadmap-sync) หรือทั้ง 6 ที่ list ไว้ใน Dimension 3?
- [ ] **Top-level cleanup:** ad-hoc summary docs ลบทิ้งเลยหรือย้ายไป `docs/archive/`?
- [ ] **AGENTS/AGENT/GEMINI consolidation:** เก็บ AGENTS.md เป็น canonical แล้วทำ AGENT.md + GEMINI.md เป็น 1-บรรทัด pointer ได้ไหม? (กังวล bridge ต้อง compat)
- [ ] **`.agents/session_logs/`:** ย้ายออก git tree (gitignore + archive) หรือเก็บไว้เป็น traceability evidence?

## Recommended Next Steps

**ถ้าจะลุย Re-engineer (active phase) ต่อ:**
1. Phase 1 (Foundation): clean top-level (priority #2), consolidate AGENTS family (priority #3)
2. Phase 3 (Skill Extraction): สร้าง `.claude/skills/docs-bump/` + `baseline-check/` + `roadmap-sync/` (priority #1, #5)
3. Phase 5 (Context Hygiene): gitignore session_logs (priority #4), เขียน note เรื่อง `.agents` ไม่ใช่ runtime (priority #6)
4. Skip Phase 2 (De-agentification) — ไม่มี embedded agent ให้ลบ
5. Skip Phase 4 (Complexity Reduction) — UI มี rationale
6. Phase 7 (Workflow): เพิ่ม sub-agent review pattern เข้า skills

**ถ้าจะหยุดที่ audit:**
- เก็บรายงานนี้ที่ `audit/ai-firstify-report-2026-06-25.md`
- ใช้เป็น checklist ตอน iteration ถัดไป

---

## Skeptic Review Adjustments (v1 → v2)

Sub-agent review เจอประเด็นเหล่านี้ที่ v1 ผิด/อ่อน — แก้แล้วในตัว report:

| ประเด็น | v1 (ผิด/อ่อน) | v2 (แก้แล้ว) |
|---|---|---|
| Vitest count | "92 tests" | จริง ~28 cases / 4 files (ผม conflate กับ `ref/`) → Dim 7 ลด GREEN→YELLOW |
| Dim 5 score | YELLOW | RED — GEMINI.md 142 บรรทัดเนื้อหาจริง, รวม 304 บรรทัด triplicate + 138 session_logs tracked |
| Rec #1 effort | 2-3 ชม. | 4-6 ชม. (ไม่มี skill pattern เดิม ต้องออกแบบ schema) |
| Rec #3 effort + scope | 15 นาที, "ลบ fix.cjs/scratch HTML" | 30 นาที, **ห้ามลบ `index.html` (Vite entry) หรือ `fix.cjs` (Thai-encoding fixer, verified)** |
| Rec #4 priority | MEDIUM 30 นาที | **HIGH** — single largest repo bloat, 138 jsonl ยัง tracked |
| Rec #4 (consolidate AGENTS) effort | 15 นาที | 45-60 นาที — GEMINI.md ไม่ใช่ thin stub |

## Gaps ที่ skeptic จับ + ที่ผมจัดการแล้ว

- ✅ `ref/` — confirmed ว่าเป็น reference subtree (`ref/src` ตัวเดียว) ไม่ใช่ active code; ใส่ rec #7
- ✅ `index.html` — Vite entrypoint; ไม่ต้องลบ
- ✅ `.claude/settings.json` — MISSING; ใส่ rec #6
- ✅ `fix.cjs` — Thai-encoding fixer one-shot (verified) ไม่ใช่ ad-hoc มั่ว
- ⚠️ standalone HTMLs (`GoVibe-Domain-A-Project-Overview.html`, `GoVibe-Mission-Control-template.html`) — **ยังไม่ verify role**; อยู่ใน rec #3 แต่ flag ว่าต้อง check ก่อน
