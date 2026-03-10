# Monitoring — Runbook

---

## Symptom: Alerts Firing

### Diagnosis
1. Open Grafana dashboard: check which service and which metric triggered
2. Check Prometheus targets: verify all services are being scraped
3. Cross-reference with structured logs for the alerting service

### Remediation
- Error rate > ψ (0.618) for 5m: Investigate specific errors, check upstream dependencies
- Error rate > 0.809 for 3m: Critical — check for cascading failures, consider circuit breaker activation
- Latency p99 > φ×1000ms (1618ms): Check database queries, external API calls, cache hit rates
- Service down > 5min: Restart service, check Docker health, verify Cloud Run instance count

---

## Symptom: High Latency

### Diagnosis
1. Check PgBouncer: `SHOW POOLS;` — look at cl_active, sv_active
2. Check NATS queue depth: `nats stream info heady-inference`
3. Check external provider latency: ai-router logs show per-provider response times
4. Check node memory/CPU: Cloud Run metrics or `docker stats`

### Remediation
1. If PgBouncer saturated → increase default_pool_size (next Fibonacci: 55)
2. If NATS backed up → check consumers are keeping up, add more consumer instances
3. If provider slow → circuit breaker should auto-failover, verify configuration
4. If resource constrained → scale up Cloud Run instances or CPU allocation
