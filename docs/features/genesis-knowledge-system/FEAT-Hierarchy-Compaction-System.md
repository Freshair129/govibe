# FEAT: Hierarchy Compaction System

**Status:** `DRAFT`
**Date:** 2026-06-12
**Primary PRD System:** `SYSTEM-08::Genesis-Knowledge-System`
**Supporting PRD System:** `SYSTEM-03::Docs-to-Code-System`
**Owner:** ARCHON
**Auditor:** ATHER

## 1. Goal

Provide the H-level compaction model that decides how much document, graph, and context detail should be exposed to an agent task from `H0` through `H6`, while W-Scale controls fan-out breadth.

## 2. Core Responsibilities

- classify request scope into `H0` to `H6`
- resolve context boundaries by hop and hierarchy
- enforce `W-Scale` breadth limits on peer branching or node degree
- compact multiple atomic knowledge fragments into human-manageable source documents
- preserve enough structure for later graph extraction and JIT retrieval

## 3. Output Model

```text
request
  -> context tier selection
  -> scope resolution
  -> compacted document or section set
  -> downstream graph and JIT consumption
```

## 4. Acceptance Criteria

- Context tier selection is explicit and reviewable.
- Fan-out width is reviewable through `W-Scale` and cannot silently grow into super-hub structures.
- Human-readable source docs remain canonical after compaction.
- Compaction reduces document sprawl without erasing traceability.
- Downstream systems can still build graph and retrieval context from the compacted source.
