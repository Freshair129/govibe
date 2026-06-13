# ADR-005: Canonical GoVibe Workspace Initialization via CLI

**Status:** Draft
**Owner:** THESEUS / JANUS
**Traceability:** SYSTEM-10 / Execution Governance

## 1. Context
GoVibe previously utilized legacy `.bat` scripts for workspace bootstrapping. This approach is Windows-bound, lacks observability, and is incompatible with our goal of a cross-platform, GoVibe-native runtime.

## 2. Decision
1.  **Replace `.bat` with `govibe-init.mjs`**: Migrate all workspace initialization logic to a Node.js-based CLI tool.
2.  **MCP-Ready**: Expose the initialization logic via an MCP tool (`initialize_workspace`) to allow autonomous agent setup.
3.  **Registry-Driven**: The tool will dynamically derive setup requirements from `agent-registry.yaml`, ensuring consistency across projects.

## 3. Impact
- **Cross-Platform**: Enables initialization on Linux/macOS.
- **Auditability**: All setup steps are logged through the MCP/Handoff logging pipeline.
- **Maintainability**: Centralizes setup logic, reducing duplication and drift.

## 4. Implementation Plan
- **Phase A**: Implement `scripts/agents/govibe-init.mjs`.
- **Phase B**: Expose `initialize_workspace` tool in `govibe-mcp-server.mjs`.
- **Phase C**: Deprecate `setup/init.bat`.
