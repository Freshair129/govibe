---
doc_id: "ADR-019-UNIVERSAL-CODE-IN-MCP-OUT"
title: "ADR-019: Universal code-in (12-step) + MCP-out (7-phase) — no per-framework adapters"
status: "accepted"
version: "0.1.0"
updated: "2026-06-22"
owner: "Boss (CEO)"
type: adr
---

# ADR-019: Universal code-in + MCP-out — no per-framework adapters

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
"Swarm-to-swarm across heterogeneous frameworks" appears to require an adapter per orchestrator (LangGraph / CrewAI / AutoGen / custom) — which a solo dev cannot sustain. But every team, whatever framework or agents it uses, produces **code**.

## 2. Decision
Read the **artifact (code)**, not the **producer (framework)**:
- **Ingest (12-step top-down decomposition):** any codebase → atoms → GKS, **without touching the existing docs** (zero-migration). Works regardless of the source framework or whether docs exist.
- **Generate (7-phase bottom-up):** intent → doc → (diagram/spec) → code, routed by the **H6 + W-scale + Complexity gate** (STD-Execution-Governance). UX = `mcp govibe:add_feature`.
- **Control surface = MCP** (universal). One input (code/intent via decomposition) + one output (MCP) ⇒ **no per-framework adapters**. Cross-team meaning is reconciled via the GKS interlingua (ADR-017).

## 3. Consequences
- (+) No per-framework adapters; zero-migration ingestion.
- (+) Composes with any MCP-speaking agent/orchestrator.
- (−) Decomposition + generation quality is the hard part and is heavily contested (Sourcegraph/SCIP, Augment, Cursor, GitHub; Cognition/Devin, Copilot, Qodo). Treat them as **enabling-infra ("good enough", or delegate codegen and govern its output)** — do **not** try to out-build them; lead with governance.
- (−) Decomposition reliability is a known risk (cf. "Knowledge Packaging Error" history) → narrow language/framework scope first; human-in-loop at promotion.

## 4. Related
[[ADR-017-GoVibe-Governance-Translator-GKS-Interlingua]], `STD-Execution-Governance`, `CONCEPT--HYBRID-JIT-CONTEXT`, `BRD-GoVibe-Platform`.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided universal code-in (12-step) + MCP-out (7-phase); decomposition/generation = enabling-infra, not the moat. |
