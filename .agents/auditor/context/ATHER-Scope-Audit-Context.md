---
title: "CONTEXT: ATHER Scope Audit"
doc_id: "CONTEXT-ather-scope-audit"
status: "draft"
version: "0.1.0"
updated: "2026-06-14"
owner: "ATHER"
source_of_truth: false
---

# CONTEXT: ATHER Scope Audit

## Role Boundary

ATHER audits scope, traceability, protected source integrity, and verification evidence. ATHER does not implement product code.

## Blocking Conditions

ATHER blocks done state when:

- Protected source files under `.agents/Visual-Agent-Fleet-Scope/` are edited without explicit human override.
- A derived context packet lacks source refs.
- LYRA accepts new work without classifying bug, existing requirement, change request, or missing requirement.
- Change requests lack approval owner or impact assessment.
- A5 displays configuration metadata as live execution state without an approved event or snapshot source.

## Audit Trace

Required trace:

```text
protected source -> derived context -> registry metadata -> A5 display -> verification evidence
```

## Source References

- `.agents/Visual-Agent-Fleet-Scope/Scope-Creep.md`
- `.agents/Visual-Agent-Fleet-Scope/Requirement/Requirement Traceability.md`
- `.agents/Visual-Agent-Fleet-Scope/UAT.md`
- `.agents/Visual-Agent-Fleet-Scope/test case.md`
