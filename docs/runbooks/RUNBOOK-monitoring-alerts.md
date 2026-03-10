# Monitoring and Alerts Runbook

**Author**: Eric Haywood, HeadySystems Inc. | **Version**: 4.0.0

## Stack
- Prometheus (9090): 13s scrape interval
- Grafana (3000): Dashboards
- Alertmanager (9093): Alert routing
- HeadyHealth (3328): Service health aggregation

## Key Alerts
| Alert | Severity | Trigger | Response |
|-------|----------|---------|----------|
| ServiceDown | Critical | `up == 0` for 5min | Service Recovery Runbook |
| HighErrorRate | Critical | Error rate > 38.2% for 3min | Check logs, rollback if recent deploy |
| HighLatency | Warning | p99 > 4.236s for 5min | Check resources, scale up |
| HighMemory | Warning | Memory > 61.8% for 8min | Monitor growth, restart if leaking |
| CriticalMemory | Critical | Memory > 85.4% for 3min | Immediate restart |
| CoherenceDrift | Warning | Score < 0.809 for 5min | Check node alignment |
| CircuitBreakerOpen | Critical | Any breaker OPEN > 1min | Check failed service |

## On-Call
1. Acknowledge P1 within 5 min, P2 within 13 min
2. Follow appropriate runbook
3. Document actions in incident channel
4. Post-mortem within 24h for P1/P2
