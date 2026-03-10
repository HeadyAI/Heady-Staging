# Incident Playbook: heady-brain Returns 503 Service Unavailable

**Severity:** CRITICAL
**Impact:** All inference requests fail. Users see errors across all 9 websites.

## Symptoms

- API gateway returns 502/503 for /api/infer endpoints
- Grafana alert: heady-brain error rate > phiThreshold(3)≈0.882
- NATS JetStream consumer lag on heady.inference.* subjects

## Diagnosis Steps

1. **Check Cloud Run instance status**

```bash
gcloud run services describe heady-brain --region=us-east1 --format="value(status.conditions)"
```

2. **Check health endpoint**

```bash
curl -s https://heady-brain-HASH-ue.a.run.app/health | jq .
```

3. **Check pgvector connection**

```bash
psql $DATABASE_URL -c "SELECT 1;"
```

4. **Check NATS JetStream**

```bash
nats server check jetstream
```

5. **Check LLM provider status**

```bash
curl -s http://localhost:3313/api/providers | jq ".providers[] | {name, status, circuitState}"
```

6. **Review recent logs**

```bash
gcloud run services logs read heady-brain --region=us-east1 --limit=50 --format=json | jq ".[].textPayload"
```

## Remediation

- If pgvector is down: Restart Cloud SQL instance, verify PgBouncer pool recovery
- If all LLM providers are down: Circuit breakers will auto-reset after fib(7)=13s half-open. If persistent, check API keys in Secret Manager
- If OOM killed: Scale Cloud Run memory to next Fibonacci step (current × φ). Set min-instances=2
- If NATS is down: Check NATS cluster health. Restart NATS pods. Messages are durable in JetStream
- If all checks pass: Force redeploy with fresh instances: gcloud run deploy heady-brain --region=us-east1 --image=LATEST

## Rollback

```bash
gcloud run services update-traffic heady-brain --to-revisions=PREVIOUS_REVISION=100 --region=us-east1
```

## Post-Incident Review

- [ ] Document timeline in docs/incidents/YYYY-MM-DD-heady-brain-503.md
- [ ] Review: Was the circuit breaker threshold correct? Should we adjust fib(11)=89 to fib(12)=144?
- [ ] Update Grafana alert thresholds if false positive
- [ ] Add regression test to chaos-engineering suite

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
