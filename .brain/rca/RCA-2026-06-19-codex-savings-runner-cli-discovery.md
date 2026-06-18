---
version: "0.1.0"
created_at: "2026-06-19T00:00:00+07:00,ATHER,pending"
last_update: "2026-06-19T00:00:00+07:00,ATHER"
status: "active"
attributes:
  domain: "agent-tooling"
  doc_type: "root-cause-analysis"
  scope: "scripts/agents"
---

# RCA — Codex savings runner could not discover Codex CLI

## Symptom

`run-codex-savings-round.cmd` stopped before executing a test round with:

`Codex CLI was not found. Checked Get-Command, where.exe, and WindowsApps OpenAI.Codex install paths.`

## Evidence

- Codex Desktop includes a working CLI at `%LOCALAPPDATA%\OpenAI\Codex\bin\<installation-id>\codex.exe`.
- Running that executable directly returns a valid `codex-cli` version.
- The failing resolver checked shell command discovery and the protected WindowsApps package tree, but did not check the LocalAppData Codex Desktop binary tree.
- The launcher passed a discovered path only as a parameter to the first PowerShell process. Nested LYRA, VIBE, and ATHER PowerShell processes did not receive that parameter.

## Root Cause

CLI discovery depended on shell PATH visibility or access to the WindowsApps package directory. Double-clicked launcher shells can lack the Codex PATH entry, while recursive WindowsApps discovery can be unavailable. The resolved path was also not propagated to nested agent processes.

## Why the issue escaped detection

Previous verification ran from a Codex-managed PowerShell session where `Get-Command codex` and `where.exe codex` succeeded. It did not reproduce a double-click-style shell with reduced PATH visibility or verify the complete nested process chain.

## Proposed prevention

- Resolve Codex Desktop from `%LOCALAPPDATA%\OpenAI\Codex\bin` before using WindowsApps as the final fallback.
- Export the resolved path through `CODEX_EXE` before starting nested agent processes.
- Verify discovery under a deliberately reduced PATH and verify the executable with `--version`.

## Changelog

| Version | Date | Status | Summary | Commit Hash | Agent |
|---|---|---|---|---|---|
| 0.1.0 | 2026-06-19 | active | Recorded CLI discovery and subprocess propagation failure. | pending | ATHER |
