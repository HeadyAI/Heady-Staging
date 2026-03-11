# Runbook: heady-brain (Inference Service)

**Service:** AI Inference Engine
**Language:** Go
**GPU Required:** Yes (NVIDIA A100 or equivalent)
**On-Call:** Check PagerDuty for current owner
**Slack:** #heady-brain
**Repo:** https://github.com/heady-ai/heady-brain

---

## Overview

heady-brain is the core inference service handling LLM calls for all 60+ domains. It interfaces with OpenAI's GPT-4, Anthropic's Claude, and other models via unified API.

### Service Tier
**Tier 1 (Critical):** Any downtime affects all domains

### Dependencies
- **Upstream:** api-gateway, heady-conductor
- **Downstream:** heady-embed (context embeddings), heady-memory (vector search), postgres (store results)
- **External:** OpenAI API, Anthropic API, safety classifiers
- **Inference Hardware:** NVIDIA GPUs (8x A100 per pod)

---

## Metrics & Monitoring

### Key Metrics

| Metric | Alert | Target | Dashboard |
|--------|-------|--------|-----------|
| Error Rate (5xx) | >2% | <1% | Brain Health |
| Model Latency p99 | >30s | <20s | Brain Performance |
| Inference Queue Depth | >100 | <20 | Brain Queue |
| Token Usage (daily) | N/A | Track spend | Brain Tokens |
| GPU Memory Usage | >90% | 70-80% | Brain GPU |
| Inference Success Rate | <95% | >99% | Brain Success |

### Health Check

```bash
# Test inference endpoint
curl -X POST http://localhost:8000/health -H "Content-Type: application/json" \
  -d '{"type": "inference"}'

# Expected: 200 OK
# {
#   "status": "healthy",
#   "model": "gpt-4-turbo",
#   "gpu_available": true,
#   "queue_depth": 5,
#   "avg_latency_ms": 245
# }
```

### GPU Monitoring

```bash
# Check GPU allocation per pod
kubectl describe pod heady-brain-xyz | grep -A 5 "nvidia.com"

# Monitor GPU memory
kubectl exec -it pod/heady-brain-xyz -- nvidia-smi

# Should see:
# GPU 0: Tesla A100 | Memory: 35GB / 40GB (87%)
# GPU 1: Tesla A100 | Memory: 38GB / 40GB (95%)

# If memory > 95%: queue backup to downstream processing
```

---

## Common Issues

### Issue 1: Inference Timeout (408)

**Error:** `HEADY-BRAIN-005 | Inference timeout exceeded (default 120s)`

**Diagnosis:**

```bash
# Step 1: Check inference queue
kubectl logs -f deployment/heady-brain | grep "queue_depth"
# If queue_depth > 100: service overloaded

# Step 2: Check model latency
# Grafana → Brain Performance → Model Response Time
# If p99 > 120s: model slow (not service issue)

# Step 3: Check GPU utilization
kubectl exec -it pod/heady-brain-xyz -- nvidia-smi
# If GPU Memory 100%: inference stuck in memory

# Step 4: Check downstream services
# Is heady-embed responding? (get embeddings for context)
# Is heady-memory responding? (retrieve vectors)
curl http://heady-embed:8000/health
curl http://heady-memory:8000/health
```

**Resolution:**

```bash
# Option 1: Increase timeout (short term)
# Edit: k8s/heady-brain-deployment.yaml
# Change: timeout: 120s → timeout: 240s
kubectl apply -f k8s/heady-brain-deployment.yaml

# Option 2: Reduce input size (immediate)
# Query limit: max 25K tokens (not 50K)
# Truncate context to 10 documents instead of 20

# Option 3: Scale up GPUs (permanent)
# Add GPU pod node: gcloud compute nodes create ...
# Increase GPU per pod: limits: nvidia.com/gpu: 2 → 4

# Option 4: Migrate to faster model
# Use gpt-4-turbo instead of gpt-4
# ~2x faster, same quality
```

### Issue 2: GPU Out of Memory (OOM)

**Error:** `HEADY-BRAIN-009 | No available inference replicas`

**Diagnosis:**

```bash
# Step 1: Check GPU memory
kubectl exec pod/heady-brain-xyz -- nvidia-smi
# GPU 0: 40GB / 40GB (100%) → OOM

# Step 2: Check batch size
kubectl logs deployment/heady-brain | grep "batch_size"
# If batch_size > 32: too many concurrent inferences

# Step 3: Check request size
kubectl logs deployment/heady-brain | grep "prompt_tokens"
# If prompt > 50K tokens: input too large

# Step 4: Check model size
kubectl get deployment heady-brain -o jsonpath='{.spec.template.spec.containers[0].env}' | grep MODEL
# If model="gpt-4": 175B parameters, needs 40GB+ memory
```

**Resolution:**

```bash
# Option 1: Reduce batch size (immediate)
# Edit: services/heady-brain/config.yaml
# Change: max_concurrent_requests: 32 → 16
# Restart: kubectl rollout restart deployment/heady-brain

# Option 2: Reduce input prompt size
# Implement prompt summarization: compress context before inference
# Or use 4K context models instead of 128K

# Option 3: Add GPU capacity
# Scale up: 8 GPUs → 16 GPUs per node
# Or add GPU pods: kubectl scale statefulset heady-brain --replicas=4

# Option 4: Use smaller model
# Switch: gpt-4-turbo (8B) instead of gpt-4 (175B)
# Latency: 200ms → 50ms, but less accurate
```

### Issue 3: Model API Rate Limit (429)

**Error:** `HEADY-BRAIN-006 | Rate limit exceeded`

**Diagnosis:**

```bash
# Step 1: Check API usage
# OpenAI dashboard: https://platform.openai.com/account/usage
# Current: 1.2M tokens/day (95% of daily limit)

# Step 2: Check domain utilization
kubectl logs deployment/heady-brain | grep "domain_id" | sort | uniq -c | sort -rn
# domain-a: 45K inferences
# domain-b: 35K inferences
# domain-c: 25K inferences

# Step 3: Check request volume trend
# Metrics → Brain Requests → 7-day trend
# If spiking up: need higher quota
```

**Resolution:**

```bash
# Option 1: Request higher quota (permanent)
# OpenAI support request:
# Current: 1M tokens/day
# Requested: 5M tokens/day (for growth)
# Expected approval: 24 hours

# Option 2: Implement caching (immediate)
# Cache inference results in Redis for 24 hours
# Dedupe identical requests: 20% reduction in API calls

# Option 3: Reduce per-domain quota
# Implement fair-share: domain-a gets 40%, domain-b gets 35%, etc.
# Use NATS subscriber per domain to serialize inferences

# Option 4: Switch model provider
# OpenAI quota exhausted? Fall back to Anthropic API
# Or use cheaper model (gpt-3.5-turbo instead of gpt-4)
```

### Issue 4: Safety Filter False Positive

**Error:** `HEADY-BRAIN-013 | Safety filter triggered on input`

**Diagnosis:**

```bash
# Step 1: Identify prompt
kubectl logs deployment/heady-brain | grep "SAFETY_FILTER_BLOCKED"
# Example: "prompt contains 'jailbreak' keyword"

# Step 2: Review prompt
# Is it actually malicious? Or false positive?
# Check classification score (0-1): 0.92 = confident block

# Step 3: Check filter version
# Classifiers update weekly
# kubectl describe configmap safety-classifier | grep "version"
```

**Resolution:**

```bash
# Option 1: User reformulates prompt (immediate)
# "How can I bypass security" → "How do I reset my password"

# Option 2: Lower filter sensitivity
# Edit: config.yaml
# safety_threshold: 0.9 → 0.85
# Risk: More malicious prompts slip through
# Requires careful monitoring

# Option 3: Add to whitelist
# Contact: security team
# If false positive confirmed, add pattern to whitelist
```

### Issue 5: Cascading Failures (Downtime)

**Symptoms:**
- Multiple pod restarts
- CrashLoopBackOff status
- All inferences failing

**Diagnosis:**

```bash
# Step 1: Check pod status
kubectl get pods -l app=heady-brain
# Status: CrashLoopBackOff → restart loop

# Step 2: Check logs
kubectl logs --tail=50 pod/heady-brain-xyz
# Look for panic, error, or init failure

# Step 3: Check dependencies
kubectl get pods -l app=postgres
kubectl get pods -l app=redis
kubectl get pods -l app=nats
# If any showing CrashLoopBackOff: dependency issue

# Step 4: Check resource availability
kubectl describe nodes
# CPU Allocatable: 100m / 100m (100% → no resources)
# Memory Allocatable: 50Gi / 64Gi (normal)

# Step 5: Check recent changes
git log --oneline -10
# What was deployed in last 1 hour?
```

**Resolution:**

```bash
# Option 1: Restart service
kubectl rollout restart deployment/heady-brain
# Wait 5 minutes for recovery

# Option 2: Rollback deployment
kubectl rollout history deployment/heady-brain
# Find last stable revision (e.g., revision 42)
kubectl rollout undo deployment/heady-brain --to-revision=42

# Option 3: Restart dependent services first
kubectl rollout restart deployment/postgres
kubectl rollout restart deployment/redis
# Wait for health checks
kubectl rollout restart deployment/heady-brain

# Option 4: Scale up capacity
# If CPU exhausted:
kubectl get nodes
# Add new node: gcloud compute nodes create ...
# Or increase node pool size: gcloud container node-pools update default --num-nodes=10

# Option 5: Check logs for root cause
kubectl logs -f --tail=200 deployment/heady-brain
# Look for: panic, segfault, OOM, timeout, connection error
```

---

## Scaling & Capacity

### GPU Scaling

```bash
# Current GPU allocation
kubectl get deploymentspec heady-brain | grep nvidia.com/gpu
# Result: 8 (8x A100 per pod)

# Scale to more GPUs
kubectl set resources deployment heady-brain \
  --limits=nvidia.com/gpu=16 \
  --requests=nvidia.com/gpu=16

# This requires:
# 1. Available GPU nodes in cluster
# 2. Increase node count if needed:
gcloud container node-pools create gpu-pool-v2 \
  --cluster=heady-prod \
  --accelerator=type=nvidia-tesla-a100,count=8 \
  --machine-type=a2-highgpu-8g
```

### Replica Scaling

```bash
# Current replicas
kubectl get deployment heady-brain -o jsonpath='{.spec.replicas}'
# Result: 3

# Scale to 5 replicas
kubectl scale deployment heady-brain --replicas=5

# Watch rollout
kubectl rollout status deployment/heady-brain

# Expected: 5 pods running in <2 minutes
```

---

## Backup & Recovery

### Model Checkpoint Backup

```bash
# heady-brain loads models at startup
# Models stored in persistent volume

# Backup models
kubectl exec pod/heady-brain-xyz -- tar -czf /mnt/models-backup-$(date +%Y%m%d).tar.gz /models/
kubectl cp pod/heady-brain-xyz:/mnt/models-backup-*.tar.gz ./

# Upload to Cloud Storage
gsutil cp models-backup-*.tar.gz gs://heady-backups/models/

# Restore (if model corrupted)
gsutil cp gs://heady-backups/models/models-backup-20240115.tar.gz ./
kubectl cp models-backup-20240115.tar.gz pod/heady-brain-xyz:/mnt/
kubectl exec pod/heady-brain-xyz -- tar -xzf /mnt/models-backup-20240115.tar.gz -C /
kubectl rollout restart deployment/heady-brain
```

### Cache Flush

```bash
# If inference results cache corrupted
curl -X POST http://localhost:8000/admin/cache/clear

# Or via kubectl
kubectl exec pod/heady-brain-xyz -- /app/scripts/flush-cache.sh

# Wait for inference to warm up cache
# First 100 inferences: slower (cache rebuilding)
```

---

## Deployment & Rollback

### Deploy New heady-brain Version

```bash
# Build image
docker build -t heady-brain:2.0.0 -f Dockerfile .
docker tag heady-brain:2.0.0 gcr.io/heady-ai/heady-brain:2.0.0
docker push gcr.io/heady-ai/heady-brain:2.0.0

# Test in staging first
kubectl --context=staging set image deployment/heady-brain \
  heady-brain=gcr.io/heady-ai/heady-brain:2.0.0

# Monitor staging
kubectl --context=staging get pods -l app=heady-brain
kubectl --context=staging logs -f deployment/heady-brain

# Run load test
ab -n 1000 -c 10 http://staging-brain.heady.ai/api/inference

# Canary deploy to production (10% traffic)
kubectl set image deployment/heady-brain \
  heady-brain=gcr.io/heady-ai/heady-brain:2.0.0 \
  --record

# Monitor metrics
# Grafana → Brain Health → Error Rate, Latency
# Watch for 15 minutes

# If no errors, complete rollout
# (Manual traffic increase in Envoy config)

# Full rollout (90% → 100%)
kubectl patch virtualservice heady-brain -p '{"spec":{"hosts":[{"name":"heady-brain","weight":100}]}}'

# Verify
kubectl rollout status deployment/heady-brain
```

### Rollback

```bash
# If new version has issues
kubectl rollout undo deployment/heady-brain

# Verify rollback
kubectl rollout status deployment/heady-brain
kubectl get deployment heady-brain -o jsonpath='{.spec.template.spec.containers[0].image}'

# Should return to previous version image tag
```

---

## Observability

### View Inference Metrics

```bash
# Latency distribution
kubectl logs -f deployment/heady-brain | grep "latency_ms" | tail -20

# Most common models used
kubectl logs deployment/heady-brain | grep "model:" | sort | uniq -c

# Domain usage
kubectl logs deployment/heady-brain | grep "domain_id:" | sort | uniq -c | sort -rn | head -10

# Error rate by domain
kubectl logs deployment/heady-brain | grep "ERROR" | grep "domain_id:" | cut -d' ' -f NF | sort | uniq -c
```

### Trace Request

```bash
# In Jaeger UI (http://localhost:16686)
# Search for inference request:
# Service: heady-brain
# Operation: /api/inference
# Filter by request ID or domain

# See:
# - heady-brain call OpenAI API (200ms)
# - heady-memory retrieve context (50ms)
# - heady-embed generate embeddings (100ms)
# - postgres store result (20ms)
# Total: 370ms
```

---

## Emergency Procedures

### Circuit Breaker Open (Fail Fast)

```bash
# If upstream service (OpenAI) failing:
# Circuit breaker opens to prevent cascading failures

# Service returns 503 immediately
# Does not queue or retry indefinitely

# To override (dangerous!)
curl -X POST http://localhost:8000/admin/circuit-breaker/reset

# Then monitor closely
kubectl logs -f deployment/heady-brain
```

### Fallback to Cached Responses

```bash
# If model API down, can serve cached results
# Requires caching enabled

# Check cache hit rate
kubectl logs deployment/heady-brain | grep "cache_hit_rate"
# If 0%: no cache, responses will fail

# Enable cache (requires config change)
# Edit: config.yaml → cache_enabled: true
kubectl apply -f k8s/heady-brain-configmap.yaml
kubectl rollout restart deployment/heady-brain

# Now similar requests served from cache instantly
```

---

## Performance Tuning

### Optimize for Latency

```bash
# Goals: p99 latency < 5s
# Current: p99 = 12s

# Tuning options:
# 1. Batch smaller prompts (5K tokens → 2K)
# 2. Use faster model (gpt-4-turbo instead of gpt-4)
# 3. Increase GPU allocation (4 → 8 GPUs per pod)
# 4. Implement prompt caching (repeat queries)

# Test change: reduce prompt size
# Edit: services/heady-brain/config.yaml
# max_prompt_tokens: 50000 → 20000

# Deploy and measure
kubectl apply -f k8s/heady-brain-configmap.yaml
kubectl rollout restart deployment/heady-brain
# Wait 30 minutes, check Grafana for latency improvement
```

---

## Related Documents

- ADR-001: Microservice architecture
- Architecture: `docs/adr/001-microservice-architecture.md`
- Error codes: `docs/ERROR_CODES.md`
- Incident playbooks: `docs/playbooks/`

