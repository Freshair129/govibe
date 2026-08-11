---
title: "Mode 2 Deliverable 3: Workspace Adapter Contract"
doc_id: "MODE2-WORKSPACE-ADAPTER-CONTRACT"
status: "draft"
version: "0.1.0"
updated: "2026-08-11"
owner: "Boss (CEO)"
source_of_truth: false
access_scope: "H2"
complexity: "C-2"
related_docs:
  - "docs/mode2/MODE2-ARCHITECTURE.md"
  - "docs/mode2/DEEP-SCAN-12-STAGE-SPEC.md"
  - "docs/specs/SPEC-Workspace-System.md"
---

# Mode 2 Deliverable 3: Workspace Adapter Contract

## 1. Purpose

The `WorkspaceAdapter` is the **only** seam at which client-specific behaviour is allowed.
Everything below it — the scan pipeline, the semantic IR, the coverage engine, the view
router, the roadmap compiler — is provider-neutral and must never branch on client identity.

Implemented by `packages/govibe-core/src/mode2/workspace-adapter.mjs`.

## 2. Design Rule: Do Not Overbuild

All three Phase-1 adapters operate over the same filesystem abstraction. Client adapters
differ **only** in the data they declare:

```text
identity
capability hints
instruction locations
workspace conventions
```

A client adapter that needs to override `read`, `stat`, or `search` is a design smell in
Phase 1. `ClaudeCodeWorkspaceAdapter` and `GeminiWorkspaceAdapter` are thin declarative
descendants of `GenericFilesystemWorkspaceAdapter`.

## 3. Interface

```ts
interface WorkspaceAdapter {
  identify(): WorkspaceIdentity
  getRoot(): string
  discoverCapabilities(): Promise<CapabilityManifest>
  discoverInstructions(): Promise<InstructionSource[]>
  discoverProjectFiles(): Promise<ProjectFile[]>
  discoverAgentConfiguration(): Promise<AgentConfiguration[]>
  discoverExistingArtifacts(): Promise<ExistingArtifact[]>
  read(path: string): Promise<string>
  stat(path: string): Promise<FileMetadata>
  search(query: SearchQuery): Promise<SearchResult[]>
}
```

Every path argument is **workspace-relative, POSIX-separated**. Absolute paths, `..`
segments, and symlinked segments are rejected by `assertNoLinksWithin`
(`packages/govibe-core/src/path-safety.mjs`). This holds on Windows and POSIX alike.

## 4. Payload Shapes

### 4.1 WorkspaceIdentity

```json
{
  "schema": "govibe-mode2-workspace-identity/v1",
  "adapter_id": "generic-filesystem",
  "client": "generic",
  "workspace_mode": "external",
  "workspace_root": "/repo/product",
  "write_policy": "metadata-only",
  "metadata_root": ".govibe/mode2"
}
```

`client` is one of `claude-code`, `gemini-cli`, `codex`, `generic`. It is **descriptive
metadata only**. No core module may read it to select behaviour.

### 4.2 CapabilityManifest

Declares what the *client* can do, so GoVibe can classify capabilities
`NATIVE` / `PLATFORM` / `HYBRID` / `MISSING` (architecture §10).

```json
{
  "schema": "govibe-mode2-capability-manifest/v1",
  "adapter_id": "claude-code",
  "capabilities": {
    "instruction_files": ["CLAUDE.md", "AGENTS.md", ".claude/CLAUDE.md"],
    "skills": true,
    "subagents": true,
    "mcp_client": true,
    "hooks": true,
    "slash_commands": true
  }
}
```

Capability *hints* are adapter-declared. Capability *observations* come from scan Stage 11
and always outrank a hint that the repository contradicts.

### 4.3 InstructionSource

```json
{
  "path": "CLAUDE.md",
  "kind": "agent-instruction",
  "client_affinity": "claude-code",
  "exists": true,
  "bytes": 13788,
  "sha256": "..."
}
```

`kind` ∈ `agent-instruction`, `governor`, `policy`, `skill`, `command`, `mcp-config`,
`readme`, `other`.

### 4.4 ProjectFile

The adapter returns raw discovery. Classification is Stage 2's job, not the adapter's.

```json
{ "path": "src/mission.ts", "size": 41203, "extension": ".ts", "mtime_ms": 1754870000000 }
```

### 4.5 SearchQuery / SearchResult

```json
{ "pattern": "govibe\\.[a-z.]+", "glob": "**/*.mjs", "max_results": 200, "regex": true }
```

```json
{ "path": "scripts/mcp/registry.mjs", "line": 42, "text": "\"govibe.workspace.scan\"" }
```

`search` is bounded: it MUST enforce `max_results` and MUST NOT read files excluded by the
inventory exclusion set.

## 5. Phase 1 Adapters

| Adapter | `client` | Instruction sources | Status |
|---|---|---|---|
| `GenericFilesystemWorkspaceAdapter` | `generic` | `README.md`, `AGENTS.md`, `AGENT.md` | Tranche 1 |
| `ClaudeCodeWorkspaceAdapter` | `claude-code` | `CLAUDE.md`, `.claude/**`, `AGENTS.md` | Tranche 1 |
| `GeminiWorkspaceAdapter` | `gemini-cli` | `GEMINI.md`, `.gemini/**`, `AGENTS.md` | Tranche 1 |

`createWorkspaceAdapter({ client, workspaceRoot })` resolves the adapter. An unknown
`client` resolves to the generic adapter rather than failing — provider neutrality means an
unrecognised client is still a first-class citizen.

## 6. Invariants

| ID | Invariant |
|---|---|
| WA-01 | An adapter never writes. Writes go only through `metadata-store.mjs`. |
| WA-02 | An adapter never escapes `workspace_root` — enforced, not documented. |
| WA-03 | No core module below the adapter branches on `client`. |
| WA-04 | An unknown client resolves to the generic adapter. |
| WA-05 | Adapter output is deterministic: identical tree ⇒ identical output, stably sorted. |
| WA-06 | `discoverInstructions()` reports non-existent well-known paths as `exists: false` rather than omitting them, so absence is evidence. |

## 7. Verification

`packages/govibe-core/src/mode2/workspace-adapter.test.mjs` pins WA-01 through WA-06,
including a negative test that path escape and symlinked segments are rejected, and a
neutrality test asserting the three adapters produce byte-identical inventories for the
same fixture tree.

## 8. Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 0.1.0 | 2026-08-11 | Initial adapter contract. | Claude Code |
