# DEBUG Guide: Memory Domain

## Services

- `heady-embed (3320)`
- `heady-memory (3321)`
- `heady-vector (3322)`
- `heady-projection (3323)`

## Health Check

```bash
curl -s http://localhost:3321/health | jq .
```

## Common Failure Modes

### Embedding requests timeout

**Diagnosis:** Embedding provider unreachable or circuit breaker open.

**Fix:** Check embedding-pipeline circuit breaker state. Failover order: Nomic → Jina → Voyage. Reset circuit breaker if provider is back.

### Vector search returns empty results

**Diagnosis:** HNSW index not built or ef_search too low.

**Fix:** Verify HNSW index exists: SELECT * FROM pg_indexes WHERE indexname LIKE '%hnsw%'. Ensure ef_search=fib(11)=89.

### PgBouncer connection pool exhausted

**Diagnosis:** Too many concurrent queries (>fib(9)=34 pool size).

**Fix:** Check PgBouncer stats: SHOW POOLS. Increase pool to next Fibonacci step (fib(10)=55) or investigate connection leaks.

### Memory cache hit rate below PSI≈0.618

**Diagnosis:** Cache too small or working set changed.

**Fix:** Check cache stats. Increase LRU capacity to next Fibonacci step. Verify cache key generation is consistent.

## Environment Variables

- `DATABASE_URL`
- `PGBOUNCER_URL`
- `NOMIC_API_KEY`
- `JINA_API_KEY`
- `VOYAGE_API_KEY`

## Debug Commands

```bash
curl -s http://localhost:3321/health | jq .
curl -X POST http://localhost:3321/api/memory/search -H "Content-Type: application/json" -d '{"query":"test","topK":5}'
psql $DATABASE_URL -c "SELECT count(*) FROM embeddings;"
psql $DATABASE_URL -c "SELECT * FROM pg_indexes WHERE indexname LIKE '%hnsw%';"
```

## Log Locations

- Cloud Run: gcloud run services logs read heady-memory --region=us-east1
- PgBouncer: /var/log/pgbouncer/pgbouncer.log

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
