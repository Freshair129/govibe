---
id: SPEC--SRS-PIPELINE-INTERFACE
tier: genesis
created_at: 2026-05-31T14:45:00+07:00
last_updated: 2026-05-31T16:15:00+07:00
phase: 2
type: spec
status: stable
enforcement_state: active
vault_id: covibe
title: SRS-G Pipeline API & Graph Zoo Specification
tags: [api, contract, spec, graph-ml]
domain: benchmark
aliases: [SPEC, SRS-PIPELINE-INTERFACE]
---

# SPEC--SRS-PIPELINE-INTERFACE

> Asset classification: historical benchmark/reference document. Preserve as opt-in background only; it is not current Mission Control runtime truth.

## 1. Technical Contract
*   **Endpoint:** `GET /api/v1/search/srs-g`
*   **Payload:** `{ query: string, model: string, rerank: boolean, graph_mode: boolean }`
*   **Response:** `Array<{ id: string, text: string, score: number, graph_score?: number, symbolLink?: SymbolMetadata }>`

## 2. Graph Intelligence Zoo Inventory
*   **GraphsGPT-8W:** Reasoning LLM for structural analysis.
*   **Graphormer-Rerank:** Sub-graph similarity ranking.
*   **Ultra-50G:** Knowledge Graph reasoning and inference.
*   **RGCN-Relational:** Pattern discovery across multi-relational edges.

## 3. Retrieval Modes
*   **Dense Mode:** Standard Cosine Similarity (Jina v5 / Voyage).
*   **Graph Mode:** Augmented retrieval using topological weights from GKS Call Graphs.
