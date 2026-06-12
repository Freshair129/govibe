# Git and Workflow Standards

## Branching
- `main`: production-ready branch.
- Feature branches should be short-lived and scoped to one task or document set.
- Use a clear prefix such as `feat/`, `fix/`, `docs/`, `chore/`, or `codex/`.

## Commits
Use concise conventional-style commits:

```text
docs(scope): update product architecture
feat(scope): add agent task assignment
fix(scope): correct roadmap progress state
chore(scope): reorganize feature specs
```

Every commit should have one clear purpose. Do not mix unrelated user changes, generated files, or local experiments into a task commit.

## Pull Requests
- One coherent task or document set per PR.
- PR description must link the source document or task.
- UI changes need visual evidence.
- Code changes need relevant tests or verification evidence.
- C-2/C-3 work needs source docs and approval evidence.

## Staging Rules
- Stage only files that belong to the task.
- Leave unrelated dirty files unstaged.
- Use `git mv` for documentation reorganization so history remains readable.
- Never hide unrelated changes inside cleanup commits.

## Auditor Checks
- Confirm staged files match the task scope.
- Confirm deleted or moved docs are replaced by canonical paths or references.
- Confirm feature specs remain discoverable through `docs/features/README.md`.
- Confirm the latest commit message matches the actual diff.
