# DEBUG Guide: Agents Domain

## Services

- `heady-bee-factory (3330)`
- `heady-hive (3331)`
- `heady-federation (3332)`

## Health Check

```bash
curl -s http://localhost:3330/health | jq .
```

## Common Failure Modes

### Agent spawn fails with "pool exhausted"

**Diagnosis:** Bulkhead limit reached (fib(9)=34 concurrent agents).

**Fix:** Check active agent count. Expired agents should auto-cleanup after φ-TTL. If stuck, force cleanup via /api/agents/cleanup.

### Swarm consensus timeout

**Diagnosis:** Too many agents disagreeing or network partition between hive nodes.

**Fix:** Check consensus threshold (needs phiThreshold(2)≈0.809 agreement). Reduce swarm size or increase timeout to fib(8)=21 seconds.

### Federation cross-hive message loss

**Diagnosis:** NATS JetStream consumer lag or partition.

**Fix:** Check NATS consumer status: nats consumer info HEADY federation. Verify JetStream is healthy.

## Environment Variables

- `NATS_URL`
- `AGENT_MAX_CONCURRENT`
- `AGENT_TTL_MS`

## Debug Commands

```bash
curl -s http://localhost:3330/health | jq .
curl -s http://localhost:3330/api/agents/active | jq .
nats consumer info HEADY agents  # Check NATS consumer
```

## Log Locations

- Cloud Run: gcloud run services logs read heady-bee-factory --region=us-east1

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
