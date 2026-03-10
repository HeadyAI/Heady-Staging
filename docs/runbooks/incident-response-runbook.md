# Incident Response Runbook

## Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| P0 | Complete outage | < 5 min | All services down |
| P1 | Major degradation | < 13 min (fib(7)) | Auth service down |
| P2 | Minor degradation | < 34 min (fib(9)) | Analytics delayed |
| P3 | Cosmetic/minor | < 89 min (fib(11)) | Dashboard slow |

## Step 1: Assess

```bash
# Check all service health
for port in 3360 3361 3362 3363 3364 3365 3366 3370; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r .status)"
done
```

## Step 2: Isolate

1. Identify failing service from health checks
2. Check logs: `docker-compose logs <service> --tail=100`
3. Check circuit breaker state in structured logs
4. If cascading: check API gateway for upstream failures

## Step 3: Mitigate

### Service Down
```bash
docker-compose restart <service>
```
Wait PHI_TIMING.PHI_5 = 11 090ms for health check to stabilize.

### Database Connection Issues
```bash
docker-compose restart postgres
```
Wait PHI_TIMING.PHI_7 = 29 034ms for connection pool recovery.

### Rate Limit Storm
1. Temporarily increase limits in API gateway config
2. Identify source of excess traffic
3. Add source to deny list if malicious

## Step 4: Recover

1. Verify all services healthy via health endpoints
2. Check Grafana dashboards for anomalies
3. Review structured logs for error patterns
4. Document incident in post-mortem

## Step 5: Post-Mortem

Template:
- **What happened?**
- **Timeline** (with φ-derived checkpoints)
- **Root cause**
- **Impact** (users affected, duration)
- **Resolution**
- **Action items** (prevent recurrence)
