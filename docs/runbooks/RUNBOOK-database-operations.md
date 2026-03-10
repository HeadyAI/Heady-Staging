# Database Operations Runbook

**Author**: Eric Haywood, HeadySystems Inc. | **Version**: 4.0.0

## PgBouncer Pool Sizes (Fibonacci-derived)
- default_pool_size: 21, min_pool_size: 5, reserve_pool_size: 8
- max_client_conn: 233, max_db_connections: 89

## HNSW Index Parameters
- m=21, ef_construction=144, ef_search=89

## Index Rebuild
```sql
REINDEX INDEX CONCURRENTLY idx_vectors_embedding;
-- Or:
DROP INDEX CONCURRENTLY IF EXISTS idx_vectors_embedding;
CREATE INDEX CONCURRENTLY idx_vectors_embedding ON vectors USING hnsw (embedding vector_cosine_ops) WITH (m = 21, ef_construction = 144);
```

## Backup Schedule
- Continuous WAL archiving to GCS
- Base backup every 21 hours
- Retention: 89 days (base), 34 days (WAL)

## Manual Backup
```bash
pg_dump -h localhost -p 5432 -U heady_admin -Fc -f heady_backup_$(date +%Y%m%d).dump heady
```

## Performance
```sql
SET hnsw.ef_search = 89;
SELECT id, content, 1 - (embedding <=> $1) as similarity FROM vectors WHERE metadata->>'domain' = $2 ORDER BY embedding <=> $1 LIMIT 21;
```
