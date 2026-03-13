# PROMPT 5: Liquid Architecture & Dynamic Projection System

## For: Perplexity Computer

## Objective: Perfect the dynamic projection system so Heady exists as a true liquid latent OS

---

## INSTRUCTIONS FOR PERPLEXITY COMPUTER

You are implementing the Heady™ Liquid Architecture — the system that makes Heady a dynamically projected latent OS where the monorepo is the source of truth and all external surfaces (repos, sites, workers, APIs) are projections.

**READ THE ATTACHED CONTEXT FILES FIRST** — especially `00-HEADY-MASTER-CONTEXT.md` and `heady-registry.json`.

### CONCEPT: THE LATENT OS

Heady™ is NOT a traditional application. It is a **Latent Operating System** where:

- The **monorepo** (`/home/headyme/Heady/`) is the persistent RAM — the 3D vector space
- **GitHub repos** are projections — they're generated/synced FROM the monorepo
- **Cloud Run services** are projections — they're deployed FROM the monorepo
- **Cloudflare Workers** are projections — they're pushed FROM the monorepo
- **Sites** are projections — they're rendered FROM configuration in the monorepo
- Nothing exists independently — everything traces back to source of truth

### TASK 1: Projection Engine

Build/complete `src/services/projection-engine.js` to be the master orchestrator:

```javascript
// projection-engine.js must implement:
class ProjectionEngine {
  constructor(config) { /* φ-scaled configuration */ }
  
  // Detect what changed in monorepo since last projection
  async detectDelta(since) { /* git diff-based change detection */ }
  
  // Project to GitHub repos (14 active repos)
  async projectToGitHub(delta) {
    // For each -core and -production repo:
    // 1. Determine which monorepo paths map to this repo
    // 2. Copy/transform files
    // 3. Commit and push
  }
  
  // Project to Cloud Run (14+ services)
  async projectToCloudRun(delta) {
    // For each changed service:
    // 1. Build container
    // 2. Push to Artifact Registry
    // 3. Deploy to Cloud Run
  }
  
  // Project to Cloudflare Workers (5+ workers)
  async projectToCloudflare(delta) {
    // For each changed worker:
    // 1. Bundle with wrangler
    // 2. Deploy to Cloudflare
  }
  
  // Project all sites (24 web properties)
  async projectToSites(delta) {
    // For each site:
    // 1. Read site-registry.json config
    // 2. Generate HTML from template + config
    // 3. Deploy via Cloudflare or Cloud Run
  }
  
  // Full projection cycle
  async projectAll() {
    const delta = await this.detectDelta(this.lastProjection);
    await Promise.all([
      this.projectToGitHub(delta),
      this.projectToCloudRun(delta),
      this.projectToCloudflare(delta),
      this.projectToSites(delta)
    ]);
  }
}
```

### TASK 2: Repo-to-Monorepo Mapping

Create `configs/projection-map.json` that maps each external repo to its monorepo source:

```json
{
  "headysystems-core": {
    "source_paths": ["services/heady-web/sites/headyme/", "src/core/"],
    "repo": "HeadyMe/headysystems-core",
    "deploy_target": "cloudflare-worker:headysystems-site"
  },
  "headyos-core": {
    "source_paths": ["services/heady-web/sites/headyos/", "packages/kernel/"],
    "repo": "HeadyMe/headyos-core",
    "deploy_target": "cloudflare-worker:headyos-site"
  },
  "headymcp-core": {
    "source_paths": ["services/heady-mcp/", "src/mcp/", "packages/mcp-server/"],
    "repo": "HeadyMe/headymcp-core",
    "deploy_target": "cloud-run:heady-mcp"
  },
  "headybuddy-core": {
    "source_paths": ["services/heady-buddy/", "extensions/"],
    "repo": "HeadyMe/headybuddy-core",
    "deploy_target": "cloud-run:heady-buddy"
  },
  "headyconnection-core": {
    "source_paths": ["services/heady-web/sites/headyconnection-org/"],
    "repo": "HeadyMe/headyconnection-core",
    "deploy_target": "cloudflare-worker:headyconnection-site"
  },
  "headyapi-core": {
    "source_paths": ["workers/api-gateway/", "src/core/api-gateway/"],
    "repo": "HeadyMe/headyapi-core",
    "deploy_target": "cloudflare-worker:heady-api-gateway"
  },
  "headyio-core": {
    "source_paths": ["packages/sdk/", "apps/heady-io-docs/"],
    "repo": "HeadyMe/headyio-core",
    "deploy_target": "cloudflare-pages:headyio"
  },
  "headybot-core": {
    "source_paths": ["services/discord-bot/"],
    "repo": "HeadyMe/headybot-core",
    "deploy_target": "cloud-run:heady-bot"
  }
}
```

### TASK 3: Continuous Embedder Integration

Build/complete `src/services/continuous-embedder.js` that:

- Watches the monorepo for file changes (using fs.watch)
- Embeds every change into 3D vector space using all-MiniLM-L6-v2
- Stores embeddings in PostgreSQL with pgvector
- Uses φ-scaled intervals: embed every 11090ms, project every 29034ms
- Triggers projection-engine when embedding density gate (0.92) is met

### TASK 4: Bee Factory & Swarm

Build/complete `src/services/bee-factory.js` that:

- Spawns specialized worker bees for each projection target
- Uses Fibonacci batch sizes (1, 2, 3, 5, 8, 13) for parallel work
- Each bee has a CSL confidence score for task assignment
- Bees communicate via Redis pub/sub channels
- Self-healing: dead bees are respawned with φ-backoff

### TASK 5: Site Renderer

Build `src/services/site-renderer.js` that:

- Reads `src/sites/site-registry.json` for site configuration
- Renders each site from the unified template system
- Generates Sacred Geometry canvas animations per-site config
- Outputs static HTML/CSS/JS to deploy targets
- Supports all 12 site configs in the registry

### DELIVERABLES

Create a ZIP file named `05-liquid-architecture.zip` containing:

- `projection-engine.js` — Complete projection engine
- `projection-map.json` — Complete repo-to-monorepo mapping
- `continuous-embedder.js` — Embedding pipeline
- `bee-factory.js` — Swarm worker factory
- `site-renderer.js` — Static site generation
- `liquid-architecture-diagram.mermaid` — Visual architecture
- `projection-test-results.md` — Test plan and expected results
