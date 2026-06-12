# FEAT: Hybrid JIT Context System

**Status:** `DRAFT`
**Date:** 2026-06-12
**Primary PRD System:** `SYSTEM-08::Genesis-Knowledge-System`
**Supporting PRD System:** `SYSTEM-03::Docs-to-Code-System`
**Owner:** ARCHON
**Auditor:** ATHER

## 1. Goal

Load the minimum useful context for an agent task by combining Markdown source documents with graph-derived in-memory context and rendering a task-specific virtual document on demand.

## 2. Core Workflow

```text
approved source document
  -> parser builds in-memory graph
  -> hop-bounded query resolves relevant nodes
  -> JIT renderer builds task-specific virtual document
  -> agent consumes only the required context window
```

## 3. Minimum Responsibilities

- resolve canonical Markdown or HTML source
- build temporary graph context from the approved source
- bound retrieval by hop, tier, and task scope
- return a virtual document or text snapshot instead of the full raw tree

## 4. Acceptance Criteria

- Agents can receive task-scoped context without loading full source trees.
- Rendered context remains traceable to source path and source section.
- JIT rendering works with compacted documents rather than requiring one atom per file.
- Batch ingest and virtual rendering rules remain compatible with Obsidian and GenesisDB workflow assumptions.

