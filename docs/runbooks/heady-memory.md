# Runbook: heady-memory (Vector Similarity Search)

**Service:** Semantic Memory & Vector Search
**Technology:** PostgreSQL + pgvector
**On-Call:** Check PagerDuty
**Slack:** #heady-memory
**Repo:** https://github.com/heady-ai/heady-memory

---

## Overview

heady-memory manages semantic memory via pgvector (PostgreSQL extension). Stores and searches embeddings for 60+ domains with strict isolation and φ-scaled performance characteristics.

### Service Tier
**Tier 2 (High):** Inference pipeline depends on memory retrieval

### Capabilities
- Vector similarity search (L2, cosine, inner product)
- 50M vectors across all domains (~1M per domain)
- <50ms p99 latency for similarity queries
- Automatic index optimization (HNSW algorithm)
- Domain isolation via row-level security

---

## Key Metrics

| Metric | Alert | Target |
|--------|-------|--------|
| Query Latency p99 | >100ms | <50ms |
| Connection Pool Usage | >90 | <80 |
| Index Bloat | >20% | <10% |
| Replication Lag | >10s | <1s |
| Vector Storage Growth | +50GB/week | <20GB/week |

### Health Check

```bash
curl http://localhost:8000/health

# Expected: 200 OK
# {
#   "status": "healthy",
#   "database": "connected",
#   "vectors_total": "47000000",
#   "index_efficiency": "94%",
#   "replication_lag_ms": 250
# }
```

---

## Common Issues & Resolutions

### Issue 1: Query Timeout (>100ms)

**Error:** `HEADY-MEMORY-004 | Vector similarity query timeout`

**Diagnosis:**

```bash
# Step 1: Check query performance
kubectl port-forward svc/postgres 5432:5432
psql -h localhost -U heady_user -d heady_db

# Run slow query log
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE query LIKE '%embedding%'
ORDER BY mean_time DESC LIMIT 10;

# Look for: mean_time > 100ms

# Step 2: Check index status
SELECT schemaname, tablename, indexname, idx_size
FROM pg_indexes
WHERE tablename LIKE '%embedding%';

# Step 3: Check vector dimension match
SELECT COUNT(*) FROM embeddings
WHERE array_length(embedding, 1) != 1536;
# If >0: dimension mismatch (expects 1536 for text-embedding-3-large)

# Step 4: Check table size
SELECT pg_size_pretty(pg_total_relation_size('embeddings'));
# If >100GB: may be slow due to size
```

**Resolution:**

```bash
# Option 1: Rebuild HNSW index (immediate improvement)
REINDEX INDEX CONCURRENTLY embeddings_embedding_idx;
# Takes 30-60 minutes depending on size
# Rebuilds index structure for fast searches

# Option 2: Reduce query limit
# Request only top 10 results instead of 100
# LIMIT 10 vs LIMIT 100
# Much faster: 20ms vs 150ms

# Option 3: Add missing index
# If index doesn't exist on (domain_id, created_at):
CREATE INDEX CONCURRENTLY embeddings_domain_created_idx
ON embeddings (domain_id, created_at DESC);

# Step 4: Increase HNSW parameters
# Edit: k8s/heady-memory-configmap.yaml
# hnsw_m: 12 → 16 (more connections per node)
# hnsw_ef_construction: 64 → 128 (better construction)
# Tradeoff: slower index building, faster queries
# Restart service

# Step 5: Check server CPU
# If CPU maxed: scale up replicas or add CPU resources
kubectl top pods -l app=heady-memory
```

### Issue 2: Connection Pool Exhausted (503)

**Error:** `HEADY-MEMORY-003 | pgvector connection pool exhausted`

**Diagnosis:**

```bash
# Step 1: Check connection count
SELECT datname, count(*) as connections
FROM pg_stat_activity
GROUP BY datname;

# If heady_db > 80 connections: pool full

# Step 2: Check idle connections
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < now() - INTERVAL '5 minutes';

# Step 3: Check blocking queries
SELECT pid, query, wait_event, wait_event_type
FROM pg_stat_activity
WHERE wait_event IS NOT NULL;

# Step 4: Check application logs
kubectl logs deployment/heady-memory | grep "pool"
# Look for: "POOL EXHAUSTED" or "Connection timeout"
```

**Resolution:**

```bash
# Option 1: Kill idle connections (immediate)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - INTERVAL '10 minutes';

# Option 2: Increase pool size
# Edit: k8s/pgbouncer-config.yaml
# max_client_conn: 100 → 200
# max_db_connections: 50 → 100
kubectl apply -f k8s/pgbouncer-config.yaml
kubectl rollout restart deployment/pgbouncer

# Option 3: Reduce connection leak
# Ensure connections properly closed in application
# heady-memory/src/db.ts: use connection pooling library
// Example: pg.Pool with max: 50, idleTimeoutMillis: 30000
const pool = new Pool({
  max: 50,
  idleTimeoutMillis: 30000,
  query_timeout: 30000
});

# Option 4: Enable connection timeout
# Close connections after N seconds of inactivity
# Edit: postgres.conf → idle_in_transaction_session_timeout = 300000 (5 min)

# Option 5: Scale up replicas
# More heady-memory pods = more connections (distributed)
kubectl scale deployment heady-memory --replicas=5
```

### Issue 3: HNSW Index Corrupted

**Error:** `HEADY-MEMORY-007 | HNSW index corrupted`

**Symptoms:**
- Query results incorrect (expected vector not in top 10)
- Index size suspiciously small
- Performance degradation

**Diagnosis:**

```bash
# Step 1: Check index health
SELECT * FROM pg_indexes
WHERE tablename = 'embeddings'
AND indexname LIKE '%hnsw%';

# Step 2: Verify index structure
SELECT COUNT(*) FROM embeddings;
SELECT COUNT(DISTINCT id) FROM embeddings;
# If counts differ: data corruption

# Step 3: Check for unlogged table (vulnerable)
SELECT * FROM pg_class
WHERE relname = 'embeddings'
AND relpersistence = 'u'; # 'u' = unlogged
# Should return nothing; if not: risk of corruption on crash
```

**Resolution:**

```bash
# Option 1: Rebuild index
REINDEX INDEX CONCURRENTLY embeddings_embedding_idx;
# Concurrent reindex doesn't lock table
# Takes 30-60 minutes

# Option 2: Rebuild table (if data corrupted)
# Create new table from backup
pg_dump --table=embeddings > embeddings_backup.sql

# Restore from backup
psql < embeddings_backup.sql

# Restart heady-memory
kubectl rollout restart deployment/heady-memory

# Option 3: Convert to logged table (safer)
# ALTER TABLE embeddings SET LOGGED;
# Requires exclusive lock; do during maintenance window

# Step 4: Verify after rebuild
SELECT COUNT(*) FROM embeddings;
# Should match pre-corruption count
```

### Issue 4: Replication Lag (Stale Data)

**Symptoms:**
- Read replicas show old data
- Updated vectors don't appear in queries
- Domain isolation violations (data bleeding)

**Diagnosis:**

```bash
# Step 1: Check replication lag
SELECT CASE WHEN pg_last_xlog_receive_location() = pg_last_xlog_replay_location()
  THEN 0
  ELSE EXTRACT(EPOCH FROM now() - pg_last_xact_xmin_timestamp())::int
END as lag_seconds;

# If > 10 seconds: lag issue

# Step 2: Check WAL (Write-Ahead Log)
SELECT * FROM pg_stat_replication;
# Shows replica status and lag in bytes

# Step 3: Check network
kubectl get pods -l app=postgres
# All should be Running
kubectl logs pod/postgres-1 | grep "replication"
```

**Resolution:**

```bash
# Option 1: Increase WAL buffer (if network slow)
# postgresql.conf: wal_buffers = 16MB (default 16MB, OK)
# max_wal_size = 4GB (increase if lag persists)

# Option 2: Restart replica (force resync)
kubectl delete pod postgres-replica-0
# Kubernetes re-creates pod; syncs from primary

# Option 3: Use primary only for consistency-critical operations
# Vector writes to primary
# Vector reads from replicas (eventual consistency acceptable)

# Step 4: Monitor improvement
# Re-check lag after fix:
SELECT replication_lag_seconds
FROM monitor_replication;
# Should drop below 1s
```

---

## Scaling & Capacity

### Add More Vector Storage

```bash
# Current: 47M vectors (85% of 55M capacity)
# Add more: increase PVC size

# Expand PVC
kubectl patch pvc postgres-data -p '{"spec":{"resources":{"requests":{"storage":"500Gi"}}}}'

# Expand PostgreSQL table space
ALTER TABLESPACE main OWNER TO postgres;
ALTER SYSTEM SET max_connections = 200;

# Restart postgres
kubectl rollout restart statefulset/postgres
```

### Scale Read Replicas

```bash
# Current: 1 replica
# Add more for read throughput

# Increase replicas
kubectl scale statefulset postgres --replicas=3
# Creates postgres-0 (primary), postgres-1, postgres-2 (replicas)

# Configure heady-memory to use replicas
# Edit: config.yaml
# read_host: postgres-1.postgres.svc.cluster.local (read replica)
# write_host: postgres-0.postgres.svc.cluster.local (primary)

# Restart heady-memory
kubectl rollout restart deployment/heady-memory
```

---

## Backup & Recovery

### Daily Backup

```bash
# Automated backup script (runs daily)
pg_dump -h postgres -U heady_user heady_db | gzip > \
  /mnt/backups/heady_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload to Cloud Storage
gsutil cp /mnt/backups/*.sql.gz gs://heady-backups/

# Verify backup
gunzip -c gs://heady-backups/heady_db_20240115_120000.sql.gz | head -20
```

### Restore from Backup

```bash
# Download backup
gsutil cp gs://heady-backups/heady_db_20240115_120000.sql.gz ./

# Create new database
psql -h postgres -U heady_user
CREATE DATABASE heady_db_restore;

# Restore
psql -h postgres -U heady_user heady_db_restore < heady_db_20240115_120000.sql

# Verify
SELECT COUNT(*) FROM heady_db_restore.embeddings;
# Should match pre-failure count

# Rename if good
ALTER DATABASE heady_db RENAME TO heady_db_old;
ALTER DATABASE heady_db_restore RENAME TO heady_db;
```

---

## Deployment

### Deploy Vector Search Update

```bash
docker build -t heady-memory:2.0.0 .
docker tag heady-memory:2.0.0 gcr.io/heady-ai/heady-memory:2.0.0
docker push gcr.io/heady-ai/heady-memory:2.0.0

# Deploy
kubectl set image deployment/heady-memory \
  heady-memory=gcr.io/heady-ai/heady-memory:2.0.0

# Monitor
kubectl rollout status deployment/heady-memory

# Test
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "domain_id": "test-domain",
    "query_vector": [0.1, 0.2, ...],
    "limit": 10
  }'
```

---

## Related Documents

- ADR-003: pgvector over Pinecone architecture
- Security Model: `docs/SECURITY_MODEL.md` (Domain Isolation section)

