---
doc_id: "ADR-006-DETERMINISTIC-AGENT-ID-GENERATION"
uid: "01KVXGFRV28DR72F7P39HPKM43"
title: "ADR-006: Deterministic Agent ID Generation Engine"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:aa368a18e4d8560d"
updated: "2026-06-24"
owner: "THESEUS"
type: adr
---
# ADR-006: Deterministic Agent ID Generation Engine

**Status:** Draft
**Owner:** THESEUS
**Traceability:** SYSTEM-10 / Execution Governance

## 1. Context
To ensure robust orchestration, GoVibe must transition from display-name based identification to deterministic unique IDs. Allowing LLMs to generate IDs risks collisions and state drift.

## 2. Decision
1. **Unique ID Constraint**: `agent_id` is mandatory and must be unique across the `agent-registry.yaml`.
2. **Deterministic Pattern**: ID format must be `[project-namespace]-[role]-[slug]` (e.g., `govibe-devops-janus`).
3. **Registration Gate**: Agent IDs cannot be hallucinated; they must be added to the registry via `govibe.registry.add` (forthcoming) or manual approved PR.
4. **Validation**: `govibe.workspace.validate` will enforce unique `agent_id` constraints.

## 3. Implementation Plan
- **Phase A**: Enforce `agent_id` presence in `agent-registry.yaml` for all active agents.
- **Phase B**: Implement `govibe.registry.add` MCP tool.
- **Phase C**: Integrate ID uniqueness check in `packages/govibe-core/bin/validate.mjs`.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | THESEUS | Brought under document governance (docs:backfill): frontmatter + changelog. |
