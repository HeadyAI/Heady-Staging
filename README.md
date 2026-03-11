<!-- HEADY_BRAND:BEGIN
╔══════════════════════════════════════════════════════════════════╗
║  HeadyOS · Sacred Geometry · Organic Systems · Breathing Interfaces ║
║  FILE: README.md  ·  LAYER: root                                ║
╚══════════════════════════════════════════════════════════════════╝
HEADY_BRAND:END -->

# Heady Systems

> **Sacred Geometry · Organic Systems · Breathing Interfaces**

HeadyOS is a **unified intelligent orchestration platform** for AI pipelines, distributed agents, and modern workloads. Every component self-monitors, self-corrects, and adapts in real time — a *living system*.

---

## Quick Start

```bash
git clone https://github.com/HeadySystems/Heady.git
cd Heady
npm install
cp .env.example .env
# Edit .env — set at minimum ANTHROPIC_API_KEY
npm start
curl localhost:3300/api/health
```

Cloud deploy: Connect to [Render.com](https://render.com) — the included `render.yaml` provisions everything automatically.

---

## Architecture

```
heady-manager.js           # Node.js API Gateway (port 3300)
├── src/hc_pipeline.js     # HCFullPipeline engine
├── src/agents/            # Builder, Researcher, Claude Code, Deployer
├── packages/hc-supervisor # Multi-agent Supervisor (parallel fan-out)
├── packages/hc-brain/     # HeadyBrain meta-controller
├── packages/hc-health/    # Health checks + cron
├── configs/               # YAML configs (source of truth)
├── public/                # Static frontend (this site)
│   ├── index.html         # Landing page
│   ├── docs.html          # Documentation hub
│   ├── products.html      # Product catalog
│   ├── api-docs.html      # Interactive API docs
│   ├── status.html        # System status
│   └── verticals/         # Product vertical pages
├── frontend/              # React admin IDE (Vite)
├── scripts/               # Build, deploy, checkpoint automation
├── docs/                  # Developer documentation
└── heady-registry.json    # Central component catalog
```

---

## HCFullPipeline

Five-stage deterministic execution with deep checkpoints:

```
ingest → plan → execute-major-phase → recover → finalize
```

**Operational Readiness Score (ORS)** gates execution intensity:
- **85–100**: Full parallelism, all optimisations enabled
- **70–85**: Normal operation
- **50–70**: Maintenance mode, no new large builds
- **<50**: Recovery only — repair before building

---

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/system/status` | GET | Full system status |
| `/api/pipeline/run` | POST | Trigger pipeline run |
| `/api/pipeline/state` | GET | Current state |
| `/api/supervisor/status` | GET | All agent statuses |
| `/api/brain/status` | GET | Brain + ORS |
| `/api/registry` | GET | Component registry |

Full reference: `public/api-docs.html` or `/api-docs.html` on the running system.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | Claude API key |
| `DATABASE_URL` | Recommended | PostgreSQL connection |
| `HEADY_API_KEY` | Recommended | Auto-generated if not set |
| `PORT` | Optional | Server port (default: 3300) |
| `NODE_ENV` | Optional | `development` or `production` |

---

## Checkpoint Protocol

At every checkpoint, 10-step deep analysis detects drift and syncs all files:

```powershell
.\scripts\checkpoint-sync.ps1              # Full sync
.\scripts\checkpoint-sync.ps1 -Mode check  # Read-only drift detection
.\scripts\checkpoint-sync.ps1 -Mode fix    # Auto-fix
```

Full protocol: `docs/CHECKPOINT_PROTOCOL.md`

---

## Key Documentation

| Path | Purpose |
|------|---------|
| `public/docs.html` | **Documentation hub** |
| `CLAUDE.md` | Claude Code integration protocol |
| `docs/CHECKPOINT_PROTOCOL.md` | Sync protocol |
| `docs/C4_ARCHITECTURE.md` | Architecture diagrams |
| `configs/hcfullpipeline.yaml` | Pipeline definition (source of truth) |
| `heady-registry.json` | Central component catalog |

---

## Deployment

```powershell
.\commit_and_build.ps1   # Local build
.\nexus_deploy.ps1       # Push to all remotes
```

Render.com blueprint: `render.yaml`

---

## License

Proprietary — Heady Systems
