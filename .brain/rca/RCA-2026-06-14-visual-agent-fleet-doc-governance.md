---
title: "RCA: Visual Agent Fleet Documentation Governance Escape"
doc_id: "RCA-2026-06-14-visual-agent-fleet-doc-governance"
status: "draft"
version: "0.1.0"
updated: "2026-06-14"
owner: "THESEUS"
auditor: "ATHER"
source_of_truth: true
related_docs:
  - "docs/PRD-GoVibe-Platform-Overview.md"
  - "docs/adr/ADR-012-Visual-Agent-Fleet-Governance.md"
  - "docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md"
  - "docs/architecture/SDD-Visual-Agent-Fleet.md"
---

# RCA: Visual Agent Fleet Documentation Governance Escape

## 1. Executive Summary

The first Visual Agent Fleet implementation commit (`bb44b97`) added the feature spec, system design, derived role context, registry metadata, and A5 UI support, but missed two upstream governance artifacts: the platform PRD update and the governing ADR. The human owner caught the omission. A follow-up commit (`40912eb`) added ADR-012 and aligned the PRD.

Responsible roles:

- THESEUS: documentation hierarchy and source-of-truth alignment.
- ATHER: governance, traceability, and required-artifact audit.

## 2. Impact

- User impact: the human owner had to catch missing parent-layer documentation manually.
- Business impact: the planning contract briefly looked complete while upstream product and decision records were incomplete.
- System impact: traceability initially ran from FEAT/SDD to implementation, but not from PRD/ADR to FEAT/SDD/implementation.

## 3. Timeline

| Time | Event |
|---|---|
| 2026-06-14 | User approved Visual Agent Fleet implementation plan. |
| 2026-06-14 | Commit `bb44b97` added Visual Agent Fleet governance docs, registry metadata, and A5 optional metadata UI. |
| 2026-06-14 | User asked whether ADR and PRD should also be updated. |
| 2026-06-14 | Commit `40912eb` added `docs/adr/ADR-012-Visual-Agent-Fleet-Governance.md` and updated `docs/PRD-GoVibe-Platform-Overview.md`. |
| 2026-06-14 | Initial Gemini CLI RCA attempt produced no usable output because the selected model hit quota retries and the session also hit a read failure plus plan-mode write denial. |
| 2026-06-14 | Gemini CLI was retried with `--model gemini-2.5-flash` and a no-tool concise RCA prompt. It produced usable confirmation that the work was under-classified as C-2 instead of C-3/H4. |

## 4. Root Cause

The work was under-classified as a C-2 feature/documentation implementation when it should have been treated as C-3/H4 architecture-governance work from the start.

Primary root cause:

- Process classification failure: Visual Agent Fleet was not escalated to C-3/H4 before implementation and commit.

Systemic contributing root cause:

- GoVibe has traceability requirements in policy/specs, but it does not yet have an enforced document dependency map that connects PRD, ADR, FEAT, SDD, agent context, registry metadata, source code, visual nodes, and verification evidence.
- Existing AST/symbol/visual-node surfaces are present as product concepts and UI receivers, but they do not yet enforce wikilink backlinks, cross-link completeness, document communities, or code-to-doc symbol links before commit.
- Because that graph is not materialized as a validation gate, THESEUS and ATHER had to rely on manual checklist memory instead of a dependency-aware doc graph that would have flagged "FEAT/SDD changed without parent PRD/ADR alignment."

Evidence:

- `bb44b97` changed `.agents/agent-registry.yaml`, role authority metadata, derived context policy, `src/mission.ts`, and A5 behavior. Those changes affect governance, registry shape, protected-source policy, and UI contract.
- `bb44b97` did not include `docs/PRD-GoVibe-Platform-Overview.md` or an ADR.
- `40912eb` had to add the missing parent-layer PRD alignment and ADR-012 after human review.
- ATHER's contract says non-trivial work must preserve source document -> requirement/section -> task -> assignment -> artifact -> review -> verification evidence.
- THESEUS's contract says every non-trivial document must preserve traceability to PRD system, owner, acceptance criteria, and verification, and must preserve canonical source rules.
- `docs/PRD-GoVibe-Platform-Overview.md` states that the knowledge layer supports graph retrieval, context compaction, symbol linking, and Mission Control visualization.
- `docs/specs/SPEC-Genesis-Block.md` defines `wikilink` relationship rules.
- `docs/DOCS-Human-First-Atom-Extraction.md` requires generated tasks to keep backlinks to the source document and section.
- `docs/features/traceability-audit/FEAT-Traceability-Audit-Verification.md` describes surfacing missing evidence or broken traceability links.
- `src/mission.ts` and `src/App.tsx` expose `symbols` and B1/C1 visual surfaces, but current validation does not require a complete PRD -> ADR -> FEAT -> SDD -> code/source symbol dependency chain.
- Gemini CLI secondary review using `--model gemini-2.5-flash` independently confirmed the same root-cause shape: Visual Agent Fleet was treated as C-2 documentation-driven work instead of C-3/H4 architecture-governance work.

The immediate process failure was a sequence break: peer-level artifacts (FEAT/SDD/context/registry/UI) were created before the parent product and architecture-decision layer was fully aligned.

## 5. Why It Escaped

- Missing classification gate: the implementation turn did not re-declare C/H/risk after the plan was accepted, so the task was not escalated from C-2 to C-3 when registry and protected-source policy changed.
- Missing parent-layer checklist: THESEUS produced FEAT/SDD and context docs but did not require PRD and ADR checks before close-out.
- Audit lag: ATHER-style audit happened after user review instead of before the first commit.
- UI masking effect: the A5 visualization part made the work feel like a feature slice, while the registry/protected-source rules were actually governance architecture.
- Verification gap: `baseline:check` proved syntax/build/doc validation, but it does not prove "required upstream artifact exists for this change class."
- Graph gap: there was no enforced dependency map, backlink index, document community, or symbol-link gate to tell the agent that this FEAT/SDD/context/registry/code change also required parent PRD and ADR artifacts.
- Visual-node gap: B1/C1/A5 surfaces exist, but their displayed nodes are not yet backed by a validation-grade doc/code graph that can block incomplete governance chains.
- External-agent review gap: Gemini CLI was available, but the first attempt used a quota-constrained model path. Future external-agent RCA calls should select a model with available quota and keep the prompt no-tool/read-only unless repository inspection is explicitly required.

## 6. Corrective Actions

| Action | Owner | Status | Target Date |
|---|---|---|---|
| Add ADR-012 for Visual Agent Fleet governance. | THESEUS / ARCHON | Done in `40912eb` | 2026-06-14 |
| Update platform PRD Agent Team Management section. | THESEUS | Done in `40912eb` | 2026-06-14 |
| Record this RCA under `.brain/rca/`. | THESEUS / ATHER | Done | 2026-06-14 |
| Add a pre-closeout parent-layer checklist for C-3/H4 changes touching `.agents/`, registry metadata, protected source policy, or Mission Control contracts. | THESEUS / ATHER | Proposed | Next governance cleanup |
| Add an auditor prompt/check that flags FEAT/SDD without PRD/ADR when architecture or governance metadata changes. | ATHER | Proposed | Next governance cleanup |
| Define a document dependency map contract for PRD, ADR, FEAT, SDD, agent context, registry metadata, code symbols, visual nodes, and verification evidence. | ARCHON / ATHER / THESEUS | Proposed | Traceability audit slice |
| Extend docs validation or a dedicated traceability audit to flag missing backlinks/cross-links and missing parent artifacts for C-3/H4 work. | ATHER / GHOST | Proposed | Traceability audit slice |
| Add a Gemini CLI fallback rule: when RCA review is requested and the default model is quota-limited, retry with an available Flash/Flash Lite model using `--model` and a concise no-tool prompt. | ATHER | Proposed | Next governance cleanup |

## 7. Prevention

### Universal Verification & Prevention SOP

- [x] Step 1: Root Cause Validation - Confirmed root cause with commit evidence from `bb44b97` and `40912eb`.
- [x] Step 2: Corrective Action Implementation - ADR-012 and PRD alignment were added.
- [x] Step 3: Multi-Layer Verification - `npm run baseline:check` passed after the corrective commit.
- [ ] Step 4: Context & Memory Update - Update durable agent guidance only if requested by the human owner.
- [ ] Step 5: Process Guardrail - Add an explicit parent-layer checklist to THESEUS/ATHER workflow.

### Specific Prevention Measures

- Code: No additional code prevention is needed; this was a documentation governance sequence failure.
- Tests: Add or document a docs-audit check for C-3/H4 changes that requires PRD/ADR presence when `.agents/`, registry metadata, protected source policy, or Mission Control contracts change.
- Traceability graph: Promote doc dependencies from prose-only policy into a machine-readable map with backlinks, cross-links, document communities, visual node IDs, and code-symbol references.
- Symbol links: Require code-facing changes to declare the owning PRD/ADR/FEAT/SDD chain before ATHER can mark the work done.
- Process: Before committing C-3/H4 work, THESEUS must answer:
  - Is the PRD already aligned?
  - Is an ADR required?
  - Is the SDD/FEAT linked to the ADR and PRD?
  - Has ATHER checked source-of-truth traceability before commit?
  - Does the dependency graph show complete upstream and downstream links?
- External review: When Gemini CLI is used for audit/RCA, ATHER must check `/model` usage or force `--model` to a non-exhausted model before treating failures as unusable external review.

## 8. Related Documents

- `docs/PRD-GoVibe-Platform-Overview.md`
- `docs/adr/ADR-012-Visual-Agent-Fleet-Governance.md`
- `docs/features/agent-team/FEAT-Visual-Agent-Fleet-System.md`
- `docs/architecture/SDD-Visual-Agent-Fleet.md`
- `.agents/doc_writer/THESEUS.md`
- `.agents/auditor/AGENT.md`
