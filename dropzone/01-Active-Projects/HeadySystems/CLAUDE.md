# HEADY SYSTEMS | CLAUDE CODE INTEGRATION PROTOCOL

> **Updated:** 2026-03-17 · **Version:** 4.1.0 · **Sacred Geometry v4.0**
> © 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## SYSTEM IDENTITY

You are operating inside the **HeadyMonorepo** — the canonical implementation of
**HCFullPipeline v7** and the **Heady Conductor-Orchestrator** system.

This is a **Liquid Latent OS** — every decision a vector, every threshold φ-derived.
All components map into continuous 3D vector space with 384D embeddings.

## TECH STACK

- **Gateway:** Node.js (Express) — `services/heady-gateway/` on port 3330
- **Manager:** Node.js (Express, MCP Protocol) — `heady-manager.js` on port 3301
- **Brain:** Node.js — `packages/hc-brain/` on port 3302
- **Conductor:** TypeScript — `packages/heady-conductor/` on port 3303
- **HeadyWeb:** React + Webpack Module Federation — `apps/headyweb/` on port 3300
- **HeadyBuddy:** Backend Node.js — `services/heady-buddy/` on port 3310
- **HeadyAI-IDE:** React + Monaco — `HeadyAI-IDE/` on port 3320
- **Persistence:** TypeScript — `packages/heady-persistence/` on port 3340
- **Frontend:** React with Sacred Geometry Aesthetics (Rounded, Organic, Breathing)
- **Pipeline Engine:** HCFullPipeline v7 — 21-stage state machine
- **Edge:** Cloudflare Workers, Pages, KV, Vectorize, Durable Objects, Workers AI
- **Origin:** Cloud Run (us-east1, project gen-lang-client-0920560496)
- **Auth:** Firebase
- **Database:** PostgreSQL + pgvector (HNSW m=21, ef_construction=89)
- **Cache:** Upstash Redis
- **Latent Space:** 3 Colab Pro+ (Vector:3301, LLM:3302, Train:3303)
- **Tunnels:** vector.headyos.com, llm.headyos.com, train.headyos.com

## 9 DOMAINS

headyme.com, headysystems.com, headyconnection.org, headybuddy.org,
headymcp.com, headyio.com, headybot.com, headyapi.com, heady-ai.com

## CRITICAL PATHS

| Path | Purpose |
|------|---------|
| `services/heady-gateway/` | Central API Gateway — CSL-routed, phi-scaled rate limiting |
| `heady-manager.js` | Node.js MCP server & API gateway (port 3301) |
| `packages/heady-conductor/` | HeadyConductor — task routing, node selection |
| `packages/heady-persistence/` | User Persistence — CRDT sync, sessions, state |
| `packages/kernel/` | Liquid Kernel — 6-layer boot sequence |
| `apps/headyweb/` | HeadyWeb Browser — Comet/Chromium hybrid, 7 micro-frontends |
| `HeadyAI-IDE/` | HeadyAI-IDE — Windsurf/Antigravity hybrid |
| `headybuddy-mobile/` | HeadyBuddy Android — Island-style work profile |
| `apps/desktop/` | HeadyBuddy Desktop — Tauri app |
| `heady-buddy/` | HeadyBuddy Web Widget |
| `packages/hc-supervisor/` | Multi-agent Supervisor pattern |
| `packages/csl-engine/` | Continuous Semantic Logic engine |
| `packages/heady-memory/` | 384D vector memory operations |
| `packages/heady-sacred-geometry-sdk/` | Sacred Geometry design system |
| `configs/` | All YAML configs (pipeline, services, governance) |
| `services/SERVICE_INDEX.json` | Service registry (175 services) |

## PHI-MATH CONSTANTS

```
PHI = 1.618, PSI = 0.618
FIB = [0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987]
CSL: MINIMUM=0.500, LOW=0.691, MEDIUM=0.809, HIGH=0.882, CRITICAL=0.927, DEDUP=0.972
Pools: Hot=34%, Warm=21%, Cold=13%, Reserve=8%, Governance=5%
Backoff: attempt → PHI^attempt × base (jitter ±38.2%)
```

## HCFULLPIPELINE v7 — 21 STAGES

```
CHANNEL_ENTRY → AUTH_GATE → INTENT_CLASSIFY → CONTEXT_ASSEMBLE →
NODE_SELECT → CSL_GATE → BATTLE_DISPATCH → MC_SAMPLE →
BEE_DISPATCH → SWARM_ROUTE → EXECUTE → QUALITY_GATE →
ASSURANCE_GATE → PATTERN_CAPTURE → DRIFT_CHECK → STORY_UPDATE →
GOVERNANCE_LOG → COST_TALLY → CACHE_WRITE → RESPONSE_SHAPE → RECEIPT
```

Path variants: FAST_PATH(7), FULL_PATH(21), ARENA_PATH(9), LEARNING_PATH(7)

## SACRED GEOMETRY TOPOLOGY

```
Center:     HeadySoul
Inner:      Conductor, Brains, Vinci, AutoSuccess
Middle:     JULES, BUILDER, OBSERVER, MURPHY, ATLAS, PYTHIA
Outer:      BRIDGE, MUSE, SENTINEL, NOVA, JANITOR, SOPHIA, CIPHER, LENS
Governance: Check, Assure, Aware, Patterns, MC, Risks
```

## CODING CONVENTIONS

1. **Zero console.log** — Use `pino` structured JSON logging with correlation IDs
2. **Zero localStorage** — Use `sessionStorage` + httpOnly secure cookies
3. **Zero hardcoded URLs** — Use environment variables and service discovery
4. **Zero TODOs/FIXMEs** — Complete code or documented technical debt
5. **Zero magic numbers** — All constants phi-derived or Fibonacci-indexed
6. **Every service has /health** — Returns `{ status, coherenceScore, version }`
7. **CSL gates on all routing** — Minimum confidence 0.500 to proceed
8. **Structured observability** — JSON logs, correlation IDs, metrics
9. **Security by default** — Input validation, explicit CORS, secrets in env
10. **Swarm-ready** — BaseHeadyBee lifecycle: spawn→execute→report→retire

## ENVIRONMENT VARIABLES

See `.env.example` for the complete list. Key variables:

```bash
DATABASE_URL=              # PostgreSQL + pgvector
REDIS_URL=                 # Upstash Redis
FIREBASE_PROJECT_ID=       # Firebase Auth
JWT_SECRET=                # Session signing
ANTHROPIC_API_KEY=         # Claude
OPENAI_API_KEY=            # GPT models
GOOGLE_AI_API_KEY=         # Gemini
GCP_PROJECT_ID=            # Cloud Run
```

## COMMANDS

```bash
# Start the gateway
node services/heady-gateway/src/server.js

# Start the manager
node heady-manager.js

# Build HeadyWeb
cd apps/headyweb && npm run build

# Build HeadyAI-IDE
cd HeadyAI-IDE && npm run build

# Docker full stack
docker-compose up

# Health check all services
curl http://localhost:3330/health | jq .

# Run tests
npx turbo run test
```

## 3 UNBREAKABLE LAWS

1. **Structural Integrity** — Compiles, passes type checks, respects module boundaries
2. **Semantic Coherence** — Embedding stays within cosine 0.809 of intended design
3. **Mission Alignment** — Serves HeadyConnection's mission (community, equity, empowerment)
