---
name: heady-ops
description: "DevOps, deployment, health monitoring, and system operations using Heady™ Operations services. Use this skill when the user asks about system health, deployment, maintenance, service status, monitoring, cleanup, or any operational task. Triggers on: 'deploy', 'health check', 'system status', 'is everything running', 'maintenance', 'cleanup', 'service health', 'monitor', 'ops', 'devops', 'uptime', 'telemetry', 'logs'. Always use this skill for any operational, deployment, monitoring, or maintenance task — it connects to heady_deploy, heady_health, heady_ops, heady_maintenance, heady_maid, heady_telemetry, heady_edge_ai, heady_search, and heady_template_stats MCP tools."
---

# Heady™ Ops Skill

You are connected to the Heady™ Operations tier — monitoring, deployment, maintenance, and system health for the entire platform.

## Available MCP Tools

### heady_health
Check the health of all Heady services. Start here for any operational question.

```json
{
  "services": ["heady-brain", "heady-memory", "heady-guard"],
  "verbose": true
}
```

**When to use:** First tool to call when checking system status. Shows which services are up/down.

### heady_deploy
Deploy code to production with φ-scaled rollout (canary → staged → full).

```json
{
  "service": "heady-brain",
  "version": "5.1.0",
  "strategy": "canary",
  "rollout_percent": 10
}
```

### heady_ops
General operations commands — restart services, rotate logs, update configs.

```json
{
  "action": "restart",
  "service": "heady-memory",
  "reason": "Memory leak detected"
}
```

### heady_maintenance
Schedule or execute maintenance windows — database migrations, cache clears, index rebuilds.

```json
{
  "action": "schedule",
  "type": "database_migration",
  "window_start": "2026-03-10T02:00:00Z",
  "duration_minutes": 30
}
```

### heady_maid
System cleanup — garbage collection, temp file removal, log rotation, stale session cleanup.

```json
{
  "tasks": ["temp_files", "stale_sessions", "old_logs"],
  "dry_run": true
}
```

### heady_telemetry
Platform telemetry — request counts, latency percentiles, error rates, resource usage.

```json
{
  "metrics": ["requests", "latency_p95", "error_rate"],
  "period": "1h",
  "service": "heady-brain"
}
```

### heady_edge_ai
Edge AI operations — manage Cloudflare Workers AI for embeddings, classification at the edge.

```json
{
  "action": "status",
  "workers": ["embed-worker", "classify-worker"]
}
```

### heady_search
Discover system capabilities — search across all tools, services, and documentation.

```json
{
  "query": "How do I check memory usage?",
  "scope": "tools"
}
```

### heady_template_stats
Template usage statistics — which templates are used, performance metrics.

```json
{}
```

## Operational Workflows

### Daily Health Check
1. `heady_health` — Check all services
2. `heady_telemetry` — Review key metrics
3. `heady_maid` (dry_run) — Preview cleanup needs
4. Report status summary

### Deployment
1. `heady_health` — Pre-deploy health check
2. `heady_deploy` — Canary deploy (10%)
3. `heady_telemetry` — Monitor for errors
4. `heady_deploy` — Staged rollout (50%)
5. `heady_deploy` — Full rollout (100%)
6. `heady_health` — Post-deploy verification

### Incident Response
1. `heady_health` — Identify affected services
2. `heady_telemetry` — Check error rates and latency spikes
3. `heady_ops` — Restart affected services if needed
4. `heady_search` — Find relevant runbooks
5. Report incident summary with timeline

### Maintenance Window
1. `heady_maintenance` — Schedule window
2. `heady_health` — Pre-maintenance baseline
3. Execute maintenance tasks
4. `heady_health` — Post-maintenance verification
5. `heady_maid` — Cleanup

## Service Port Map

| Service | Port | Status Tool |
|---------|------|-------------|
| MCP Server | 3310 | heady_health |
| Brain | 3311 | heady_health |
| Memory | 3312 | heady_health |
| Auth | 3314 | heady_health |
| API Gateway | 3315 | heady_health |
| Guard | 3329 | heady_health |
| HCFP | 3330 | heady_hcfp_status |
| Edge AI | 3331 | heady_edge_ai |

## Connection

Ops tools connect through the MCP server (port 3310) to upstream services. Use `heady_health` to verify connectivity.
