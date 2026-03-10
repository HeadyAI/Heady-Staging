# Heady™ Incident Response Playbook

> For all 50+ Heady services. Each section: Symptoms → Diagnosis → Remediation → Post-Incident.

---

## 1. Auth Service Down (`auth.headysystems.com`)

### Symptoms

- All 9 sites show "Sign In" instead of authenticated state
- `/session` endpoint returns 502/503
- CloudRun logs show container crash loops

### Diagnosis

```bash
gcloud run services describe heady-auth --region=us-central1 --format="value(status.conditions)"
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="heady-auth"' --limit=20
```

### Remediation

1. Check Firebase Auth status: <https://status.firebase.google.com/>
2. If container crash: `gcloud run deploy heady-auth --image=us-docker.pkg.dev/gen-lang-client-0920560496/heady/auth:latest --region=us-central1`
3. If JWT_SECRET mismatch: Verify secret in Google Secret Manager matches deployed config

### Post-Incident

- Verify logins work across all 9 domains
- Check session cookie propagation with dev tools

---

## 2. Brain/Inference Timeout (HEADY-BRAIN-002)

### Symptoms

- Chat responses show "Thinking…" spinner indefinitely
- `/api/brain/chat` returns 504 after 30s
- Vector memory queries slower than 8s (Fibonacci threshold)

### Diagnosis

```bash
# Check pgvector connection pool
psql -h localhost -p 6432 -U heady_monitor pgbouncer -c "SHOW POOLS"

# Check model gateway health
curl -s https://api.headysystems.com/health | jq '.models'

# Check inference latency
curl -w "@curl-timing.txt" -o /dev/null -s https://api.headysystems.com/api/brain/health
```

### Remediation

1. If pool exhaustion: Restart PgBouncer — `systemctl restart pgbouncer`
2. If model timeout: Switch to fallback model in brain config
3. If index corruption: Rebuild HNSW index — `REINDEX INDEX CONCURRENTLY heady_vectors_hnsw_idx;`

### Post-Incident

- Monitor p99 latency for 1 hour via monitoring dashboard
- Verify embedding dimensions match (384-dim)

---

## 3. NATS JetStream Bus Failure (HEADY-BUS-001)

### Symptoms

- Events not propagating between services
- Agent swarms not coordinating
- DLQ subject accumulating messages

### Diagnosis

```bash
nats stream info HEADY
nats consumer ls HEADY
nats sub "heady.monitoring.health" --count=5
```

### Remediation

1. If NATS down: `systemctl restart nats-server`
2. If stream full: Purge old messages — `nats stream purge HEADY --keep=10000`
3. If consumer stuck: Reset consumer — `nats consumer rm HEADY <consumer-name>` then let service recreate

### Post-Incident

- Verify all consumers are healthy: `nats consumer ls HEADY`
- Check DLQ for failed messages that need manual replay

---

## 4. Website Not Rendering (HEADY-WEB-001/002)

### Symptoms

- Domain shows default CloudRun page or 404
- Site-renderer returns template errors
- Missing CSS/JS assets

### Diagnosis

```bash
# Check site-registry.json
cat src/registries/site-registry.json | jq '.sites["headyme.com"]'

# Check CloudRun service
gcloud run services describe headyme-site --region=us-central1

# Check DNS
dig headyme.com +short
```

### Remediation

1. If registry missing: Add domain entry to `site-registry.json`
2. If CloudRun down: Redeploy — `gcloud run deploy headyme-site --source .`
3. If DNS wrong: Check Cloudflare DNS → should point to CloudRun domain mapping

### Post-Incident

- Test all 9 sites respond with correct content
- Verify auth widget loads on each site

---

## 5. Saga Coordinator Compensation Loop (HEADY-AGENT-003)

### Symptoms

- User signup partially fails — Firebase account exists but no Drupal account
- Saga shows `COMPENSATING` state indefinitely
- Compensation retry count exceeds φ³ (4 attempts)

### Diagnosis

```bash
# Check saga execution state
curl -s localhost:3310/api/sagas/{sagaId} | jq '.steps'

# Check service health for each step
curl -s localhost:3310/health
```

### Remediation

1. Identify which compensations failed in saga log
2. Manually execute failed compensations (delete orphaned records)
3. Reset saga state to `COMPENSATED` or `FAILED`

### Post-Incident

- Verify no orphaned records across Firebase, pgvector, and Drupal
- Review saga step timeouts — increase if external service is slow

---

## 6. Prompt Injection Alert (HEADY-SECURITY-001)

### Symptoms

- Structured logs show `event: "injection-detected"` with `blocked: true`
- Users reporting "Input rejected" errors
- Unusual patterns in inference requests

### Diagnosis

```bash
# Search for injection events in logs
gcloud logging read 'jsonPayload.event="injection-detected"' --limit=20

# Check detection scores
grep "injection-detected" /var/log/heady/*.log | jq '.score, .categories'
```

### Remediation

1. If false positive: Adjust pattern weights in `prompt-injection-defense.js`
2. If real attack: Block source IP, audit all requests from that session
3. If extraction attempt: Verify system prompts are not in any response logs

### Post-Incident

- Review and tune injection patterns
- Add new patterns for observed attack vectors
- Check rate limit thresholds are appropriate

---

## 7. Feature Flag Rollout Issue

### Symptoms

- Users in wrong rollout bucket
- Feature visible to users who shouldn't see it
- Kill switch not taking effect

### Diagnosis

```bash
# Check flag state via API
curl -s localhost:3310/api/flags | jq '.'

# Test specific user bucketing
node -e "const ff = require('./src/scaling/feature-flags'); const s = new ff.FeatureFlagStore(); s.define({name:'test',rolloutPct:0.382}); console.log(s.isEnabled('test','user123'));"
```

### Remediation

1. If wrong rollout: `store.kill('flag-name')` to immediately disable
2. If hash collision: Check consistent hash function with test users
3. If stale state: Restart all services to pick up latest flag definitions

### Post-Incident

- Verify flag state matches expectations across all instances
- Review rollout metrics

---

*Last updated: 2026-03-09 · Maximum Potential Pass*
