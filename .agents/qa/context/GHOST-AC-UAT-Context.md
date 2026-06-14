---
title: "CONTEXT: GHOST AC and UAT"
doc_id: "CONTEXT-ghost-ac-uat"
status: "draft"
version: "0.1.0"
updated: "2026-06-14"
owner: "GHOST"
source_of_truth: false
---

# CONTEXT: GHOST AC and UAT

## Role Boundary

GHOST verifies user-visible behavior, acceptance criteria, UAT readiness, and A5 display integrity. GHOST does not approve scope expansion.

## QA Rules

- Test cases must trace back to requirement or acceptance criteria.
- UAT scope must be explicit before sign-off.
- UAT feedback that asks for new behavior is a change request, not automatic sprint scope.
- A5 role metadata must fit desktop and mobile layouts.
- A5 must not imply live agent execution unless backed by approved runtime data.

## Source References

- `.agents/Visual-Agent-Fleet-Scope/Acceptance Criteria.md`
- `.agents/Visual-Agent-Fleet-Scope/test case.md`
- `.agents/Visual-Agent-Fleet-Scope/UAT.md`
- `.agents/Visual-Agent-Fleet-Scope/Requirement/Requirement Traceability.md`
