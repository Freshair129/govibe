# ADR--INTEL-PIPELINE-SRS

> Asset classification: historical benchmark/reference document. This captures an older adjacent design/testing thread and should be loaded only when explicitly needed for comparison or recovery.
**Status:** PROPOSED | **Decider:** Architect

## 1. Context (Problem)
Current RAG implementation is flat and lacks technical precision. LLM agents often retrieve outdated or contextually irrelevant documentation. We need a way to link "Semantic Meaning" (Natural Language) with "Symbolic Truth" (Live Source Code/AST).

## 2. Decision: The SRS Architecture
We will implement a **Three-Stage Intelligence Pipeline**:
1.  **Stage 1 (Semantic):** Use `jina-embeddings-v5-text` (or Voyage-Code-3) for dense vector retrieval via HNSW index.
2.  **Stage 2 (Rerank):** Use `jina-reranker-v3` to refine the Top-20 results down to Top-5 based on cross-attention scoring.
3.  **Stage 3 (Symbol Link):** Automatically detect Symbol IDs in retrieved text and perform a direct lookup in the **GKS Symbol Table** (Live AST/Call Graph) to append the latest source code.

## 3. Rationale
*   **Jina AI Ecosystem:** Provides the best price-performance ratio and specialized code-search capabilities.
*   **Late Chunking:** Preserves global context in long files.
*   **Symbol Linking:** Mitigates the "hallucination" of old code by forcing the agent to see the *current* state of the file system.

## 4. Consequences
*   **Positive:** Higher precision in code generation and bug fixes.
*   **Negative:** Increased latency (due to Reranking step). Mitigation: Use **Semantic Caching** for frequent queries.

---

# FLOW--SRS-INTEL-PIPELINE
**Domain:** Domain C (Genesis Block DB)

## 1. Sequence Map
1.  **INPUT:** User Query (e.g., "How is drift calculated?")
2.  **SEMANTIC SEARCH:** 
    *   Query -> Embedding Model (`jina-v5`)
    *   Vector -> HNSW Index (Search L0-L2)
    *   Output: `[{id: 101, text: "...", score: 0.82}, ...]` (Top 20)
3.  **RERANKING:**
    *   Top 20 -> Reranker Model (`jina-reranker-v3`)
    *   Output: Sorted results with refined scores (Top 5)
4.  **SYMBOL LINKING:**
    *   Regex scan Top 5 for `@SymbolID` patterns.
    *   Match found: `calculateDrift`
    *   Lookup: `GKS.getSymbol('calculateDrift')` -> Returns `filePath`, `lineRange`, `rawCode`.
5.  **FINAL CONTEXT:** 
    *   Merge (Docs + Live Code + AST Metadata)
    *   Send to Agent.

---

# BLUEPRINT--DOMAIN-C-REFACTOR
**Status:** READY | **Priority:** HIGH

## 1. UI Implementation Strategy
We will refactor the `database-view` and `vector-view` in `codev_dashboard.html` into a unified **Intelligence Analytics** dashboard.

## 2. Component Tasks
*   **T1: Model Zoo UI:** Create a selection card for Jina, Voyage, and BGE models.
*   **T2: Reranking Studio:** Build a comparison table showing `Pre-Rerank Rank` vs `Post-Rerank Rank`.
*   **T3: Symbol Linker Overlay:** Add a side-panel that reveals live code when a vector result is hovered.
*   **T4: Cache Hit Monitor:** Add a HUD element showing % HIT, Latency Saved, and Memory Source.

## 3. Data Integration
*   Sync with `G:\covibe\data\benchmarks.json` for performance stats.
*   Sync with `G:\covibe\benchmark\ui\data\sushirl_summary.json` for campaign data.
