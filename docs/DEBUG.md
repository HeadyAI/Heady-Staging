# Heady Platform — Debug Guide

## Quick Diagnostics
```bash
# Service health
curl -s http://localhost:<port>/healthz | jq .

# Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
curl -s http://localhost:<port>/metrics | grep circuit_breaker

# System coherence (threshold: 0.809)
curl -s http://localhost:3310/coherence | jq .

# PgBouncer stats
psql -h localhost -p 6432 pgbouncer -c "SHOW POOLS;"
```

## Common Issues
| Symptom | Cause | Fix |
|---------|-------|-----|
| 503 everywhere | Service crashed | Restart, check logs |
| Slow vector search | Index fragmentation | REINDEX CONCURRENTLY |
| CSRF errors | Cookie mismatch | Clear cookies, re-auth |
| 429 rate limit | Burst traffic | Wait for token refill |
| Coherence < 0.809 | Embedding model change | Re-embed affected vectors |

## Log Analysis
```bash
docker logs <container> 2>&1 | jq 'select(.level == "error")'
docker logs <container> --since "2h" 2>&1 | jq 'select(.level == "critical")'
```
