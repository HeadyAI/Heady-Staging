# Incident Playbook: heady-memory Search Latency Exceeds 50ms Target

**Severity:** HIGH
**Impact:** All context retrieval slows down. Inference quality degrades due to stale/missing context.

## Symptoms

- Grafana P99 latency > 50ms for /api/memory/search
- Cache hit rate drops below ψ≈0.618
- PgBouncer pool utilization > phiThreshold(3)≈0.882

## Diagnosis Steps

1. **Check HNSW index health**

```bash
psql $DATABASE_URL -c "SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) FROM pg_indexes WHERE indexname LIKE '%hnsw%';"
```

2. **Check PgBouncer pool stats**

```bash
psql -p 6432 pgbouncer -c "SHOW POOLS;"
```

3. **Check memory cache stats**

```bash
curl -s http://localhost:3321/api/memory/cache-stats | jq .
```

4. **Check active queries**

```bash
psql $DATABASE_URL -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"
```

5. **Check table bloat**

```bash
psql $DATABASE_URL -c "SELECT relname, n_dead_tup, n_live_tup, round(n_dead_tup::numeric/greatest(n_live_tup,1)*100,1) as dead_pct FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 5;"
```

## Remediation

- If HNSW index missing or corrupted: Rebuild index with ef_construction=fib(12)=144, m=fib(8)=21
- If PgBouncer saturated: Increase default_pool_size from fib(9)=34 to fib(10)=55
- If cache miss rate high: Increase LRU capacity from fib(16)=987 to fib(17)=1597 entries
- If table bloat > 20%: Run VACUUM ANALYZE on embeddings table
- If slow queries: Check for sequential scans, ensure HNSW indexes cover all query patterns (cosine, inner_product)

## Rollback

```bash
No rollback needed — memory service is stateful. Fix the underlying cause.
```

## Post-Incident Review

- [ ] Review HNSW parameter tuning — should ef_construction increase?
- [ ] Check if embedding volume growth requires table partitioning
- [ ] Update PgBouncer monitoring alerts
- [ ] Consider read replica for query-heavy workloads (CQRS pattern)

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
