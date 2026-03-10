---
name: heady-perplexity-rag-optimizer
title: Heady Perplexity RAG Optimizer
description: Retrieval quality optimization — signal-to-noise ratio, context precision/recall
triggers: RAG, retrieval, context quality, precision, recall
version: 1.0.0
author: HeadySystems Inc.
---

# Heady Perplexity RAG Optimizer

Retrieval quality optimization — signal-to-noise ratio, context precision/recall

## Purpose
Optimize retrieval-augmented generation quality across the Heady vector memory system.

## Optimization Targets
- **Context Precision**: Fraction of retrieved chunks that are relevant (target: >0.8)
- **Context Recall**: Fraction of relevant chunks that are retrieved (target: >0.9)
- **Signal-to-Noise Ratio**: Relevant tokens / total tokens in context window
- **Faithfulness**: Fraction of generated claims supported by retrieved context
- **Answer Relevancy**: CSL similarity between answer and original query

## Techniques
- Hybrid search: BM25 + dense vectors + optional SPLADE sparse retrieval
- Reciprocal Rank Fusion (RRF) for combining retrieval signals
- CSL-gated reranking at three thresholds (0.382, 0.618, 0.718)
- Adaptive chunk sizing using Fibonacci boundaries
- Query expansion via CSL OR (vector superposition)
- Negative filtering via CSL NOT (orthogonal projection)

## Integration
- pgvector HNSW for dense retrieval
- BM25 full-text search for lexical matching
- CSL engine for relevance gating and reranking
- HeadyAutoContext for context window management


---
*© 2026 HeadySystems Inc. — 51+ Provisional Patents — Sacred Geometry v4.0*
