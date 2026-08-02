---
doc_id: "ADR-019-UNIVERSAL-CODE-IN-MCP-OUT"
title: "ADR-019: Universal code-in (12-step) + MCP-out (7-phase) — no per-framework adapters"
status: "accepted"
version: "0.2.0"
updated: "2026-08-02"
owner: "Boss (CEO)"
type: adr
related_adrs: ["ADR-023"]
---

# ADR-019: Universal code-in + MCP-out — no per-framework adapters

**Status:** Accepted
**Date:** 2026-06-22
**Owner:** Boss (CEO)

## 1. Context
"Swarm-to-swarm across heterogeneous frameworks" appears to require an adapter per orchestrator, which a solo dev cannot sustain. But every team, whatever framework or agents it uses, produces artifacts such as code, documents, diagrams, tests, and execution evidence.

Generation and decomposition providers can transform those artifacts, but they normally treat the supplied input as sufficient and may fill missing requirements, relations, constraints, or rationale from model priors. A provider that produces plausible output is not automatically compatible with GoVibe's canonical knowledge, authority, and traceability contracts.

## 2. Decision
Read the **artifact**, not the **producer framework**:

- **Ingest:** any codebase or supported artifact → structural candidates → GKS promotion pipeline, without requiring migration of existing documents.
- **Generate:** governed intent/context → candidate doc/diagram/spec/code output, routed by the Execution Governance contract. UX may be exposed through MCP tools such as `govibe:add_feature`.
- **Control surface = MCP.** Cross-team meaning is reconciled through the GKS interlingua (`ADR-017`) and task context is governed by MSP (`ADR-023`).
- Decomposition, extraction, and generation providers are **replaceable bounded skills/providers**, but their outputs remain candidates.
- A provider output must carry source IDs and hashes, provenance, assumptions, requested scope, exclusions, and provider/version identity before normalization.
- GoVibe normalizes and validates candidate shape. MSP applies authority, context, and promotion policy. GKS alone assigns canonical identities, resolves canonical relations, deduplicates, and records graph versions.
- External providers must not create canonical `gks:` identities, widen approved scope, select unrestricted graph context, or bypass MSP/GKS promotion.

Canonical provider boundary:

```text
External skill / parser / generator
  -> bounded candidate output
  -> GoVibe normalization and contract validation
  -> MSP authority/context/promotion gate
  -> GKS canonical materialization
```

## 3. Consequences
- (+) No per-framework adapters; zero-migration artifact ingestion remains possible.
- (+) Specialist providers can improve without redefining GoVibe's core product contract.
- (+) Provider fluency cannot silently replace missing WHY, source relations, scope, or approval.
- (+) Candidate output can be rejected, replayed, compared, or replaced without corrupting canonical knowledge.
- (−) Provider integration requires conformance adapters and validation rather than raw prompt/output passthrough.
- (−) Decomposition and generation quality remain contested enabling infrastructure; GoVibe must govern their output instead of claiming provider superiority.
- (−) Human or policy approval remains necessary when relation coverage, authority, or assumptions are unresolved.

## 4. Related
[[ADR-017-GoVibe-Governance-Translator-GKS-Interlingua]], [[ADR-023-Knowledge-Authority-Context-Authority-Boundary]], `STD-Execution-Governance`, `CONCEPT--HYBRID-JIT-CONTEXT`, `BRD-GoVibe-Platform`.

## Changelog
| Version | Date | Owner | Summary |
|---|---|---|---|
| 0.2.0 | 2026-08-02 | Boss (CEO) | Defined external skills as candidate providers subject to GoVibe normalization, MSP governance, and GKS canonical materialization. |
| 0.1.0 | 2026-06-22 | Boss (CEO) | Decided universal code-in + MCP-out; decomposition/generation are enabling infrastructure, not the moat. |
