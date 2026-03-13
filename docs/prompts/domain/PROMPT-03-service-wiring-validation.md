# PROMPT 3: Service Wiring & Endpoint Validation

## For: Perplexity Computer  

## Objective: Ensure every service is fully wired, every endpoint resolves, every inter-service connection works

---

## INSTRUCTIONS FOR PERPLEXITY COMPUTER

You are validating that every Heady™ service is properly wired to every other service it depends on. No dead references. No broken imports. No stubs.

**READ THE ATTACHED CONTEXT FILES FIRST** — especially `00-HEADY-MASTER-CONTEXT.md`, `docker-compose.production.yml`, and `heady-registry.json`.

### TASK 1: Service Dependency Graph

Build a complete dependency graph for all 25 services. For each service in `services/`:

1. Read its `package.json` for declared dependencies
2. Scan its source files for `require()` and `import` statements
3. Identify which other Heady services it calls (HTTP, Redis pub/sub, direct import)
4. Map all external API calls (Groq, Gemini, Claude, OpenAI, HuggingFace)
5. Map all database connections (PostgreSQL, Redis, DuckDB)
6. Output as a Mermaid diagram AND a JSON adjacency list

### TASK 2: Endpoint Inventory

For every service, catalog ALL HTTP endpoints:

```json
{
  "service": "heady-brain",
  "endpoints": [
    { "method": "GET", "path": "/health/live", "handler": "healthCheck()" },
    { "method": "POST", "path": "/api/brain/chat", "handler": "chatHandler()" }
  ]
}
```

Then verify each endpoint:

- Has a route handler function that exists (not a stub/TODO)
- Has proper error handling
- Returns correct HTTP status codes
- Has proper CORS headers for cross-service calls

### TASK 3: Inter-Service Communication Wiring

For each service-to-service connection:

1. **HTTP calls**: Verify the target URL uses the Cloud Run URL (NOT localhost)
2. **Redis pub/sub**: Verify channel names match between publisher and subscriber
3. **Database**: Verify connection strings use pgbouncer (not direct postgres)
4. **WebSocket**: Verify WS endpoints are available and handlers exist
5. **MCP tools**: Verify MCP tool registrations match actual implementations

### TASK 4: Missing Service Implementations

Identify services that are declared but incomplete:

- `heady-federation/` — only 1 file, needs full federation service
- `heady-hive/` — only 1 file, needs full hive orchestration
- `heady-orchestration/` — only 2 files, needs complete orchestration engine
- `heady-pilot-onboarding/` — only 3 files, needs complete onboarding flow

For each incomplete service, create the minimum viable implementation:

- `index.js` — Main entry point with Express server
- `routes/` — API route handlers
- `Dockerfile` — Container definition
- `package.json` — Dependencies
- Health check endpoint at `/health/live`

### TASK 5: Environment Variable Wiring

For each service, verify its `.env` requirements match the `.env.template`:

- Every `process.env.VAR_NAME` in source has a corresponding entry in `.env.template`
- No service references an env var that doesn't exist
- All API keys are properly templated (not hardcoded)

### TASK 6: Worker-to-Service Wiring

Verify all Cloudflare Workers properly proxy to Cloud Run services:

- `worker-heady-router` → routes to correct Cloud Run URLs
- `worker-ai-gateway` → proxies to inference services
- `worker-mcp-telemetry` → connects to heady-mcp service
- `heady-edge-node` → connects to heady-brain service
- Edge → Origin routing is correctly configured in `wrangler.toml`

### DELIVERABLES

Create a ZIP file named `03-wiring-validation-results.zip` containing:

- `dependency-graph.mermaid` — Full Mermaid diagram of service dependencies
- `dependency-graph.json` — JSON adjacency list
- `endpoint-inventory.json` — Complete endpoint catalog for all services
- `wiring-issues.md` — Every broken wire found, with exact file/line and fix
- `missing-implementations/` — Directory with generated code for incomplete services
- `env-var-audit.json` — Every env var reference mapped to its template entry
- `worker-routing-map.json` — Worker → Service URL mapping
