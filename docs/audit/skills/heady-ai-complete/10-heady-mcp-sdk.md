# SKILL: Heady MCP, SDK & Developer Platform

## MCP Server (Model Context Protocol)

Heady exposes 30+ tools via MCP for IDE integration:
- **Server location**: `packages/mcp-server/`
- **Protocol**: JSON-RPC 2.0 over stdio
- **Registration**: `mcp.json` in user package

### Core MCP Tools

| Tool | Description |
|------|-------------|
| `heady_health` | System health check |
| `heady_pulse` | Full system status + endpoints |
| `heady_brain_query` | Semantic search across vector memory |
| `heady_generate` | Code generation with node attribution |
| `heady_deploy` | Trigger Cloud Run deployment |
| `heady_battle` | Multi-model arena competition |
| `heady_creative` | Image/audio generation pipelines |
| `heady_distill` | Knowledge distillation workflows |

## Heady Hive SDK

Client SDK for interacting with Heady services:

```javascript
const { HeadyHive } = require('@heady-ai/hive-sdk');

const hive = new HeadyHive({
  apiKey: process.env.HEADY_API_KEY,
  endpoint: 'https://heady-manager-bf4q4zywhq-uc.a.run.app'
});

// Query the brain
const results = await hive.brain.search('latest deployment status');

// Trigger a pipeline stage
await hive.pipeline.execute('ingest', { source: 'repo-changes' });

// Get system health
const health = await hive.health();
```

## API Endpoints (heady-manager.js)

### Health & Status
- `GET /api/health` — Service health + Redis pool status
- `GET /api/pulse` — Full system status with all endpoints listed
- `GET /health/live` — Kubernetes liveness probe
- `GET /health/ready` — Kubernetes readiness probe

### Registry
- `GET /api/registry` — Full component registry
- `GET /api/registry/component/:id` — Single component
- `GET /api/registry/environments` — Deployment environments
- `GET /api/registry/ai-nodes` — AI node topology

### Intelligence
- `GET /api/nodes` — AI node status
- `GET /api/system/status` — Full system status
- `GET /api/monte-carlo/simulate` — Run MC simulation
- `GET /api/patterns` — Recognized patterns

### Authentication
- `POST /api/auth/login` — User login (rate-limited: 20/15min)
- `POST /api/vm/revoke` — Revoke a Soul-Token

### Observability
- `GET /api/events` — SSE event stream
- `WS ws://host:3301/ws` — WebSocket real-time updates

## HeadyBuddy (Chrome Extension)

Browser companion providing:
- Sidebar UI for quick Heady access
- Context-aware suggestions
- System health monitoring widget
- One-click deployment triggers

## Desktop Package (HeadyMCP-{Name}/)

Standardized developer onboarding package:
```
HeadyMCP-{Name}/
├── install.sh          # One-command installer
├── .env                # Credentials + endpoints
├── package.json        # npm manifest + CLI bindings
├── antigravity-config/ # IDE settings + mcp.json
├── chrome-extension/   # HeadyBuddy sidebar
├── heady-cli/          # MCP server (mcp-server.js)
└── sdk/                # Heady Hive SDK
```
