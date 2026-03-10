# Heady™ Security Model

**Author:** Eric Haywood | **Classification:** Internal | **Updated:** 2026-03-10

---

## 1. Authentication Flow

```
User → Firebase Auth (Google/Email/Anonymous)
  → Firebase ID Token
  → POST auth.headysystems.com/auth/session
  → auth-session-server validates with Firebase Admin SDK
  → Creates __Host-heady_session httpOnly cookie
    - SameSite=None, Secure=true, Path=/
    - Max-Age=518400 (FIB[12]=144 hours)
    - Bound to SHA-256(IP + User-Agent)
  → Propagates to *.headysystems.com subdomains
  → Other domains use relay iframe + postMessage
```

## 2. Cross-Domain Session Propagation

- Relay iframe at `auth.headysystems.com/relay`
- postMessage with session request/response (never the cookie)
- Origin whitelist: only 9 Heady domains
- CSP frame-ancestors prevents unauthorized embedding

## 3. Inter-Service Security

**HMAC-SHA256 Request Signing:**
- Signed: HTTP method, path, timestamp, body SHA-256
- Clock skew tolerance: FIB[8]=21 seconds
- Secrets rotated every FIB[11]=89 days

**mTLS via Envoy:**
- Sidecar on each service
- φ-scaled timeouts: 1.618s connect, 4.236s request
- Circuit breaker: Fibonacci thresholds (89/55/144)

## 4. Session Security

- __Host- cookie prefix (HTTPS, specific domain, no subdomain override)
- Bound to SHA-256(client_IP + User-Agent)
- Nonce-based replay detection
- Token rotation on privilege escalation
- Max lifetime: FIB[12]=144 hours

## 5. Rate Limiting (φ-scaled)

| Tier | Req/Min | Method |
|------|---------|--------|
| Anonymous | FIB[9]=34 | Per-IP |
| Authenticated | FIB[11]=89 | Per-User |
| Enterprise | FIB[13]=233 | Per-API-Key |

429 response with Retry-After using φ-backoff.

## 6. Content Security Policy

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: https:; connect-src 'self' https://*.headysystems.com
https://*.headyme.com; frame-ancestors 'self' https://*.headysystems.com;
```

Plus: X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, Referrer-Policy: strict-origin-when-cross-origin

## 7. Autonomous Agent Guardrails

**ALLOWED:** deploy, update_dependencies, generate_configs, run_tests, create_documentation, optimize_indexes  
**FORBIDDEN:** delete_data, rotate_production_secrets, modify_auth_rules, change_billing, drop_tables, modify_security_policies, access_PII

All actions logged: agent_id, action, timestamp, git_commit_hash

## 8. Secret Management

| Secret Type | Rotation Interval |
|-------------|-------------------|
| API keys | FIB[8]=21 days |
| Database passwords | FIB[10]=55 days |
| Certificates | FIB[11]=89 days |

Current: env vars. Target: Google Secret Manager with auto-rotation.

## 9. Incident Response

Detection → Containment → Eradication → Recovery → Documentation

1. Automated via Prometheus alerts + log anomaly detection
2. Revoke sessions, isolate service, activate circuit breakers
3. Patch vulnerability, rotate compromised secrets
4. Restore, verify integrity, monitor recurrence
5. Incident report with root cause analysis
