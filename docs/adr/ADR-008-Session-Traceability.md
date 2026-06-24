---
doc_id: "ADR-008-SESSION-TRACEABILITY"
uid: "01KVXGFRV4MZKQCYWPSYRV29FJ"
title: "ADR-008: Session Traceability & Telemetry System"
status: "draft"
version: "0.1.0+draft"
content_hash: "atom:4f4b507346f30c29"
updated: "2026-06-24"
owner: "THESEUS"
type: adr
---
# ADR-008: Session Traceability & Telemetry System

**Status:** Draft
**Owner:** THESEUS
**Traceability:** SYSTEM-09 / Traceability Audit

## 1. Context
Current session execution lacks automated telemetry. We cannot reliably track token usage, model performance, tool invocation frequency, or automatically link RCA/incidents to a specific operational session.

## 2. Decision
1. **Session-ID (SID)**: All sessions are assigned a unique SID at start.
2. **Automated Tracker**: A GoVibe-native `SessionTracker` will intercept MCP tool calls, agent invocations, and completion events.
3. **Telemetry Store**: Metrics (tokens, models, duration) and critical events (RCA, Incidents) are serialized into a JSONL trace file per session in `.agents/devops/session_logs/`.
4. **Final Report**: Upon session termination, the tracker generates a consolidated summary artifact.

## 3. Implementation Plan
- **Phase A**: Define `SessionTracker` schema and logic in `packages/govibe-core/bin/session-tracker.mjs`.
- **Phase B**: Integrate tracking hooks into `runtime-core.mjs`.
- **Phase C**: Implement `govibe.session.end` tool to trigger final summary report generation.

## Changelog

| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0+draft | 2026-06-24 | THESEUS | Brought under document governance (docs:backfill): frontmatter + changelog. |
