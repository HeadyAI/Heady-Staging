# Auth System — Runbook

**Services:** auth-session-server (3380), Firebase Auth  
**Domain:** Security  

---

## Symptom: Login Failures

### Diagnosis
1. Check Firebase status: https://status.firebase.google.com/
2. Check auth-session-server health: GET https://auth.headysystems.com/health
3. Check CORS headers: browser DevTools → Network → look for preflight failures
4. Check cookie config: verify __Host-heady_session cookie attributes

### Remediation
1. If Firebase down → display maintenance page, sessions remain valid for FIB[12]=144 hours
2. If CORS failing → verify origin is in whitelist (shared/config/domains.js)
3. If cookie not setting → verify SameSite=None, Secure=true, domain matches

---

## Symptom: Session Expiry Issues

### Diagnosis
1. Check cookie Max-Age: should be FIB[12]*3600 = 518400 seconds (144 hours)
2. Check session binding: IP+User-Agent hash must match
3. Check if user changed networks (IP changed, session invalidated)

### Remediation
1. If premature expiry → verify server clock sync (NTP)
2. If IP mismatch → gracefully prompt re-authentication
3. If refresh failing → check /auth/refresh endpoint logs

---

## Symptom: Cross-Domain Auth Broken

### Diagnosis
1. Check relay iframe: https://auth.headysystems.com/relay must load on all 9 domains
2. Check postMessage origins: must include all 9 Heady domains
3. Check third-party cookie policy: some browsers block SameSite=None cookies

### Remediation
1. If iframe blocked → verify Content-Security-Policy frame-ancestors includes all domains
2. If postMessage rejected → verify origin whitelist in relay iframe code
3. If cookies blocked → implement token-based fallback via URL parameters (short-lived, one-time)
