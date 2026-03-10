# 🚀 Heady Onboarding Guide

Complete walkthrough from zero to a running Heady instance.

---

## Prerequisites

- [ ] **Node.js 20+** (`node --version`)
- [ ] **npm 10+** (ships with Node 20)
- [ ] **Git** with access to HeadyMe GitHub org
- [ ] **Docker or Podman** (for containers)
- [ ] **Ollama** (optional, for local models)

---

## Step 1: Clone & Setup

```bash
git clone https://github.com/HeadyMe/Heady-8f71ffc8.git ~/Heady
cd ~/Heady
bash scripts/setup.sh
```

The setup script:
1. Verifies Node 20+, npm, Git, Docker
2. Runs `npm install`
3. Creates `.env` from `.env.example`
4. Creates `data/memory`, `data/logs`, `data/checkpoints`
5. Validates environment

---

## Step 2: Configure API Keys

Edit `.env` — required variables:

| Variable | Source | Generate |
|---|---|---|
| `JWT_SECRET` | — | `openssl rand -hex 32` |
| `MCP_BEARER_TOKEN` | — | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | console.anthropic.com | — |
| `OPENAI_API_KEY` | platform.openai.com | — |
| `EMBEDDINGS_PROVIDER` | — | Set to `ollama` or `openai` |
| `MEMORY_STORE_PATH` | — | Default: `./data/memory` |

Validate: `node scripts/validate-env.js`

---

## Step 3: Start

### Option A: Node.js direct
```bash
node heady-manager.js
```

### Option B: Docker Compose (recommended)
```bash
docker-compose up -d
```

### Option C: Docker manual
```bash
docker build -t heady:latest .
docker run -d --name heady -p 3301:3301 -v $(pwd)/data:/app/data --env-file .env heady:latest
```

---

## Step 4: Verify

```bash
bash scripts/smoke-test.sh
```

Manual checks:

| Endpoint | Expected |
|---|---|
| `GET /health` | `200 { status: "ok" }` |
| `GET /health/deep` | `200` with service statuses |
| `GET /api/agents` | `200` with 19 agents |
| `GET /api/memory/status` | `200 { memories: 0 }` |
| `GET /mcp/v1/tools/list` | `200` with tools (requires Bearer token) |
| `GET /metrics` | Prometheus metrics |

---

## Step 5: Connect Your IDE

Copy `.mcp/config.example.json` to your IDE's MCP config:

- **Windsurf/Cursor:** `~/.cursor/mcp.json` or settings
- **VS Code:** MCP extension settings

Update `token` to match your `MCP_BEARER_TOKEN`.

---

## Common Issues

| Problem | Fix |
|---|---|
| Port 3301 in use | `lsof -ti:3301 \| xargs kill` or change PORT in .env |
| Ollama not found | Install from ollama.com or set `EMBEDDINGS_PROVIDER=openai` |
| JWT errors | Regenerate: `openssl rand -hex 32` |
| Memory permission denied | `chmod -R 755 data/` |
| Rate limit hit | Check API key quotas; Heady has built-in rate limiting |
| Docker healthcheck failing | Wait 30s for startup; check `docker logs heady` |

---

## Next Steps

1. Visit `http://localhost:3301` for the dashboard
2. Try the MCP tools: `curl -H "Authorization: Bearer $TOKEN" localhost:3301/mcp/v1/tools/list`
3. Ingest a memory: `POST /api/memory/ingest` with `{ "content": "test" }`
4. Explore agents: `GET /api/agents/status`
5. Read [docs/architecture-overview.md](./docs/architecture-overview.md)
6. Start contributing: [CONTRIBUTING.md](./CONTRIBUTING.md)
