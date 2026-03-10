# DEBUG Guide: Monitoring Domain

## Services

- `heady-health (3370)`
- `heady-eval (3371)`
- `heady-maintenance (3372)`
- `heady-testing (3373)`

## Health Check

```bash
curl -s http://localhost:3370/health | jq .
```

## Common Failure Modes

### Health check cascade — all services report unhealthy

**Diagnosis:** Usually a shared dependency failure (pgvector, NATS, or DNS).

**Fix:** Check shared infrastructure first. pgvector: psql connection. NATS: nats server check. DNS: dig headysystems.com.

### Drift detector fires false positives

**Diagnosis:** Embedding distribution shifted due to new content ingestion.

**Fix:** Check drift threshold (phiThreshold(2)≈0.809). If content was intentionally added, reset drift baseline.

### Grafana dashboards show gaps in metrics

**Diagnosis:** Prometheus scrape target unreachable or OpenTelemetry collector down.

**Fix:** Check Prometheus targets: curl http://localhost:9090/api/v1/targets. Verify OTEL collector is running.

## Environment Variables

- `PROMETHEUS_URL`
- `GRAFANA_URL`
- `OTEL_EXPORTER_ENDPOINT`

## Debug Commands

```bash
curl -s http://localhost:3370/health | jq .
curl -s http://localhost:3370/api/health/all | jq .  # All service health
curl -s http://localhost:9090/api/v1/targets | jq .status
```

## Log Locations

- Cloud Run: gcloud run services logs read heady-health --region=us-east1
- Prometheus: /var/log/prometheus/prometheus.log

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
