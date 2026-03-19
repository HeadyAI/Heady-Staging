---
name: heady-autorun
description: Continuously run HCFullPipeline — diagnose blockers, fix issues, trigger execution, and keep the pipeline running autonomously
---

# heady-autorun

Ensure HCFullPipeline runs **continuously and autonomously**. Diagnose every blocker,
fix what can be fixed, queue remaining tasks into the auto-success engine, and trigger
the pipeline to run. This skill is the primary driver of full-auto operation.

## What to do

1. **Check server health** — run `node -e "require('./src/hc_pipeline.js').pipeline.load()"` to verify pipeline loads without errors
2. **Read run state** — check `hc_pipeline.log` and `.heady_cache/pipeline_task_cache.json` for last run status
3. **Identify blockers** in this order:
   - Check if `heady-manager.js` process is running: `ps aux | grep heady-manager`
   - Verify all required configs exist: `resource-policies.yaml`, `service-catalog.yaml`, `governance-policies.yaml`, `concepts-index.yaml`
   - Check for syntax errors in `src/hc_pipeline.js` (run `node --check src/hc_pipeline.js`)
   - Check circuit breakers: read `.heady_cache/pipeline_task_cache.json`
   - Verify `data/` directory exists for auto-success persistence
4. **Fix blockers found** — apply direct fixes for known issues (see Issues section below)
5. **Trigger pipeline run** — use MCP tool `heady_auto_flow` with action `run_pipeline`
6. **Verify run completed** — check `hc_pipeline.log` for run completion entry
7. **Report status** — summarize: stages completed, tasks run, errors, next run trigger

## Known Issues & Fixes

### Issue: hc_pipeline.js bug — taskName.priority on string (FIXED in commit)
**File:** `src/hc_pipeline.js` lines ~508-510
**Fix:** Remove the block that sets `taskName.priority` and `taskName.tags.push()` — strings are immutable.

### Issue: hc_auto_success.js wrong require path
**File:** `src/orchestration/hc_auto_success.js` line ~1514
**Fix:** Change `require('core/heady-server')` → `require('express')`

### Issue: Services unhealthy (0/20)
**Root cause:** `heady-manager.js` server not running
**Fix steps:**
```bash
cd /home/user/Heady
npm install 2>&1 | tail -5
node heady-manager.js &
```

### Issue: logger null-ref in hc_auto_success.js
**Fix:** The lazy-loaded logger at line 45 can be null. Engine must check `if (logger)` before calling methods.

### Issue: Missing data/ directory
**Fix:** `mkdir -p /home/user/Heady/data`

## Continuous Run Protocol

To keep the pipeline running autonomously:
1. Ensure heady-manager.js is running (use PM2 or systemd)
2. The auto-success engine is event-driven — it reacts to system events automatically
3. The `improvement` lane runs every 15 minutes via cron
4. The `system_operations` lane runs every 4 hours
5. Manual trigger: `POST /api/pipeline/run` or `POST /api/auto-success/force-react`

## Key files

- `src/hc_pipeline.js` — Pipeline executor (21-stage HCFullPipeline)
- `src/orchestration/hc_auto_success.js` — Always-on auto-success engine
- `heady-manager.js` — Main Express server (must be running)
- `configs/hcfullpipeline.yaml` — 21-stage pipeline definition
- `hc_pipeline.log` — Pipeline execution log
- `.heady_cache/pipeline_task_cache.json` — Task result cache
- `data/auto-success-tasks.json` — Auto-success history

## MCP Tools

- `heady_auto_flow` — Trigger pipeline flows
- `heady_health` — Check all service health
- `heady_ops` — Operations and maintenance
- `heady_maintenance` — Run maintenance tasks
