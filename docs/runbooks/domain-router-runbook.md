# Domain Router Runbook

**Service:** domain-router | **Port:** 3366

## Health Check
```bash
curl http://localhost:3366/health
```

## Common Issues

### 1. Route Verification Failure
**Symptom:** `valid: false` responses from `/verify-route`
**Cause:** Destination not in canonical domain registry
**Resolution:**
1. Check `shared/heady-domains.js` for registered domains
2. Verify URL format: must be `https://<domain>/<path>`
3. Confirm domain is one of the 9 canonical Heady domains

### 2. Auth Handoff Failure
**Symptom:** Relay code rejected at auth service
**Cause:** Code expired (TTL: 11 090ms) or already consumed
**Resolution:**
1. Check relay code TTL: PHI_TIMING.PHI_5 = 11 090ms
2. Ensure code is consumed within TTL
3. Check lockout status: max fib(6) = 8 attempts before lockout
4. Lockout duration: PHI_TIMING.PHI_7 = 29 034ms

### 3. Navigation Cache Stale
**Symptom:** Outdated navigation manifest
**Cause:** Cache TTL not expired
**Resolution:**
1. Cache TTL: PHI_TIMING.PHI_7 = 29 034ms
2. Wait for TTL or restart service to clear cache
