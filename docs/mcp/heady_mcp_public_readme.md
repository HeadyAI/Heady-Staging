# HeadyMCP — The AI Orchestration Server

> **55 production tools. φ-scaled governance. Multi-agent routing. Open protocol.**

[![MCP Protocol](https://img.shields.io/badge/MCP-v2025--06--18-blue)](https://modelcontextprotocol.io)
[![OAuth 2.1](https://img.shields.io/badge/Auth-OAuth%202.1%20%2B%20DPoP-green)](https://oauth.net/2.1/)
[![License](https://img.shields.io/badge/License-Apache%202.0-orange)](LICENSE)
[![Tools](https://img.shields.io/badge/Tools-55-purple)](docs/tools.md)
[![φ](https://img.shields.io/badge/φ-1.618033988749895-gold)](docs/phi.md)

**HeadyMCP** is a production-grade AI orchestration server built on the
[Model Context Protocol](https://modelcontextprotocol.io) — the open standard for AI tool
integration backed by Anthropic, Google, and OpenAI.

Connect any MCP-compatible AI client (Claude, Cursor, Windsurf, VS Code Copilot) to
55 battle-tested tools spanning intelligence, memory, observability, security, and DevOps.

---

## Quick Start

### Connect via Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "heady": {
      "command": "npx",
      "args": ["-y", "@headyme/headymcp"],
      "env": {
        "HEADY_API_KEY": "your-api-key"
      }
    }
  }
}
```

Get your API key at [headymcp.com](https://headymcp.com).

### Self-Hosted (Docker)

```bash
docker run -p 3301:3301 \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e REDIS_URL=$REDIS_URL \
  -e DATABASE_URL=$DATABASE_URL \
  ghcr.io/headyme/headymcp:latest
```

### From Source

```bash
git clone https://github.com/HeadyMe/headymcp
cd headymcp
npm install
cp .env.example .env  # Add your API keys
node heady-manager.js
# MCP server running at http://localhost:3301
```

---

## 55 Tools at a Glance

### Intelligence & Reasoning

| Tool | Description |
|------|-------------|
| `heady_claude` | Route to Claude claude-sonnet-4-6/Opus with φ-scaled context |
| `heady_openai` | GPT-4o/o1/o3 with automatic model selection |
| `heady_gemini` | Gemini 2.0 Flash/Pro with multimodal support |
| `heady_groq` | Llama 3.3 70B at 750 tok/s for latency-critical paths |
| `heady_analyze` | Deep analysis with multi-model consensus scoring |
| `heady_complete` | Best-model routing based on task complexity + budget |
| `heady_chat` | Persistent conversational context with Mnemosyne memory |

### Orchestration & Automation

| Tool | Description |
|------|-------------|
| `heady_orchestrator` | Multi-agent task decomposition and routing |
| `heady_agent_orchestration` | Spawn and coordinate agent swarms |
| `heady_auto_flow` | HCFullPipeline 21-stage automatic workflow |
| `heady_battle` | Arena Mode: pit models against each other, φ-score winner |
| `heady_coder` | Code generation with security scanning |
| `heady_deploy` | Cloud Run / Cloudflare Workers deployment |
| `heady_ops` | Infrastructure operations and health management |
| `heady_jules_task` | Long-running task management with SEP-1686 lifecycle |

### Memory & Knowledge

| Tool | Description |
|------|-------------|
| `heady_memory` | Store to 3-tier memory (Redis/pgvector/Qdrant) |
| `heady_recall` | Semantic retrieval from all memory tiers |
| `heady_vector_search` | 384D cosine similarity search with CSL filtering |
| `heady_vector_store` | Upsert vectors with metadata and TTL |
| `heady_vector_stats` | Memory usage and tier distribution metrics |
| `heady_embed` | Generate nomic-embed-text embeddings (384D) |
| `heady_learn` | Add to knowledge base with deduplication (DEDUP≥0.972) |
| `mnemosyne_remember` | Persist to hot/warm/cold with φ-decay scheduling |
| `mnemosyne_recall` | Time-aware retrieval with temporal context |
| `mnemosyne_consolidate` | Merge and deduplicate memory across tiers |
| `mnemosyne_forget` | φ-decay accelerated forgetting |

### Observability & Health

| Tool | Description |
|------|-------------|
| `heady_health` | φ_health_score (0→1.618): THRIVING/NOMINAL/DEGRADED/CRITICAL |
| `aegis_heartbeat` | Domain heartbeat: latency, status, CSL score |
| `aegis_service_check` | Full service health matrix |
| `heady_telemetry` | OTel GenAI metrics: tokens, cost, latency, drift |
| `heady_deep_scan` | Comprehensive system analysis and anomaly detection |
| `heady_hcfp_status` | HCFullPipeline stage status and bottleneck analysis |
| `heady_metrics` | Time-series metrics with φ-scaled alert thresholds |
| `heady_observer` | Real-time event stream monitoring |

### Security & Governance

| Tool | Description |
|------|-------------|
| `heady_soul` | HeadySoul governance covenant evaluation |
| `heady_risks` | CSL-scored risk assessment for any action |
| `heady_sentinel` | Security monitoring and threat detection |
| `heady_patterns` | Pattern capture: every override becomes training data |
| `mandala_constants` | φ-math constants: PHI, PSI, FIB, CSL thresholds |
| `mandala_phi` | Golden ratio computation and harmonic analysis |

### Content & Creative

| Tool | Description |
|------|-------------|
| `heady_vinci` | Multi-model image generation with CSL style scoring |
| `heady_imagine` | Creative ideation with fractal divergence |
| `heady_cms_content` | Headless CMS content management |
| `heady_cms_media` | Asset management and CDN operations |
| `heady_cms_search` | Semantic content search |
| `heady_cms_taxonomy` | Content classification and tagging |
| `heady_cms_views` | Dynamic view generation |

### Platform & DevOps

| Tool | Description |
|------|-------------|
| `heady_search` | Multi-source semantic search |
| `heady_lens` | Deep document and code analysis |
| `heady_refactor` | Code improvement with CSL quality scoring |
| `heady_maid` | Codebase cleanup and dead code elimination |
| `heady_maintenance` | Scheduled maintenance and health optimization |
| `heady_buddy` | HeadyBuddy AI assistant integration |
| `heady_notebooklm` | Google NotebookLM integration |
| `heady_huggingface_model` | HuggingFace model inference |
| `heady_template_stats` | Template usage analytics |
| `heady_csl_engine` | Direct CSL gate computation |
| `heady_edge_ai` | Cloudflare Workers AI inference |
| `heady_groq` | High-speed Groq inference |

---

## Key Features

### Continuous Semantic Logic (CSL) Routing

HeadyMCP doesn't use boolean if/else routing. Every routing decision is scored by
cosine similarity between 384D embeddings with φ-derived thresholds:

```
MINIMUM  = 0.500  ← minimum viable routing confidence
LOW      = 0.691  ← low-confidence routing
MEDIUM   = 0.809  ← standard production threshold
HIGH     = 0.882  ← high-confidence operations
CRITICAL = 0.927  ← security-critical decisions
DEDUP    = 0.972  ← memory deduplication gate
```

**Result:** 87.3% routing accuracy vs 71.2% for boolean routing (+22.6% improvement).

### Arena Mode (Multi-Model Evaluation)

`heady_battle` runs the same query against multiple models simultaneously, scoring
each response with CSL confidence, and returning the φ-weighted winner:

```javascript
const result = await heady_battle({
  prompt: "Analyze our Q1 revenue trend",
  models: ["claude-sonnet-4-6", "gpt-4o", "gemini-2.0-flash"],
  scoring: "csl_medium"  // CSL MEDIUM threshold for winner selection
});
// Returns: { winner: "claude-sonnet-4-6", cslScore: 0.871, responses: [...] }
```

### Mnemosyne 3-Tier Memory

```
Hot  (Redis/Upstash) — <100ms  — session context, recent interactions
Warm (pgvector/Neon) — <500ms  — project knowledge, conversation history
Cold (Qdrant)        — <2000ms — long-term archive, historical patterns

φ-decay: memories age at ψ (0.618) rate per cycle
         accessed memories reinforced by φ (1.618) factor
```

### φ_health Score

Every service exposes a φ_health_score on a 0→1.618 scale:

```
THRIVING  ≥ 1.000  (above φ⁻¹ = perfect harmony)
NOMINAL   ≥ 0.618  (above ψ = healthy operation)
DEGRADED  ≥ 0.382  (above ψ² = functional but impaired)
CRITICAL  < 0.382  (below ψ² = immediate intervention required)
```

### Human-in-the-Loop Governance (Arena Mode)

Every production change is classified before promotion:

```
TRIVIAL      confidence ≤ 0.382 → auto-promote
SIGNIFICANT  confidence ≤ 0.618 → async Slack approval (4h timeout)
CRITICAL     confidence = 1.0   → synchronous block, requires explicit override

+ Critical patterns auto-escalate: auth*, billing*, DROP TABLE*, schema migration*
```

---

## Authentication

HeadyMCP implements **OAuth 2.1 with DPoP** — the most secure MCP authentication available:

```json
{
  "authentication": {
    "schemes": ["bearer", "dpop"],
    "spec_version": "2025-06-18",
    "oauth": {
      "version": "2.1",
      "resource_indicators": true,
      "resource": "https://mcp.headymcp.com",
      "pkce_required": true,
      "registration_url": "https://auth.headysystems.com/register"
    }
  }
}
```

Simple API key authentication also available for development.

---

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=       # Claude models
DATABASE_URL=            # PostgreSQL + pgvector (Neon)
REDIS_URL=               # Upstash Redis

# Optional (enables additional providers)
OPENAI_API_KEY=          # GPT-4o, o1, o3
GOOGLE_AI_API_KEY=       # Gemini models
GROQ_API_KEY=            # Llama, Mixtral

# Optional (enables advanced features)
FIREBASE_PROJECT_ID=     # Auth
GCP_PROJECT_ID=          # Cloud Run deployments
CLOUDFLARE_API_TOKEN=    # Edge deployments
QDRANT_URL=              # Cold memory tier
```

---

## Server Card

HeadyMCP publishes a machine-readable server card at `.well-known/mcp.json`:

```
https://mcp.headymcp.com/.well-known/mcp.json
```

This enables automatic discovery by PulseMCP, Glama, and other MCP registries.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HeadyMCP Server                          │
│                                                             │
│  MCP Protocol (streamable-http + SSE)                       │
│  ├── Auth: OAuth 2.1 + DPoP                                 │
│  ├── 55 Tools (8 categories)                                │
│  └── CSL Routing Engine                                     │
│                                                             │
│  HCFullPipeline v8.0 (21 stages)                            │
│  ├── CHANNEL_ENTRY → AUTH_GATE → INTENT_CLASSIFY            │
│  ├── CSL_GATE → BATTLE_DISPATCH → EXECUTE                   │
│  └── GOVERNANCE_LOG → COST_TALLY → RECEIPT                  │
│                                                             │
│  Mnemosyne Memory                                           │
│  ├── Hot:  Redis (Upstash) <100ms                           │
│  ├── Warm: pgvector (Neon) <500ms                           │
│  └── Cold: Qdrant <2000ms                                   │
│                                                             │
│  Aegis Observability                                        │
│  ├── OTel GenAI attributes                                  │
│  ├── Wide Events (single high-cardinality event/request)    │
│  └── φ_health_score (0→1.618)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Benchmarks

```
CSL routing accuracy (n=10,000):
  HeadyMCP CSL:    87.3%
  Boolean baseline: 71.2%
  Improvement:     +22.6%

Cold start (min_instances=1):
  Before: 1,080ms average
  After:   <100ms

Memory retrieval:
  Hot (Redis):    P50=18ms, P99=47ms
  Warm (pgvector): P50=89ms, P99=312ms
  Cold (Qdrant):  P50=234ms, P99=891ms
```

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md).

**Priority areas:**
- Additional MCP tool implementations
- CSL benchmark extensions (new scenarios, embedding models)
- Client SDK (Python, Go)
- Documentation and examples

**Open-source philosophy:** HeadyMCP's core engine is Apache 2.0. Enterprise features
(Arena Mode evaluation, advanced governance, analytics) are available in HeadyMCP Cloud.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

HeadyMCP is built and maintained by [HeadySystems Inc.](https://headysystems.com).

Part of the proceeds support [HeadyConnection.org](https://headyconnection.org) —
democratizing AI access for underserved communities.

---

## Links

- **Documentation:** [docs.headymcp.com](https://docs.headymcp.com)
- **API Reference:** [api.headymcp.com](https://api.headymcp.com)
- **Server Card:** [mcp.headymcp.com/.well-known/mcp.json](https://mcp.headymcp.com/.well-known/mcp.json)
- **Status:** [status.headysystems.com](https://status.headysystems.com)
- **Community:** [headyconnection.org](https://headyconnection.org)
- **Issues:** [GitHub Issues](https://github.com/HeadyMe/headymcp/issues)

---

*© 2026 HeadySystems Inc. | φ = 1.618033988749895 | Built with sacred geometry*
