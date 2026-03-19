---
name: heady-start
description: Bootstrap all Heady services — start heady-manager, wire auto-success engine, verify health, and enable continuous pipeline operation
---

# heady-start

Bootstrap the full Heady ecosystem for **continuous, autonomous operation**.
This skill starts the server, wires all systems, verifies health, and ensures
HCFullPipeline + AutoSuccess Engine are running at max potential.

## What to do

### Phase 1 — Pre-flight Checks
1. Verify Node.js version: `node --version` (requires ≥18)
2. Check `package.json` exists and dependencies installed: `ls node_modules | head -5`
3. Verify critical configs exist:
   - `configs/hcfullpipeline.yaml`
   - `configs/resource-policies.yaml`
   - `configs/service-catalog.yaml`
   - `configs/governance-policies.yaml`
   - `configs/concepts-index.yaml`
4. Verify `data/` directory: `ls data/ 2>/dev/null || mkdir -p data`
5. Verify `.env` has required vars (check `.env.example` for the list)

### Phase 2 — Syntax Validation
Run these checks BEFORE starting the server:
```bash
node --check src/hc_pipeline.js
node --check src/orchestration/hc_auto_success.js
node -e "require('./src/hc_pipeline.js')" 2>&1 | head -20
```

### Phase 3 — Start Server
```bash
cd /home/user/Heady
# Option A: Direct (foreground, for debugging)
node heady-manager.js

# Option B: PM2 (background, auto-restart)
pm2 start heady-manager.js --name heady-manager
pm2 save

# Option C: Node with env
NODE_ENV=development node heady-manager.js
```

### Phase 4 — Verify Health
After start, verify:
```bash
curl -s http://localhost:3301/api/health | jq .
curl -s http://localhost:3301/api/auto-success/status | jq .status,.running
curl -s http://localhost:3301/api/pipeline/status | jq .
```

### Phase 5 — Bootstrap Pipeline
Trigger initial pipeline run:
```bash
curl -X POST http://localhost:3301/api/pipeline/run
curl -X POST http://localhost:3301/api/auto-success/force-react
```

### Phase 6 — Verify Continuous Operation
Check that improvement lane is scheduled:
- `improvement` lane: every 15 min (`*/15 * * * *`)
- `system_operations` lane: every 4 hours (`0 */4 * * *`)
- `learning` lane: 6AM daily (`0 6 * * *`)
- `pqc` lane: 2AM daily (`0 2 * * *`)

## Service Port Map

| Service | Port | Path |
|---------|------|------|
| heady-manager | 3301 | Main MCP+API server |
| heady-brain | 3311 | Brain/LLM routing |
| heady-memory | 3312 | Vector memory |
| auth-session | 3314 | Auth service |
| api-gateway | 3315 | API gateway |
| heady-buddy | 3326 | HeadyBuddy |
| heady-guard | 3329 | Security guard |
| hcfp | 3330 | HCFP service |

## Known Startup Blockers

### Blocker 1: heady-manager.js mixes import/require
**Symptom:** `SyntaxError: Cannot use import statement in a module loaded as CommonJS`
**Fix:** Add `"type": "module"` to `package.json` OR convert imports to require()

### Blocker 2: Missing npm dependencies
**Symptom:** `Error: Cannot find module 'js-yaml'`
**Fix:** `npm install`

### Blocker 3: Missing .env file
**Symptom:** `Environment validation failed`
**Fix:** `cp .env.example .env` then populate required vars

### Blocker 4: Port already in use
**Symptom:** `Error: listen EADDRINUSE :::3301`
**Fix:** `kill $(lsof -ti:3301)` then restart

### Blocker 5: data/ directory missing
**Symptom:** `ENOENT: no such file or directory, open 'data/auto-success-tasks.json'`
**Fix:** `mkdir -p data`

## Key files

- `heady-manager.js` — Main server entry point
- `src/hc_pipeline.js` — Pipeline executor
- `src/orchestration/hc_auto_success.js` — Auto-success engine
- `.env` / `.env.example` — Environment configuration
- `package.json` — Dependencies and scripts
- `docker-compose.yml` — Full stack via Docker
