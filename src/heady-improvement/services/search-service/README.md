# @heady/search-service

Hybrid vector + BM25 search with Reciprocal Rank Fusion and CSL-gated relevance scoring.

## Architecture

- **BM25**: PostgreSQL `ts_rank_cd` full-text search
- **Vector**: pgvector cosine similarity (`<=>` operator)
- **Fusion**: Reciprocal Rank Fusion with φ-scaled k=55 (FIB[10])
- **Gating**: CSL sigmoid gate filters results below relevance threshold (≈0.691)
- **Caching**: LRU cache sized at FIB[16]=987 entries, TTL=55s

## φ-Scaled Constants

| Parameter | Value | Source |
|-----------|-------|--------|
| Max Results | 21 | FIB[8] |
| Rerank Top-K | 21 | FIB[8] |
| RRF k | 55 | FIB[10] |
| BM25 Weight | 0.618 | ψ |
| Vector Weight | 0.382 | 1-ψ |
| Cache Size | 987 | FIB[16] |
| Cache TTL | 55s | FIB[10]×1000 |
| Max Concurrent | 13 | FIB[7] |
| Relevance Threshold | 0.691 | phiThreshold(1) |

## Endpoints

- `POST /search` — Hybrid search (body: `{ query, namespace?, limit? }`)
- `GET /stats` — Service statistics
- `GET /healthz` — Health check
