---
title: "Alignment 01: System Authority and Command Boundary"
doc_id: "ALIGNMENT-01-SYSTEM-AUTHORITY-COMMAND-BOUNDARY"
status: "approved"
version: "1.0.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
type: "alignment"
source_of_truth: false
conforms_to:
  - "docs/api/API-005-GoVibe-Capability-Contracts.md"
  - "docs/architecture/BLUEPRINT-GoVibe-Capability-Vertical-Slice.md"
  - "docs/adr/ADR-022-Vault-Ownership-and-Context-Lineage.md"
---

# Purpose

This document is a conformance map. It does not redefine the architecture. Canonical authority remains in the linked API, Blueprint, and ADR.

# Required authority chain

```text
User / Claude Code / Executor
  -> GoVibe MCP command boundary
  -> MSP parent boundary
  -> GKS canonical knowledge lifecycle
  -> GenesisBlockDB persistence and indexing
```

# Command boundary

- `govibe.workspace.initialize` prepares workspace state and registers identities through MSP.
- `govibe.workspace.scan` is the public scan command entrypoint.
- `deep: true` invokes the canonical twelve-stage decomposition contract.
- Executors must not call MSP, GKS, or GenesisBlockDB directly.
- GoVibe must not expose or use a direct GKS or GenesisBlockDB runtime port.

# Ownership alignment

| Concern | Owner |
|---|---|
| Command routing and scan orchestration | GoVibe |
| Identity, authority, Vault Registry, evidence, promotion mediation | MSP |
| Canonical document/atom/entity/relation identity and lifecycle | GKS |
| Transactions, graph/vector indexes, snapshots and persistence | GenesisBlockDB |

# Conformance checks

1. Runtime configuration uses the MSP parent transport only.
2. Deep Scan outputs remain candidates until MSP-mediated GKS canonicalization.
3. Returned `gks:` references are opaque references, not connection capabilities.
4. Initialization and governed execution fail closed when mandatory parent registration is unavailable.

# Supersession rule

When this mapping conflicts with a canonical document, the canonical API/ADR/Blueprint wins and this alignment document must be updated.
