# Definition of Done

GoVibe uses a documentation-first Definition of Done. A task is not done until source documents, implementation artifacts, and verification evidence agree.

## Gate 1: Source and Scope
- [ ] Source document is identified.
- [ ] Primary PRD system is identified.
- [ ] Complexity and context tier are declared.
- [ ] Required artifacts match `docs/STD-Execution-Governance.md`.
- [ ] Scope boundary is explicit.
- [ ] Unrelated worktree changes are excluded.

## Gate 2: Documentation and Traceability
- [ ] PRD/SRS/SDD/LLD/API/Runbook/Test Plan updates are complete where required.
- [ ] Feature spec is placed under the correct `docs/features/<system-folder>/`.
- [ ] Traceability exists from source document to task, agent assignment, artifact, review, and verification evidence.
- [ ] Derived atoms do not override approved human-readable SWE docs.

## Gate 3: Implementation Quality
- [ ] Code or document changes match the approved source.
- [ ] Type checks, lint checks, builds, or equivalent validations pass when relevant.
- [ ] UI changes comply with `docs/design/`.
- [ ] RBAC/ABAC-sensitive changes include policy and audit evidence.
- [ ] Diff is surgical and limited to the approved task.

## Gate 4: Verification and Exit
- [ ] Automated tests pass, or manual verification evidence is attached when automation is not available.
- [ ] Regression risk is assessed and mitigated.
- [ ] Known failures, skipped tests, and open risks are documented.
- [ ] Owner/lead approval exists for C-2/C-3 work.

Failure at any required gate prevents the task from being marked done.

## Changelog
| Version | Date | Summary |
|---|---|---|
| 2.0.0 | 2026-06-12 | Updated DoD for PRD/C4/execution governance, feature folder mapping, traceability, and RBAC/ABAC governance. |
