# Heady Brain — Runbook

**Service:** heady-brain  
**Domain:** Inference  
**Port:** 3310  
**Health:** GET /health  

---

## Symptom: 503 Service Unavailable

### Diagnosis
1. Check pgvector connection pool: `SELECT count(*) FROM pg_stat_activity WHERE datname='heady';`
2. Check NATS JetStream: `nats stream ls` — verify heady.inference.* stream is healthy
3. Check Cloud Run instances: `gcloud run services describe heady-brain --region us-east1`
4. Check provider rate limits: query budget-tracker service for current spend

### Remediation
1. If pgvector pool exhausted → restart PgBouncer: `docker restart pgbouncer`
2. If NATS down → restart: `docker restart nats-server`
3. If Cloud Run cold start → set min-instances=2: `gcloud run services update heady-brain --min-instances=2 --region us-east1`
4. If provider rate limited → circuit breaker should route to fallback provider automatically

---

## Symptom: Slow Inference (>4236ms / φ³×1000)

### Diagnosis
1. Check which provider is being used: query ai-router logs for model selection
2. Check cache hit rate: GET /health on heady-cache, look at `cacheHitRate`
3. Check embedding latency: query heady-embed /health for p95 latency
4. Check if context enrichment (HeadyAutoContext) is scanning too many files

### Remediation
1. If provider slow → switch primary in ai-router config
2. If cache cold → pre-warm with common queries
3. If embedding slow → check all-MiniLM-L6-v2 model loading, consider edge caching
4. If AutoContext slow → reduce MAX_SCAN_DEPTH from FIB[5]=8 to FIB[4]=5

---

## Symptom: Memory Leak (heap growing)

### Diagnosis
1. Take heap snapshot: `kill -USR2 <pid>` (if configured), or `--inspect` + Chrome DevTools
2. Check vector cache size: should be ≤ FIB[16]=987 entries
3. Check event listener count: `process._getActiveHandles().length`
4. Check for unclosed WebSocket connections

### Remediation
1. If vector cache oversized → trigger LRU eviction
2. If event listeners leaking → check that all .on() have corresponding .off()
3. Emergency: restart service with `gcloud run services update heady-brain --max-instances=3`
