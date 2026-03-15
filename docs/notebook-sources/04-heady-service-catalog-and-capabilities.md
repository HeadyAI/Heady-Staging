# Heady™ Service Catalog & Capabilities — NotebookLM Source
**Version:** 5.0 | **Updated:** March 15, 2026

## 50+ Services Inventory

### Core Intelligence Services
| Service | Purpose |
|---------|---------|
| heady-brain | Central AI reasoning engine |
| heady-brains | Multi-brain federation |
| heady-soul | Orchestration core |
| heady-conductor | Pipeline conductor |
| heady-infer | Inference engine (21 files) |
| heady-embed | Embedding service (11 files) |
| heady-memory | Memory persistence (3-tier: T0/T1/T2) |
| heady-vector | Vector operations (16 files) |
| heady-projection | Vector projection engine (22 files) |

### Agent & Bee Services
| Service | Purpose |
|---------|---------|
| heady-bee-factory | Dynamic bee creation (30+ bee types) |
| heady-hive | Bee coordination hub |
| heady-orchestration | 17-swarm orchestration |
| heady-federation | Agent federation across clouds |

### Security, Monitoring & User-Facing
| Service | Purpose |
|---------|---------|
| heady-guard | Security enforcement (20 files), 8 sanitization layers |
| heady-governance | Policy enforcement, audit logging |
| heady-health | Health monitoring (17 files), φ-scaled heartbeat |
| heady-eval | Evaluation engine (20 files), arena scoring |
| heady-web | Web platform (155 files), 9-site ecosystem |
| heady-buddy | Chat companion widget, cross-device sync |
| heady-onboarding | User onboarding (71 files) |
| heady-task-browser | Task management UI |
| heady-ui | Admin dashboard |

### Pipeline, Gateway & Integrations
| Service | Purpose |
|---------|---------|
| auto-success-engine | φ-scaled auto-success (144 tasks, 13 categories, 29,034ms) |
| hcfullpipeline-executor | 21-stage pipeline execution |
| ai_router | Multi-model AI routing (Claude/GPT/Gemini/O1/Sonar/Groq) |
| model_gateway | CSL-scored model selection |
| mcp_server | MCP protocol server (streamable-http, SSE, WebSocket, stdio) |
| perplexity_mcp | Perplexity Enterprise Max MCP |
| heady-midi | MIDI/creative interface (24 files) |

**Every service MUST have:** /health endpoint, HeadyAutoContext enrichment, φ-scaled timeouts, structured logging with correlation IDs, OpenTelemetry spans, bulkhead pattern.

## 50+ Agentic Skills

### Core Skills (16)
heady-bee-agent-factory, heady-agent-orchestration, heady-liquid-gateway, heady-knowledge-ingestion, vector-memory-graph-rag, phi-exponential-backoff, circuit-breaker-resilience, self-awareness-telemetry, heady-memory-knowledge-os, heady-companion-memory, heady-gateway-routing, heady-ide-control-plane, heady-mcp-streaming-interface, heady-reliability-orchestrator, heady-self-healing-lifecycle, heady-research.

### Extended Skills (35+)
heady-auto-flow, heady-battle-arena, heady-bee-swarm-ops, heady-cloud-orchestrator, heady-code-generation, heady-cognitive-runtime, heady-connector-vault, heady-csl-engine, heady-deep-scan, heady-deployment, heady-drift-detection, heady-drupal-headless-ops, heady-edge-ai, heady-embedding-router, heady-fintech-trading, heady-graph-rag-memory, heady-hybrid-vector-search, heady-incident-ops, heady-intelligence-analytics, heady-middleware-armor, heady-midi-creative, heady-monetization-platform, heady-nonprofit-ops, heady-perplexity, heady-phi-math-foundation, heady-pqc-security, heady-prompt-orchestration, heady-sandbox-execution, heady-security-audit, heady-semantic-backpressure, heady-task-decomposition, heady-trading-intelligence, heady-vector-projection, heady-voice-relay, heady-vsa-hyperdimensional.

## Security & Authentication
- OAuth 2.0 via Cloudflare Edge (Hono), full redirect-based flow
- Firebase Auth: Google OAuth + Email/Password + Anonymous
- Session Minting: sk_heady_<uuid> keys in KV (7-day TTL)
- CSRF Protection: Non-deterministic state tokens (5-min TTL)
- Cross-Domain Auth: Shared tokens via relay iframe + postMessage
- 8 Sanitization Layers: Zod → ESLint → DOMPurify → SQL Injection → XSS (CSP) → SSRF → Path Traversal → TruffleHog

## Deployment Targets
| Platform | Identifier | Region |
|----------|-----------|--------|
| Cloud Run | gen-lang-client-0920560496 | us-east1 |
| Cloudflare Workers | Account 8b1fa38f282c691423c6399247d53323 | Global edge |
| Firebase | Project gen-lang-client-0920560496 | — |
| GitHub | github.com/HeadyMe | — |

## Multi-Model AI Council
Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro, O1 Pro, Sonar Pro, Groq, Workers AI. All routing via CSL scoring — no priority-based model selection.
