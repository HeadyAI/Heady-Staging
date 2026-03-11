# Heady Pre-Production — Implementation Notes

## Changes Made (2026-03-10)

### 1. `src/gateway/dashboard-router.js` (NEW)
- Creates `/api/dashboard/status` — aggregates system health, agent counts by status, memory store stats, and OS resource metrics
- Creates `/api/services/status` — lists AI providers with key availability (without leaking key names), plus internal service status
- Uses existing `AgentManager` and `MemoryStore` singletons

### 2. `src/gateway/ai-gateway.js` (REWRITTEN)
- `PROVIDER_DISPATCH` map with real HTTPS implementations for Anthropic, OpenAI, and Groq
- `selectProvider()` walks the task→provider mapping from `config/providers.json`, skipping providers without configured API keys
- Proper 30s timeout, error propagation, latency measurement
- `/api/ai/providers` no longer leaks `envKey` field names — returns `available: boolean` instead

### 3. Frontend Pages (REWRITTEN)
- **Dashboard.jsx**: StatCard grid showing status, uptime, agent count, memory entries, CPU/memory utilization. Agent category tags.
- **Agents.jsx**: Agents grouped by category, color-coded status dots (idle=green, working=orange, error=red), invocation counts, persistent badges.
- **Services.jsx**: AI provider cards with model lists, strength tags, key status indicators. Internal services section.
- **Memory.jsx**: Two-section layout with search form (POST to `/api/memory/query`) and ingest form (POST to `/api/memory/ingest`). Result cards with timestamps.
- **index.css**: 80+ lines of new CSS for stat-grid, agent-grid, service-grid, forms, tags, memory cards. Dark theme consistent with existing Sacred Geometry palette.

### 4. Service Mesh Production Fix
- Both `src/core/heady-service-mesh.js` and `src/architecture/v2/heady-service-mesh.js`
- Filters `localhost` instances from `SEED_SERVICES` when `NODE_ENV=production` or `HEADY_ENV=production`
- Services with zero remaining instances after filtering are excluded from the registry

### 5. Env Validator Hardening
- Added `default` field to REQUIRED entries for PORT, NODE_ENV, EMBEDDINGS_PROVIDER, MEMORY_STORE_PATH
- Defaults are applied when env var is missing (prevents production startup crash for non-secret vars)
- Error log now lists all missing vars in a single message instead of one-per-line console.error
- Uses structured winston logger instead of raw console.error

### 6. MCP Tool Wiring
- `memory_ingest` tool now calls `memoryStore.ingest()` — persists to `data/memory/index.json`
- `memory_query` tool now calls `memoryStore.query()` — returns real substring-match results
- Both return structured `{ success, id/results, count }` responses

## Architecture Decisions
- Dashboard router creates its own `AgentManager` and `MemoryStore` instances — acceptable for read-only status, but a future refactor should use dependency injection to share singleton instances across the app
- AI gateway uses raw `https` module (no fetch polyfill) to avoid adding dependencies — the project already uses Node 20+ which has global fetch, but CommonJS require patterns and the existing code style favor explicit https
- Frontend stays in vanilla React without routing library — matches existing pattern
