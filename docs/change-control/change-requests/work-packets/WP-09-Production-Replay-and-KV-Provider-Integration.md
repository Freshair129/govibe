---
title: "WP-09: Production Replay and KV Provider Integration"
doc_id: "WP-09-PRODUCTION-REPLAY-KV-PROVIDER"
status: "verification_pending"
version: "0.9.0"
updated: "2026-08-02"
owner: "Boss / ATHER"
complexity: "C-3"
access_scope: "H4"
---

# Objective

Make context replay durable across process restarts and fail closed when source, model, tool-contract, or KV integrity cannot be reproduced.

# Implemented

- A provider contract with `put` and `get` operations.
- An atomic file-backed provider suitable as the local production default.
- Versioned replay bundles containing context, source manifest, model, tool contract, injection, and optional KV payload evidence.
- SHA-256 integrity checks for the complete bundle and nested KV payload.
- Explicit compatibility checks before restoration.
- A restoration callback boundary so executor/model-specific KV injection stays outside the persistence layer.
- Tests covering restart durability, KV restoration, compatibility rejection, and tamper detection.

# Invariants

- Replay IDs are safe identifiers and cannot escape the provider root.
- A replay bundle cannot be restored under a different model or tool contract when an exact match is required.
- Source manifest and context hashes remain authoritative.
- KV payloads are optional, but when present their integrity is mandatory.
- File writes are staged and atomically renamed.
- Provider recreation must not lose committed replay state.

# Boundary

This work does not claim cross-model KV portability. KV restoration remains model-specific and executor-specific. Remote providers may implement the same contract in later deployment work without changing replay validation semantics.

# Acceptance criteria

- Tests, lint, documentation validation, MCP smoke, and build pass in CI.
- PR remains unmerged until explicit owner approval.
