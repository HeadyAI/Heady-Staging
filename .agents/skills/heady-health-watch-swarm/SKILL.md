---
name: heady-health-watch-swarm
description: Use for continuous monitoring and auto-remediation across the entire Heady infrastructure — 78 repos, 10 domains, 48 Cloudflare zones, 4 GPU runtimes. Implements HealthWatchSwarm from §33.4. Keywords include health monitoring, infrastructure watch, auto-remediate, domain check, repo health, uptime, SLA.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: HealthWatchSwarm
  absorption_source: "§33.4 — Autonomous Maintenance Swarms"
  super_prompt_section: "§33.4"
---

# Heady™ Health Watch Swarm

## When to Use This Skill

Use this skill when:
- Running infrastructure health checks across all Heady services
- Auto-remediating degraded services without human intervention
- Monitoring domain uptime and SSL certificate status
- Checking GPU runtime connectivity and task stream health

## Monitoring Matrix

| Target | Count | Check |
|---|---|---|
| Repositories | 78 | CI status, security alerts, stale PRs |
| Domains | 10 | HTTP response, SSL expiry, cf-ray headers |
| Cloudflare Zones | 48 | WAF rules, rate limits, cache hit ratio |
| GPU Runtimes | 4 | Tailscale connectivity, VRAM usage, heartbeat |
| Services | 12 | Health endpoint, response time, error rate |

## Auto-Remediation Actions

| Trigger | Action | Escalation |
|---|---|---|
| Domain 5xx | Restart Cloud Run revision | Page Eric if persists > 5 min |
| SSL expiry < 14 days | Trigger renewal via Cloudflare | Alert if renewal fails |
| GPU heartbeat stale > 60s | XAUTOCLAIM + restart worker | Alert if > 2 GPUs down |
| CI pipeline red | Revert last commit, open issue | Notify Eric |
| Error rate > 15% | Circuit breaker OPEN | Investigate root cause |

## Instructions

### Running Health Check Cycle

1. Scan all 10 domains for HTTP 200 + cf-ray header
2. Check GitHub Actions status across tier-1 repos
3. Verify Neon Postgres connection pool < fib(7)
4. Redis PING + check worker registry keys
5. Qdrant: verify 3 collections healthy
6. GPU cluster: scan Redis worker:* keys for heartbeats
7. Aggregate health score using φ-weighted composite
8. Auto-remediate any degraded components
9. Report to governance log

## Output Format

- Health Score (0-100, φ-weighted)
- Per-Component Status Table
- Remediation Actions Taken
- Escalation Alerts Fired
