---
doc_id: "ADR-007-DETERMINISTIC-GOVERNANCE"
uid: "01KVXGFRV34D202VJYRFQN75M0"
title: "ADR-007: Deterministic Governance via Hardened Tooling"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:a045dec2a5ddeb4a"
updated: "2026-06-24"
owner: "THESEUS / RKOI"
type: adr
---
# ADR-007: Deterministic Governance via Hardened Tooling

**Status:** Approved
**Owner:** THESEUS / RKOI
**Traceability:** SYSTEM-10 / Execution Governance

## 1. Context
Previous governance relied on loosely coupled YAML configuration and trust-based agent behavior. This led to "Configuration Hell", halluncinated IDs, and structural drift in documentation, as agents were permitted to author content directly without structural enforcement.

## 2. Decision
1.  **Template-as-Code**: Direct authoring of canonical `docs/` artifacts by agents is prohibited. All artifacts must be initialized via `govibe doc create`.
2.  **Deterministic ID Enforcement**: Agents must use predefined `agent_id`s. Hallucinated IDs are rejected by the registry validator.
3.  **Hardened Validation Gate**: A mandatory `govibe workspace validate` gate (enforced via Git pre-commit hook) checks schema compliance, artifact traceability, and dependency drift before commits are accepted.
4.  **Decoupled Logic**: Business logic for tiers/limits is migrated from YAML to the GoVibe native runtime (Validator/CLI), ensuring the registry remains a pure data store.

## 3. Impact
- **Drift Elimination**: Strict template enforcement ensures consistent Metadata.
- **Observability**: `govibe workspace validate` provides deterministic audit logs.
- **Maintainability**: Reduced Registry complexity allows for cleaner, modular scaling.

## 4. Implementation Plan
- **Phase A**: Migrate all agent contracts to `AGENT.md` (Completed).
- **Phase B**: Implement `govibe doc create` and `govibe workspace validate`.
- **Phase C**: Install pre-commit hooks to enforce validation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | THESEUS / RKOI | Brought under document governance (docs:backfill): frontmatter + changelog. |
