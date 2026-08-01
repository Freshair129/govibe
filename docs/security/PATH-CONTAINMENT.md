# Canonical path containment

Filesystem paths accepted from Mission Control, MCP tools, or environment configuration must be resolved against an explicit allowed root before use.

## Invariant

A caller-provided path is allowed only when its canonical `realpath` is the allowed root itself or a descendant of that canonical root.

Lexical prefix checks are insufficient because `..`, mixed separators, platform case rules, and symbolic links can escape the intended directory.

## Helper

Use `scripts/mcp/path-security.mjs`:

- `resolvePathWithinRoot(inputPath, rootPath)` for a single trust root.
- `resolvePathWithinAnyRoot(inputPath, rootPaths)` when policy explicitly permits multiple roots.

Rejected containment attempts use error code `PATH_OUTSIDE_ALLOWED_ROOT`. Public HTTP/MCP handlers should translate this into a bounded client error without exposing unnecessary host filesystem details.

## Required consumers

The helper is intended for roadmap load/select, master-plan preview, roadmap export, workspace operations, and future file persistence paths. Each consumer remains responsible for declaring whether the resolved path is read-only or writable and for validating file type and existence.
