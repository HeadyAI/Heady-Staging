# Incident Playbook: Cross-Domain Authentication Breakdown

**Severity:** P1 (Critical)
**Response Time:** <5 minutes
**Resolution Time:** <20 minutes

---

## Alert: Users Cannot Authenticate

Authentication failures across multiple domains; users unable to log in or access applications

---

## Initial Triage (First 3 minutes)

### Step 1: Verify Issue Scope

```bash
# Test authentication endpoints
curl -X POST https://auth.heady.ai/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test"}'

# If: 500 or connection refused → service down
# If: 401 Unauthorized → Firebase token issue
# If: 403 Forbidden → user not in domain

# Check which domains affected
# From Slack #incidents or PagerDuty
# Is it: all domains? or specific domains?
```

### Step 2: Check Service Health

```bash
# Check auth-session-server
kubectl get pods -l app=auth-session-server
# Should show 3 Running

# Check logs
kubectl logs -f deployment/auth-session-server --tail=50

# Look for:
# - "Firebase initialization failed"
# - "Connection to postgres failed"
# - "Redis unavailable"
# - "Invalid JWT signature"
```

### Step 3: Check Dependencies

```bash
# Firebase connectivity
kubectl logs deployment/auth-session-server | grep -i firebase

# Database connectivity
kubectl logs deployment/auth-session-server | grep -i "database\|postgres"

# Cache (Redis)
kubectl logs deployment/auth-session-server | grep -i "redis"

# Relay iframe service
kubectl get pods -l app=relay-iframe
```

---

## Diagnostic Paths

### Path 1: Firebase Connection Failed

**Symptoms:**
- Error: "Firebase initialization failed"
- Service unable to verify ID tokens
- Logs: "Failed to fetch JWK" or "Invalid credentials"

**Diagnosis:**

```bash
# Check Firebase credentials
kubectl get secret firebase-service-account -o jsonpath='{.data.key}' | base64 -d | jq .

# Verify credentials are valid JSON with required fields:
# - "type": "service_account"
# - "project_id": "heady-ai-platform"
# - "private_key": "-----BEGIN PRIVATE KEY-----..."

# Check Firebase API availability
curl -I https://securetoken.google.com/heady-ai-platform/keys
# Should return: 200 OK

# Check GCP project access
gcloud auth list
gcloud config set project heady-ai-platform
gcloud services list --enabled | grep firebase
```

**Resolution:**

```bash
# Option 1: Refresh credentials (if recently rotated)
gcloud iam service-accounts keys create firebase-key.json \
  --iam-account=firebase-sa@heady-ai-platform.iam.gserviceaccount.com

kubectl create secret generic firebase-service-account \
  --from-file=key=firebase-key.json \
  --dry-run=client -o yaml | kubectl apply -f -

# Option 2: Restart auth service to reload credentials
kubectl rollout restart deployment/auth-session-server

# Option 3: Check Firebase project limits
# Firebase dashboard → Authentication → Quotas
# Is project over usage limits?
# If yes: Request quota increase
```

### Path 2: Database Connection Lost

**Symptoms:**
- Error: "User not found in domain"
- Logs: "Connection refused to postgres"
- Authentication fails even for existing users

**Diagnosis:**

```bash
# Check Postgres pod
kubectl get pods -l app=postgres

# Test Postgres directly
kubectl exec pod/postgres-0 -- \
  psql -U heady_user -d heady_db -c "SELECT 1;"

# Check if postgres-0 is Running
kubectl describe pod postgres-0 | grep -A 5 "State:"

# Check for connection errors
kubectl logs deployment/auth-session-server | grep -i "postgres\|database"
```

**Resolution:**

```bash
# Option 1: Restart Postgres
kubectl rollout restart statefulset/postgres

# Option 2: Check PgBouncer (connection pooler)
kubectl get pods -l app=pgbouncer
kubectl logs deployment/pgbouncer

# Option 3: If still failing, check network connectivity
kubectl exec pod/auth-session-server-xyz -- \
  nc -zv postgres-0.postgres.svc.cluster.local 5432
# Should output: postgres-0.postgres.svc.cluster.local (10.x.x.x) port 5432 [tcp/*] succeeded!

# Option 4: Restart auth service
kubectl rollout restart deployment/auth-session-server
```

### Path 3: Invalid Firebase Token

**Symptoms:**
- Error: "Firebase ID token signature invalid"
- Logs: "Token verification failed"
- JWK cache stale

**Diagnosis:**

```bash
# Check JWK cache age
kubectl exec pod/auth-session-server-xyz -- redis-cli
redis> GET firebase:jwks
# If null or very old: cache stale

# Check when JWK was last updated
redis> TTL firebase:jwks
# If TTL negative: key expired

# Verify Firebase JWKs are accessible
curl -s https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com | jq '.keys | length'
# Should return number of keys (e.g., 3)
```

**Resolution:**

```bash
# Option 1: Clear JWK cache (force refresh)
kubectl exec pod/auth-session-server-xyz -- redis-cli FLUSHDB

# Option 2: Restart auth service (reloads JWKs)
kubectl rollout restart deployment/auth-session-server

# Option 3: Check Firebase project settings
gcloud iam service-accounts describe \
  firebase-sa@heady-ai-platform.iam.gserviceaccount.com

# Option 4: Verify token is from correct Firebase project
# Decode token: jwt.io → check "aud" (audience) claim
# Should be: "heady-ai-platform"
```

### Path 4: Relay Iframe Down

**Symptoms:**
- Login works at first domain
- Cross-domain SSO fails
- Error: "Relay transfer failed"

**Diagnosis:**

```bash
# Check relay-iframe service
kubectl get pods -l app=relay-iframe

# Check logs
kubectl logs deployment/relay-iframe

# Test relay endpoint
curl -I http://relay.heady.ai/auth/relay.html

# Check if in whitelist
kubectl get configmap auth-domains
# Should include all registered domains
```

**Resolution:**

```bash
# Option 1: Restart relay
kubectl rollout restart deployment/relay-iframe

# Option 2: Check domain whitelist
kubectl edit configmap auth-domains
# Verify target domain is listed

# Option 3: Check CORS configuration
# relay.heady.ai must accept postMessage from all registered domains
# Edit: k8s/relay-iframe-configmap.yaml
# Update: ALLOWED_ORIGINS=[all registered domains]

# Option 4: Clear browser cache
# Users: Clear cookies, localStorage, restart browser
```

---

## Verification (After Fix)

```bash
# Step 1: Test authentication flow
curl -X POST http://localhost:8000/health
# Expected: 200 OK, "status": "healthy"

# Step 2: Test token verification
# Create test Firebase token via SDK
node -e "
const admin = require('firebase-admin');
admin.initializeApp();
admin.auth().createCustomToken('test-user').then(token => {
  console.log('Token:', token);
});
"

# Step 3: Test user can login
# Go to: https://domain-a.heady.ai
# Click login
# Enter credentials
# Expected: Redirect to dashboard

# Step 4: Test cross-domain SSO
# At domain-a: Click "Access Domain B"
# Expected: Transfer session, appear logged into domain-b

# Step 5: Monitor error rate
# Grafana → Auth Metrics → Error Rate
# Should drop to <1%
```

---

## Post-Incident

```bash
# Document timeline
# 14:32 - Alert fired: auth failures detected
# 14:35 - Diagnosed: Firebase credentials stale
# 14:40 - Fixed: Rotated credentials, restarted service
# 14:42 - Verified: Users can log in

# Notify stakeholders
# Post in #incidents: "Auth service recovered. 10 min impact. Root cause: credential rotation issue. Added alerting for future."

# Add monitoring gap if found
# Was there no alert for "Firebase connection failed"?
# Add PrometheusRule to alert on this
```

