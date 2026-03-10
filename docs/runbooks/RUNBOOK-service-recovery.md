# Service Recovery Runbook

**Author**: Eric Haywood, HeadySystems Inc. | **Version**: 4.0.0

## Severity Classification
- **P1 (Critical)**: Service unavailable, users impacted. Response: 5 min.
- **P2 (High)**: Service degraded. Response: 13 min.
- **P3 (Warning)**: Performance degradation. Response: 34 min.
- **P4 (Info)**: Anomaly, no user impact. Response: 89 min.

## Single Service Recovery
1. Check health: `curl -s http://<service>:<port>/healthz | jq .`
2. Check circuit breaker: Opens after fib(5)=5 consecutive failures
3. Review structured JSON logs: `docker logs <container> --tail 100 | jq 'select(.level == "error")'`
4. Restart service: `docker restart <container>` or Cloud Run redeploy
5. Verify recovery across all three probes (liveness, readiness, startup)
6. Monitor for phi-cubed minutes (~4.2 min) to confirm stability

## Multi-Service Cascade Recovery
Recover in ring order:
1. Central Hub: HeadySoul (3310)
2. Inner Ring: HeadyBrains (3311), HeadyConductor (3312), HeadyVinci (3313)
3. Infrastructure: Database, event bus, cache
4. Middle Ring: Execution nodes
5. Outer Ring + Governance

## Database Connection Recovery
```bash
psql -h localhost -p 6432 pgbouncer -c "SHOW POOLS;"
psql -h localhost -p 6432 pgbouncer -c "KILL heady;"
psql -h localhost -p 6432 pgbouncer -c "RESUME heady;"
```

## Escalation
- P1: Escalate after 13 min
- P2: Escalate after 34 min
- P3: Escalate after 89 min
