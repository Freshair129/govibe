---
doc_id: "ADR-011-INTENT-TO-PRODUCTION-GOVERNANCE"
uid: "01KVXGFRV5JNVYQM5SBKXCRC9R"
title: "ADR-011: Intent-to-Production (I2P) Governance Paradigm"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:3115660b9061ccdb"
updated: "2026-06-24"
owner: "ARCHON (CTO)"
type: adr
---
# ADR-011: Intent-to-Production (I2P) Governance Paradigm

**Status:** Approved
**Owner:** ARCHON (CTO)
**Traceability:** SYSTEM-01 / Mission Control

## 1. Context
Current workflows (Doc-to-Code) require manual effort to author specifications and bridge the gap between business intent and production-ready code. This introduces latency, potential for human error, and inconsistent governance. To achieve our vision of a "next-gen coding factory" where "complaints become apps", we must shift to an **Intent-to-Production (I2P) Engine**.

## 2. Decision
1. **Intent-as-Trigger**: The primary unit of work is no longer the markdown document, but the `INTENT--` atom (business goal + constraints).
2. **Autonomous Factory**: GoVibe runtime is upgraded to an "Intent Factory" that automatically orchestrates the generation of architecture, code, schema, monitoring, and security based on the `INTENT--` manifest.
3. **Automated Governance**: Standards (Compliance, Security, OTel) are injected into the production system *during assembly*, not retrofitted by humans.
4. **Obsidian as View-only**: Obsidian remains an interface for human visibility; it is no longer part of the critical runtime path.

## 3. Impact
- **Productivity**: Reduces the human/agent "coding tax" by automating the assembly of standard components.
- **Safety**: Governance is injected by the factory (Safe-by-Design), eliminating hallucinated or overlooked security requirements.
- **Consistency**: All production systems will share the same observability and deployment structure defined by the factory.

## 4. Implementation Path (Phase Transition)
- **Phase A**: Define `INTENT--` schema (Business goal, SLO, Security Constraints).
- **Phase B**: Implement `IntentDecomposer` in `packages/govibe-core/` to translate intent to Production-Grade Blueprints.
- **Phase C**: Integrate `IntentFactory` with GenesisBlockDB for persistent storage of intent and resulting artifacts.
- **Phase D**: Deprecate manual ADR authoring for trivial features, shifting human effort to reviewing high-level business goals only.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | ARCHON (CTO) | Brought under document governance (docs:backfill): frontmatter + changelog. |
