# Heady Phase 2 — Implementation Notes

## Changes Made (2026-03-10)

### 1. `src/agents/agent-manager.js` — Real AI Provider Dispatch

The agent manager's `invoke()` was the single most impactful stub in the system — every agent call returned a fake string. Replaced with:

- **Category-to-task mapping:** Maps agent categories to AI task types:
  - thinker → reasoning, builder → code, creative → creative
  - ops → validation, security → red_team, research → research
- **Provider dispatch:** `_dispatchToProvider(task, prompt, options)` reads `config/providers.json`, walks the task→provider fallback chain, and calls the first provider with a configured API key
- **Three provider implementations:**
  - `_callAnthropic()` — Anthropic Messages API (claude-sonnet-4-20250514)
  - `_callOpenAI()` — OpenAI Chat Completions (gpt-4o)
  - `_callGroq()` — Groq Chat Completions (llama-3.1-70b-versatile)
- **Prompt construction:** Injects agent context (name, description, skills) into the prompt sent to the provider
- **Error handling:** 503 when no provider available, timeout at 30s, structured error propagation

### 2. `src/gateway/health.js` — Real Health Probes

Replaced hardcoded `{ tools_loaded: true }` and `{ tasks_running: 135 }` with 5 concurrent probes:

```
memory_store   → fs.existsSync(storePath) + JSON.parse(index.json).length
mcp_tools      → require('../mcp/tool-registry').getTools().length
agent_manager  → require('../../config/agents.json').agents.length
config_files   → checks 5 critical YAML configs exist in configs/
data_dirs      → checks data/memory, data/logs, data/checkpoints exist
```

All probes run via `Promise.allSettled` for concurrent execution. Each returns `{ status, details }`. Overall status degrades if any probe fails.

### 3. `heady-manager.js` — Production CORS Allowlist

Replaced `origin: process.env.CORS_ORIGINS?.split(',') || '*'` with:

- `HEADY_DOMAINS` constant: 9 production domains (headyme.com, headyapi.com, headysystems.com, headyconnection.org, headymcp.com, headybuddy.org, headyio.com, headybot.com, heady-ai.com)
- Production mode: uses domain allowlist by default
- Development mode: adds localhost:3301 and localhost:5173
- `CORS_ORIGINS` env var still works as an explicit override

### 4. `src/services/auto-success.js` — Real Concurrent Task Handlers

Replaced 135 no-op tasks with 9 real category handlers running concurrently:

| Category | What it checks |
|----------|---------------|
| health_monitoring | V8 heap usage, warns at >85% |
| agent_lifecycle | Agent count from config |
| memory_maintenance | Store path + entry count |
| security_scanning | JWT_SECRET length, CORS config |
| performance_optimization | OS load averages |
| learning_feedback | Log file count |
| checkpoint_management | Checkpoint dir existence |
| connectivity_checks | Critical config file presence |
| self_healing | Creates missing data directories |

Cycle interval reduced from 135 sequential no-ops to 9 concurrent real checks via `Promise.allSettled`.

### 5. `src/memory/memory-store.js` — TF Cosine Similarity

Added two methods:
- `_computeTermVector(text)` — Tokenizes to lowercase alphanumeric words, computes normalized term frequencies
- `_cosineSimilarity(a, b)` — Standard cosine similarity over term vectors

Term vectors are computed at `ingest()` time and stored in `entry._termVector`. On `query()`, the query's term vector is compared against all entries, filtered by threshold (0.1), and returned sorted by descending score.

Validated with test query "semantic embeddings search" — returns relevant results with top score 0.655, correctly ranking more relevant entries higher.

### 6. Frontend Production Wiring

**`frontend/src/utils/api.js` (NEW):**
- `apiFetch(path, options)` — configurable via `VITE_API_BASE` env var
- Auto-attaches `Authorization: Bearer` header from `sessionStorage`
- Sets `Content-Type: application/json` when body is present
- Throws structured errors with `.status` property

**`frontend/src/utils/auth.js` (REWRITTEN):**
- Removed `prompt()` dialog and `default_insecure_token` fallback
- `getToken()` / `setToken()` / `clearToken()` / `isAuthenticated()` using `sessionStorage`

**`frontend/vite.config.js` (UPDATED):**
- Proxy expanded: added `/mcp` and `/metrics` routes alongside existing `/api`
- Added documentation comment explaining `VITE_API_BASE` for production builds

## Architecture Decisions

- **Agent dispatch reuses `config/providers.json`** — Same routing config used by the AI gateway. Avoids config duplication and ensures consistent provider selection across both paths.
- **Health probes use `Promise.allSettled`** — One failing probe doesn't block others. Overall status is computed from individual results.
- **CORS allowlist is hardcoded, not config-driven** — Deliberate choice: the 9 Heady domains are stable identity anchors. `CORS_ORIGINS` env var provides override escape hatch.
- **TF cosine over embeddings** — True embedding-based vector search requires API calls at ingest time, adding latency and cost. TF cosine is a zero-dependency improvement that works now. The `EMBEDDINGS_PROVIDER` config path is ready for future upgrade.
- **sessionStorage over localStorage for auth tokens** — Tokens clear on tab close, reducing exposure window for XSS.
