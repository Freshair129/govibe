---
title: "CR: PM Asset Redundancy Cleanup and Telemetry Alignment"
doc_id: "CR-2026-06-14-pm-asset-redundancy-cleanup"
status: "approve_with_conditions"
version: "0.1.2"
updated: "2026-08-19"
owner: "LYRA"
decision_owner: "ARCHON"
auditor: "ATHER"
source_of_truth: true
prd_system: "SYSTEM-02::Project-Roadmap-Management-System"
related_docs:
  - ".agents/pm/asset/Implementation-Plan-Template.md"
  - ".agents/pm/asset/Backlog-Template.md"
  - ".agents/pm/asset/Roadmap-Template.md"
  - ".agents/pm/asset/Planning-Decomposition-Standard.md"
---

# CR: PM Asset Redundancy Cleanup and Telemetry Alignment

> **2026-08-19 correction (ADR-021/AUD-14, TASK-PRD-022):** corrected abolished H-axis semantics — `business_value`'s "(H5-H0)" tier range, the template-mapping table's "H5-H4" row, and the §4 heading's "H0-H6 Governance" are all corrected to the `H0-H4` Access Scope ceiling. No status change.

## 1. Change Request

```yaml
change_requested: "Consolidate and normalize PM asset templates in `.agents/pm/asset/` to remove redundancy and align with H4 Tier telemetry standards (Model Name, Context Length, Token Telemetry)."
reason: "Existing templates overlap in scope, and Implementation-Plan-Template.md contains execution data that should reside in `docs/roadmap/`. Current templates lack mandatory token telemetry columns required for GoVibe execution governance."
business_value: "Reduce documentation maintenance overhead, ensure planning consistency across all tiers (H4-H0), and enable accurate token usage prediction vs. actual auditing."
affected_requirement:
  - "STD-Execution-Governance"
  - "Documentation-Requirements"
affected_tasks:
  - "Rename PLAN_Template.md to Implementation-Plan-Template.md and strip legacy data."
  - "Update `Backlog-Template.md` with telemetry columns (Model, Context, Tokens)."
  - "Cross-reference `Planning-Decomposition-Standard.md` as the SSOT for all templates."
timeline_impact: "Immediate update to templates; no impact on product code."
resource_impact: "Owned by LYRA; Drafted by THESEUS; Audited by ATHER."
risk_impact: "MEDIUM (Impacts workflow, naming, audit path, and traceability contract)."
what_moves_out: "Legacy 'Import P1 MVP' data from Implementation-Plan-Template.md moves to `docs/archive/legacy/legacy-p1-mvp-import-reference.md`."
approval_owner: "ARCHON"
decision: "approve_with_conditions"
```

## 2. Proposed Template Mapping & Telemetry Standards

| Current File | New Status | Target Role | Telemetry Requirements |
|---|---|---|---|
| `Roadmap-Template.md` | **Retain (Updated)** | H4: Strategic Themes & Phases | High-level milestones |
| `Backlog-Template.md` | **Retain (Updated)** | H3-H2: Feature Slicing & Sprint Backlog | Model, Context, Predicted Tokens |
| PLAN_Template.md | **Rename to Implementation-Plan-Template.md** | H1-H0: Task Execution | Full Telemetry + Verification Link |

### Mandatory Telemetry Columns (Implementation Plan)
1.  **Verification Link** (Link to evidence/results)
2.  **Predicted Token Usage** (Prediction by planning agent)
3.  **Actual Input Tokens**
4.  **Actual Output Tokens**
5.  **Tool Calling Tokens**
6.  **Total Token Usage**

## 3. Migration & Reference Update List
- [x] Rename legacy PM template to Implementation-Plan-Template.md
- [x] Move legacy content from PLAN_Template.md to `docs/archive/legacy/legacy-p1-mvp-import-reference.md`
- [x] Update `Backlog-Template.md` to reference Implementation-Plan-Template.md for execution detail.
- [x] Ensure all templates include a header referencing `Planning-Decomposition-Standard.md` as the SSOT.

## 4. Decision Log (H0-H4 Governance)
- **User (ARCHON):** Approve with Conditions. (2026-06-14)
- **Conditions:** 
    1. Risk impact must be MEDIUM.
    2. Specific archive destination for legacy data.
    3. Mandatory migration checklist/reference update.
    4. Exact telemetry column names as specified.
- **ATHER (Auditor):** Approve with Conditions. (2026-06-14)

