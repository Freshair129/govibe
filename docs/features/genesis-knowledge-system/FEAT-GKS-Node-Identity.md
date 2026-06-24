---
doc_id: "FEAT-GKS-NODE-IDENTITY"
uid: "01KVXGFTY40MSVC2QMBD2MAMJ4"
title: "GKS Knowledge-Node Identity (uid + content-address)"
status: "approved"
version: "0.1.0+draft"
content_hash: "atom:cba3feab8dfc9aa7"
updated: "2026-06-25"
owner: "ARCHON"
type: feat
related_docs:
  - "docs/adr/ADR-021-doc-identity-model.md"
  - "docs/features/execution-governance/FEAT-Doc-Content-Integrity.md"
  - "docs/features/genesis-knowledge-system/FEAT-GenesisBlockDB-Core.md"
  - "docs/adr/ADR-019-Universal-Code-In-MCP-Out.md"
---

# GKS Knowledge-Node Identity (uid + content-address)

> Foundation FR for [[ADR-021-DOC-IDENTITY-MODEL]]. Owns the identity primitive for **every**
> knowledge node (doc atom, code atom, agent-memory unit) — not just docs. The GoVibe doc consumer
> is [[FEAT-DOC-CONTENT-INTEGRITY]].

## 1. Purpose

Define a stable identity for GKS knowledge nodes that survives both **rename** (location change) and
**edit** (content change), reusing the existing translator atomizer so it is forward-compatible with
the GenesisBlockDB atom store.

## 2. Scope

**In:** the identity contract + the content-address primitive.
**Out:** persisting the atom store and JIT retrieval (later GenesisBlockDB epic).

### Functional Requirements

- **FR-1 (uid):** every governed knowledge node carries an immutable `uid` (ULID — sortable,
  time-prefixed), minted once and frozen. It is the stable node key in the atom graph.
- **FR-2 (content-address):** a node's `content_hash` = `atom:` + sha256 of its sorted atom keys
  (from `atomize()`), excluding frontmatter + Changelog. Edit → new hash; format-only changes
  (numbering/case/order) → same hash (atom keys are content-identity).
- **FR-3 (reference-by-id):** cross-node references resolve through the `uid`/`doc_id` resolver, never
  raw path, so rename does not break inbound links.
- **FR-4 (reuse, no fork):** `content_hash` MUST reuse `scripts/mcp/translator/atomizer.mjs`
  (`atomKey`/`atomize`) — no second hashing scheme.

## 3. Acceptance Criteria

- Given a node, `content_hash` is stable across a pure format change and changes on a substantive
  edit.
- Given a renamed file, references resolving by id still resolve (resolver updated in one place).
- `uid` is present, ULID-shaped, and unchanged across edits + renames once minted.

## 4. Success Criteria

- The same `content_hash` primitive is usable by the doc consumer ([[FEAT-DOC-CONTENT-INTEGRITY]])
  and a future code/agent-memory consumer without change.

## 5. Definition of Done

- Contract ratified in [[ADR-021-DOC-IDENTITY-MODEL]]; primitive specified against the atomizer;
  consumer FEAT can depend on it.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-25 | ARCHON | Drafted the GKS node-identity FR (uid + atom-merkle content-address + reference-by-id), depending on ADR-021. Awaiting ratification. |
