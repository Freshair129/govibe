# Verification Standards

ATHER ranks verification evidence from strongest to weakest. Use the strongest practical evidence for the task risk.

## Evidence Priority
1. **Automated tests**
   - Frontend: Vitest or equivalent component/unit tests.
   - Backend: Rust tests or service-level tests.
   - E2E: Playwright for user-visible workflows.
   - IPC/integration: React/Tauri/API/MCP boundary tests.
2. **Build and static validation**
   - TypeScript type check.
   - Lint/format checks.
   - Vite/Tauri build.
   - Schema, contract, or policy validation.
3. **Reproduction or verification script**
   - CLI command, curl command, MCP invocation, or script that proves behavior.
4. **Browser or visual evidence**
   - Screenshots, screen recordings, console-error checks, and viewport checks for UI work.
5. **Manual inspection**
   - Peer review of logic, diff scope, and compliance with source docs.

## Required Evidence By Work Type
| Work Type | Required Evidence |
|---|---|
| Docs-only | Link to changed docs, `git diff --check`, and source/traceability review |
| UI | Browser verification, console check, viewport check, design doc comparison |
| API/MCP | Contract check, request/response sample, permission check |
| RBAC/ABAC | Policy decision evidence, deny/allow cases, audit log expectation |
| HCS/JIT/Graph | H-level classification case, graph-hop query case, compaction output |
| Agent runbook/process | Execution governance mapping, role/gate check, traceability check |

## Failure Reporting
When verification cannot be run, report:

```text
not run:
reason:
risk:
recommended next evidence:
```

## Changelog
| Version | Date | Summary |
|---|---|---|
| 2.0.0 | 2026-06-12 | Added evidence requirements for docs, UI, API/MCP, RBAC/ABAC, HCS/JIT, and process work. |
