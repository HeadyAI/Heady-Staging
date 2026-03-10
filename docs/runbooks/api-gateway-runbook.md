# API Gateway Runbook

**Service:** api-gateway | **Port:** 3370

## Health Check
```bash
curl http://localhost:3370/health
```

## Common Issues

### 1. Upstream Service Timeout
**Symptom:** 504 errors on proxied requests
**Cause:** Downstream service unhealthy or slow
**Resolution:**
1. Check downstream health: `curl http://localhost:<port>/health`
2. Review circuit breaker state in logs
3. If service is down, restart: `docker-compose restart <service>`
4. Circuit breaker will auto-recover after PHI_TIMING.PHI_6 = 17 944ms

### 2. Rate Limit Exceeded
**Symptom:** 429 responses
**Cause:** Client exceeding tier limit
**Resolution:**
1. Check tier: anonymous=fib(9)=34, authenticated=fib(11)=89, enterprise=fib(13)=233
2. Verify authentication — unauthenticated gets lowest tier
3. If legitimate load: upgrade tier or distribute across API keys

### 3. CORS Rejection
**Symptom:** Preflight fails, browser shows CORS error
**Cause:** Origin not in canonical whitelist
**Resolution:**
1. Verify origin is one of the 9 Heady domains
2. Check `shared/heady-domains.js` for canonical list
3. Add new domain to `HEADY_DOMAINS` if approved

## Scaling
- Horizontal: Add instances behind Envoy load balancer
- Vertical: Increase container memory (current: 512MB)
