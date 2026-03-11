# Runbook Template

Use this template for all service runbooks. Copy and fill in all sections.

---

## Service: [NAME]

**On-Call:** Check PagerDuty for current owner
**Slack Channel:** #heady-[service-name]
**Repository:** https://github.com/heady-ai/[service-name]

---

## Overview

### Purpose
[Describe what this service does in 1-2 sentences]

### Service Tier
- **Tier 1 (Critical):** Inference services (brain, embed, memory)
- **Tier 2 (High):** API services (gateway, auth, conductor)
- **Tier 3 (Medium):** Content services (CMS, webhook)
- **Tier 4 (Low):** Observability (logs, metrics, tracing)

### Dependencies
- **Upstream:** What services call this service?
- **Downstream:** What services does this service call?
- **External:** Third-party APIs?
- **Data:** Databases, caches, queues?

---

## Metrics & Monitoring

### Key Metrics

| Metric | Alert Threshold | Dashboard |
|--------|-----------------|-----------|
| Error Rate (5xx) | >5% | Service Overview |
| Latency (p99) | >5s | Service Overview |
| Request Volume | >10K req/s | Service Overview |
| Memory Usage | >85% | Resource Usage |
| CPU Usage | >90% | Resource Usage |
| Pod Restarts | >3 in 5min | Pod Health |

### Health Check Endpoint

```bash
# Check if service is healthy
curl -v http://localhost:8000/health

# Expected response (200 OK):
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "dependencies": {
    "database": "ok",
    "cache": "ok",
    "event_bus": "ok"
  }
}

# If health check fails:
# 1. Check service logs: kubectl logs -f deployment/[service]
# 2. Check dependent services: kubectl port-forward ...
# 3. Restart service: kubectl rollout restart deployment/[service]
```

### Dashboard Access

- **Grafana:** http://localhost:3000 → Service Overview
- **Prometheus:** http://localhost:9090 → Metrics explorer
- **Jaeger:** http://localhost:16686 → Trace requests

---

## Common Issues & Resolutions

### Issue 1: Service Returning 503

**Symptoms:**
- Requests timeout after 30 seconds
- Health check fails
- Error logs show "service unavailable"

**Root Causes:**
- Service process crashed or hung
- Dependent service down
- Resource exhaustion (memory, CPU)
- Database connection pool full

**Resolution:**

```bash
# Step 1: Check service status
kubectl get pods -l app=[service-name]
# If pod is CrashLoopBackOff, check logs

# Step 2: Check logs
kubectl logs -f --tail=100 deployment/[service-name]
# Look for errors, panics, or connection timeouts

# Step 3: Check dependencies
kubectl get pods -l app=postgres
kubectl get pods -l app=redis
kubectl get pods -l app=nats
# All should be Running

# Step 4: Describe pod for details
kubectl describe pod [pod-name]
# Check: Last State, Events section

# Step 5: Restart service (if temporary glitch)
kubectl rollout restart deployment/[service-name]

# Step 6: Monitor recovery
kubectl logs -f deployment/[service-name]
# Should see startup logs and "service ready" message

# Step 7: Verify with health check
curl http://localhost:8000/health
```

### Issue 2: High Latency (p99 > 5s)

**Symptoms:**
- Requests taking >5 seconds
- Users report slow responses
- Dashboard shows spikes in latency

**Root Causes:**
- Slow database query (missing index)
- High load from another service
- Network latency (packet loss)
- External API timeout

**Resolution:**

```bash
# Step 1: Check service metrics in Grafana
# Look for:
# - Database query duration
# - Cache hit rate
# - Downstream service latency

# Step 2: View distributed trace
# Jaeger UI → Select service and operation
# Look for slowest span in call chain
# Identify bottleneck (database? external API?)

# Step 3: Check database performance
kubectl port-forward svc/postgres 5432:5432
psql -h localhost -U heady_user -d heady_db

# Query slowest queries
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

# If query time high:
# - Add index: CREATE INDEX idx_name ON table(column);
# - Analyze plan: EXPLAIN ANALYZE SELECT ...;
# - Check row count: SELECT COUNT(*) FROM table;

# Step 4: Check resource utilization
# Metrics → Resource Usage dashboard
# If CPU near max: scale up replicas or increase CPU request
# If Memory near max: increase memory limit or optimize code

# Step 5: Check cache hit rate
# If <80% hit rate: increase cache size or TTL
# kubectl exec -it pod/redis -- redis-cli INFO stats

# Step 6: Monitor improvement
# Tail logs to see new query performance
# Rerun trace comparison before/after
```

### Issue 3: Out of Memory (OOM)

**Symptoms:**
- Pod restarts frequently
- "Killed" status in pod events
- Spike in memory usage

**Root Causes:**
- Memory leak in application code
- Cache not evicting old entries
- Large batch processing without limits
- Child processes not cleaned up

**Resolution:**

```bash
# Step 1: Check memory usage over time
# Grafana → Resource Usage → Memory graph
# Look for linear increase (leak) vs spiky (batch processing)

# Step 2: Check pod events
kubectl describe pod [pod-name] | tail -20
# Shows last state and memory limits

# Step 3: Check heap dumps (if Java service)
kubectl logs [pod-name] | grep "OutOfMemory"

# Step 4: Increase memory limit (temporary)
kubectl set resources deployment [service-name] \
  --limits=memory=8Gi --requests=memory=4Gi

# Step 5: Identify leak (permanent fix)
# Check application code for:
# - Unbounded caches (add size limits)
# - Goroutine leaks (ensure cleanup)
# - Connection leaks (close connections)

# Step 6: Deploy fix
# Create new image with memory leak fix
# Deploy canary (10% traffic) to verify

# Step 7: Monitor memory
# After deployment, check memory usage returns to baseline
```

### Issue 4: Database Connection Pool Exhausted

**Symptoms:**
- Errors: "connection pool full"
- Query timeout after 10 seconds
- Cascading failures to other services

**Root Causes:**
- Connection not properly closed
- Too many concurrent requests
- Long-running transaction holding connection
- PgBouncer configuration too small

**Resolution:**

```bash
# Step 1: Check connection count
psql -h localhost -U heady_user -d heady_db

SELECT datname, usename, count(*)
FROM pg_stat_activity
GROUP BY datname, usename;

# If heady_db shows >80 connections: issue found

# Step 2: Check query types
SELECT query, state, wait_event
FROM pg_stat_activity
WHERE datname = 'heady_db'
ORDER BY query_start DESC;

# Look for:
# - Idle connections (close them)
# - Long queries (slow)
# - Blocked queries (waiting for lock)

# Step 3: Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'heady_db'
AND state = 'idle'
AND query_start < now() - interval '5 minutes';

# Step 4: Increase connection limit (PgBouncer)
# Update config: max_client_conn = 200
kubectl rollout restart deployment/pgbouncer

# Step 5: Fix application
# Ensure connections are properly returned to pool
# Add connection timeout to queries
# Use connection pooling library (e.g., node-postgres pool)

# Step 6: Monitor
# Check connection count returns to normal (<50)
```

---

## Scaling & Capacity

### Horizontal Scaling (Add Replicas)

```bash
# Current replicas
kubectl get deployment [service-name]

# Scale to N replicas
kubectl scale deployment [service-name] --replicas=5

# Monitor scaling
kubectl rollout status deployment/[service-name]

# Pod startup time
# Watch pod initialization: kubectl logs -f pod/[service-name]-[id]
```

### Vertical Scaling (Increase CPU/Memory)

```bash
# Update resource requests/limits
kubectl set resources deployment [service-name] \
  --requests=cpu=1000m,memory=2Gi \
  --limits=cpu=2000m,memory=4Gi

# Rolling restart to apply changes
kubectl rollout restart deployment/[service-name]

# Verify
kubectl describe deployment [service-name] | grep -A 10 "Limits\|Requests"
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup current database
pg_dump -h postgres -U heady_user heady_db > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup
gunzip -c backup_*.sql.gz | head -20

# Restore from backup
psql -h postgres -U heady_user heady_db < backup_*.sql.gz
```

### Disaster Recovery

```bash
# If database corrupted or data lost:

# Step 1: Stop all services to prevent further damage
kubectl scale deployment [service-name] --replicas=0

# Step 2: Restore from backup
# Cloud Storage → gs://heady-backups/daily/backup-2024-01-15.sql.gz
gsutil cp gs://heady-backups/daily/backup-2024-01-15.sql.gz .

# Step 3: Restore to postgres
psql -h postgres -U heady_user heady_db < backup-2024-01-15.sql.gz

# Step 4: Verify restore
psql -h postgres -U heady_user heady_db
heady_db=# SELECT COUNT(*) FROM articles; -- Should match pre-failure count

# Step 5: Restart services
kubectl scale deployment [service-name] --replicas=3

# Step 6: Monitor for consistency
kubectl logs -f deployment/[service-name]
```

---

## Deployment & Rollback

### Deploy New Version

```bash
# Build new image
docker build -t heady-[service]:1.2.0 .
docker tag heady-[service]:1.2.0 gcr.io/heady-ai/[service]:1.2.0

# Push to registry
docker push gcr.io/heady-ai/[service]:1.2.0

# Update deployment
kubectl set image deployment/[service] \
  [service]=gcr.io/heady-ai/[service]:1.2.0

# Monitor rollout
kubectl rollout status deployment/[service]

# View deployment
kubectl rollout history deployment/[service]
```

### Rollback to Previous Version

```bash
# If new version has issues:
kubectl rollout undo deployment/[service]

# Monitor rollback
kubectl rollout status deployment/[service]

# Verify previous version working
curl http://localhost:8000/health

# Check version
kubectl get deployment [service] -o jsonpath='{.spec.template.spec.containers[0].image}'
```

---

## Observability & Debugging

### View Logs

```bash
# Recent logs (last 100 lines)
kubectl logs --tail=100 deployment/[service-name]

# Follow logs (streaming)
kubectl logs -f deployment/[service-name]

# Logs with timestamps
kubectl logs -f --timestamps deployment/[service-name]

# Logs from specific pod
kubectl logs pod/[service-name]-[id]

# Logs from all pods of service
kubectl logs -l app=[service-name] --all-containers=true
```

### Trace Request

```bash
# 1. Get request ID from logs or response headers
# X-Request-ID: req-abc123def456

# 2. View in Jaeger UI
open http://localhost:16686

# 3. Search:
# Service: [service-name]
# Operation: POST /api/inference
# Tags: request_id="req-abc123def456"

# 4. View timeline:
# Shows each service call duration
# Identify slowest spans
# Check error details
```

### Check Service Status

```bash
# All pods
kubectl get pods

# Specific service
kubectl get pods -l app=[service-name]

# Pod details
kubectl describe pod [pod-name]

# Service endpoints
kubectl get endpoints [service-name]

# Resources
kubectl top pod [pod-name]
```

---

## On-Call Handoff

At end of shift, provide incoming on-call engineer with:

- [ ] Current status (healthy? any open issues?)
- [ ] Recent changes deployed
- [ ] Pending issues or monitoring alerts
- [ ] Any service restarts or quirks
- [ ] Recent incident postmortems
- [ ] Links to relevant dashboards and logs

**Example Handoff:**
```
Hey [engineer], taking over. Status:

✅ All services healthy
✅ No open alerts
🔄 Recently deployed v1.2.0 to heady-brain (rolled out 2 hours ago)
⚠️ Minor: Redis memory slightly elevated (85%), monitoring
📝 Watch: Database query performance on domain-b (added index, verify improvement)

Dashboard: [grafana-link]
Recent logs: [Cloud Logging link]
Service health: [health-check link]

Let me know if you see anything unusual!
```

---

## Emergency Contacts

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| Engineering Lead | [Name] | @[handle] | [Number] |
| Infrastructure Lead | [Name] | @[handle] | [Number] |
| Security On-Call | [Name] | @[handle] | [Number] |
| Product Manager | [Name] | @[handle] | [Number] |

---

## Related Documents

- Architecture Decision Records: `docs/adr/`
- Security Model: `docs/SECURITY_MODEL.md`
- Error Codes: `docs/ERROR_CODES.md`
- Incident Playbooks: `docs/playbooks/`

