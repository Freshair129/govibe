---
id: FEAT--SRS-INTELLIGENT-PIPELINE
tier: genesis
created_at: 2026-05-31T14:45:00+07:00
last_updated: 2026-05-31T16:15:00+07:00
phase: 2
type: feat
status: stable
enforcement_state: active
vault_id: covibe
title: SRS-G (Semantic-Rerank-Symbol-Graph) Intelligent Pipeline
tags: [rag, search, intelligence, precision, graph-ml]
domain: benchmark
aliases: [FEAT, SRS-INTELLIGENT-PIPELINE]
---

# FEAT--SRS-INTELLIGENT-PIPELINE

> Asset classification: historical benchmark/reference document. Preserved as adjacent retrieval/benchmark context and not part of the default GoVibe frontend worker load set.

## 1. Behavior Statement (User-Facing)
The system SHALL provide a high-precision retrieval mechanism (SRS-G) that links semantic natural language queries to live source code symbols and relationship-aware graph insights, enabling LLM agents to reason over complex technical dependencies.

## 2. Requirement Specification (EARS)
*   **[R1] SEMANTIC SEARCH:** WHEN a user enters a technical query, THEN the system SHALL retrieve Top-20 relevant chunks from the Jina-v5 Vector Store.
*   **[R2] NEURAL RERANKING:** WHEN Top-20 chunks are retrieved, THEN the system SHALL use Jina Reranker v3 to sort them by objective technical relevance.
*   **[R3] GRAPH AUGMENTATION:** WHEN "Graph-Augmented" mode is active, THEN the system SHALL use Graph-ML models (e.g., GraphsGPT) to refine retrieval based on topological code dependencies.
*   **[R4] SYMBOL LINKING:** WHEN a chunk contains a recognized Symbol ID, THEN the system SHALL display a direct link and preview of the live source code from the GKS Symbol Table.

## 3. Acceptance Criteria (AC)
*   **AC1:** UI displays a "Graph Intelligence Zoo" with at least 4 specialized Graph-ML models.
*   **AC2:** A toggle between "Dense Vector" and "Graph-Augmented" retrieval modes is functional.
*   **AC3:** Hovering over a @SymbolID reveals a "Live Code Preview" side-panel.
*   **AC4:** A HUD indicator displays the "Active Model" (e.g., GraphsGPT-8W).
