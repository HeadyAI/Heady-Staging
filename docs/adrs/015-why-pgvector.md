# ADR-015: Why pgvector over Pinecone/Weaviate/Qdrant

## Status
Accepted

## Context
The Heady platform requires high-performance vector similarity search for 384-dimensional embeddings with:
- Sub-50ms query latency at scale
- ACID transactions (vector + relational data in one query)
- Self-hosted sovereignty (no third-party vector DB vendor lock-in)
- HNSW indexing with tunable recall/speed tradeoffs
- Hybrid search (BM25 full-text + dense vector + optional SPLADE sparse)

## Decision
Use PostgreSQL with the pgvector extension. Store all embeddings in pgvector tables with HNSW indexes. Parameters tuned to φ-derived values:
- `ef_construction = fib(12) = 144` (build quality)
- `m = fib(8) = 21` (graph connectivity)
- `ef_search = fib(11) = 89` (query quality)
- Dimensions: 384 (Nomic Embed v1.5 via MRL truncation)

## Consequences
**Benefits:**
- Single database for relational + vector data (no sync between Postgres and external vector DB)
- ACID transactions: embed + metadata update in one atomic operation
- Self-hosted: full sovereignty, no vendor API calls, no data leaving GCP project
- Cost: PostgreSQL licensing is free; Pinecone costs ~$70/month minimum for equivalent scale
- Hybrid search: pg_trgm + pgvector in one query with Reciprocal Rank Fusion
- Connection pooling via PgBouncer with Fibonacci pool sizes

**Costs:**
- Operational responsibility for Postgres scaling (mitigated by Cloud SQL managed service)
- HNSW index rebuild on parameter changes (offline operation, φ-backoff scheduled)
- Memory footprint: HNSW index for 1M 384-dim vectors ≈ 2.8GB RAM

**Alternatives Considered:**
- Pinecone: Managed but SaaS dependency, $70+/month, no ACID with relational data
- Weaviate: Good but adds operational complexity of a second database
- Qdrant: Rust-based, fast, but same two-database problem
- Milvus: Enterprise-focused, overkill for current scale

## References
- pgvector HNSW benchmarks: https://github.com/pgvector/pgvector
- ADR-009: CQRS Event Sourcing (read replicas for vector queries)
- shared/phi-math-v2.js: fibonacci() function for index parameters
