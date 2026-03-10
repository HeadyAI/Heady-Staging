# Analytics Runbook

**Service:** analytics | **Port:** 3362

## Health Check
```bash
curl http://localhost:3362/health
```

## Common Issues

### 1. Event Buffer Overflow
**Symptom:** Events being dropped
**Cause:** Flush failing to PostgreSQL
**Resolution:**
1. Check PostgreSQL connectivity
2. Buffer max: fib(12) = 144 events
3. Flush interval: PHI_TIMING.PHI_6 = 17 944ms
4. If DB down: events are lost after buffer fills (Cold pool — accepted tradeoff)

### 2. Slow Queries
**Symptom:** Summary endpoint timing out
**Resolution:**
1. Check pgvector index health
2. Add date range filters to narrow query
3. Consider materialized views for common queries
