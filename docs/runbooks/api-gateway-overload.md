# Incident Playbook: API Gateway Overloaded / Rate Limiting All Requests

**Severity:** HIGH
**Impact:** All external API access degraded. Developers see 429 responses. Internal services may be affected if routing through gateway.

## Symptoms

- High 429 response rate on api-gateway
- Grafana alert: request queue depth > fib(10)=55
- Bulkhead pool saturated (fib(9)=34 concurrent / fib(10)=55 queued)
- P99 latency > φ³≈4.236 seconds

## Diagnosis Steps

1. **Check gateway health**

```bash
curl -s http://localhost:3390/health | jq .
```

2. **Check rate limiter state**

```bash
curl -s http://localhost:3390/api/rate-limiter/stats | jq .
```

3. **Check bulkhead pool utilization**

```bash
curl -s http://localhost:3390/api/bulkhead/stats | jq .
```

4. **Check upstream service health**

```bash
curl -s http://localhost:3390/api/routes | jq ".routes[] | {path, upstream, healthy}"
```

5. **Check for DDoS indicators**

```bash
gcloud run services logs read api-gateway --region=us-east1 --limit=100 | grep -c "rate_limited"
```

## Remediation

- If DDoS: Enable Cloudflare Under Attack mode. Add aggressive rate limiting at edge
- If legitimate traffic spike: Scale Cloud Run max-instances to next Fibonacci step. Increase bulkhead pool
- If single user/key causing load: Temporarily reduce their rate limit. Investigate usage pattern
- If upstream slow: Circuit breakers should isolate slow upstreams. Check individual service health
- If configuration error: Verify rate limit tiers: fib(9)=34/min anon, fib(11)=89/min auth, fib(13)=233/min enterprise

## Rollback

```bash
Scale down to previous revision: gcloud run services update-traffic api-gateway --to-revisions=PREVIOUS_REVISION=100
```

## Post-Incident Review

- [ ] Review: Are rate limits correctly tiered for current user base?
- [ ] Consider: Should we add request prioritization (CSL-weighted)?
- [ ] Update load testing scripts to simulate this traffic pattern
- [ ] Verify Cloudflare WAF rules are up to date

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
