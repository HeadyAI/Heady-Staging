# Incident Playbook: Service Returning 503

**Severity:** P1 (Critical)
**Response Time:** <5 minutes
**Resolution Time:** <30 minutes

---

## Alert: Service Returning 503 Errors

Service health check failing; all requests return "Service Unavailable"

---

## Initial Triage (First 2 minutes)

### Step 1: Identify Affected Service

```bash
# Check Prometheus alerts
# Or from slack: @pagerduty who?

# Determine service name (heady-brain, heady-memory, auth, etc)
SERVICE_NAME=$(kubectl get pods -o json | jq -r '.items[] | select(.status.phase != "Running") | .metadata.labels.app' | head -1)

# Verify service down
curl http://localhost:8000/health
# Expected: timeout or connection refused
```

### Step 2: Check Pod Status

```bash
kubectl get pods -l app=$SERVICE_NAME

# Status interpretation:
# Running: Pod is up but might be unhealthy
# Pending: Waiting for resources (no capacity)
# CrashLoopBackOff: Repeatedly crashing (bug or misconfiguration)
# Terminated: Pod killed (out of memory, node failure)
```

### Step 3: Quick Triage

| Pod Status | Likely Cause | Action |
|-----------|--------------|--------|
| Running (but health fail) | Internal service error | Check logs |
| Pending | Resource exhaustion | Scale up |
| CrashLoopBackOff | Code bug or config error | Rollback |
| Terminated | OOM or hardware failure | Investigate crash |

---

## Diagnostic Steps (Minutes 3-8)

### Check Service Logs

```bash
# Get recent logs
kubectl logs -f deployment/$SERVICE_NAME --tail=100

# Look for:
# - panic: code crash
# - ERROR: application error
# - connection refused: can't reach dependency
# - FATAL: fatal error

# Common patterns:
# "panic: runtime error: slice bounds out of range" → bug (rollback)
# "connection refused to postgres" → dependency down (restart postgres)
# "Out of memory" → OOM (scale up memory)
```

### Check Pod Details

```bash
# Detailed pod info
kubectl describe pod $SERVICE_POD_NAME

# Critical sections:
# - Status: Running? Pending? Terminated?
# - Last State: Reason for termination
# - Events: Recent pod events (restarts, failures)
# - Resource Limits: Are we hitting CPU/memory limits?

# Check resource usage
kubectl top pod $SERVICE_POD_NAME
# CPU and memory: is it maxed out?
```

### Check Dependencies

```bash
# Database connectivity
curl postgres:5432/health || echo "Postgres down"

# Cache connectivity
curl redis:6379/health || echo "Redis down"

# Event bus connectivity
curl nats:4222/health || echo "NATS down"

# Any downstream service down?
for svc in heady-brain heady-memory heady-embed auth-session-server; do
  curl http://$svc:8000/health || echo "$svc unreachable"
done
```

---

## Resolution Paths

### Path 1: Service Process Crash (CrashLoopBackOff)

**Indicators:**
- Pod status: CrashLoopBackOff
- Logs show panic or fatal error
- Same error repeating

**Action:**

```bash
# Step 1: Rollback to last known good version
kubectl rollout undo deployment/$SERVICE_NAME

# Step 2: Monitor recovery
kubectl rollout status deployment/$SERVICE_NAME

# Step 3: Investigate root cause
git log --oneline -5
# What changed in last 5 commits?

git show <commit-hash> | head -50
# Review changes that caused crash

# Step 4: Fix bug and redeploy
# Fix → commit → build → push → deploy

# Step 5: Notify team
# Post in #incidents: "Rolled back $SERVICE_NAME v2.1.0 → v2.0.9. Bug in [area]. Fix deployed."
```

### Path 2: Dependency Service Down

**Indicators:**
- Pod status: Running
- Health check fails with "connection refused"
- Logs show: "Failed to connect to postgres" or "Cannot reach nats"

**Action:**

```bash
# Step 1: Identify which dependency
# Check logs for connection errors:
kubectl logs deployment/$SERVICE_NAME | grep -i "connection\|refused\|timeout"

# Step 2: Check dependency health
kubectl get pods -l app=postgres
kubectl get pods -l app=redis
# Any down or restarting?

# Step 3: Restart dependency
kubectl rollout restart deployment/postgres
# (Replace with actual dependency name)

# Step 4: Wait for recovery
kubectl rollout status deployment/postgres

# Step 5: Restart primary service
kubectl rollout restart deployment/$SERVICE_NAME

# Step 6: Verify
curl http://localhost:8000/health
```

### Path 3: Out of Memory (OOM)

**Indicators:**
- Pod status: Terminated (reason: OOMKilled)
- Logs show: "cannot allocate memory" or similar
- Resource spike in metrics

**Action:**

```bash
# Step 1: Check current memory limit
kubectl get deployment $SERVICE_NAME -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}'
# Result: 2Gi or 4Gi

# Step 2: Check actual memory usage
kubectl top pod $SERVICE_POD_NAME
# Memory: 3.8Gi (out of 4Gi limit)

# Step 3: Increase limit (short term)
kubectl set resources deployment/$SERVICE_NAME \
  --limits=memory=8Gi

# Step 4: Restart pod with new limit
kubectl rollout restart deployment/$SERVICE_NAME

# Step 5: Monitor memory usage
# Watch if it continues growing (memory leak)
kubectl top pod $SERVICE_POD_NAME --watch

# Step 6: Identify root cause (long term)
# - Memory leak in application code?
# - Too many concurrent requests?
# - Cache not evicting old entries?
# Check service runbook for guidance

# Step 7: Fix root cause
# Usually: optimize code or increase resources permanently
```

### Path 4: Resource Exhaustion (CPU)

**Indicators:**
- Pod running but responding slowly
- Service latency high (p99 > 10s)
- CPU usage: 90%+

**Action:**

```bash
# Step 1: Check CPU limits
kubectl get deployment $SERVICE_NAME -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}'

# Step 2: Scale up replicas (quick)
kubectl scale deployment/$SERVICE_NAME --replicas=5
# More pods = more total CPU

# Step 3: Increase CPU per pod (longer term)
kubectl set resources deployment/$SERVICE_NAME \
  --limits=cpu=4000m \
  --requests=cpu=2000m

# Step 4: Identify inefficient code
# Profile: what code consuming CPU?
# Usually: inefficient queries, large batch processing

# Step 5: Optimize or increase resources
```

---

## Escalation (If Issue Persists >15 minutes)

```bash
# Page on-call manager
# Send to #incidents channel:
# @channel Service $SERVICE_NAME unavailable for 15 minutes
# Last action: [description]
# Current status: [current status]
# Need help with: [specific area]

# If data loss suspected:
# Preserve evidence before restarting
kubectl describe nodes
kubectl get events -A
# Save pod status and logs
```

---

## Post-Incident (After Resolution)

```bash
# Step 1: Verify service healthy
for i in {1..10}; do
  curl -s http://localhost:8000/health | jq .status
done
# All should return "healthy"

# Step 2: Check error rate normalized
# Metrics → Error Rate graph should drop to <1%

# Step 3: Notify stakeholders
# Post in #incidents: "Service $SERVICE_NAME recovered at [time]. Root cause: [brief]. Post-mortem scheduled for [time]."

# Step 4: Schedule post-mortem
# Within 24 hours, discuss:
# - Timeline of failure
# - Root cause analysis
# - What could have prevented this
# - Process improvements

# Step 5: Document findings
# Update runbook or create new alert if gap identified
```

---

## Prevention

### Add Alert (If Missing)

```yaml
# PrometheusRule: Alert if service down for >1 minute
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: service-health-alert
spec:
  groups:
    - name: service.rules
      rules:
        - alert: ServiceUnhealthy
          expr: up{job="$SERVICE_NAME"} == 0
          for: 1m
          annotations:
            summary: "Service $SERVICE_NAME unhealthy for >1 minute"
            runbook: "docs/runbooks/$SERVICE_NAME.md"
```

### Improve Monitoring

- Add health check endpoint if missing
- Log all errors with context (domain, user, request ID)
- Collect metrics: latency, error rate, resource usage
- Set appropriate resource limits/requests

### Improve Resilience

- Circuit breaker pattern for external APIs
- Retry logic with exponential backoff (φ-scaled)
- Timeout enforcement
- Connection pooling with limits
- Graceful degradation when dependency unavailable

