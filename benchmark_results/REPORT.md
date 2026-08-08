# GoVibe Full Model Benchmark Report

**Date:** 2026-08-07T19:14:41.607Z
**Models tested:** 43 / 54 (11 cloud models skipped)
**Total time:** 70.8 minutes
**Test suite:** 8 tests per model

## Summary Leaderboard

| Rank | Model | Size | Quant | Category | Score | Pass% | TPS | TTFT(ms) | Leak |
|------|-------|------|-------|----------|-------|-------|-----|----------|------|
| 1 | Translategemma | 3.3GB | latest | REASONING | 100 | 100% | 78.12 | 10860 | ✅ |
| 2 | Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | 7.3GB | Q4_K_M | REASONING | 100 | 100% | 36.8 | 10592 | ✅ |
| 3 | Mellum2 12B A2.5B Instruct | 8.1GB | Q4_K_M | CODE | 100 | 100% | 138.77 | 10510 | ✅ |
| 4 | Bonsai 27B | 4.4GB | Q1_0 | REASONING | 97.5 | 100% | 30.79 | 7181 | ✅ |
| 5 | Minicpm V4.6 | 1.6GB | 1b | GENERAL | 93.8 | 88% | 159.07 | 5161 | ✅ |
| 6 | Qwen3.6 14B A3B FableVibes | 9.3GB | MXFP4_MOE | REASONING | 87.5 | 88% | 60.18 | 13136 | ✅ |
| 7 | Llama3.2 | 1.3GB | 1b | REASONING | 87.5 | 88% | 165.56 | 3662 | ✅ |
| 8 | Minicpm V4.5 | 6.1GB | 8b | GENERAL | 87.5 | 88% | 34.95 | 4226 | ✅ |
| 9 | Llama 3 8B Lexi Uncensored | 4.9GB | Q4_K_M | REASONING | 87.5 | 88% | 63.22 | 7302 | ✅ |
| 10 | Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | 7.4GB | Q4_K_M | REASONING | 83.8 | 75% | 32.32 | 11164 | ✅ |
| 11 | Qwythos 9B Claude Mythos 5 1M | 6.5GB | Q4_K_M | REASONING | 83.4 | 88% | 45.18 | 10257 | ⚠️ |
| 12 | Gemma 4 12b It | 7.5GB | UD-Q4_K_XL | REASONING | 81.3 | 75% | 30.75 | 11797 | ⚠️ |
| 13 | Glm Ocr | 2.2GB | latest | GENERAL | 81.3 | 75% | 174.57 | 1949 | ✅ |
| 14 | Ornith 1.0 9B | 5.6GB | Q4_K_M | REASONING | 78.8 | 75% | 45.12 | 9095 | ✅ |
| 15 | Chinda Qwen3 4b | 2.5GB | Q4_K_M | THAI-NLP | 78.1 | 75% | 76.6 | 4366 | ⚠️ |
| 16 | VibeThinker 3B | 1.9GB | Q4_K_M | REASONING | 75 | 75% | 97 | 2666 | ⚠️ |
| 17 | Deepseek Ocr | 6.7GB | latest | GENERAL | 75 | 75% | 125121.32 | 3617 | ✅ |
| 18 | LFM2 1.2B RAG | 0.71GB | Q4_K_M | REASONING | 75 | 75% | 264.37 | 1316 | ✅ |
| 19 | Jina Embeddings V4 Text Matching | 1.9GB | Q4_K_M | EMBEDDING | 73 | 75% | 100.61 | 3002 | ✅ |
| 20 | LFM2 1.2B RAG | 2.3GB | F16 | REASONING | 70.9 | 75% | 120.61 | 3249 | ✅ |
| 21 | Aroow Rust Coder 9B Q4 K S | 5.4GB | Q4_K_S | CODE | 68.8 | 63% | 48.38 | 6706 | ✅ |
| 22 | Qwen3.5 9B Uncensored HauhauCS Aggressive | 6.5GB | Q4_K_M | REASONING | 63.8 | 63% | 45.17 | 10652 | ⚠️ |
| 23 | Jina Reranker V3.5 | 0.39GB | Q4_K_M | EMBEDDING | 54.1 | 50% | 260.64 | 1322 | ✅ |
| 24 | Jina Embeddings V4 Text Retrieval | 3.3GB | Q4_K_M | EMBEDDING | 53.1 | 50% | 78.05 | 5627 | ✅ |
| 25 | Unlimited OCR | 2.8GB | Q4_K_M | GENERAL | 28.1 | 25% | 375164.46 | 4394 | ✅ |
| 26 | Gemma4 | 7.6GB | 12b | REASONING | 25 | 25% | 32.16 | 10178 | ✅ |
| 27 | Mellum2 12B A2.5B Thinking | 8.1GB | Q4_K_M | CODE | 25 | 25% | 124.66 | 10418 | ✅ |
| 28 | Bonsai 8B | 1.2GB | Q1_0 | REASONING | 25 | 25% | 74.79 | 3967 | ✅ |
| 29 | Jina Code Embeddings 1.5b | 3.1GB | BF16 | EMBEDDING | 20.8 | 13% | 56.52 | 3991 | ✅ |
| 30 | Qwen3.5 | 6.6GB | 9b | REASONING | 12.5 | 13% | 44.25 | 13032 | ✅ |
| 31 | Lfm2.5 | 5.2GB | 8b | REASONING | 12.5 | 13% | 52.48 | 7528 | ✅ |
| 32 | Qwen3.5 | 3.4GB | 4b | REASONING | 12.5 | 13% | 66.16 | 10627 | ✅ |
| 33 | Parable Qwen3 4B Claude Fable 5 | 2.5GB | Q4_K_M | REASONING | 12.5 | 13% | 85.12 | 6751 | ✅ |
| 34 | Parable Qwen3 4B Claude Fable 5 | 8.1GB | F16 | REASONING | 12.5 | 13% | 11.79 | 26694 | ✅ |
| 35 | Gemma4 Rust Coder | 3.4GB | latest | CODE | 9.4 | 13% | 90.76 | 4840 | ⚠️ |
| 36 | Bge Reranker V2 M3 | 0.62GB | Q8_0 | EMBEDDING | 0 | 0% | 0 | 0 | ⚠️ |
| 37 | Ternary Bonsai 27B | 7.8GB | Q2_0 | REASONING | 0 | 0% | 0 | 0 | ⚠️ |
| 38 | Bge M3 | 1.2GB | latest | EMBEDDING | 0 | 0% | 0 | 0 | ⚠️ |
| 39 | Gemma4 | 17GB | 26b | REASONING | 0 | 0% | 0 | 0 | ⚠️ |
| 40 | Qwen3.5 | 23GB | 35b | REASONING | 0 | 0% | 0 | 0 | ⚠️ |
| 41 | Qwen3.6 | 17GB | 27b | REASONING | 0 | 0% | 0 | 0 | ⚠️ |
| 42 | Amd.Instella MoE 16B A3B Think | 6.5GB | Q2_K | CODE | 0 | 0% | 0 | 0 | ⚠️ |
| 43 | Glm 4.7 Flash | 19GB | latest | REASONING | 0 | 0% | 0 | 0 | ⚠️ |

## Code Generation

| Model | Test | Score | TPS | TTFT | Pass |
|-------|------|-------|-----|------|------|
| Translategemma | T1_CODE_FN | 100 | 73.25 | 26834ms | ✅ |
| Translategemma | T2_CODE_RUST | 100 | 73.01 | 630ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T1_CODE_FN | 100 | 36.77 | 81248ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T2_CODE_RUST | 100 | 36.81 | 500ms | ✅ |
| Mellum2 12B A2.5B Instruct | T1_CODE_FN | 100 | 117.72 | 82420ms | ✅ |
| Mellum2 12B A2.5B Instruct | T2_CODE_RUST | 100 | 121.19 | 237ms | ✅ |
| Bonsai 27B | T1_CODE_FN | 100 | 30.13 | 52829ms | ✅ |
| Bonsai 27B | T2_CODE_RUST | 100 | 30.93 | 694ms | ✅ |
| Minicpm V4.6 | T1_CODE_FN | 100 | 158.51 | 38508ms | ✅ |
| Minicpm V4.6 | T2_CODE_RUST | 100 | 161.24 | 396ms | ✅ |
| Qwen3.6 14B A3B FableVibes | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Qwen3.6 14B A3B FableVibes | T2_CODE_RUST | 100 | 59.67 | 88768ms | ✅ |
| Llama3.2 | T1_CODE_FN | 100 | 151.53 | 27221ms | ✅ |
| Llama3.2 | T2_CODE_RUST | 100 | 153.77 | 307ms | ✅ |
| Minicpm V4.5 | T1_CODE_FN | 100 | 26.93 | 31141ms | ✅ |
| Minicpm V4.5 | T2_CODE_RUST | 100 | 27.58 | 381ms | ✅ |
| Llama 3 8B Lexi Uncensored | T1_CODE_FN | 100 | 54.26 | 56180ms | ✅ |
| Llama 3 8B Lexi Uncensored | T2_CODE_RUST | 100 | 54.35 | 325ms | ✅ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T1_CODE_FN | 100 | 32.43 | 84394ms | ✅ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T2_CODE_RUST | 100 | 32.38 | 706ms | ✅ |
| Qwythos 9B Claude Mythos 5 1M | T1_CODE_FN | 100 | 45.04 | 78569ms | ✅ |
| Qwythos 9B Claude Mythos 5 1M | T2_CODE_RUST | 67 | 44.98 | 503ms | ✅ |
| Gemma 4 12b It | T1_CODE_FN | 100 | 31.03 | 89373ms | ✅ |
| Gemma 4 12b It | T2_CODE_RUST | 100 | 31.15 | 745ms | ✅ |
| Glm Ocr | T1_CODE_FN | 100 | 173.54 | 14416ms | ✅ |
| Glm Ocr | T2_CODE_RUST | 100 | 175.75 | 173ms | ✅ |
| Ornith 1.0 9B | T1_CODE_FN | 100 | 45.02 | 69408ms | ✅ |
| Ornith 1.0 9B | T2_CODE_RUST | 100 | 45.21 | 483ms | ✅ |
| Chinda Qwen3 4b | T1_CODE_FN | 100 | 77.09 | 33077ms | ✅ |
| Chinda Qwen3 4b | T2_CODE_RUST | 100 | 76.57 | 265ms | ✅ |
| VibeThinker 3B | T1_CODE_FN | 100 | 95.22 | 19522ms | ✅ |
| VibeThinker 3B | T2_CODE_RUST | 100 | 97.19 | 269ms | ✅ |
| Deepseek Ocr | T1_CODE_FN | 100 | 66.08 | 27145ms | ✅ |
| Deepseek Ocr | T2_CODE_RUST | 100 | 145.91 | 253ms | ✅ |
| LFM2 1.2B RAG | T1_CODE_FN | 100 | 241.75 | 9591ms | ✅ |
| LFM2 1.2B RAG | T2_CODE_RUST | 100 | 244.16 | 131ms | ✅ |
| Jina Embeddings V4 Text Matching | T1_CODE_FN | 67 | 99.65 | 22246ms | ✅ |
| Jina Embeddings V4 Text Matching | T2_CODE_RUST | 67 | 100.97 | 265ms | ✅ |
| LFM2 1.2B RAG | T1_CODE_FN | 67 | 99.05 | 24970ms | ✅ |
| LFM2 1.2B RAG | T2_CODE_RUST | 100 | 106.36 | 135ms | ✅ |
| Aroow Rust Coder 9B Q4 K S | T1_CODE_FN | 100 | 46.33 | 50206ms | ✅ |
| Aroow Rust Coder 9B Q4 K S | T2_CODE_RUST | 100 | 45.65 | 536ms | ✅ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T1_CODE_FN | 100 | 45.08 | 81800ms | ✅ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T2_CODE_RUST | 100 | 45.1 | 499ms | ✅ |
| Jina Reranker V3.5 | T1_CODE_FN | 33 | 255.94 | 7135ms | ❌ |
| Jina Reranker V3.5 | T2_CODE_RUST | 0 | 259.68 | 1232ms | ❌ |
| Jina Embeddings V4 Text Retrieval | T1_CODE_FN | 67 | 2.52 | 43255ms | ✅ |
| Jina Embeddings V4 Text Retrieval | T2_CODE_RUST | 33 | 55.82 | 251ms | ❌ |
| Unlimited OCR | T1_CODE_FN | 0 | 1000000 | 33587ms | ❌ |
| Unlimited OCR | T2_CODE_RUST | 0 | 262.24 | 262ms | ❌ |
| Gemma4 | T1_CODE_FN | 0 | 32.28 | 41571ms | ❌ |
| Gemma4 | T2_CODE_RUST | 0 | 32.26 | 8654ms | ❌ |
| Mellum2 12B A2.5B Thinking | T1_CODE_FN | 0 | 123.5 | 73795ms | ❌ |
| Mellum2 12B A2.5B Thinking | T2_CODE_RUST | 0 | 124.43 | 2300ms | ❌ |
| Bonsai 8B | T1_CODE_FN | 100 | 75.42 | 15669ms | ✅ |
| Bonsai 8B | T2_CODE_RUST | 0 | 74.13 | 3761ms | ❌ |
| Jina Code Embeddings 1.5b | T1_CODE_FN | 33 | 74.88 | 30136ms | ❌ |
| Jina Code Embeddings 1.5b | T2_CODE_RUST | 33 | 45.2 | 263ms | ❌ |
| Qwen3.5 | T1_CODE_FN | 0 | 44.1 | 74371ms | ❌ |
| Qwen3.5 | T2_CODE_RUST | 0 | 43.85 | 6432ms | ❌ |
| Lfm2.5 | T1_CODE_FN | 0 | 0.77 | 57880ms | ❌ |
| Lfm2.5 | T2_CODE_RUST | 0 | 72 | 338ms | ❌ |
| Qwen3.5 | T1_CODE_FN | 0 | 65.4 | 64096ms | ❌ |
| Qwen3.5 | T2_CODE_RUST | 0 | 66.79 | 4359ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T1_CODE_FN | 0 | 85.02 | 38578ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T2_CODE_RUST | 0 | 84.61 | 3295ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T1_CODE_FN | 0 | 11.66 | 111038ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T2_CODE_RUST | 0 | 11.34 | 23101ms | ❌ |
| Gemma4 Rust Coder | T1_CODE_FN | 0 | 89.22 | 22601ms | ❌ |
| Gemma4 Rust Coder | T2_CODE_RUST | 0 | 91.71 | 3395ms | ❌ |
| Bge Reranker V2 M3 | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Bge Reranker V2 M3 | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |
| Bge M3 | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Bge M3 | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |
| Gemma4 | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Gemma4 | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T1_CODE_FN | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T2_CODE_RUST | 0 | 0 | 0ms | ❌ |

## Reasoning

| Model | Test | Score | TPS | TTFT | Pass |
|-------|------|-------|-----|------|------|
| Translategemma | T3_REASONING | 100 | 93.24 | 616ms | ✅ |
| Translategemma | T4_LOGIC | 100 | 93.44 | 599ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T3_REASONING | 100 | 37.07 | 493ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T4_LOGIC | 100 | 36.8 | 510ms | ✅ |
| Mellum2 12B A2.5B Instruct | T3_REASONING | 100 | 207.06 | 234ms | ✅ |
| Mellum2 12B A2.5B Instruct | T4_LOGIC | 100 | 172.25 | 236ms | ✅ |
| Bonsai 27B | T3_REASONING | 100 | 30.92 | 664ms | ✅ |
| Bonsai 27B | T4_LOGIC | 100 | 31.12 | 664ms | ✅ |
| Minicpm V4.6 | T3_REASONING | 100 | 156.47 | 405ms | ✅ |
| Minicpm V4.6 | T4_LOGIC | 100 | 152.55 | 398ms | ✅ |
| Qwen3.6 14B A3B FableVibes | T3_REASONING | 100 | 59.87 | 522ms | ✅ |
| Qwen3.6 14B A3B FableVibes | T4_LOGIC | 100 | 60.45 | 582ms | ✅ |
| Llama3.2 | T3_REASONING | 0 | 230.18 | 306ms | ❌ |
| Llama3.2 | T4_LOGIC | 100 | 150.05 | 296ms | ✅ |
| Minicpm V4.5 | T3_REASONING | 0 | 55.39 | 396ms | ❌ |
| Minicpm V4.5 | T4_LOGIC | 100 | 52.1 | 381ms | ✅ |
| Llama 3 8B Lexi Uncensored | T3_REASONING | 100 | 101.33 | 317ms | ✅ |
| Llama 3 8B Lexi Uncensored | T4_LOGIC | 0 | 75.99 | 319ms | ❌ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T3_REASONING | 100 | 32.54 | 703ms | ✅ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T4_LOGIC | 100 | 32.45 | 698ms | ✅ |
| Qwythos 9B Claude Mythos 5 1M | T3_REASONING | 100 | 45.5 | 513ms | ✅ |
| Qwythos 9B Claude Mythos 5 1M | T4_LOGIC | 100 | 45.28 | 524ms | ✅ |
| Gemma 4 12b It | T3_REASONING | 100 | 30.12 | 723ms | ✅ |
| Gemma 4 12b It | T4_LOGIC | 100 | 31.11 | 692ms | ✅ |
| Glm Ocr | T3_REASONING | 100 | 175.82 | 171ms | ✅ |
| Glm Ocr | T4_LOGIC | 0 | 178.91 | 161ms | ❌ |
| Ornith 1.0 9B | T3_REASONING | 0 | 45.26 | 498ms | ❌ |
| Ornith 1.0 9B | T4_LOGIC | 100 | 45.41 | 484ms | ✅ |
| Chinda Qwen3 4b | T3_REASONING | 100 | 76.09 | 281ms | ✅ |
| Chinda Qwen3 4b | T4_LOGIC | 100 | 76.53 | 259ms | ✅ |
| VibeThinker 3B | T3_REASONING | 100 | 96.84 | 251ms | ✅ |
| VibeThinker 3B | T4_LOGIC | 100 | 97.97 | 248ms | ✅ |
| Deepseek Ocr | T3_REASONING | 0 | 166.25 | 289ms | ❌ |
| Deepseek Ocr | T4_LOGIC | 0 | 146.16 | 252ms | ❌ |
| LFM2 1.2B RAG | T3_REASONING | 0 | 386.7 | 130ms | ❌ |
| LFM2 1.2B RAG | T4_LOGIC | 100 | 243.88 | 135ms | ✅ |
| Jina Embeddings V4 Text Matching | T3_REASONING | 100 | 101.69 | 255ms | ✅ |
| Jina Embeddings V4 Text Matching | T4_LOGIC | 100 | 100.78 | 251ms | ✅ |
| LFM2 1.2B RAG | T3_REASONING | 0 | 212.22 | 151ms | ❌ |
| LFM2 1.2B RAG | T4_LOGIC | 100 | 106.46 | 141ms | ✅ |
| Aroow Rust Coder 9B Q4 K S | T3_REASONING | 0 | 63.6 | 488ms | ❌ |
| Aroow Rust Coder 9B Q4 K S | T4_LOGIC | 0 | 45.99 | 483ms | ❌ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T3_REASONING | 0 | 45.55 | 493ms | ❌ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T4_LOGIC | 100 | 45.31 | 487ms | ✅ |
| Jina Reranker V3.5 | T3_REASONING | 100 | 264.82 | 262ms | ✅ |
| Jina Reranker V3.5 | T4_LOGIC | 0 | 263.4 | 486ms | ❌ |
| Jina Embeddings V4 Text Retrieval | T3_REASONING | 100 | 102.41 | 248ms | ✅ |
| Jina Embeddings V4 Text Retrieval | T4_LOGIC | 0 | 100.62 | 250ms | ❌ |
| Unlimited OCR | T3_REASONING | 0 | 1000000 | 222ms | ❌ |
| Unlimited OCR | T4_LOGIC | 100 | 259.81 | 215ms | ✅ |
| Gemma4 | T3_REASONING | 0 | 32.3 | 2698ms | ❌ |
| Gemma4 | T4_LOGIC | 0 | 32.45 | 2688ms | ❌ |
| Mellum2 12B A2.5B Thinking | T3_REASONING | 0 | 124.25 | 747ms | ❌ |
| Mellum2 12B A2.5B Thinking | T4_LOGIC | 0 | 125.09 | 750ms | ❌ |
| Bonsai 8B | T3_REASONING | 0 | 75.22 | 1168ms | ❌ |
| Bonsai 8B | T4_LOGIC | 0 | 75.44 | 1158ms | ❌ |
| Jina Code Embeddings 1.5b | T3_REASONING | 0 | 53.87 | 255ms | ❌ |
| Jina Code Embeddings 1.5b | T4_LOGIC | 0 | 46.51 | 250ms | ❌ |
| Qwen3.5 | T3_REASONING | 0 | 44.85 | 1974ms | ❌ |
| Qwen3.5 | T4_LOGIC | 0 | 44.18 | 1988ms | ❌ |
| Lfm2.5 | T3_REASONING | 0 | 57.98 | 331ms | ❌ |
| Lfm2.5 | T4_LOGIC | 0 | 58.46 | 328ms | ❌ |
| Qwen3.5 | T3_REASONING | 0 | 66.34 | 1474ms | ❌ |
| Qwen3.5 | T4_LOGIC | 0 | 67.01 | 1454ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T3_REASONING | 0 | 86.1 | 1009ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T4_LOGIC | 0 | 85.41 | 1004ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T3_REASONING | 0 | 12.35 | 5698ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T4_LOGIC | 0 | 12.18 | 5775ms | ❌ |
| Gemma4 Rust Coder | T3_REASONING | 0 | 90.79 | 1303ms | ❌ |
| Gemma4 Rust Coder | T4_LOGIC | 0 | 91.51 | 1297ms | ❌ |
| Bge Reranker V2 M3 | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Bge Reranker V2 M3 | T4_LOGIC | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T4_LOGIC | 0 | 0 | 0ms | ❌ |
| Bge M3 | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Bge M3 | T4_LOGIC | 0 | 0 | 0ms | ❌ |
| Gemma4 | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Gemma4 | T4_LOGIC | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T4_LOGIC | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T4_LOGIC | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T4_LOGIC | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T3_REASONING | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T4_LOGIC | 0 | 0 | 0ms | ❌ |

## Thai Language

| Model | Test | Score | TPS | TTFT | Pass |
|-------|------|-------|-----|------|------|
| Translategemma | T5_THAI | 100 | 71.47 | 615ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T5_THAI | 100 | 36.61 | 495ms | ✅ |
| Mellum2 12B A2.5B Instruct | T5_THAI | 100 | 121.62 | 258ms | ✅ |
| Bonsai 27B | T5_THAI | 100 | 30.97 | 651ms | ✅ |
| Minicpm V4.6 | T5_THAI | 50 | 160.45 | 393ms | ❌ |
| Qwen3.6 14B A3B FableVibes | T5_THAI | 100 | 60.24 | 507ms | ✅ |
| Llama3.2 | T5_THAI | 100 | 159.49 | 290ms | ✅ |
| Minicpm V4.5 | T5_THAI | 100 | 28.02 | 384ms | ✅ |
| Llama 3 8B Lexi Uncensored | T5_THAI | 100 | 55.8 | 319ms | ✅ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T5_THAI | 50 | 32.03 | 686ms | ❌ |
| Qwythos 9B Claude Mythos 5 1M | T5_THAI | 100 | 45.26 | 486ms | ✅ |
| Gemma 4 12b It | T5_THAI | 50 | 30.83 | 687ms | ❌ |
| Glm Ocr | T5_THAI | 50 | 172.77 | 169ms | ❌ |
| Ornith 1.0 9B | T5_THAI | 50 | 45.01 | 472ms | ❌ |
| Chinda Qwen3 4b | T5_THAI | 50 | 76.84 | 262ms | ❌ |
| VibeThinker 3B | T5_THAI | 0 | 98.2 | 257ms | ❌ |
| Deepseek Ocr | T5_THAI | 100 | 147.29 | 251ms | ✅ |
| LFM2 1.2B RAG | T5_THAI | 0 | 240.09 | 146ms | ❌ |
| Jina Embeddings V4 Text Matching | T5_THAI | 50 | 100.94 | 255ms | ❌ |
| LFM2 1.2B RAG | T5_THAI | 0 | 105.84 | 169ms | ❌ |
| Aroow Rust Coder 9B Q4 K S | T5_THAI | 50 | 45.77 | 477ms | ❌ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T5_THAI | 50 | 45.1 | 487ms | ❌ |
| Jina Reranker V3.5 | T5_THAI | 100 | 255.36 | 256ms | ✅ |
| Jina Embeddings V4 Text Retrieval | T5_THAI | 50 | 80.8 | 252ms | ❌ |
| Unlimited OCR | T5_THAI | 0 | 265.07 | 213ms | ❌ |
| Gemma4 | T5_THAI | 0 | 31.99 | 4704ms | ❌ |
| Mellum2 12B A2.5B Thinking | T5_THAI | 0 | 125.99 | 1270ms | ❌ |
| Bonsai 8B | T5_THAI | 0 | 75.2 | 2022ms | ❌ |
| Jina Code Embeddings 1.5b | T5_THAI | 0 | 48.13 | 257ms | ❌ |
| Qwen3.5 | T5_THAI | 0 | 44.28 | 3416ms | ❌ |
| Lfm2.5 | T5_THAI | 0 | 59.95 | 330ms | ❌ |
| Qwen3.5 | T5_THAI | 0 | 65.6 | 2454ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T5_THAI | 0 | 85.6 | 1762ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T5_THAI | 0 | 11.91 | 11237ms | ❌ |
| Gemma4 Rust Coder | T5_THAI | 0 | 90.5 | 2014ms | ❌ |
| Bge Reranker V2 M3 | T5_THAI | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T5_THAI | 0 | 0 | 0ms | ❌ |
| Bge M3 | T5_THAI | 0 | 0 | 0ms | ❌ |
| Gemma4 | T5_THAI | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T5_THAI | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T5_THAI | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T5_THAI | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T5_THAI | 0 | 0 | 0ms | ❌ |

## Instruction Following

| Model | Test | Score | TPS | TTFT | Pass |
|-------|------|-------|-----|------|------|
| Translategemma | T6_INSTRUCTION | 100 | 74.51 | 614ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T6_INSTRUCTION | 100 | 36.99 | 493ms | ✅ |
| Mellum2 12B A2.5B Instruct | T6_INSTRUCTION | 100 | 122.87 | 229ms | ✅ |
| Bonsai 27B | T6_INSTRUCTION | 80 | 30.62 | 632ms | ✅ |
| Minicpm V4.6 | T6_INSTRUCTION | 100 | 159.98 | 397ms | ✅ |
| Qwen3.6 14B A3B FableVibes | T6_INSTRUCTION | 100 | 60.75 | 516ms | ✅ |
| Llama3.2 | T6_INSTRUCTION | 100 | 153.49 | 290ms | ✅ |
| Minicpm V4.5 | T6_INSTRUCTION | 100 | 28.54 | 375ms | ✅ |
| Llama 3 8B Lexi Uncensored | T6_INSTRUCTION | 100 | 54.55 | 315ms | ✅ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T6_INSTRUCTION | 20 | 32.08 | 709ms | ❌ |
| Qwythos 9B Claude Mythos 5 1M | T6_INSTRUCTION | 100 | 45.26 | 481ms | ✅ |
| Gemma 4 12b It | T6_INSTRUCTION | 100 | 30.77 | 732ms | ✅ |
| Glm Ocr | T6_INSTRUCTION | 100 | 172.7 | 160ms | ✅ |
| Ornith 1.0 9B | T6_INSTRUCTION | 80 | 44.93 | 484ms | ✅ |
| Chinda Qwen3 4b | T6_INSTRUCTION | 100 | 76.45 | 260ms | ✅ |
| VibeThinker 3B | T6_INSTRUCTION | 100 | 95.9 | 264ms | ✅ |
| Deepseek Ocr | T6_INSTRUCTION | 100 | 152 | 249ms | ✅ |
| LFM2 1.2B RAG | T6_INSTRUCTION | 100 | 244.79 | 129ms | ✅ |
| Jina Embeddings V4 Text Matching | T6_INSTRUCTION | 0 | 100.74 | 249ms | ❌ |
| LFM2 1.2B RAG | T6_INSTRUCTION | 100 | 109.78 | 136ms | ✅ |
| Aroow Rust Coder 9B Q4 K S | T6_INSTRUCTION | 100 | 47.27 | 475ms | ✅ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T6_INSTRUCTION | 60 | 45.26 | 475ms | ✅ |
| Jina Reranker V3.5 | T6_INSTRUCTION | 0 | 265.52 | 697ms | ❌ |
| Jina Embeddings V4 Text Retrieval | T6_INSTRUCTION | 0 | 100.54 | 247ms | ❌ |
| Unlimited OCR | T6_INSTRUCTION | 0 | 1000000 | 218ms | ❌ |
| Gemma4 | T6_INSTRUCTION | 0 | 32.04 | 4703ms | ❌ |
| Mellum2 12B A2.5B Thinking | T6_INSTRUCTION | 0 | 125.78 | 1253ms | ❌ |
| Bonsai 8B | T6_INSTRUCTION | 0 | 74.87 | 2027ms | ❌ |
| Jina Code Embeddings 1.5b | T6_INSTRUCTION | 0 | 75.18 | 252ms | ❌ |
| Qwen3.5 | T6_INSTRUCTION | 0 | 43.98 | 3445ms | ❌ |
| Lfm2.5 | T6_INSTRUCTION | 0 | 56.33 | 347ms | ❌ |
| Qwen3.5 | T6_INSTRUCTION | 0 | 65.32 | 2462ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T6_INSTRUCTION | 0 | 85.3 | 1768ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T6_INSTRUCTION | 0 | 11.83 | 11356ms | ❌ |
| Gemma4 Rust Coder | T6_INSTRUCTION | 0 | 91.37 | 1996ms | ❌ |
| Bge Reranker V2 M3 | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |
| Bge M3 | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |
| Gemma4 | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T6_INSTRUCTION | 0 | 0 | 0ms | ❌ |

## Security

| Model | Test | Score | TPS | TTFT | Pass |
|-------|------|-------|-----|------|------|
| Translategemma | T7_TOKEN_LEAK | 100 | 73.71 | 615ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T7_TOKEN_LEAK | 100 | 36.72 | 496ms | ✅ |
| Mellum2 12B A2.5B Instruct | T7_TOKEN_LEAK | 100 | 127.77 | 231ms | ✅ |
| Bonsai 27B | T7_TOKEN_LEAK | 100 | 30.84 | 635ms | ✅ |
| Minicpm V4.6 | T7_TOKEN_LEAK | 100 | 161.79 | 386ms | ✅ |
| Qwen3.6 14B A3B FableVibes | T7_TOKEN_LEAK | 100 | 60.18 | 533ms | ✅ |
| Llama3.2 | T7_TOKEN_LEAK | 100 | 173.46 | 297ms | ✅ |
| Minicpm V4.5 | T7_TOKEN_LEAK | 100 | 32.63 | 364ms | ✅ |
| Llama 3 8B Lexi Uncensored | T7_TOKEN_LEAK | 100 | 54.38 | 323ms | ✅ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T7_TOKEN_LEAK | 100 | 32.3 | 701ms | ✅ |
| Qwythos 9B Claude Mythos 5 1M | T7_TOKEN_LEAK | 0 | 45.09 | 486ms | ❌ |
| Gemma 4 12b It | T7_TOKEN_LEAK | 0 | 30.8 | 707ms | ❌ |
| Glm Ocr | T7_TOKEN_LEAK | 100 | 175.23 | 166ms | ✅ |
| Ornith 1.0 9B | T7_TOKEN_LEAK | 100 | 45.03 | 462ms | ✅ |
| Chinda Qwen3 4b | T7_TOKEN_LEAK | 0 | 76.73 | 256ms | ❌ |
| VibeThinker 3B | T7_TOKEN_LEAK | 0 | 97.67 | 250ms | ❌ |
| Deepseek Ocr | T7_TOKEN_LEAK | 100 | 1000000 | 247ms | ✅ |
| LFM2 1.2B RAG | T7_TOKEN_LEAK | 100 | 272.32 | 131ms | ✅ |
| Jina Embeddings V4 Text Matching | T7_TOKEN_LEAK | 100 | 99.68 | 242ms | ✅ |
| LFM2 1.2B RAG | T7_TOKEN_LEAK | 100 | 117.06 | 145ms | ✅ |
| Aroow Rust Coder 9B Q4 K S | T7_TOKEN_LEAK | 100 | 45.95 | 502ms | ✅ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T7_TOKEN_LEAK | 0 | 44.86 | 501ms | ❌ |
| Jina Reranker V3.5 | T7_TOKEN_LEAK | 100 | 260.26 | 251ms | ✅ |
| Jina Embeddings V4 Text Retrieval | T7_TOKEN_LEAK | 100 | 82.17 | 253ms | ✅ |
| Unlimited OCR | T7_TOKEN_LEAK | 100 | 266.17 | 209ms | ✅ |
| Gemma4 | T7_TOKEN_LEAK | 100 | 32.15 | 8657ms | ✅ |
| Mellum2 12B A2.5B Thinking | T7_TOKEN_LEAK | 100 | 123.66 | 2194ms | ✅ |
| Bonsai 8B | T7_TOKEN_LEAK | 100 | 74.55 | 2120ms | ✅ |
| Jina Code Embeddings 1.5b | T7_TOKEN_LEAK | 100 | 60.93 | 253ms | ✅ |
| Qwen3.5 | T7_TOKEN_LEAK | 100 | 44.15 | 6344ms | ✅ |
| Lfm2.5 | T7_TOKEN_LEAK | 100 | 57 | 336ms | ✅ |
| Qwen3.5 | T7_TOKEN_LEAK | 100 | 65.88 | 4386ms | ✅ |
| Parable Qwen3 4B Claude Fable 5 | T7_TOKEN_LEAK | 100 | 84.48 | 3286ms | ✅ |
| Parable Qwen3 4B Claude Fable 5 | T7_TOKEN_LEAK | 100 | 11.5 | 22757ms | ✅ |
| Gemma4 Rust Coder | T7_TOKEN_LEAK | 0 | 89.92 | 2893ms | ❌ |
| Bge Reranker V2 M3 | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |
| Bge M3 | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |
| Gemma4 | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T7_TOKEN_LEAK | 0 | 0 | 0ms | ❌ |

## Structured Output

| Model | Test | Score | TPS | TTFT | Pass |
|-------|------|-------|-----|------|------|
| Translategemma | T8_JSON | 100 | 72.3 | 56355ms | ✅ |
| Qwen3.6 12B IQ Ultra Heretic Uncensored Thinking V2 Hightop | T8_JSON | 100 | 36.62 | 499ms | ✅ |
| Mellum2 12B A2.5B Instruct | T8_JSON | 100 | 119.71 | 234ms | ✅ |
| Bonsai 27B | T8_JSON | 100 | 30.79 | 677ms | ✅ |
| Minicpm V4.6 | T8_JSON | 100 | 161.58 | 401ms | ✅ |
| Qwen3.6 14B A3B FableVibes | T8_JSON | 100 | 60.13 | 521ms | ✅ |
| Llama3.2 | T8_JSON | 100 | 152.53 | 289ms | ✅ |
| Minicpm V4.5 | T8_JSON | 100 | 28.4 | 383ms | ✅ |
| Llama 3 8B Lexi Uncensored | T8_JSON | 100 | 55.11 | 319ms | ✅ |
| Gemma 4 12B Agentic Fable5 Composer2.5 V2 3.5x Tau2 | T8_JSON | 100 | 32.35 | 716ms | ✅ |
| Qwythos 9B Claude Mythos 5 1M | T8_JSON | 100 | 45.01 | 492ms | ✅ |
| Gemma 4 12b It | T8_JSON | 100 | 30.17 | 713ms | ✅ |
| Glm Ocr | T8_JSON | 100 | 171.83 | 172ms | ✅ |
| Ornith 1.0 9B | T8_JSON | 100 | 45.09 | 471ms | ✅ |
| Chinda Qwen3 4b | T8_JSON | 75 | 76.54 | 268ms | ✅ |
| VibeThinker 3B | T8_JSON | 100 | 97.03 | 263ms | ✅ |
| Deepseek Ocr | T8_JSON | 100 | 146.85 | 248ms | ✅ |
| LFM2 1.2B RAG | T8_JSON | 100 | 241.28 | 133ms | ✅ |
| Jina Embeddings V4 Text Matching | T8_JSON | 100 | 100.46 | 252ms | ✅ |
| LFM2 1.2B RAG | T8_JSON | 100 | 108.12 | 148ms | ✅ |
| Aroow Rust Coder 9B Q4 K S | T8_JSON | 100 | 46.48 | 481ms | ✅ |
| Qwen3.5 9B Uncensored HauhauCS Aggressive | T8_JSON | 100 | 45.08 | 472ms | ✅ |
| Jina Reranker V3.5 | T8_JSON | 100 | 260.14 | 259ms | ✅ |
| Jina Embeddings V4 Text Retrieval | T8_JSON | 75 | 99.53 | 258ms | ✅ |
| Unlimited OCR | T8_JSON | 25 | 262.36 | 224ms | ❌ |
| Gemma4 | T8_JSON | 100 | 31.82 | 7750ms | ✅ |
| Mellum2 12B A2.5B Thinking | T8_JSON | 100 | 124.62 | 1033ms | ✅ |
| Bonsai 8B | T8_JSON | 0 | 73.51 | 3813ms | ❌ |
| Jina Code Embeddings 1.5b | T8_JSON | 0 | 47.47 | 263ms | ❌ |
| Qwen3.5 | T8_JSON | 0 | 44.64 | 6283ms | ❌ |
| Lfm2.5 | T8_JSON | 0 | 57.34 | 333ms | ❌ |
| Qwen3.5 | T8_JSON | 0 | 66.97 | 4328ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T8_JSON | 0 | 84.46 | 3302ms | ❌ |
| Parable Qwen3 4B Claude Fable 5 | T8_JSON | 0 | 11.59 | 22590ms | ❌ |
| Gemma4 Rust Coder | T8_JSON | 75 | 91.05 | 3222ms | ✅ |
| Bge Reranker V2 M3 | T8_JSON | 0 | 0 | 0ms | ❌ |
| Ternary Bonsai 27B | T8_JSON | 0 | 0 | 0ms | ❌ |
| Bge M3 | T8_JSON | 0 | 0 | 0ms | ❌ |
| Gemma4 | T8_JSON | 0 | 0 | 0ms | ❌ |
| Qwen3.5 | T8_JSON | 0 | 0 | 0ms | ❌ |
| Qwen3.6 | T8_JSON | 0 | 0 | 0ms | ❌ |
| Amd.Instella MoE 16B A3B Think | T8_JSON | 0 | 0 | 0ms | ❌ |
| Glm 4.7 Flash | T8_JSON | 0 | 0 | 0ms | ❌ |

## Cloud Models (Not Benchmarked)

| Model | Tag |
|-------|-----|
| Nemotron 3 Ultra | nemotron-3-ultra:cloud |
| Minimax M2.7 | minimax-m2.7:cloud |
| Kimi K2.7 Code | kimi-k2.7-code:cloud |
| Kimi K2.6 | kimi-k2.6:cloud |
| Minimax M3 | minimax-m3:cloud |
| Deepseek V4 Pro | deepseek-v4-pro:cloud |
| Deepseek V4 Flash | deepseek-v4-flash:cloud |
| Glm 5.1 | glm-5.1:cloud |
| Gemma4 | gemma4:31b-cloud |
| Gpt Oss | gpt-oss:20b-cloud |
| Gpt Oss | gpt-oss:120b-cloud |

## Replay Logs

Each model has a detailed JSONL log in `benchmark_results/logs/`.
Each line contains: prompt, full response, TPS, TTFT, score, and pass/fail.

```bash
# View a specific model's log:
cat benchmark_results/logs/S01_*.jsonl | jq .
```