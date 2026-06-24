# Wireframe — PHASE 0 / Sprint 0

> Converted from the provided screenshot into a Markdown wireframe.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ PHASE 0 ]  Feasibility Spike — พิสูจน์ความเสถียร          [Duration: 1 week] [----------]0%   [▾] │
│                                                                          [download]  [collapse] │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ก่อนเริ่ม Sprint จริง ต้องพิสูจน์ให้ได้ว่าระบบ YouTube IFrame API ทำงานร่วมกับ WebSocket sync               │
│  ในการสั่งพักติดเวลาของเพลงโสดเดียวบนมือถือ 2 เครื่อง และหัวข้อวิตกในระบบ                                   │
│                                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  SPRINT 0    Feasibility Spike                                      [Duration: 1 week] 0% │  │
│  │                                                                                           │  │
│  │  ┌──────────────────────────────────────────────────────────────────────────────────┐     │  │
│  │  │ ○  [▾]  Prototype YouTube IFrame Player บน 2 clients พร้อมกัน      ASSIGN TO: [▼] │     │  │
│  │  │        [FR] [High] [doc] [code] [test]                                           │     │  │
│  │  ├──────────────────────────────────────────────────────────────────────────────────┤     │  │
│  │  │                                                                                  │     │  │
│  │  │  SYMBOL LINKS                                                    [NOT IMPLEMENT] │     │  │
│  │  │                                                                                  │     │  │
│  │  │  CODE LINK:                         DOC LINK:                       TEST LINK:   │     │  │
│  │  │  <path>                             <path>                          <path>       │     │  │
│  │  │                                                                                  │     │  │
│  │  │  VERSION:       COMPLEXITY:         TYPE:          STATUS:          TOKENS USED: │     │  │
│  │  │  [1.0.0]        [High]              [FR]           [stable]         [12,040]     │     │  │
│  │  ├──────────────────────────────────────────────────────────────────────────────────┤     │  │
│  │  │  DEFINITION OF DONE (DoD):                                                       │     │  │
│  │  │                                                                                  │     │  │
│  │  │  ACCEPTANCE CRITERIA             SUCCESS CRITERIA             EXIT CRITERIA      │     │  │
│  │  │  ☐ Spec approved                 ☐ Code complete            ☐ Tests passed     │     │  │
│  │  │  ☐ Docs updated                  ☐ Lints clean              ☐ Regression free  │     │  │
│  │  ├──────────────────────────────────────────────────────────────────────────────────┤     │  │
│  │  │  CHANGELOG:                                                                      │     │  │
│  │  │  ┌────────────────────────────────────────────────────────────────────────────┐  │     │  │
│  │  │  │ [1.0.0] - Added iframe configuration sandbox;                              │  │     |  │
│  │  │  │         resolved background autoplay restrictions.                         │  │     |  │
│  │  │  │         [Updated: 2026-06-05T16:22:00+07:00, Wang,d4e5f6g]                 │  │     |  │
│  │  │  └────────────────────────────────────────────────────────────────────────────┘  │     │  │
│  │  │                                                                                  │     │  │
│  │  │  Created: 2026-06-05T00:00:07:00,EVA Agent,a3f2b1c                               │     │  │
│  │  │  TASK ID: TSK-CVP01B00010                    EXPORT TASK: [JSON][YAML][Markdown] │     │  │
│  │  └──────────────────────────────────────────────────────────────────────────────────┘     │  |
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Component structure

```text
PhaseCard
├─ PhaseHeader
│  ├─ PhaseBadge: "PHASE 0"
│  ├─ Title: "Feasibility Spike — พิสูจน์ความเสถียร"
│  ├─ DurationPill: "Duration: 1 week"
│  ├─ Progress: "0%"
│  └─ HeaderActions: download, collapse
├─ PhaseDescription
└─ SprintCard
   ├─ SprintHeader
   │  ├─ SprintBadge: "SPRINT 0"
   │  ├─ SprintTitle: "Feasibility Spike"
   │  ├─ DurationPill
   │  └─ Progress
   └─ TaskCard
      ├─ TaskHeader
      │  ├─ Checkbox / ExpandIcon
      │  ├─ TaskTitle
      │  ├─ MetaBadges: FR, High, doc, code, test
      │  └─ AssignDropdown
      ├─ SymbolLinks
      │  ├─ CodeLink
      │  ├─ DocLink
      │  └─ TestLink
      ├─ MetadataGrid
      │  ├─ Version
      │  ├─ Complexity
      │  ├─ Type
      │  ├─ Status
      │  └─ TokensUsed
      ├─ DefinitionOfDone
      │  ├─ AcceptanceCriteria
      │  ├─ SuccessCriteria
      │  └─ ExitCriteria
      ├─ ChangelogPanel
      └─ Footer
         ├─ Created
         ├─ TaskID
         └─ ExportButtons
```

## Suggested responsive layout

```text
Desktop:  3-column metadata / criteria grid
Tablet:   2-column grid
Mobile:   1-column stacked cards
```
