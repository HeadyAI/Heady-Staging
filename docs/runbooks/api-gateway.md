# Runbook: api-gateway (Request Routing & Rate Limiting)

**Service:** API Gateway (Envoy Proxy)
**Version:** Envoy 1.28
**On-Call:** Check PagerDuty
**Slack:** #heady-gateway
**Repo:** https://github.com/heady-ai/api-gateway

---

## Overview

Envoy-based API gateway handles request routing, rate limiting, circuit breaking, and mTLS for all 60+ domains. Single point of entry for all external traffic.

### Service Tier
**Tier 1 (Critical):** Gateway down = all services unreachable

### Responsibilities
- **Request Routing:** Route to correct service (brain, memory, conductor, etc.)
- **Rate Limiting:** 34 req/sec per domain (φ-scaled)
- **Load Balancing:** Round-robin across service replicas
- **TLS Termination:** HTTPS for all external clients
- **Authentication:** Validate Authorization header
- **Metrics & Logging:** Access logs, metrics, distributed traces

---

## Key Metrics

| Metric | Alert | Target |
|--------|-------|--------|
| Error Rate (5xx) | >2% | <1% |
| Request Latency p99 | >1000ms | <500ms |
| Rate Limit Rejections | >10% of traffic | <5% |
| Circuit Breaker Open | >0 | 0 (no broken circuits) |
| Upstream Service Health | <90% healthy | 100% |

### Health Check

```bash
curl -v http://localhost:8000/health

# Expected: 200 OK
# Envoy returns: "LIVE" for health checks during graceful shutdown
```

---

## Common Issues & Resolutions

### Issue 1: All Requests Return 502 Bad Gateway

**Symptoms:**
- All API calls fail with 502
- Error: "No healthy upstream found"
- Cascading failures to all services

**Diagnosis:**

```bash
# Step 1: Check Envoy status
kubectl get pods -l app=api-gateway
# Should show 3 pods Running

# Step 2: Check upstream services health
kubectl logs deployment/api-gateway | grep "upstream_cx_none_healthy"
# If present → no healthy instances of upstream service

# Step 3: Check specific service
kubectl get pods -l app=heady-brain
# heady-brain should show Running
kubectl exec pod/heady-brain-xyz -- curl http://localhost:8000/health
# Should return 200 OK

# Step 4: Check Envoy configuration
kubectl get configmap envoy-config
kubectl describe configmap envoy-config | grep -A 20 "clusters"
# Verify: correct service names and ports

# Step 5: Check network policies
kubectl get networkpolicies
# Verify: gateway → services allowed
```

**Resolution:**

```bash
# Option 1: Restart gateway (if config correct)
kubectl rollout restart deployment/api-gateway

# Option 2: Check and fix configuration
# Edit: k8s/api-gateway-configmap.yaml
# Verify: cluster names match Kubernetes services
# Example: "heady-brain.default.svc.cluster.local:8000"
kubectl apply -f k8s/api-gateway-configmap.yaml
kubectl rollout restart deployment/api-gateway

# Option 3: Fix upstream service
# If upstream service crashing:
kubectl logs deployment/heady-brain | tail -20
# See error causing crash
# Fix issue and restart: kubectl rollout restart deployment/heady-brain

# Option 4: Check DNS
# Envoy resolves service names via DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup heady-brain.default.svc.cluster.local
# Should resolve to ClusterIP

# Option 5: Network policy issue
# If services cannot communicate:
kubectl get networkpolicies | grep api-gateway
# Verify allows: api-gateway → all services
# If missing: add policy
```

### Issue 2: Rate Limiting Rejecting Too Many Requests (429)

**Error:** `HEADY-GATEWAY-004 | Rate limit exceeded`

**Diagnosis:**

```bash
# Step 1: Check rate limit config
kubectl logs deployment/api-gateway | grep "rate_limit"
# Should see: rate_limit_per_second: 34

# Step 2: Check domain usage
kubectl logs deployment/api-gateway | grep "domain_id" | tail -100 | sort | uniq -c | sort -rn
# Shows requests per domain

# Step 3: Check if bursty
# Are requests evenly distributed or spikey?
# Bursty requests (100 in 1s, then idle) will hit limit faster

# Step 4: Check request backlog
# Is queue building up?
kubectl logs deployment/api-gateway | grep "queue_depth"
# If >100: more traffic than capacity
```

**Resolution:**

```bash
# Option 1: Implement backoff in client
# Client should retry with exponential backoff (1.618x):
# 100ms → 162ms → 262ms → 424ms → ...
# This is standard; most clients do this already

# Option 2: Increase domain quota (if legitimate increase)
# Edit: k8s/api-gateway-configmap.yaml
# Change: rate_limit: 34 → 100 (per domain)
# But: may need to scale up backend services

# Option 3: Implement request batching
# Client batches requests: [req1, req2, req3] in one API call
# Reduces request count by 3x

# Option 4: Scale up gateway
kubectl scale deployment/api-gateway --replicas=5
# More gateway instances = more total capacity

# Option 5: Check for client bug
# One misbehaving client sending 1000x normal requests?
# Block IP or identify/fix client

# Option 6: Implement tiered limits
# Premium tier: 100 req/s
# Standard tier: 34 req/s
# Free tier: 10 req/s
# Move aggressive customers to premium
```

### Issue 3: Circuit Breaker Open (Temporary Failures)

**Error:** `HEADY-GATEWAY-013 | Circuit breaker open`

**Symptoms:**
- Upstream service temporarily unavailable
- Requests fail with 430 code (Envoy's circuit breaker)
- After 30s → requests succeed again

**Diagnosis:**

```bash
# Step 1: Identify which service has open circuit
kubectl logs deployment/api-gateway | grep "circuit_breaker"
# Shows: service heady-brain has circuit open

# Step 2: Check that service health
kubectl get pods -l app=heady-brain
# If pods restarting: circuit breaker correct behavior

# Step 3: Check error rate that triggered breaker
kubectl logs deployment/heady-brain | grep "ERROR" | tail -10
# How many errors in last minute?

# Circuit breaker threshold: 5 consecutive errors
# If service has temporary issue → circuit opens (fast failure)
```

**Resolution:**

```bash
# Option 1: Wait for recovery (if temporary issue)
# Service recovers within 30s
# Requests automatically resume

# Option 2: Reduce circuit breaker sensitivity (if false positives)
# Edit: k8s/api-gateway-configmap.yaml
# Change: consecutive_5xx: 5 → 10 (require 10 errors, not 5)
# Tradeoff: slower detection of real issues

# Option 3: Fix upstream service
# If service unstable:
kubectl logs deployment/heady-brain
# Identify issue (OOM, CPU max, hanging requests)
# Fix and restart

# Option 4: Check for timeout being too short
# If all requests timing out:
# Increase timeout: 10s → 30s
# Edit: k8s/api-gateway-configmap.yaml
# Change: request_timeout: 10000 → 30000
```

---

## Deployment

### Update Gateway Configuration

```bash
# Edit Envoy configuration
nano k8s/api-gateway-configmap.yaml

# Key sections:
# - clusters: upstream services
# - routes: request routing rules
# - rate_limiting: per-domain limits
# - circuit_breakers: timeout, connection pool

# Apply changes
kubectl apply -f k8s/api-gateway-configmap.yaml

# Reload config (graceful)
kubectl exec pod/api-gateway-xyz -- curl -X POST localhost:9001/drain_listeners
# Envoy drains connections, reloads config
# Connected clients stay connected, new clients use new config

# OR restart (if complex changes)
kubectl rollout restart deployment/api-gateway
```

### Monitor Traffic During Deployment

```bash
# Pre-deployment metrics
kubectl exec pod/api-gateway-xyz -- curl localhost:8001/stats | grep rq_total

# During rolling restart: watch error rate
kubectl logs -f deployment/api-gateway | grep "response_code"

# Post-deployment: verify success
curl -X GET http://localhost:8000/stats/health
```

---

## Performance Tuning

### Optimize for Low Latency

```bash
# Current: p99 latency = 800ms
# Goal: <500ms

# Tuning steps:

# 1. Reduce connection pool wait
# Edit: api-gateway-configmap.yaml
# connection_pool: 100 → 200 connections per upstream

# 2. Increase buffer sizes
# upstream_buffer_limit: 4Mb → 16Mb

# 3. Disable unnecessary logging
# access_log_enabled: true → false (if not debugging)

# 4. Add caching for health checks
# Only health check every 5s instead of every 1s

# 5. Tune backoff
# backoff: base_interval: 10ms → 1ms

# Apply and measure
kubectl apply -f k8s/api-gateway-configmap.yaml
kubectl rollout restart deployment/api-gateway
# Wait 5 minutes, check Grafana for latency improvement
```

---

## Monitoring & Observability

### Check Request Volume

```bash
# Total requests per second
kubectl logs deployment/api-gateway | grep "response_code" | wc -l
# Result: ~500 requests in last 10 seconds = ~50 req/s (normal)

# Requests by domain
kubectl logs deployment/api-gateway | grep "domain_id" | cut -d'=' -f2 | sort | uniq -c | sort -rn
# Shows traffic distribution

# Requests by service
kubectl logs deployment/api-gateway | grep "route" | cut -d'=' -f2 | sort | uniq -c
# Shows which services getting most traffic
```

### Check Error Rates

```bash
# 5xx errors (service errors)
kubectl logs deployment/api-gateway | grep "response_code=5" | wc -l

# 429 errors (rate limit)
kubectl logs deployment/api-gateway | grep "response_code=429" | wc -l

# 502 errors (bad gateway)
kubectl logs deployment/api-gateway | grep "response_code=502" | wc -l

# Rate: errors_per_second = count / time_window
# Alert if >2% of requests are errors
```

---

## Related Documents

- ADR-008: Envoy service mesh architecture
- Security Model: `docs/SECURITY_MODEL.md` (Rate Limiting section)

