# Risk Assessment

Assess risk before approval. When uncertain, choose the higher risk level.

## LOW Risk
Use when the change is isolated and reversible.

Examples:
- Copy or documentation wording updates.
- Isolated UI polish within existing design rules.
- Small feature-spec organization changes.
- Non-behavioral comments or metadata fixes.

Required process:
- C-0 or C-1
- H0 or H1
- Basic validation

## MEDIUM Risk
Use when the change affects a feature, workflow, shared UI, or multiple files.

Examples:
- Feature spec changes that affect implementation behavior.
- Roadmap/task rendering behavior.
- Shared component props or core state changes.
- External adapter behavior without security impact.
- Documentation moves that affect references.

Required process:
- C-2
- H1 or H2
- Source document and verification evidence

## HIGH Risk
Use when the change affects architecture, security, governance, persistence, agent access, or cross-system behavior.

Examples:
- PRD, SDD, C4, execution governance, or platform system-map changes.
- RBAC/ABAC, policy, audit, or permission behavior.
- HCS, Hybrid JIT Context, graph-hop, compaction, atom extraction, or Block DB behavior.
- MCP tool/resource permission behavior.
- Third-party agent integration contract changes.
- Tauri/Rust IPC and persistence schema changes.

Required process:
- C-3
- H3 to H5
- Architecture review, source-doc review, and verification evidence

## Automatic Escalation
Escalate to HIGH when:
- The change can expose project docs, code, or artifacts to the wrong user/agent.
- The change can break traceability from docs to task to artifact.
- The change changes what is considered canonical source of truth.
- The change affects provider/runtime boundaries for Claude Code, Gemini CLI, OpenClaw, Hermes, or MCP clients.

## Changelog
| Version | Date | Summary |
|---|---|---|
| 2.0.0 | 2026-06-12 | Updated risk model for PRD/C4/execution governance, HCS/JIT, RBAC/ABAC, MCP, and docs-as-SSOT changes. |
