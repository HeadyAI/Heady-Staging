# Search Service

**Port:** 3364 | **Pool:** Hot | **Domain:** search.headysystems.com

## Overview
Vector search and semantic similarity using pgvector. Supports hybrid BM25 + dense vector search with φ-scaled parameters.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/search` | Vector search |
| `POST` | `/search/similarity` | Cosine similarity |
| `POST` | `/search/embed` | Generate embedding |
| `GET` | `/health` | Health check |

## Search Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | 13 (fib(7)) | Max results |
| `threshold` | 0.691 (CSL LOW) | Minimum similarity |
| `rerank` | true | Re-rank with CSL scoring |
| `rerankTopK` | 21 (fib(8)) | Candidates for re-ranking |

## Vector Index Configuration
- Dimensions: 384 (Nomic/Jina) or 1536 (OpenAI)
- Index type: HNSW
- m parameter: fib(8) = 21
- ef_construction: fib(12) = 144
- ef_search: fib(11) = 89
