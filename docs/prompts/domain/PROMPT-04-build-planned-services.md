# PROMPT 4: Build All Planned-Stage Services & Packages

## For: Perplexity Computer

## Objective: Build every service, package, and component currently in planned/stub status into fully functional production code

---

## INSTRUCTIONS FOR PERPLEXITY COMPUTER

You are building out every planned/incomplete component in the Heady™ monorepo. Nothing should remain as a stub, placeholder, or TODO. Everything must be real, functional, production code.

**READ THE ATTACHED CONTEXT FILES FIRST** — especially `00-HEADY-MASTER-CONTEXT.md`, `package.json`, and `manifest.monorepo.json`.

### SACRED RULES FOR ALL CODE

- φ = 1.618033988749895 (Golden Ratio) — use for ALL numeric constants
- Fibonacci sequence for ALL counts: 1,1,2,3,5,8,13,21,34,55,89,144
- CSL gates replace boolean logic — confidence-weighted decisions [0,1]
- No `localhost` references — all URLs point to Cloud Run or Cloudflare
- Node.js 20+ with CommonJS (require/module.exports) unless package specifies ESM
- Every service MUST have `/health/live` endpoint
- Every file MUST have the Heady™Systems Inc. copyright header

### BUILD 1: Complete the Thin Services

These services exist but have minimal files. Build them into full production services:

#### `services/heady-federation/` (currently 1 file → target 8+ files)

Build a federation service that:

- Manages cross-organization AI agent federation
- Implements federated learning aggregation with φ-scaled weights
- Provides trust scoring between federated nodes using CSL gates
- Has API endpoints: `/api/federation/join`, `/api/federation/sync`, `/api/federation/trust`
- Connects to PostgreSQL for federation state and Redis for real-time sync

#### `services/heady-hive/` (currently 1 file → target 8+ files)

Build a hive orchestration service that:

- Manages bee swarm allocation using Fibonacci batch sizes
- Implements hive-level task decomposition with CSL priority scoring
- Coordinates across all 20 AI nodes
- Has API endpoints: `/api/hive/spawn`, `/api/hive/status`, `/api/hive/assign`
- Uses Redis pub/sub for bee communication channels

#### `services/heady-orchestration/` (currently 2 files → target 10+ files)

Build a complete orchestration engine that:

- Implements DAG-based task execution with topological sort
- Uses CSL cosine similarity for task-to-agent matching
- Supports parallel execution with φ-scaled concurrency limits
- Has API endpoints: `/api/orchestration/plan`, `/api/orchestration/execute`, `/api/orchestration/status`
- Connects to heady-conductor for high-level orchestration

#### `services/heady-pilot-onboarding/` (currently 3 files → target 8+ files)

Build the pilot onboarding flow:

- Multi-step wizard with Sacred Geometry themed UI
- API key provisioning for pilot users
- Usage tier selection (Fibonacci-stepped: free, starter-8, pro-21, enterprise-55)
- Integration with heady-onboarding auth system
- Endpoints: `/api/pilot/register`, `/api/pilot/provision`, `/api/pilot/status`

### BUILD 2: Complete the Packages

#### `packages/core/` (currently empty)

Build the Heady™ core package:

- Re-exports from phi-math, csl-router, kernel
- Provides `createHeadyInstance()` factory
- Exports all type definitions
- package.json with `@heady-ai/core`

#### `packages/phi-math-foundation/` (currently 1 file)

Expand to full implementation:

- `phi.js` — φ constant, fibonacci(), phiPow(), phiScale()
- `fibonacci.js` — Generator, nth, nearest, range
- `sacred-geometry.js` — Flower of Life, Metatron's Cube, Sri Yantra coordinate generators
- `index.js` — Re-exports
- Tests for all functions

### BUILD 3: Complete the Apps

#### `apps/command-center/` (currently 1 file)

Build a full command center UI:

- Real-time dashboard showing all 25 services health
- Service dependency graph visualization
- Live log streaming from each service
- One-click deploy/restart buttons
- Sacred Geometry themed dark mode UI
- Built with vanilla JS + CSS (no frameworks)

#### `apps/heady-io-docs/` (currently 1 file)

Build a complete developer documentation site:

- Auto-generated from JSDoc comments in source
- API reference for all 25 services
- Getting started guide
- SDK integration examples
- Built with vanilla HTML/CSS/JS

#### `apps/heady-mcp-portal/` (currently 1 file)

Build an MCP tool marketplace UI:

- Lists all 31+ MCP tools with descriptions
- Tool testing playground
- Usage analytics dashboard
- Tool installation/configuration wizard

### BUILD 4: Workers & Edge

#### `cloudflare/heady-edge-proxy/` (currently empty)

Build the edge proxy worker:

- Routes requests to correct Cloud Run service based on domain
- Implements KV caching with φ-scaled TTL
- Request/response transformation
- Rate limiting using Fibonacci burst rates

### BUILD 5: Discord Bots

Verify and build the Discord bot services:

- `services/discord-bot/` — Main Heady Discord bot with slash commands
- Integration with heady-brain for AI responses
- Integration with heady-memory for context persistence

### DELIVERABLES

Create a ZIP file named `04-built-planned-services.zip` containing:

- Every new/expanded file organized by its monorepo path
- `build-manifest.json` — List of every file created/modified with line counts
- `dependency-additions.json` — New npm dependencies needed
- `deployment-order.md` — Correct order to deploy new services (respecting dependencies)
- `test-commands.md` — Commands to verify each new service works
