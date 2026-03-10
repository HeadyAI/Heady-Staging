# 🧠 Heady — Latent OS & Autonomous AI Platform

[![Node](https://img.shields.io/badge/node-20%2B-green.svg)]()
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)]()
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)]()

> **Heady** is a personal AI platform that functions as a fully autonomous digital company.
> It orchestrates **20+ specialized AI agents** across reasoning, coding, research,
> creative, operations, and personal-assistant domains — running 24/7 on self-healing infrastructure.

**HeadySystems Inc.** (C-Corp) builds the platform. Revenue directly funds
**HeadyConnection Inc.** (Nonprofit), which brings AI tools to underserved communities.

---

## Quick Start

```bash
git clone https://github.com/HeadyMe/Heady-8f71ffc8.git ~/Heady && cd ~/Heady
bash scripts/setup.sh           # Checks prereqs, installs deps, creates .env
# Edit .env with your API keys
node heady-manager.js           # Starts on port 3301
bash scripts/smoke-test.sh      # Verifies all systems
```

📖 **Full walkthrough:** [ONBOARDING.md](./ONBOARDING.md)

---

## Architecture

```
User Request → AI Gateway (auth + rate limit)
    → HeadyBrain (reasoning)
    → HeadySoul (alignment + veto)
    → HeadyBattle (validation)
    → HeadySims (Monte Carlo)
    → Arena Mode (competing solutions)
    → HeadyVinci (learns from outcome)
    → Response
```

### Liquid Architecture
Services scale dynamically to demand. The **Auto-Success Engine** runs **135 background tasks**
across **9 categories** every 30 seconds. Errors become learning events, not failures.

### Fractal Intelligence
Same values at every scale — Fibonacci spacing, golden ratio rhythms, fractal self-similarity
govern code, services, and the organization itself.

---

## Agent Roster

| Category | Agents | Mission |
|---|---|---|
| **Thinkers** | HeadyBrain, HeadySoul, HeadyVinci | Reasoning, alignment, pattern recognition |
| **Builders** | HeadyCoder, HeadyCodex, HeadyCopilot, HeadyJules | Code orchestration, pair coding, PM |
| **Researchers** | HeadyPerplexity, HeadyGrok, HeadyBattle, HeadySims | Research, red-team, validation, simulation |
| **Creatives** | HeadyCreative, HeadyVinci Canvas | Content generation, design |
| **Operations** | HeadyManager, HeadyConductor, HeadyLens, HeadyOps, HeadyMaintenance | Control plane, monitoring, deploy, health |
| **Assistant** | HeadyBuddy | Browser-based assistant with memory |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 (Express) |
| Frontend | React + Vite |
| Local AI | Ollama |
| External AI | Claude, GPT, Gemini, Groq, Perplexity |
| Infrastructure | Cloudflare (DNS, Tunnels, Workers, KV, Pages, Access) |
| Cloud | Google Cloud (Vertex AI, Cloud Run, Storage) |
| Protocol | MCP (Model Context Protocol) |
| CI/CD | GitHub Actions |
| Memory | File-based + vector embeddings |
| Monitoring | Prometheus metrics, Winston logging |

---

## Project Structure

```
Heady/
├── heady-manager.js             # Entry point — control plane
├── package.json
├── .env.example
├── src/
│   ├── gateway/                 # AI gateway, auth, rate limiting, health
│   ├── mcp/                     # MCP protocol server + tool registry
│   ├── agents/                  # Agent manager + routing
│   ├── memory/                  # Memory store + embeddings
│   ├── services/                # Auto-success engine + service stubs
│   ├── utils/                   # Logger, metrics, env validation
│   └── web/                     # React + Vite frontend
├── config/
│   ├── agents.json              # Agent registry (19 agents)
│   ├── providers.json           # AI provider routing config
│   └── services.json            # Domain & service registry
├── scripts/                     # setup.sh, smoke-test.sh, validate-env.js
├── tests/                       # Unit, integration, e2e
├── docs/                        # Architecture, API, ADRs, runbooks
├── .github/                     # CI/CD, issue templates, PR template
├── Dockerfile
├── docker-compose.yml
├── ONBOARDING.md
├── CONTRIBUTING.md
├── SECURITY.md
└── CHANGELOG.md
```

---

## Domains & Interfaces

| Domain | Purpose |
|---|---|
| [headyme.com](https://headyme.com) | Personal dashboard / Command Center |
| [headysystems.com](https://headysystems.com) | Infrastructure hub |
| [headyconnection.org](https://headyconnection.org) | Nonprofit community hub |
| [headymcp.com](https://headymcp.com) | MCP Protocol portal |
| [headyio.com](https://headyio.com) | Developer platform |
| [headybuddy.org](https://headybuddy.org) | AI Assistant hub |
| [ide.headyme.com](https://ide.headyme.com) | Browser-based IDE |

---

## MCP Integration

Heady exposes a full MCP-compatible tool gateway for IDE integration:

```json
{
  "mcpServers": {
    "heady": {
      "url": "http://localhost:3301/mcp/v1",
      "transport": "streamable-http",
      "auth": { "type": "bearer", "token": "<MCP_BEARER_TOKEN>" }
    }
  }
}
```

Compatible with: **Windsurf**, **Cursor**, **VS Code + MCP extension**

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## License

Copyright © 2024-2026 HeadySystems Inc. & HeadyConnection Inc. All rights reserved.
