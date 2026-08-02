---
title: "Canonical Path Containment"
doc_id: "PATH-CONTAINMENT"
status: "draft"
version: "0.1.0+draft"
updated: "2026-08-03"
owner: "ATHER"
source_of_truth: false
---

# Canonical Path Containment

Roadmap paths received from Mission Control or MCP callers are resolved with `scripts/mcp/path-security.mjs` before reads or writes.

## Configuration

- `GOVIBE_ROADMAP_READ_ROOTS`: optional JSON array of absolute readable roots; defaults to `<workspace>/docs/roadmap`.
- `GOVIBE_ROADMAP_WRITE_ROOTS`: optional JSON array of absolute writable roots; defaults to `<workspace>/docs/roadmap`.

The runtime canonicalizes roots and targets with `realpath`, applies platform-consistent `path.relative` containment, rejects traversal, absolute escapes, and symlink escapes, and distinguishes `PATH_NOT_FOUND` from `PATH_OUTSIDE_ALLOWED_ROOT`. Missing export leaves are permitted only after their nearest existing ancestor is canonicalized and contained. Client-facing errors are fixed and do not include host paths.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-08-03 | ATHER | Added governed metadata under delegated Phase 1B authority; runtime-security assertions remain subject to separate verification. |
