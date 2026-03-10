# ADR-003: pgvector Over Pinecone for Vector Memory

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Heady's 3D vector memory system requires storage and retrieval of 384-dimensional embeddings (all-MiniLM-L6-v2) with HNSW indexing for similarity search. Options evaluated: Pinecone (managed), Weaviate (self-hosted), Qdrant (self-hosted), Milvus (self-hosted), pgvector (PostgreSQL extension).

## Decision

Use pgvector as the vector memory backend with HNSW indexing. Parameters: ef_construction=200, m=32. Target: recall >0.95 at <50ms for 384-dim vectors.

**Key reasons:**
1. **No vendor lock-in**: pgvector is open-source, runs anywhere PostgreSQL runs
2. **SQL integration**: vector search combines naturally with relational queries (JOIN vector results with user metadata)
3. **Single database**: no need for separate vector database — reduces operational burden
4. **Cost**: PostgreSQL on Cloud SQL costs ~$50/mo vs Pinecone starting at $70/mo for similar scale
5. **Sovereignty**: data stays in our GCP project, no third-party data processing

## Consequences

**Positive:** Full control, no vendor dependency, SQL + vector in one query, cost-effective, sovereign data  
**Negative:** More ops work (backups, index tuning, connection pooling), fewer managed features than Pinecone  
**Mitigations:** PgBouncer for pooling (34 default, 233 max connections), automated backups with point-in-time recovery, HNSW parameter tuning via load tests
