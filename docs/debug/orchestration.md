# DEBUG Guide: Orchestration Domain

## Services

- `heady-soul (3360)`
- `heady-conductor (3361)`
- `heady-orchestration (3362)`
- `auto-success-engine (3363)`
- `hcfullpipeline-executor (3364)`
- `heady-chain (3365)`
- `prompt-manager (3366)`

## Health Check

```bash
curl -s http://localhost:3361/health | jq .
```

## Common Failure Modes

### HCFP pipeline stuck at stage N

**Diagnosis:** Stage handler failed or dependency service unavailable.

**Fix:** Check hcfp-runner logs for stage error. Each stage has independent circuit breaker. Failed stages retry with φ-backoff.

### Conductor task routing returns "no suitable node"

**Diagnosis:** CSL matching found no agent with sufficient alignment (below phiThreshold(1)≈0.691).

**Fix:** Check available nodes in conductor pool. Lower alignment threshold or add specialized agents.

### Saga compensation fails to rollback

**Diagnosis:** Compensation handler threw an error or target service unreachable.

**Fix:** Check saga-coordinator dead letter queue. Manual compensation may be needed. Review saga log for failed step.

## Environment Variables

- `NATS_URL`
- `PIPELINE_TIMEOUT_MS`

## Debug Commands

```bash
curl -s http://localhost:3361/health | jq .
curl -s http://localhost:3361/api/conductor/pool | jq .  # Active node pool
curl -s http://localhost:3364/api/pipeline/status | jq .  # Pipeline status
```

## Log Locations

- Cloud Run: gcloud run services logs read heady-conductor --region=us-east1

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
