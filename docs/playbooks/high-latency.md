# Incident Playbook: φ-Scaled Latency Investigation

**Severity:** P2 (High)
**Response Time:** <10 minutes
**Resolution Time:** <1 hour

---

## Alert: Inference Latency Spike

Latency elevated above baseline; p99 latency exceeds φ²-scaled threshold (>20 seconds for heady-brain)

---

## Initial Assessment (First 5 minutes)

### Step 1: Quantify Latency Impact

```bash
# Check Grafana: Service Performance dashboard
# Metrics: Request Latency p50, p99, p99.9

# Baseline (normal): p99 = 5s for heady-brain
# Alert threshold: p99 > 20s (φ² ≈ 2.618 times baseline)

# If p99 = 45s: 9x baseline → critical
# If p99 = 12s: 2.4x baseline → moderate

# Affected services?
# heady-brain? heady-memory? api-gateway?
```

### Step 2: Check Service Metrics

```bash
# Prometheus query for latency
curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.99,http_request_duration_seconds)'

# Or check Grafana dashboards:
# Dashboard: "Service Performance"
# Look for: Latency spike correlating with timestamp of alert
```

### Step 3: Check Infrastructure

```bash
# CPU usage
kubectl top nodes
# Any node near 100% CPU?

# Memory usage
kubectl top pods
# Any pod near memory limit?

# Network saturation
kubectl exec pod/prometheus -- \
  promtool query instant 'rate(container_network_receive_bytes_total[5m])'
```

---

## Diagnostic Paths

### Path 1: Database Query Slow (heady-memory)

**Symptoms:**
- heady-brain calling heady-memory taking 8s instead of normal 50ms
- Cascades to heady-brain latency spike
- Memory query latency p99 > 200ms

**Diagnosis:**

```bash
# Check pgvector query performance
kubectl port-forward svc/postgres 5432:5432
psql -h localhost -U heady_user -d heady_db

SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE query LIKE '%embedding%'
ORDER BY max_time DESC LIMIT 5;

# Look for: mean_time > 100ms or max_time > 1000ms

# Check index health
SELECT schemaname, tablename, indexname, idx_size
FROM pg_indexes
WHERE tablename = 'embeddings'
AND indexname LIKE '%hnsw%';

# Check if query using index
EXPLAIN ANALYZE
SELECT document_id, embedding <-> ARRAY[...] as distance
FROM embeddings
WHERE domain_id = 'x'
ORDER BY distance LIMIT 10;

# Look at: "Seq Scan" (bad, slow) vs "Index Scan" (good, fast)
```

**Resolution:**

```bash
# Option 1: Rebuild HNSW index (if degraded)
REINDEX INDEX CONCURRENTLY embeddings_embedding_idx;
# Takes 30-60 minutes but improves performance

# Option 2: Reduce query limit
# Request top 10 instead of 100 results
# Latency: 150ms vs 800ms

# Option 3: Cache query results
# Redis: cache similarity searches for 1 hour
# Dedupe: same prompt vector = same results

# Option 4: Scale read replicas
# Add more postgres read replicas
# Distribute query load
```

### Path 2: API Gateway Bottleneck

**Symptoms:**
- All downstream latencies normal but p99 high after gateway
- Gateway response time: 10s+
- Cause: rate limiting queue or circuit breaker backoff

**Diagnosis:**

```bash
# Check gateway metrics
kubectl logs deployment/api-gateway | grep "latency\|queue_depth"

# Check if circuit breaker open
kubectl logs deployment/api-gateway | grep "circuit_breaker"

# Check rate limit queue
kubectl logs deployment/api-gateway | grep "rate_limit_queue"

# Check Envoy statistics
kubectl exec pod/api-gateway-xyz -- \
  curl -s localhost:9000/stats | grep "rq_time"
```

**Resolution:**

```bash
# Option 1: Scale up gateway
kubectl scale deployment/api-gateway --replicas=5

# Option 2: Reduce timeout
# If requests timing out unnecessarily
# Decrease timeout threshold or increase upstream processing speed

# Option 3: Check circuit breaker
# If open: restart upstream service or reduce error threshold

# Option 4: Increase rate limit
# If queue backing up: temporarily increase per-domain quota
```

### Path 3: Inference Model Slow (heady-brain)

**Symptoms:**
- heady-brain requests taking 30s+ instead of normal 3s
- Upstream OpenAI or Anthropic API slow
- Model context window large or complex prompt

**Diagnosis:**

```bash
# Check model latency
kubectl logs deployment/heady-brain | grep "model_latency_ms" | tail -20

# Sample output:
# model_latency_ms: 245 (normal)
# model_latency_ms: 8934 (slow)

# Check prompt size
kubectl logs deployment/heady-brain | grep "prompt_tokens" | tail -20

# Check model being used
kubectl logs deployment/heady-brain | grep "model:" | tail -5

# Check API status
curl -s https://status.openai.com/api/v2/components.json | jq '.components[] | select(.name | contains("API"))'
```

**Resolution:**

```bash
# Option 1: Reduce prompt size
# Truncate context from 50K tokens to 20K
# Faster model response, same quality

# Option 2: Use faster model
# Switch: gpt-4 (slow) → gpt-4-turbo (fast, 2x faster)

# Option 3: Implement prompt caching
# Store common prompts in Redis
# Dedupe: same prompt = cached response

# Option 4: Wait for upstream to recover
# If OpenAI having incident: nothing we can do
# Monitor status page
```

### Path 4: Memory Leak Causing Slowness

**Symptoms:**
- Latency gradually increasing over hours
- Memory usage creeping up (85% → 95% → OOM)
- GC pauses visible in traces

**Diagnosis:**

```bash
# Check memory usage trend
kubectl top pod heady-brain-xyz --watch

# Check for memory growing without bound
# Take 3 samples at 5 min intervals
for i in {1..3}; do
  kubectl top pod heady-brain-xyz | grep "heady-brain"
  sleep 300  # 5 minutes
done

# If Memory: 1.2Gi → 2.1Gi → 3.0Gi = leak

# Check GC logs (Go runtime)
kubectl logs deployment/heady-brain | grep "GC"

# Check for goroutine leaks
# Debug pprof if available: /debug/pprof
```

**Resolution:**

```bash
# Option 1: Restart service (short term)
kubectl rollout restart deployment/heady-brain
# Frees all memory, resets service

# Option 2: Increase memory limit (band-aid)
kubectl set resources deployment/heady-brain \
  --limits=memory=8Gi

# Option 3: Find and fix leak (long term)
# Profile heap: go tool pprof http://heady-brain:6060/debug/pprof/heap
# Identify objects not being freed
# Fix: ensure cleanup in defer or finally blocks

# Option 4: Implement connection pooling
# If connection leak: pool connections properly
```

---

## Root Cause Clustering

Group similar latency spikes to find pattern:

```bash
# Latency spike at 14:32 UTC
# - heady-brain: p99 = 45s
# - heady-memory: p99 = 250ms
# - api-gateway: p99 = 8s
# Correlation: database slow (memory latency spike)

# Action: Investigate database, find slow query, optimize

# OR

# Latency spike at 14:32 UTC
# - heady-brain: p99 = 6s (normal)
# - heady-memory: p99 = 50ms (normal)
# - api-gateway: p99 = 15s (spike)
# Correlation: gateway bottleneck, not downstream
# Action: Scale gateway, check rate limiting
```

---

## Performance Tuning (Long Term)

### Monitor Latency Baseline

```bash
# Establish φ-scaled latency tiers:
# HOT tier: p99 < 5s (F(7) * 0.714s baseline)
# WARM tier: p99 < 13s (F(9) * 0.714s)
# COLD tier: p99 < 34s (F(11) * 0.714s)

# Alert if:
# - p99 > 20s for >5 minutes
# - p99.9 > 50s (sudden spike)
```

### Cache Results

```typescript
// heady-brain/src/inference.ts
const cacheKey = `inference:${domainId}:${hash(prompt)}`;

// Check cache
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached); // 1ms response
}

// Inference if not cached
const result = await runInference(prompt);

// Cache for 24 hours
await redis.setex(cacheKey, 86400, JSON.stringify(result));

return result;
```

### Use φ-Scaled Timeout

```typescript
// Retry with φ-scaled backoff on timeout
const timeouts = [100, 162, 262, 424]; // ms, multiplied by φ ≈ 1.618

for (const timeout of timeouts) {
  try {
    return await queryWithTimeout(query, timeout);
  } catch (TimeoutError) {
    // Retry next timeout
  }
}

// All retries failed
throw new Error('Query timeout');
```

---

## Post-Incident Analysis

```
Timeline:
14:31 - Latency alert fires
14:35 - Diagnosed: pgvector query slow (50K vectors, missing index)
14:45 - Applied fix: Created index on (domain_id, created_at)
14:47 - Verified: latency back to normal p99 = 5s
14:50 - Index optimization complete

Root Cause: Query plan changed due to statistics update
Solution: Explicit index creation prevented optimizer fallback

Prevention: Add latency SLA checks to CI/CD
- Run performance tests on PR
- Alert if latency regresses >20%
- Require approval for slow changes
```

