# Heady Phase 2 Audit Report

**Date:** 2026-03-10
**Repository:** HeadyMe/Heady-Staging (maps to pre-production)
**Branch:** `audit/high-impact-fixes`
**Base:** Phase 1 commit `a8442f71f`

## Executive Summary

Continued from the Phase 1 remediation pass (PR #14, merged). Phase 2 targeted the six highest-impact remaining gaps in orchestration, health realism, security, memory quality, and frontend production readiness. All six were implemented, validated, and pushed.

## Issues Found & Fixed

### 1. CRITICAL — Agent Manager Returns Stub Results for All Invocations

**Problem:** `src/agents/agent-manager.js` `invoke()` returned `[STUB] ${agent.name} processed request` for every agent invocation. The entire 19-agent orchestration system was non-functional — agents could be registered and listed, but never actually executed work.

**Fix:** Implemented real AI provider dispatch through the agent manager:
- Category-to-task mapping: thinker→reasoning, builder→code, creative→creative, ops→validation, security→red_team, research→research
- `_dispatchToProvider()` reads `config/providers.json`, walks the task→provider fallback chain, calls the first provider with a configured API key
- Real HTTPS dispatch to Anthropic (Messages API), OpenAI (Chat Completions), and Groq (Chat Completions)
- Agent context injected into prompts: agent name, description, skills, and user request
- Returns structured `{ result, metadata: { provider, latency, task } }`
- Graceful 503 when no provider is available

### 2. HIGH — Health Check Deep Probe Returns Hardcoded Fake Values

**Problem:** `src/gateway/health.js` deep health check returned `{ tools_loaded: true }` and `checkAutoSuccess()` returned `{ tasks_running: 135, categories: 9 }` — entirely fabricated. The health endpoint gave a green signal regardless of actual system state.

**Fix:** Rewrote with 5 real concurrent probes via `Promise.allSettled`:
- **memory_store**: Checks filesystem path exists + counts entries in `index.json`
- **mcp_tools**: Requires actual tool registry, counts registered tools
- **agent_manager**: Loads real agent config, counts registered agents
- **config_files**: Checks existence of 5 critical config files (`hcfullpipeline.yaml`, `resource-policies.yaml`, `service-catalog.yaml`, `governance-policies.yaml`, `data-schema.yaml`)
- **data_dirs**: Verifies `data/memory`, `data/logs`, `data/checkpoints` directories exist

Each probe returns `{ status: 'ok'|'degraded'|'error', details }`. Overall health is `degraded` if any probe fails.

### 3. HIGH — CORS Allows Wildcard in Production

**Problem:** `heady-manager.js` CORS configuration defaulted to `*` when `CORS_ORIGINS` env var was unset, allowing any origin in production.

**Fix:**
- Hardcoded allowlist of 9 Heady production domains
- Production mode (`NODE_ENV=production`) uses the domain allowlist by default
- Development mode adds `localhost:3301` and `localhost:5173` for local dev
- `CORS_ORIGINS` env var still works as an override
- Added `CORS_ORIGINS` to `.env.production` with all 9 domains

### 4. HIGH — AutoSuccessEngine Runs 135 No-Op Tasks

**Problem:** `src/services/auto-success.js` created 135 tasks (15 per category × 9 categories) that all returned `true` from `_executeTask()`. Consumed resources without doing anything, and reported fake completion metrics.

**Fix:** Replaced with 9 real concurrent category handlers:
- **health_monitoring**: Checks heap usage, warns at >85% utilization
- **agent_lifecycle**: Counts registered agents from config
- **memory_maintenance**: Checks memory store path + entry count
- **security_scanning**: Validates JWT_SECRET length (≥32 chars) and CORS configuration
- **performance_optimization**: Reads OS load averages
- **learning_feedback**: Counts log files in data/logs
- **checkpoint_management**: Ensures checkpoint directory exists
- **connectivity_checks**: Verifies critical config files present
- **self_healing**: Creates missing data directories

All 9 run concurrently via `Promise.allSettled`. Results are real, measurable, and logged.

### 5. MEDIUM — Memory Search Is Naive Substring Match

**Problem:** `src/memory/memory-store.js` `query()` used `content.toLowerCase().includes(queryText.toLowerCase())` — no ranking, no relevance scoring. "cat" would match "catalog" and "concatenate" equally.

**Fix:** Implemented term-frequency cosine similarity:
- `_computeTermVector(text)`: Tokenizes, computes term frequencies normalized by document length
- `_cosineSimilarity(a, b)`: Dot product / (magnitude_a × magnitude_b) over the union of terms
- Term vectors computed at `ingest()` time and stored alongside content
- `query()` scores all entries, filters by threshold (0.1), returns top-k sorted by score
- Validated: "semantic embeddings search" returns relevant results ranked by cosine similarity (top score 0.655)

### 6. MEDIUM — Frontend Has No Production API Wiring or Secure Auth

**Problem:**
- All frontend pages used raw `fetch('/api/...')` — no configurable API base for production (where frontend and API may be on different domains)
- `auth.js` used `prompt('Enter token')` with a `default_insecure_token` fallback

**Fix:**
- Created `frontend/src/utils/api.js` with `apiFetch()` helper: configurable `VITE_API_BASE`, automatic `Authorization: Bearer` header from `sessionStorage`, content-type defaults, structured error handling
- Rewrote `frontend/src/utils/auth.js`: removed `prompt()` and insecure default, uses `sessionStorage` for token management
- Updated `frontend/vite.config.js`: expanded dev proxy to include `/mcp` and `/metrics`, added production build documentation

## Validation Results

| Check | Status |
|-------|--------|
| All 9 modified modules `require()` cleanly | PASS |
| ESLint on modified src files | PASS (0 errors, 0 warnings) |
| Agent manager loads, dispatchers registered | PASS |
| Health probes run concurrently, return real data | PASS |
| AutoSuccess 9 category handlers execute | PASS |
| Memory cosine similarity returns ranked results | PASS |
| Frontend api.js and auth.js load cleanly | PASS |

## Remaining Risks

1. **~90+ TODO/FIXME markers** remain across source — mostly in individual agent implementation files (e.g., `heady-brain.js`, `heady-buddy.js`). Each agent's `execute()` is now routed to a real AI provider, but agent-specific tool use, memory access, and specialized behaviors still need per-agent implementation.

2. **Duplicate `src/architecture/v2/` code** — Contains copies of service-mesh, API gateway, config server. Both copies had localhost filtering applied in phase 1, but they should be consolidated to a single source of truth.

3. **`eslint.config.js` broken** — References `@typescript-eslint/eslint-plugin` which isn't installed. Use `ESLINT_USE_FLAT_CONFIG=false npx eslint -c .eslintrc.json` as workaround.

4. **Memory store still uses TF cosine, not embeddings** — True vector search requires calling an embeddings API (OpenAI, Cohere, etc.) at ingest time. The `EMBEDDINGS_PROVIDER` env var and provider config exist but the embedding call is not yet wired. Current TF-cosine is a large improvement over substring but not production-grade for semantic search.

5. **44 Dependabot vulnerabilities** (23 high, 18 moderate, 3 low) flagged by GitHub on the default branch.

6. **Frontend routing** — No client-side router. Navigation between pages requires full page loads. Consider adding React Router for SPA behavior.

7. **No integration tests** — Both phases focused on unit-level validation (module loading, lint, functional probes). End-to-end integration tests covering the full request path (frontend → API → agent dispatch → provider) are not yet in place.

## Files Changed (Phase 2)

| File | Change |
|------|--------|
| `src/agents/agent-manager.js` | Replaced stub invoke() with real AI provider dispatch (+125 lines) |
| `src/gateway/health.js` | Replaced fake probes with 5 real concurrent health checks (+89 lines) |
| `src/services/auto-success.js` | Replaced 135 no-ops with 9 real concurrent category handlers (+125 lines) |
| `src/memory/memory-store.js` | Added TF cosine similarity for memory search (+59 lines) |
| `heady-manager.js` | Production CORS allowlist for 9 Heady domains (+12 lines) |
| `.env.production` | Added CORS_ORIGINS with production domain list |
| `frontend/src/utils/api.js` | **NEW** — Configurable API client with auth headers |
| `frontend/src/utils/auth.js` | Removed insecure prompt() and default token |
| `frontend/vite.config.js` | Expanded dev proxy, added production build docs |

**Total: 9 files changed, 407 insertions, 75 deletions**
