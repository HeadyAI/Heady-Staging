# Capabilities Scan: Skills, Swarms, Bees, Services, Tools, MCP

**Repository:** remote-headyme-main
**Audit date:** 2026-03-10

---

## 1. Skills

### Skill Definitions (`skills/` directory — 25 skills)

Each skill has a `SKILL.md` definition file. These are Claude Code agent skills.

| Skill Directory | Purpose (from directory name) |
|---|---|
| `skills/heady-context-window-manager/` | Context window management for agents |
| `skills/heady-csl-engine/` | Cognitive Semantic Logic engine operations |
| `skills/heady-drupal-content-sync/` | Drupal CMS content synchronization |
| `skills/heady-durable-agent-state/` | Persistent agent state management |
| `skills/heady-embedding-router/` | Embedding model routing |
| `skills/heady-firebase-auth-orchestrator/` | Firebase authentication orchestration |
| `skills/heady-graph-rag-memory/` | Graph-based RAG memory system |
| `skills/heady-hybrid-vector-search/` | Hybrid vector search operations |
| `skills/heady-mcp-gateway-zero-trust/` | Zero-trust MCP gateway management |
| `skills/heady-monetization-platform/` | Monetization and billing platform |
| `skills/heady-perplexity-code-review/` | Perplexity-powered code review |
| `skills/heady-perplexity-competitor-intel/` | Competitor intelligence via Perplexity |
| `skills/heady-perplexity-computer-use/` | Computer use via Perplexity |
| `skills/heady-perplexity-content-generation/` | Content generation via Perplexity |
| `skills/heady-perplexity-deep-research/` | Deep research via Perplexity |
| `skills/heady-perplexity-domain-benchmarker/` | Domain benchmarking via Perplexity |
| `skills/heady-perplexity-eval-orchestrator/` | Eval orchestration via Perplexity |
| `skills/heady-perplexity-feedback-loop/` | Feedback loop via Perplexity |
| `skills/heady-perplexity-multi-agent-eval/` | Multi-agent eval via Perplexity |
| `skills/heady-perplexity-patent-search/` | Patent search via Perplexity |
| `skills/heady-perplexity-rag-optimizer/` | RAG optimization via Perplexity |
| `skills/heady-phi-math-foundation/` | Phi/golden-ratio math foundations |
| `skills/heady-sacred-geometry-css-generator/` | Sacred geometry CSS generation |
| `skills/heady-semantic-backpressure/` | Semantic backpressure management |
| `skills/heady-task-decomposition/` | Task decomposition engine |

### Additional Skill Definitions (top-level `heady-*` dirs with `SKILL.md`)

| Directory | Purpose |
|---|---|
| `heady-a2a-protocol/` | Agent-to-Agent protocol |
| `heady-bee-swarm-ops/` | Bee swarm operations |
| `heady-buddy-device/` | Companion device integration |
| `heady-cloud-orchestrator/` | Cloud orchestration |
| `heady-cognitive-runtime/` | Cognitive runtime management |
| `heady-connector-vault/` | Connector/credentials vault |
| `heady-digital-presence/` | Digital presence management |
| `heady-drift-detection/` | Configuration drift detection |
| `heady-fintech-trading/` | Fintech/trading operations |
| `heady-incident-ops/` | Incident response operations |
| `heady-intelligence-analytics/` | Intelligence analytics |
| `heady-microfrontend-portal/` | Microfrontend portal |
| `heady-middleware-armor/` | Middleware security hardening |
| `heady-midi-creative/` | MIDI creative operations |
| `heady-nonprofit-ops/` | Nonprofit operations |
| `heady-pqc-security/` | Post-quantum cryptography security |
| `heady-resilience-cache/` | Resilience caching |
| `heady-sandbox-execution/` | Sandbox execution environment |
| `heady-vector-projection/` | Vector projection operations |
| `heady-voice-relay/` | Voice relay |

### `.agents/skills/` (77 agent skills)

The `.agents/skills/` directory contains 77 subdirectories, each an agent skill. Representative entries:

- `heady-agent-factory`, `heady-agent-orchestration`, `heady-a2a-protocol`
- `heady-bee-swarm-ops`, `heady-battle-arena`, `heady-continuous-action`
- `heady-mcp-gateway-zero-trust`, `heady-mcp-streaming-interface`
- `heady-perplexity-*` (12 Perplexity integration skills)
- `heady-deep-scan`, `heady-security-audit`, `heady-self-healing-lifecycle`
- `heady-sovereign-identity-byok`, `heady-vsa-hyperdimensional-computing`

### Skill Routing Code

| File Path | Purpose |
|---|---|
| `src/orchestration/skill-router.js` | Routes tasks to appropriate skills |
| `src/bees/skill-router-v2.js` | V2 skill router (bee-based) |
| `src/hc_skill_executor.js` | Skill execution engine |
| `configs/agent-profiles/skills-registry.yaml` | Skills registry configuration |

---

## 2. Swarm System

### Swarm Orchestration

| File Path | Purpose |
|---|---|
| `swarm-coordinator.js` (root, 44 KB) | Main swarm coordinator |
| `seventeen-swarm-orchestrator.js` (root, 24 KB) | 17-swarm orchestrator |
| `src/orchestration/swarm-coordinator.js` | Swarm coordination (src copy) |
| `src/orchestration/seventeen-swarm-orchestrator.js` | 17-swarm orchestrator (src copy) |
| `src/orchestration/swarm-consensus.js` | Swarm consensus protocol |
| `src/orchestration/swarm-consensus-v2.js` | Consensus v2 |
| `src/orchestration/swarm-ignition.js` | Swarm bootstrap/ignition |
| `src/orchestration/swarm-intelligence.js` | Swarm intelligence layer |
| `src/orchestration/swarm-message-bus.js` | Inter-swarm message bus |
| `src/services/swarm-dashboard.js` | Swarm monitoring dashboard |
| `src/services/swarm-matrix.js` | Swarm topology matrix |
| `src/services/autocontext-swarm-bridge.js` | Auto-context bridge for swarms |
| `src/projection/projection-swarm.js` | Swarm projection system |
| `scripts/heady-swarm-ignition.sh` | Swarm startup script |
| `data/swarm-nudges.json` | Swarm nudge/signal data |

### Swarm Topology & Configuration

| File Path | Purpose |
|---|---|
| `heady-cognition/topology/SWARMS-01-06-management-functional.md` | Swarms 1-6: management/functional |
| `heady-cognition/topology/SWARMS-07-17-business-reality-math.md` | Swarms 7-17: business/reality/math |
| `configs/HeadySwarmMatrix.json` | Swarm matrix configuration |
| `migrations/006_swarm_topology.sql` | Swarm topology DB schema |
| `migrations/seed/seed-swarm-taxonomy.sql` | Swarm taxonomy seed data |

---

## 3. Bee System

### Bee Factory

| File Path | Purpose |
|---|---|
| `bee-factory.js` (root, 27 KB) | Main bee factory |
| `src/bees/bee-factory.js` | Bee factory (src) |
| `src/bees/bee-factory-v2.js` | Bee factory v2 |
| `src/bees/dynamic-bee-factory-enhanced.js` | Enhanced dynamic bee factory |
| `src/orchestration/bee-factory.js` | Orchestration-level factory |
| `packages/heady-bee-factory/` | Bee factory as shared package |
| `services/heady-bee-factory/` | Bee factory microservice |
| `scripts/generate-bee.js` | Bee generator script |
| `src/bees/bee-template.js` | Bee template base class |
| `src/bees/semantic-bee-dispatcher.js` | Semantic routing for bees |
| `templates/template-swarm-bee/` | Template for new swarm bees |

### Individual Bees (~70+ in `src/bees/`)

Representative bee agents:

| Bee File | Purpose |
|---|---|
| `src/bees/orchestration-bee.js` | Orchestration management |
| `src/bees/security-bee.js` | Security operations |
| `src/bees/memory-bee.js` | Memory management |
| `src/bees/intelligence-bee.js` | Intelligence gathering |
| `src/bees/deployment-bee.js` | Deployment automation |
| `src/bees/creative-bee.js` | Creative content generation |
| `src/bees/governance-bee.js` | Governance enforcement |
| `src/bees/health-bee.js` | Health monitoring |
| `src/bees/mcp-bee.js` | MCP integration |
| `src/bees/pipeline-bee.js` | Pipeline operations |
| `src/bees/telemetry-bee.js` | Telemetry/observability |
| `src/bees/trading-bee.js` | Trading operations |
| `src/bees/credential-bee.js` | Credential management |
| `src/bees/vector-ops-bee.js` | Vector operations |
| `src/bees/brain-bee.js` | Brain/reasoning |
| `src/bees/judge-bee.js` | Evaluation/judging |
| `src/bees/evolution-bee.js` | Self-evolution |
| `src/bees/pqc-bee.js` | Post-quantum crypto |
| `src/bees/graph-rag-bee.js` | Graph RAG operations |
| `src/bees/self-healing-swarm-bee.js` (in `src/resilience/`) | Self-healing operations |
| `src/bees/full-cloud-deploy-swarm-bee.js` | Full cloud deployment swarm |
| `src/bees/valuation-report-swarm-bee.js` | Valuation reporting |

---

## 4. Services (58 microservices in `services/`)

### AI & ML Services

| Service | Purpose |
|---|---|
| `services/ai_router/` | AI model routing |
| `services/model_gateway/` | Model API gateway |
| `services/heady-infer/` | Inference service |
| `services/heady-embed/` | Embedding service |
| `services/heady-eval/` | Evaluation service |
| `services/heady-brain/` | Brain/reasoning service |
| `services/heady-brains/` | Multi-brain service |
| `services/heady-vector/` | Vector operations service |
| `services/heady-soul/` | Soul/personality service |
| `services/heady-vinci/` | Creative AI service |
| `services/silicon_bridge/` | Silicon bridge (hardware integration) |

### MCP Services

| Service | Purpose |
|---|---|
| `services/heady-mcp/` | Core MCP service |
| `services/heady-mcp-server/` | MCP server implementation |
| `services/mcp_server/` | Generic MCP server |
| `services/google_mcp/` | Google MCP integration |
| `services/jules_mcp/` | Jules MCP integration |
| `services/memory_mcp/` | Memory MCP service |
| `services/perplexity_mcp/` | Perplexity MCP integration |

### Platform Services

| Service | Purpose |
|---|---|
| `services/auth-session-server/` | Authentication/session server |
| `services/billing-service/` | Billing and payments |
| `services/notification-service/` | Notifications |
| `services/scheduler-service/` | Task scheduling |
| `services/search-service/` | Search service |
| `services/analytics-service/` | Analytics |
| `services/budget-tracker/` | Budget tracking |
| `services/discord-bot/` | Discord bot integration |
| `services/domain-router/` | Domain routing |
| `services/secret_gateway/` | Secret management gateway |
| `services/prompt_manager/` | Prompt management |
| `services/colab_gateway/` | Google Colab gateway |
| `services/huggingface_gateway/` | Hugging Face gateway |

### Orchestration Services

| Service | Purpose |
|---|---|
| `services/heady-orchestration/` | Core orchestration service |
| `services/heady-conductor/` | Conductor/workflow service |
| `services/heady-hive/` | Hive coordination service |
| `services/heady-bee-factory/` | Bee factory service |
| `services/heady-federation/` | Federation service |
| `services/heady-chain/` | Chain/workflow service |
| `services/heady-guard/` | Guard/validation service |
| `services/heady-governance/` | Governance enforcement |

### Other Services

| Service | Purpose |
|---|---|
| `services/heady-cache/` | Caching service |
| `services/heady-memory/` | Memory/state service |
| `services/heady-health/` | Health check service |
| `services/heady-security/` | Security service |
| `services/heady-maintenance/` | Maintenance service |
| `services/heady-testing/` | Testing service |
| `services/heady-task-browser/` | Task browser UI |
| `services/heady-web/` | Web service |
| `services/heady-ui/` | UI service |
| `services/heady-projection/` | Projection service |
| `services/heady-midi/` | MIDI service |
| `services/heady-autobiographer/` | Auto-documentation service |
| `services/heady-buddy/` | Companion/buddy service |
| `services/heady-onboarding/` | Onboarding service |
| `services/heady-pilot-onboarding/` | Pilot onboarding |
| `services/hcfullpipeline-executor/` | Pipeline executor service |
| `services/cli_service/` | CLI service |

---

## 5. Tool System

### Tool Registry

| File Path | Purpose |
|---|---|
| `tool-registry.js` (root, 8.8 KB) | Main tool registration system |
| `src/tool-registry.js` | Tool registry (src copy) |
| `src/mcp/tool-registry.js` | MCP tool registry |
| `src/mcp/mcp-tools.js` | MCP tool definitions |
| `src/mcp/heady-mcp-tools.js` | Heady-specific MCP tools |
| `services/heady-mcp/jit-tool-loader.js` | Just-in-time tool loading |
| `services/heady-chain/tools.js` | Chain tool definitions |

### Tool Call System

| File Path | Purpose |
|---|---|
| `tool_calls/browser_task/` | Browser automation tool calls |
| `tool_calls/fetch_url/` | URL fetching tool calls |
| `tool_calls/search_web/` | Web search tool calls |

### CLI Tools

| File Path | Purpose |
|---|---|
| `tools/create-heady-agent/` | CLI to create new Heady agents |
| `tools/phi-compliance-checker.js` | Phi compliance checking tool |
| `tools/phi-compliance-validator.js` | Phi compliance validation tool |
| `tools/repo-scanner/` | Repository scanning tool |
| `bin/create-heady-agent.js` | Agent creation binary |

---

## 6. MCP (Model Context Protocol) System

### MCP Server Implementations

| File Path | Purpose |
|---|---|
| `mcp-gateway.js` (root, 12 KB) | MCP gateway entry point |
| `src/mcp/heady-mcp-server.js` | Heady MCP server |
| `src/mcp/mcp-server.js` | Generic MCP server |
| `src/mcp/mcp-router.js` | MCP request router |
| `src/mcp/mcp-sse-transport.js` | MCP SSE transport layer |
| `src/mcp/mcp-transport.js` | MCP transport layer |
| `src/mcp/mcp-service-registry.js` | MCP service registry |
| `src/mcp/colab-mcp-bridge.js` | Google Colab MCP bridge |
| `src/gateway/mcp-gateway.js` | MCP gateway (gateway dir) |
| `src/edge/mcp-server.js` | Edge MCP server |
| `src/middleware/mcp-auth.js` | MCP authentication middleware |
| `src/bridge/midi-to-mcp-bridge.js` | MIDI-to-MCP bridge |
| `src/services/daw-mcp-bridge.js` | DAW-to-MCP bridge |
| `python/services/mcp_bridge.py` | Python MCP bridge |
| `packages/mcp-server/` | MCP server package |
| `templates/template-mcp-server/` | MCP server template |

### MCP Security

| File Path | Purpose |
|---|---|
| `heady-mcp-security/` | MCP security hardening module |
| `src/security/mcp/` | MCP security implementations |
| `circuit-breaker/mcp-breaker.js` | MCP circuit breaker |
| `configs/governance/mcp-governance.yml` | MCP governance rules |
| `configs/mcp-gateway-config.yaml` | MCP gateway configuration |

### MCP Workers & Infrastructure

| File Path | Purpose |
|---|---|
| `workers/mcp-transport/` | Cloudflare Worker for MCP transport |
| `workers/heady-mcp-worker/` | Cloudflare MCP Worker |
| `cloudflare/worker-mcp-telemetry/` | MCP telemetry worker |
| `infra/kubernetes/mcp-server/` | Kubernetes MCP server deployment |
| `infra/kubernetes/google-mcp/` | Kubernetes Google MCP deployment |
| `infra/kubernetes/jules-mcp/` | Kubernetes Jules MCP deployment |
| `infra/kubernetes/memory-mcp/` | Kubernetes Memory MCP deployment |
| `infra/kubernetes/perplexity-mcp/` | Kubernetes Perplexity MCP deployment |
| `.vscode/mcp.json` | VS Code MCP configuration |
| `apps/heady-mcp-portal/` | MCP management portal app |
| `distribution/mcp/` | MCP distribution artifacts |
| `projections/headymcp-core/` | MCP core projection |

---

## 7. Agent & Orchestration Patterns

### Agent System

| File Path | Purpose |
|---|---|
| `src/agent-orchestrator.js` | Core agent orchestrator |
| `src/agents/` | Agent implementations |
| `src/agents/pipeline-handlers.js` | Pipeline-specific agent handlers |
| `src/agents/headybee-template-registry.js` | Bee template registry |
| `packages/agent-identity/` | Agent identity package |
| `packages/orchestrator/` | Orchestrator package |
| `heady-a2a-protocol/` | Agent-to-Agent protocol module |
| `configs/agent-profiles/` | Agent profile configurations |

### Battle Arena System

| File Path | Purpose |
|---|---|
| `battle-arena-protocol.js` (root, 21 KB) | Battle arena protocol |
| `battle-sim-task-orchestrator.js` (root, 21 KB) | Battle sim task orchestrator |
| `battle-sim-orchestrator.test.js` | Battle sim tests |
| `HeadyBattle-service.js` | Battle service |
| `HeadySims-service.js` | Simulation service |

### Cognitive System

| File Path | Purpose |
|---|---|
| `csl-engine.js` (root, 34 KB) | Cognitive Semantic Logic engine |
| `csl-confidence-gate.js` (13 KB) | CSL confidence gating |
| `csl-service-integration.js` | CSL service integration |
| `auto-success-engine.ts` (14 KB) | Auto-success engine |
| `heady-cognition/` (11 subdirs) | Cognitive system: laws, directives, personas, topology |
| `heady-cognitive-runtime/` | Cognitive runtime |
| `sacred-geometry.js` (10 KB) | Sacred geometry computations |
| `hypervector.js` (9 KB) | Hypervector operations |
| `packages/phi-math/` | Phi/golden-ratio math package |
| `packages/phi-math-foundation/` | Phi math foundation package |

---

## 8. Summary Statistics

| Category | Count |
|---|---|
| Services (`services/`) | 58 |
| Agent skills (`.agents/skills/`) | 77 |
| Skill modules (`skills/`) | 25 |
| Skill modules (top-level `heady-*/SKILL.md`) | 20 |
| Bee implementations (`src/bees/`) | ~70+ |
| MCP-related files/dirs | ~80+ |
| CI/CD workflows | 30+ |
| Swarm orchestration files | ~15 |
| Tool definitions | ~10 |
| Packages (`packages/`) | 42 |
| Cloudflare Workers | 8 |
