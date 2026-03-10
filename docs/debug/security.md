# DEBUG Guide: Security Domain

## Services

- `heady-guard (3340)`
- `heady-security (3341)`
- `heady-governance (3342)`
- `secret-gateway (3343)`
- `auth-session-server (3350)`

## Health Check

```bash
curl -s http://localhost:3350/health | jq .
```

## Common Failure Modes

### Firebase ID token validation fails

**Diagnosis:** Firebase public keys expired or clock skew.

**Fix:** Firebase Admin SDK auto-refreshes keys. Check NTP sync. Verify FIREBASE_PROJECT_ID matches.

### __Host-heady_session cookie not set

**Diagnosis:** Cookie requires Secure + Path=/ + no Domain attribute. Fails on HTTP.

**Fix:** Ensure HTTPS termination. Check Set-Cookie header for __Host- prefix compliance. No domain attribute allowed.

### Cross-domain auth relay fails

**Diagnosis:** Origin not in allowedOrigins list or iframe blocked by CSP.

**Fix:** Check host-cookie-binder.js ALLOWED_ORIGINS. Verify frame-ancestors CSP directive includes auth.headysystems.com.

### Secret rotation fails

**Diagnosis:** Secret Manager IAM permissions or φ-rotation interval misconfigured.

**Fix:** Check IAM: gcloud secrets get-iam-policy <secret>. Rotation intervals: fib(8)=21 days (API keys), fib(11)=89 days (certificates).

## Environment Variables

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT`
- `SECRET_MANAGER_PROJECT`

## Debug Commands

```bash
curl -s http://localhost:3350/health | jq .
curl -s http://localhost:3340/api/guard/status | jq .
gcloud secrets list --project=gen-lang-client-0920560496
```

## Log Locations

- Cloud Run: gcloud run services logs read auth-session-server --region=us-east1

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
