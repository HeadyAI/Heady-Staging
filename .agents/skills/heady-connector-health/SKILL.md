---
name: heady-connector-health
description: Use when monitoring the health and availability of all 89+ built-in connectors, MCP servers, and dynamically generated integrations. Implements pulse checks, auto-healing, and dynamic regeneration for degraded connectors. Keywords include connector health, MCP monitoring, integration health, pulse check, auto-heal, connector status.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: ConnectorHealthSwarm
  absorption_source: "§33.4 — Autonomous Maintenance Swarms"
  super_prompt_section: "§33.4"
---

# Heady™ Connector Health (ConnectorHealthSwarm)

## When to Use This Skill

Use this skill when:
- Running health checks across all 89+ connectors
- Diagnosing degraded MCP server connections
- Auto-healing connectors with stale credentials or timeouts
- Regenerating persistently failing connectors via ConnectorForgeSwarm

## Architecture

### Health Check Protocol

```
Every φ³ hours (≈4.24 hours):
  For each connector:
    1. Ping / list_tools → measure response time
    2. If response < 3s → healthy (CSL = 1.0)
    3. If response 3-10s → degraded (CSL = 0.618)
    4. If timeout → unhealthy (CSL = 0.0)
    5. Track error rate over rolling 1-hour window
```

### Auto-Heal Actions

| Condition | Action |
|---|---|
| Stale OAuth token | Refresh token rotation |
| API key expired | Alert Eric + check vault |
| Timeout (transient) | Exponential backoff retry |
| Error rate > 15% | Circuit breaker OPEN |
| Persistent failure (> 3 cycles) | Regenerate via ConnectorForgeSwarm |
| API spec changed | Re-run SchemaExtractionBee |

### Connector Categories

| Category | Count | Check Frequency |
|---|---|---|
| Communication | 13 | Every φ³ hours |
| Developer Tools | 13 | Every φ³ hours |
| Data & Storage | 8 | Every φ² hours (more critical) |
| AI & ML | 8 | Every φ² hours (more critical) |
| Business | 8 | Every φ³ hours |
| Creative | 8 | Every φ⁴ hours (less critical) |
| Infrastructure | 8 | Every φ² hours |
| Others | 23 | Every φ³ hours |

## Instructions

### Running Connector Health Check

1. Enumerate all registered connectors from liquid node registry
2. For each: send health probe (list_tools or ping)
3. Record response time and CSL score
4. For degraded: attempt auto-heal
5. For persistently failing: trigger ConnectorForgeSwarm regeneration
6. Update connector health dashboard
7. Report to governance log

## Output Format

- Connector Health Matrix (89+ entries)
- Auto-Heal Actions Taken
- Regeneration Requests Issued
- Overall Connector Availability Percentage
