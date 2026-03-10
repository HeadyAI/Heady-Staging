# Search Runbook

**Service:** search | **Port:** 3364

## Health Check
```bash
curl http://localhost:3364/health
```

## Common Issues

### 1. Low Search Quality
**Symptom:** Irrelevant results
**Resolution:**
1. Check similarity threshold: CSL_THRESHOLDS.LOW = 0.691 (default)
2. Raise to CSL_THRESHOLDS.MEDIUM = 0.809 for better precision
3. Verify embedding model is consistent (384D vs 1536D)
4. Re-rank enabled? Check `rerankTopK`: fib(8) = 21

### 2. Slow Search Response
**Symptom:** Search taking > 1 000ms
**Resolution:**
1. Check pgvector HNSW index: ef_search = fib(11) = 89
2. Lower ef_search for speed (tradeoff: recall)
3. Check connection pool health
4. Verify embedding cache hit rate
