---
name: heady-auto-success
description: Manage the always-on Auto-Success Engine — start, status, force-react, add tasks, and wire external systems
---

# heady-auto-success

Operate and optimize the **HeadyAutoSuccess Engine** — the always-on, event-driven
background intelligence that continuously runs all Heady background tasks across
13 CSL-discovered categories. ORS target: 100.0.

## What to do

1. **Check engine state** — Read `src/orchestration/hc_auto_success.js` for engine class
2. **Check history** — Read `data/auto-success-tasks.json` for recent task executions
3. **Check audit trail** — Read `data/auto-success-audit.json` for terminal state log
4. **Check trial ledger** — Read `data/trial-ledger.json` for repeat detection state
5. **Start if not running** — POST `/api/auto-success/start` or bootstrap via heady-manager
6. **Force reaction** — POST `/api/auto-success/force-react` to trigger immediate cycle
7. **Report status** — GET `/api/auto-success/status` for full engine report

## Engine Architecture

```
AutoSuccessEngine (event-driven, no timers/intervals)
  ├── TASK_CATALOG (144+ tasks × 13 categories)
  ├── REACTION_TRIGGERS (50+ system events)
  ├── Bee Workers (per category → per domain)
  │   ├── learning → refactoring bee
  │   ├── optimization → engines bee
  │   ├── monitoring → health bee
  │   ├── maintenance → ops bee
  │   └── ... (13 total mappings)
  ├── Trial Ledger (immutable input-hash audit)
  ├── Audit Trail (terminal state per task)
  └── External Wiring
      ├── patternEngine
      ├── selfCritique
      ├── storyDriver
      └── eventBus (global.eventBus)
```

## Task Categories (13 = fib(7))

| Category | Tasks | Pool | Purpose |
|----------|-------|------|---------|
| learning | 20 | warm | Config drift, dependency analysis, timing profiles |
| optimization | 20 | warm | Circuit breakers, concurrency, cache tuning |
| integration | 15 | warm | Service mesh, registry sync, MCP coverage |
| monitoring | 15 | warm | CPU/RAM/disk/SLA tracking |
| maintenance | 15 | cold | Log rotation, cache compaction, registry cleanup |
| discovery | 15 | warm/hot | Optimization paths, parallelization, gaps |
| verification | 15 | warm/hot | Liquid architecture compliance |
| creative | 10 | warm | Creative engine health, model routing |
| deep-intel | 10 | warm | 3D vector store, audit chain integrity |
| hive-integration | 20 | warm | External APIs, MCP aggregation, SDK health |
| security-governance | - | hot | Security audits, governance enforcement |
| resilience | - | warm | Circuit breakers, auto-heal, recovery |
| evolution | - | cold | Strategy evolution, mutation testing |

## Issues Found in Audit & Fixes

### logger null-ref (lines throughout hc_auto_success.js)
Lazy-loaded `logger` at line 45 can be null when `./utils/logger` is absent.
All `logger.logSystem(...)` calls will throw if `logger === null`.
**Fix:** Wrap logger calls: `if (logger) logger.logSystem(...)` or provide inline fallback.

### autoCommitDeploy.start() can throw unhandled (line ~858-863)
`autoCommitDeploy.start()` is called but if the module loads but `.start()` throws,
the error is swallowed by a generic catch on `e.message` — but the initial `require`
could return something without a `.start()` method.
**Status:** Gracefully handled via outer try/catch.

### Missing external task files (non-fatal)
Files `auto-flow-200-tasks.json`, `nonprofit-tasks.json`, `buddy-tasks.json` etc.
are loaded with try/catch — gracefully degraded to empty arrays.

## Key files

- `src/orchestration/hc_auto_success.js` — Main engine (1591 lines)
- `src/bees/auto-success-bee.js` — Bee worker for auto-success tasks
- `src/data/auto-success-catalog.js` — Extended task catalog
- `data/auto-success-tasks.json` — Persisted execution history
- `data/auto-success-audit.json` — Terminal state audit trail
- `data/trial-ledger.json` — Immutable input-hash trial ledger

## API Endpoints

```
GET  /api/auto-success/health       — Engine health + ORS score
GET  /api/auto-success/status       — Full status with categories
GET  /api/auto-success/tasks        — Task catalog (?category=learning)
GET  /api/auto-success/history      — Execution history (?limit=200)
GET  /api/auto-success/audit        — Audit trail (?action=&target=&since=)
GET  /api/auto-success/trial-ledger — Trial ledger (?taskId=&terminalState=)
POST /api/auto-success/force-react  — Trigger immediate reaction cycle
POST /api/auto-success/start        — Start engine
POST /api/auto-success/stop         — Stop engine
```

## Wire Checklist

For full auto-success, ensure these are wired in heady-manager.js:
- [ ] `engine.wire({ patternEngine, selfCritique, storyDriver, eventBus })`
- [ ] `global.eventBus` is set before `engine.start()`
- [ ] `global.__vectorMemory` is set for bee learning writes
- [ ] `data/` directory exists (mkdir -p data)
