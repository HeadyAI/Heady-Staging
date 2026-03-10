# Heady deployment directives
## Sites
### headyme
- Domain: `headyme.com`
- Role: Personal AI operating system and primary user cockpit
- Runtime target: Cloudflare Pages or static CDN with auth relay to auth.headysystems.com and API access through Envoy/API gateway
- Source path: `apps/headyme/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### headysystems
- Domain: `headysystems.com`
- Role: Enterprise platform, architecture, and sovereign AI infrastructure hub
- Runtime target: Cloudflare Pages or static CDN with API access through Envoy/API gateway
- Source path: `apps/headysystems/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### heady-ai
- Domain: `heady-ai.com`
- Role: Research, science, and model intelligence surface
- Runtime target: Cloudflare Pages or static CDN with AI routing through api-gateway and ai-router
- Source path: `apps/heady-ai/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### headyos
- Domain: `headyos.com`
- Role: Developer operating system and orchestration console
- Runtime target: Cloudflare Pages or static CDN with developer workflows routed through mcp-server and api-gateway
- Source path: `apps/headyos/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### headyconnection-org
- Domain: `headyconnection.org`
- Role: Nonprofit, grants, mission, and community impact presence
- Runtime target: Cloudflare Pages or static CDN with Drupal-backed structured content sync
- Source path: `apps/headyconnection-org/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### headyconnection-com
- Domain: `headyconnection.com`
- Role: Community portal and public participation surface
- Runtime target: Cloudflare Pages or static CDN with community and portal workflows through api-gateway
- Source path: `apps/headyconnection-com/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### headyex
- Domain: `headyex.com`
- Role: Marketplace and exchange surface for agents and services
- Runtime target: Cloudflare Pages or static CDN with marketplace workflows through api-gateway
- Source path: `apps/headyex/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### headyfinance
- Domain: `headyfinance.com`
- Role: Investor relations, capital narrative, and financial intelligence surface
- Runtime target: Cloudflare Pages or static CDN with finance APIs through api-gateway
- Source path: `apps/headyfinance/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### admin-portal
- Domain: `admin.headysystems.com`
- Role: Internal operations, security, deployment, and governance console
- Runtime target: Protected web surface behind central auth and governance controls
- Source path: `apps/admin-portal/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

### auth
- Domain: `auth.headysystems.com/login`
- Role: Central identity relay, cookie session minting, OAuth callbacks, and redirect validation
- Runtime target: Cloud Run or equivalent server runtime because cookie minting and OAuth callbacks must execute server-side
- Source path: `apps/auth/index.html`
- Required behavior:
  - Render premium dark-glass informational experience with sacred geometry canvas unique to the site.
  - Embed central auth entrypoint and cross-site navigation to the other Heady properties.
  - Load AutoContext client bridge for request/session context hydration.
  - Load bee injectors for ecosystem map, technology stack, and dynamic support sections.
  - Route privileged or stateful actions to API services through the gateway tier rather than client-only fallbacks.

## Services
| Category | Service | Port | Domain | What it should do | Path |
|---|---:|---:|---|---|---|
| agent-bee | heady-bee-factory | 8200 | bee | Dynamic bee creation — spawns concurrent equal-status bee workers with no ranking | `services/agent-bee/heady-bee-factory` |
| agent-bee | heady-federation | 8203 | federation | Agent federation — manages cross-domain agent collaboration and capability sharing | `services/agent-bee/heady-federation` |
| agent-bee | heady-hive | 8201 | bee | Bee coordination hub — routes bee tasks via CSL domain match, concurrent dispatch | `services/agent-bee/heady-hive` |
| agent-bee | heady-orchestration | 8202 | orchestration | Swarm orchestration — coordinates all 17 swarms simultaneously in equal standing | `services/agent-bee/heady-orchestration` |
| ai-routing | ai-router | 8700 | routing | Multi-model AI routing — CSL-scored provider selection and capability match | `services/ai-routing/ai-router` |
| ai-routing | api-gateway | 8701 | gateway | API gateway — request routing, rate limiting, auth validation, OTEL span injection | `services/ai-routing/api-gateway` |
| ai-routing | domain-router | 8703 | routing | Domain-based router — resolves all 9 Heady sites plus aliases via CSL similarity | `services/ai-routing/domain-router` |
| ai-routing | model-gateway | 8702 | routing | Model selection gateway — capability vector matching for Claude/GPT/Gemini/Groq/Workers AI | `services/ai-routing/model-gateway` |
| core-intelligence | heady-brain | 8100 | inference | Central AI reasoning engine — routes inference requests by CSL domain and capability match | `services/core-intelligence/heady-brain` |
| core-intelligence | heady-brains | 8101 | federation | Multi-brain federation — coordinates distributed AI reasoning across provider endpoints | `services/core-intelligence/heady-brains` |
| core-intelligence | heady-conductor | 8103 | pipeline | Pipeline conductor — drives HCFullPipeline 21-stage cognitive state machine | `services/core-intelligence/heady-conductor` |
| core-intelligence | heady-embed | 8105 | embedding | Embedding service — 384-dim dense vector generation for all content types | `services/core-intelligence/heady-embed` |
| core-intelligence | heady-infer | 8104 | inference | Inference engine — multi-provider LLM request handling with phi-backoff retries | `services/core-intelligence/heady-infer` |
| core-intelligence | heady-memory | 8106 | memory | Memory persistence — pgvector long-term storage with CSL retrieval gates | `services/core-intelligence/heady-memory` |
| core-intelligence | heady-projection | 8108 | projection | Vector projection engine — 3D spatial computing and VALU tensor core bridge | `services/core-intelligence/heady-projection` |
| core-intelligence | heady-soul | 8102 | orchestration | Orchestration core — the center of the 17-swarm sacred geometry ring topology | `services/core-intelligence/heady-soul` |
| core-intelligence | heady-vector | 8107 | vector | Vector operations — cosine similarity, projection, and 3D octree spatial indexing | `services/core-intelligence/heady-vector` |
| external-integrations | colab-gateway | 8806 | integration | Colab integration — notebook execution dispatch and result ingestion | `services/external-integrations/colab-gateway` |
| external-integrations | discord-bot | 8808 | integration | Discord bot — HeadyBuddy presence in Discord with slash commands and webhooks | `services/external-integrations/discord-bot` |
| external-integrations | drupal-sync | 8809 | cms | Drupal webhook/polling sync — indexes Drupal JSON:API content into vector memory | `services/external-integrations/drupal-sync` |
| external-integrations | google-mcp | 8801 | mcp | Google MCP integration — Google Search, Gmail, Drive, Workspace tool adapters | `services/external-integrations/google-mcp` |
| external-integrations | huggingface-gateway | 8805 | integration | HuggingFace integration — model inference, dataset access, and embedding endpoints | `services/external-integrations/huggingface-gateway` |
| external-integrations | jules-mcp | 8804 | mcp | Jules MCP — async code task delegation to Jules AI with result streaming | `services/external-integrations/jules-mcp` |
| external-integrations | mcp-server | 8800 | mcp | MCP protocol server — JSON-RPC 2.0 over SSE/stdio with CSL-gated tool routing | `services/external-integrations/mcp-server` |
| external-integrations | memory-mcp | 8802 | mcp | Memory MCP server — exposes vector memory as MCP tool endpoints | `services/external-integrations/memory-mcp` |
| external-integrations | perplexity-mcp | 8803 | mcp | Perplexity MCP — Sonar Pro research with citation injection via MCP protocol | `services/external-integrations/perplexity-mcp` |
| external-integrations | silicon-bridge | 8807 | integration | Silicon computing bridge — edge compute routing to Cloudflare Workers AI | `services/external-integrations/silicon-bridge` |
| monitoring-health | heady-eval | 8401 | evaluation | Evaluation engine — agent metrics: task success, tool accuracy, trajectory quality | `services/monitoring-health/heady-eval` |
| monitoring-health | heady-health | 8400 | monitoring | Health monitoring — aggregates health from all 17 swarms and 50 services | `services/monitoring-health/heady-health` |
| monitoring-health | heady-maintenance | 8402 | reliability | Self-healing maintenance — quarantine, respawn, drift recovery, phi-heartbeat | `services/monitoring-health/heady-maintenance` |
| monitoring-health | heady-testing | 8403 | testing | Testing framework — integration tests, smoke tests, Arena Mode evaluation | `services/monitoring-health/heady-testing` |
| pipeline-workflow | auto-success-engine | 8600 | pipeline | φ-scaled auto-success engine — dynamic resource allocation across 9 task categories | `services/pipeline-workflow/auto-success-engine` |
| pipeline-workflow | hcfullpipeline-executor | 8601 | pipeline | HCFullPipeline executor — 21-stage cognitive state machine with CSL routing at Stage 4 | `services/pipeline-workflow/hcfullpipeline-executor` |
| pipeline-workflow | heady-cache | 8603 | cache | Caching layer — hot-cold cache with phi-scaled TTL and LRU eviction | `services/pipeline-workflow/heady-cache` |
| pipeline-workflow | heady-chain | 8602 | pipeline | Chain execution — DAG-based subtask chaining with concurrent node dispatch | `services/pipeline-workflow/heady-chain` |
| security-governance | heady-governance | 8302 | governance | Policy enforcement — compliance rules, audit trails, Ed25519 receipt signing | `services/security-governance/heady-governance` |
| security-governance | heady-guard | 8300 | security | Security enforcement — zero-trust sanitization on all input/output channels | `services/security-governance/heady-guard` |
| security-governance | heady-security | 8301 | security | Security scanning — TruffleHog secret detection, vuln scanning, SSRF prevention | `services/security-governance/heady-security` |
| specialized | budget-tracker | 8903 | finops | Cost tracking — AI provider spend metering, rate limit monitoring, budget alerts | `services/specialized/budget-tracker` |
| specialized | cli-service | 8904 | cli | CLI interface — interactive terminal with OAuth, phi-scaled theming, and REPL | `services/specialized/cli-service` |
| specialized | heady-auto-context | 8907 | context | HeadyAutoContext primary service — 384-dim vector indexing, CSL gates, enrichment API | `services/specialized/heady-auto-context` |
| specialized | heady-autobiographer | 8901 | documentation | Auto-documentation — generates architectural docs from code analysis and chat history | `services/specialized/heady-autobiographer` |
| specialized | heady-midi | 8902 | creative | MIDI/creative interface — CC→MCP bridge, MIDI→LLM tool dispatch, A/V sync | `services/specialized/heady-midi` |
| specialized | heady-vinci | 8900 | learning | Pattern learning engine — extracts, scores, and surfaces reusable execution patterns | `services/specialized/heady-vinci` |
| specialized | prompt-manager | 8905 | prompts | Prompt management — 64-prompt catalogue with version control and CSL retrieval | `services/specialized/prompt-manager` |
| specialized | secret-gateway | 8906 | security | Secret management — Vault-backed secret storage, OAuth token rotation, SDK layers | `services/specialized/secret-gateway` |
| user-facing | heady-buddy | 8501 | companion | HeadyBuddy companion widget — chat, context enrichment, and personalization engine | `services/user-facing/heady-buddy` |
| user-facing | heady-onboarding | 8503 | onboarding | User onboarding — adaptive multi-step onboarding with vector-indexed user journey | `services/user-facing/heady-onboarding` |
| user-facing | heady-pilot-onboarding | 8504 | onboarding | Pilot program onboarding — enterprise pilot enrollment and guided setup flows | `services/user-facing/heady-pilot-onboarding` |
| user-facing | heady-task-browser | 8505 | tasks | Task management UI — real-time concurrent task status with no priority ordering | `services/user-facing/heady-task-browser` |
| user-facing | heady-ui | 8502 | ui | UI component library — shared glassmorphism components and phi-scaled design tokens | `services/user-facing/heady-ui` |
| user-facing | heady-web | 8500 | web | Web platform — serves 9 Heady sites with SSR, sacred geometry, and auto-context injection | `services/user-facing/heady-web` |

| user-facing | heady-auth | 8510 | auth | central auth relay and signed cookie session service | `services/user-facing/heady-auth` |

## Global wiring
- No priority or ranking language in runtime routing, queues, enums, or task classification.
- HeadyAutoContext must enrich every request path, site interaction, API call, and agent workflow.
- CSL is used for domain relevance matching and gating only, not importance ordering.
- Central auth must be served from auth.headysystems.com with httpOnly, Secure, SameSite=Strict cookies.
- Every service must emit health status and tracing metadata and register into service discovery.
