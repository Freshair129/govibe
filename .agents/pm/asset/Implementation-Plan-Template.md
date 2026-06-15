# GoVibe Implementation Plan Template

**SSOT Reference:** [.agents/pm/asset/Planning-Decomposition-Standard.md](Planning-Decomposition-Standard.md)
**Tier:** H1-H0 (Execution)

```yaml
ImpId: [[IMP-ID]]
Source Spec: [[LINK-TO-SPEC]]
Methodology: DDD + CoDev multi-agent execution
Complexity: C-1/C-2/C-3
Risk: LOW/MEDIUM/HIGH
Gate: Doc/spec first -> approval -> implementation
Status: pending/WIP/Done/hold/Rejected
Progression: 0%
Target: task, sub-task, micro-task, atomic-task
```

## Goal
[[Describe the goal of this implementation plan]]

## Execution Table

| Status | Task ID | Task Details | Pt | Mode | Dependency | Symbollink | Assign To | Model Name | Context | Verification Link | Predicted Tokens | Actual Input | Actual Output | Tool Calling | Total Tokens | Start | End |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| waiting | [[ID]] | [[Task]] | 3 | SERIAL | - | <path> | [[AGENT]] | [[MODEL]] | 128k | [verify](#) | 1000 | - | - | - | - | - | - |

## Task Breakdown

### [[Task ID]]: [[Title]]
- [ ] S-[[ID]] [[Sub-task description]]
  - [ ] M-[[ID]] [[Micro-task description (Local LLM Packet)]]
    - [ ] A-[[ID]] [[Atomic-task description (Single Action)]]

## Definition of Done

■ Acceptance Criteria
- [ ] Spec/Doc approved (DDD gate)
- [ ] Docs updated (README, GEMINI.md, or inline JSDoc)
- [ ] Test plan Spec/Doc approved

■ Success Criteria
- [ ] Code complete — No TODO/FIXME
- [ ] Lints clean (TypeScript strict, no any)
- [ ] Renders correctly in target environment

■ Exit Criteria
- [ ] Tests passed (Evidence in Verification Link)
- [ ] Regression free
- [ ] Auditor gate passed (if required)

## Local LLM Packets (H0 Tier)
> These packets are for local LLM execution with 8k-16k context limits. Define them here to keep the Backlog clean.

### Micro-task Packet: [[M-TSK-ID]]
```text
source excerpt: [[Reference code or doc snippet]]
target path: [[File to modify]]
instruction: [[Specific step-by-step for local LLM]]
constraints: [[e.g., no external libs, preserve style]]
acceptance check: [[Verifiable outcome]]
max context: [[8k or 16k]]
```

### Atomic-task Packet: [[A-TSK-ID]]
```text
target: [[Specific line or function]]
single action: [[One instruction]]
acceptance check: [[Single check]]
rollback note: [[How to revert if fail]]
max context: 8k
```
