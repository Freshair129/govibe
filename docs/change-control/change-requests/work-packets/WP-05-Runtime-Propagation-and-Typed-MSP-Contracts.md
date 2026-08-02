---
title: "WP-05: Runtime Propagation and Typed MSP Contracts"
doc_id: "WP-05-RUNTIME-PROPAGATION-TYPED-MSP"
status: "verification_pending"
version: "0.2.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-3"
access_scope: "H4"
---

# Objective

Close the gap where MCP schemas accepted workflow lineage and impact traversal controls but `runtime-core` discarded them, and replace untyped MSP parent calls for vault/context/memory commands with validated request/response contracts.

# Implemented scope

1. Preserved `agentId`, `contextProfile`, `workflowRef/workflowId`, `parentContextId`, `sessionId`, `runId`, and `turnId` through `govibe.workflow.continue`.
2. Preserved `changeType`, `maxDistance`, and `minimumScore` through `govibe.workspace.impact`.
3. Retained workspace-root containment before invoking core operations.
4. Added typed MSP adapters for vault status, vault mount, context diff, context audit, and memory promotion.
5. Added response validation for MSP namespaces, hashes, policy decisions, required evidence, and structured result objects.
6. Routed the seven vault/context commands through the typed surface while preserving typed context resolve and replay methods.
7. Added tests for argument propagation, traversal controls, valid typed responses, and malformed parent responses.

# Invariants

- GoVibe remains MSP-parent-mediated.
- No direct GKS or GenesisBlockDB access is introduced.
- Accepted MCP fields must either affect execution or be rejected explicitly.
- Parent responses with invalid namespaces, hashes, or policy decisions fail closed.
- Workspace paths remain bounded to configured allowed roots.

# Verification evidence

- Implementation head: `c4af84b97a982c01b6ac4a66c1d57d040b337900`.
- CI: pending.

# Acceptance criteria

- Workflow lineage/profile parameters reach `continueWorkflow` core.
- Impact severity/distance/score controls reach the impact engine.
- Typed MSP adapters validate both outbound required fields and inbound authority evidence.
- Tests, MCP smoke, docs validation, lint, and build pass.
- PR remains unmerged until explicit owner approval.
