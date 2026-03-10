# Runbook: Service Failure

## Symptom
A Heady service returns 503 or health check fails.

## Diagnosis
1. Check health endpoint: `curl http://localhost:{PORT}/health`
2. Check container logs: `docker logs heady-{service}`
3. Check resource usage: `docker stats heady-{service}`
4. Check circuit breaker status in service mesh
5. Check error codes dashboard for INFRA_4001 or INFRA_4002

## Resolution
### Container Crash
1. Restart container: `docker restart heady-{service}`
2. If persistent: check memory limits (Fibonacci-scaled: 233MB default)
3. Check for OOM: `docker inspect --format='{{.State.OOMKilled}}' heady-{service}`

### Circuit Breaker Open (INFRA_4002)
1. Wait for half-open probe (φ-backoff: attempt × φ seconds)
2. Check upstream dependency health
3. If upstream healthy: manual circuit reset via API

### Database Connection (DATA_3001)
1. Check PgBouncer pool: `docker exec heady-pgbouncer show pools`
2. Check PostgreSQL: `docker exec heady-postgres pg_isready`
3. Failover to replica if primary unresponsive

## Escalation
If unresolved after 377 seconds (fibonacci(14)), escalate to on-call.
