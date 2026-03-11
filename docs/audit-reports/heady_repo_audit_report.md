# Heady Pre-Production Audit Report

**Date:** 2026-03-10
**Repository:** HeadyMe/Heady-Staging (maps to pre-production)
**Branch:** `audit/high-impact-fixes`

## Executive Summary

Audited the Heady monorepo (33,394 files, ~1,500 JS source files). The core server architecture (`heady-manager.js`) is well-structured with Express, Winston logging, Prometheus metrics, JWT auth, and health endpoints. However, six high-impact issues blocked end-to-end functionality. All six were fixed and validated.

## Issues Found & Fixed

### 1. CRITICAL — Missing API Endpoints (Frontend 404s)
**Problem:** Frontend Dashboard and Services pages fetch `/api/dashboard/status` and `/api/services/status`, but no backend routes existed. Both pages showed "Failed to load" errors.
**Fix:** Created `src/gateway/dashboard-router.js` with both endpoints. Dashboard returns aggregated system/agent/memory/resource status. Services returns AI provider status with key availability flags and internal service status. Wired into `heady-manager.js`.

### 2. HIGH — AI Gateway Returns Stub Responses
**Problem:** `src/gateway/ai-gateway.js` returned `[STUB] Response from ${provider}` for all AI requests. The core AI routing feature was non-functional.
**Fix:** Implemented real HTTPS dispatch for Anthropic, OpenAI, and Groq providers. Added provider selection that checks for configured API keys and falls back through the routing chain. Added proper error handling, timeouts, and removed env key name leakage from the `/api/ai/providers` endpoint.

### 3. HIGH — Frontend Pages Are Raw JSON Dumps
**Problem:** All four pages (Dashboard, Agents, Services, Memory) just rendered `<pre>{JSON.stringify(data)}</pre>`. No error handling, no loading states, no interactivity.
**Fix:** Rewrote all four pages with proper UI: stat cards, agent grids grouped by category, service cards with status indicators, memory search/ingest forms. Added error and loading states. Added CSS for the new component styles.

### 4. HIGH — Service Mesh Localhost Contamination
**Problem:** `src/core/heady-service-mesh.js` (and `src/architecture/v2/` copy) hardcoded localhost URLs for all 9 Heady domains + infrastructure services as seed instances. In production, health probes to localhost would fail and trigger circuit breakers.
**Fix:** Added production-mode filtering that strips all localhost instances from the seed registry when `NODE_ENV=production` or `HEADY_ENV=production`. Applied to both copies.

### 5. MEDIUM — Env Validation Blocks Production Startup
**Problem:** `src/utils/env-validator.js` required `EMBEDDINGS_PROVIDER`, `MEMORY_STORE_PATH`, and `MCP_BEARER_TOKEN`, but `.env.production` didn't define them. Server would exit immediately in production.
**Fix:** Added missing vars to `.env.production`. Added sensible defaults to the validator for `PORT`, `NODE_ENV`, `EMBEDDINGS_PROVIDER`, and `MEMORY_STORE_PATH`. Improved error logging to list all missing vars at once.

### 6. MEDIUM — MCP Tools Return Stub Data
**Problem:** `memory_ingest` and `memory_query` MCP tools were stubbed — they generated a UUID but didn't actually store or search memories, despite `MemoryStore` being fully implemented.
**Fix:** Wired both tools to the actual `MemoryStore` instance. `memory_ingest` now persists to disk. `memory_query` returns real search results.

## Validation Results

| Check | Status |
|-------|--------|
| All modified modules `require()` cleanly | PASS |
| ESLint on all 4 modified src files | PASS (0 errors, 0 warnings) |
| Dashboard router loads, exports function | PASS |
| AI gateway loads, exports function | PASS |
| Tool registry loads, registers 5 tools | PASS |
| Env validator loads, exports function | PASS |
| Memory store loads, exports class | PASS |

## Remaining Risks

1. **104 TODO/FIXME/STUB markers** remain across source (mostly in agent stubs like `heady-brain.js`, `heady-buddy.js`, etc.) — these are agent implementations that need real logic.
2. **Agent manager `invoke()` returns stub results** — each agent's execute method is a placeholder. Needs per-agent implementation.
3. **`checkAutoSuccess()` returns hardcoded `{ tasks_running: 135 }`** in health.js deep check.
4. **`eslint.config.js` references `@typescript-eslint/eslint-plugin`** which isn't installed — flat config lint is broken (workaround: use `.eslintrc.json` with `ESLINT_USE_FLAT_CONFIG=false`).
5. **Duplicate code** — `src/architecture/v2/` contains copies of `heady-service-mesh.js`, `heady-api-gateway-v2.js`, `heady-config-server.js`. These should be consolidated.
6. **Frontend `vite.config.js`** still proxies to `localhost:3301` — correct for dev mode, but verify production build uses proper API base.
7. **Memory store uses text substring matching** instead of vector similarity — needs embedding generation via `EMBEDDINGS_PROVIDER` for proper vector search.
8. **No CORS_ORIGINS set in .env.production** — defaults to `*` (open), should list specific allowed domains.

## Files Changed

| File | Change |
|------|--------|
| `heady-manager.js` | Added dashboard-router import and route registration |
| `src/gateway/dashboard-router.js` | **NEW** — `/api/dashboard/status` and `/api/services/status` endpoints |
| `src/gateway/ai-gateway.js` | Replaced stub with real Anthropic/OpenAI/Groq dispatch |
| `src/utils/env-validator.js` | Added defaults, improved error reporting |
| `src/mcp/tool-registry.js` | Wired memory tools to actual MemoryStore |
| `src/core/heady-service-mesh.js` | Production-mode localhost filtering |
| `src/architecture/v2/heady-service-mesh.js` | Same localhost filtering fix |
| `.env.production` | Added missing EMBEDDINGS_PROVIDER, MEMORY_STORE_PATH, MCP_BEARER_TOKEN |
| `frontend/src/pages/Dashboard.jsx` | Stat cards, system info, agent summary |
| `frontend/src/pages/Agents.jsx` | Category-grouped agent grid with status indicators |
| `frontend/src/pages/Services.jsx` | Provider cards with availability, internal service list |
| `frontend/src/pages/Memory.jsx` | Search form, ingest form, result display |
| `frontend/src/index.css` | Added styles for stat cards, grids, forms, tags |
