---
title: "WP-06: MSP Reference Server and Live Contract Tests"
doc_id: "WP-06-MSP-REFERENCE-SERVER-LIVE-CONTRACT-TESTS"
status: "in_progress"
version: "0.1.0"
updated: "2026-08-01"
owner: "Boss / ATHER"
complexity: "C-3"
access_scope: "H4"
---

# Objective

Prove that GoVibe's MSP client boundary works through the real stdio JSON-RPC transport rather than only in-process mocks.

# Scope

1. Add a deterministic reference MSP server for contract testing only.
2. Exercise initialize, tools/call, structuredContent, parent errors, timeout, malformed response, namespace validation, policy decisions, and idempotent retry.
3. Keep the reference server outside production authority. It does not implement canonical GKS or GenesisBlockDB persistence.
4. Make transport timeout configurable for bounded tests while preserving the production default.
5. Add live contract tests that spawn the reference server as a child process.

# Invariants

- GoVibe continues to call MSP through stdio JSON-RPC.
- The reference server is a test fixture, not a production MSP implementation.
- Wrong namespaces, malformed payloads, and parent-denied operations fail closed.
- Retried idempotent requests return the same authoritative reference.
- Child processes and pending timers are always cleaned up.

# Acceptance criteria

- A live context resolve succeeds through the spawned stdio server.
- Typed vault/context/memory responses pass client validation.
- Wrong namespaces and malformed responses are rejected.
- Parent errors surface as failures.
- Timeout behavior is deterministic and bounded.
- Idempotent retry is verified.
- Tests, lint, docs validation, MCP smoke, and build pass.
- PR remains unmerged until explicit owner approval.
