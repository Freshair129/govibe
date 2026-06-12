# Documentation Template Compliance

## Template Source
Canonical templates live in:

```text
.agents/doc_writer/template/
```

## Required Templates
- `PRD-template.md`
- `SRS-template.md`
- `SDD-template.md`
- `C4-template.md`
- `LLD-template.md`
- `FEAT-template.md`
- `API-CONTRACT-template.md`
- `RUNBOOK-template.md`
- `TEST-PLAN-template.md`
- `ADR-template.md`
- `PROJECT-STRUCTURE-template.md`
- `AGENTS-template.md`

## General Audit Checklist
- [ ] Document uses the correct template family.
- [ ] Frontmatter exists.
- [ ] `doc_id`, `status`, `version`, `updated`, `owner`, and `source_of_truth` exist when applicable.
- [ ] PRD system mapping exists when relevant.
- [ ] C/H level exists for feature/task-level documents.
- [ ] Acceptance criteria exist for requirement and feature documents.
- [ ] Verification exists for feature/API/runbook/test documents.
- [ ] Related docs are linked.
- [ ] File is in the canonical folder.
- [ ] The document does not make derived atoms the canonical human authoring format.

## AGENTS.md Compliance
- [ ] Scope is explicit.
- [ ] Source of truth list is current.
- [ ] Documentation rules reference human-first SWE docs.
- [ ] Execution Governance Standard is referenced.
- [ ] Feature folder mapping is referenced for docs work.
- [ ] Verification evidence requirements are present.
- [ ] Git/staging safety rules are present.
- [ ] Local exceptions do not conflict with root policy.

## Project Structure Compliance
- [ ] Workspace layout is documented.
- [ ] Directory contract defines allowed and disallowed content.
- [ ] Documentation layout is documented.
- [ ] Feature folder mapping matches `docs/features/README.md`.
- [ ] Agent workspace layout is documented.
- [ ] Build/test entry points are documented.
- [ ] Cleanup rules distinguish removable, archived, and protected files.
