# Incident Response

## Severity Levels
| Level | Response | Examples |
|---|---|---|
| P0 | Immediate | Full outage, data loss |
| P1 | <30 min | MCP gateway down, key agent failure |
| P2 | <2 hours | Single agent failure |
| P3 | Next day | Cosmetic issues |

## Quick Diagnostics
```bash
curl localhost:3301/health
curl localhost:3301/health/deep | jq .
docker logs heady --tail 100
tail -100 data/logs/heady.log
```
