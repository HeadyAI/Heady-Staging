# Runbook: auth-session-server (Authentication Service)

**Service:** JWT Issuance & Session Management
**Language:** Node.js/TypeScript
**On-Call:** Check PagerDuty
**Slack:** #heady-auth
**Repo:** https://github.com/heady-ai/auth-session-server

---

## Overview

auth-session-server validates Firebase ID tokens, creates HEADY session JWTs, and manages cross-domain SSO via relay iframe. Critical for all user authentication across 60+ domains.

### Service Tier
**Tier 1 (Critical):** Authentication unavailable = no access to any domain

### Dependencies
- **Upstream:** api-gateway, relay-iframe
- **Downstream:** Firebase Admin SDK (Google Cloud), postgres (user lookup), redis (session cache), permission-guard
- **External:** Firebase (Google-managed), Google Secret Manager

---

## Key Metrics

| Metric | Alert | Target |
|--------|-------|--------|
| Auth Error Rate (5xx) | >2% | <0.5% |
| Token Verification Latency p99 | >500ms | <200ms |
| Session Cache Hit Rate | <80% | >90% |
| Cross-domain SSO Success Rate | <95% | >99% |
| Firebase API Failures | >5 in 5min | 0 |

### Health Check

```bash
curl http://localhost:8000/health
# Expected: { "status": "healthy", "firebase": "connected", "database": "ok" }
```

---

## Common Issues & Resolutions

### Issue 1: Firebase ID Token Signature Invalid (401)

**Error:** `HEADY-AUTH-003 | Firebase ID token signature invalid`

**Diagnosis:**

```bash
# Step 1: Check Firebase SDK initialization
kubectl logs deployment/auth-session-server | grep "firebase"
# Should see: "Firebase initialized" or "Initialized: OK"

# Step 2: Check JWK cache age
kubectl exec pod/auth-session-server-xyz -- redis-cli
redis> GET firebase:jwks
# Should return JWK set; if null/empty → cache stale

# Step 3: Check Firebase credentials
kubectl get secret firebase-service-account -o jsonpath='{.data.key}' | base64 -d | head -10
# Should show JSON with "private_key" and "client_email"
```

**Resolution:**

```bash
# Option 1: Refresh JWK cache (immediate)
curl -X POST http://localhost:8000/admin/cache/refresh-jwks

# Option 2: Clear Redis cache (forces refetch)
kubectl exec pod/auth-session-server-xyz -- redis-cli FLUSHDB
kubectl rollout restart deployment/auth-session-server

# Option 3: Verify Firebase credentials (if cache refresh fails)
# Check Secret Manager:
gcloud secrets versions access latest --secret=firebase-service-account
# Should contain valid credentials with kid matching tokens

# Option 4: Update Firebase SDK
# Possible firebase-admin SDK bug; upgrade to latest
npm update firebase-admin
# Rebuild and deploy
```

### Issue 2: User Not Found in Domain (403)

**Error:** `HEADY-AUTH-004 | User not found in domain`

**Diagnosis:**

```bash
# Step 1: Check user exists in Firebase
gcloud auth list
# Should show authenticated user

# Step 2: Check user in database
kubectl port-forward svc/postgres 5432:5432
psql -h localhost -U heady_user -d heady_db
SELECT * FROM users WHERE uid = 'firebase-uid-123';
# If empty → user not enrolled in domain

# Step 3: Check domain_id in request header
kubectl logs deployment/auth-session-server | grep "domain_id"
# Should show: domain_id: customer-a
```

**Resolution:**

```bash
# Option 1: Admin enrolls user in domain (correct action)
# User authenticates successfully with Firebase
# But they're not registered in this domain
# Admin must: Dashboard → Users → Add [user@email.com] to domain

# Option 2: User already enrolled, check database
# Query: SELECT * FROM users WHERE uid = 'xxx' AND domain_id = 'yyy'
# If returns user but still error: cache stale

# Option 3: Clear user cache
curl -X POST http://localhost:8000/admin/cache/clear-user/firebase-uid-123
# Or restart service
kubectl rollout restart deployment/auth-session-server

# Option 4: Check domain name
# User enrolled in 'customer-a' but request has 'customer_a'
# domain_id must exactly match (case-sensitive, no underscore)
```

### Issue 3: Cross-Domain SSO Relay Failure (401)

**Error:** Session transfer fails between domains

**Diagnosis:**

```bash
# Step 1: Check relay-iframe service
kubectl get pods -l app=relay-iframe
# Should be Running

# Step 2: Check relay endpoint
curl -X POST http://localhost:8001/auth/bridge/transfer \
  -H "Content-Type: application/json" \
  -d '{"firebaseIdToken":"...","targetDomain":"https://..."}'
# Should return: { "success": true }

# Step 3: Check Firebase token validity
# Log in user at domain-a
# Get token from browser dev tools → Application → Cookies → heady_session
# Decode: jwt.io → check exp claim
# If exp in past → token expired

# Step 4: Check origin validation
kubectl logs deployment/auth-session-server | grep "postMessage"
# Should see: "Origin validated: https://domain-a.heady.ai"
```

**Resolution:**

```bash
# Option 1: Retry SSO flow
# User clicks "Access domain-b" again
# If 50% success rate: timing issue (token expiring mid-transfer)

# Option 2: Increase token TTL (short-term)
# Edit: config.yaml → token_ttl: 3600 → 7200 (1 hour → 2 hours)
# More forgiving for users with slow networks

# Option 3: Verify relay-iframe health
kubectl logs -f deployment/relay-iframe
# Should see: "Connected to nats://..." and "Listeners ready"

# Option 4: Check domain whitelist
kubectl get configmap auth-domains
# Should list: customer-a, customer-b, ...
# If target domain not listed: add it
kubectl patch configmap auth-domains -p '{"data":{"domains":"[\"customer-a\",\"customer-b\",\"new-domain\"]"}}'
kubectl rollout restart deployment/auth-session-server

# Option 5: Test with curl (debug)
curl -v -X POST http://localhost:8001/auth/bridge/transfer \
  -H "Origin: https://customer-a.heady.ai" \
  -H "Content-Type: application/json" \
  -d '{"targetDomain":"https://customer-b.heady.ai"}'
# Check: 200 OK vs 403 Forbidden vs 500 Error
```

### Issue 4: Session Cache Inconsistency (500)

**Symptoms:**
- Authentication succeeds but permission check fails
- User profile doesn't load
- Symptoms appear after domain cache expires

**Diagnosis:**

```bash
# Step 1: Check cache TTL
kubectl logs deployment/auth-session-server | grep "cache_ttl"
# Default: 3600s (1 hour)

# Step 2: Check cache values
kubectl exec pod/auth-session-server-xyz -- redis-cli
redis> KEYS session:*
redis> GET session:user-id-123-domain-a
# Should return JSON with user permissions

# Step 3: Compare with database
psql -h postgres
SELECT * FROM users WHERE id = '123' AND domain_id = 'domain-a';
# Compare roles and permissions with cached value

# Step 4: Check for cache update events
kubectl logs deployment/auth-session-server | grep "cache_invalidate"
# Should see updates when user roles change
```

**Resolution:**

```bash
# Option 1: Clear user cache
curl -X POST http://localhost:8000/admin/cache/clear-user/user-123

# Option 2: Reduce cache TTL (more fresh but more database load)
# Edit: config.yaml → session_cache_ttl: 3600 → 600 (1 hour → 10 minutes)
# Tradeoff: fresher data but 6x more database queries

# Option 3: Add event-driven cache invalidation
# When user role changes, publish event → cache cleared
# Requires: NATS subscription in auth-session-server
# See: services/auth-session-server/src/events.ts

# Option 4: Restart service to clear all cache
kubectl rollout restart deployment/auth-session-server
# Wait 1 minute for pod startup
```

---

## Scaling & Capacity

### Handle High Login Volume

```bash
# If login spike (black Friday, product launch):
# Current: 3 replicas, 1000 logins/min
# Target: 10,000 logins/min

# Scale up
kubectl scale deployment auth-session-server --replicas=10

# Verify scaling
kubectl get pods -l app=auth-session-server
# Should see 10 pods Runn ing in <1 minute

# Monitor load balancing
kubectl logs -f deployment/auth-session-server | grep "request_count"
# Should see distributed across pods

# Scale back down after peak
kubectl scale deployment auth-session-server --replicas=3
```

---

## Deployment

### Deploy New Version

```bash
docker build -t auth-session-server:2.0.0 .
docker tag auth-session-server:2.0.0 gcr.io/heady-ai/auth-session-server:2.0.0
docker push gcr.io/heady-ai/auth-session-server:2.0.0

# Test in staging
kubectl --context=staging set image deployment/auth-session-server \
  auth-session-server=gcr.io/heady-ai/auth-session-server:2.0.0

# Monitor staging logins
kubectl --context=staging logs -f deployment/auth-session-server

# Canary (10% production)
kubectl set image deployment/auth-session-server \
  auth-session-server=gcr.io/heady-ai/auth-session-server:2.0.0 \
  --record

# Wait 15 minutes → if no errors → complete rollout
# Monitor: Error rate, Auth latency, Session creation success
```

---

## Observability

### Check Auth Performance

```bash
# Login success rate
kubectl logs deployment/auth-session-server | grep "auth_result" | grep "success" | wc -l
# Divide by total: success_rate = success_count / total_count

# Auth latency
kubectl logs deployment/auth-session-server | grep "duration_ms" | tail -20
# Look for: duration_ms: 145, 203, 89, ... (should be <500ms)

# Firebase API calls
kubectl logs deployment/auth-session-server | grep "firebase_api" | tail -20
# Check: calls per second, error rate
```

---

## Related Documents

- Security Model: `docs/SECURITY_MODEL.md` (Authentication section)
- ADR-004: Firebase authentication architecture
- ADR-010: Cross-domain SSO relay iframe

