# PROMPT 8: MCP Tools, AI Gateway & Multi-Model Routing

## For: Perplexity Computer

## Objective: Perfect the MCP server with all 31+ tools and build the production AI inference gateway

---

## INSTRUCTIONS FOR PERPLEXITY COMPUTER

You are building the connective tissue of Heady™ — the MCP (Model Context Protocol) server that gives AI agents access to all Heady tools, and the inference gateway that routes AI requests to the best provider.

**READ THE ATTACHED CONTEXT FILES FIRST** — especially `00-HEADY-MASTER-CONTEXT.md`.

### TASK 1: Complete MCP Server

Build/complete `src/mcp/heady-mcp-server.js` and `services/heady-mcp/`:

The MCP server must support both `stdio` and `SSE` transports and expose these tools:

```javascript
const MCP_TOOLS = [
  // Memory & Vector Operations
  { name: 'memory_search', description: 'Search 3D vector memory space', inputSchema: { query: 'string', k: 'number', threshold: 'number' } },
  { name: 'memory_store', description: 'Store embedding in vector memory', inputSchema: { content: 'string', metadata: 'object' } },
  { name: 'memory_forget', description: 'Remove entry from vector memory', inputSchema: { id: 'string' } },
  
  // Code Operations  
  { name: 'code_search', description: 'Semantic code search across monorepo', inputSchema: { query: 'string', language: 'string' } },
  { name: 'code_analyze', description: 'Analyze code quality and patterns', inputSchema: { file: 'string' } },
  { name: 'code_generate', description: 'Generate code from spec', inputSchema: { spec: 'string', language: 'string' } },
  { name: 'code_refactor', description: 'Refactor code with φ-scaling', inputSchema: { file: 'string', strategy: 'string' } },
  
  // Service Operations
  { name: 'service_deploy', description: 'Deploy a service to Cloud Run', inputSchema: { service: 'string', region: 'string' } },
  { name: 'service_health', description: 'Check service health status', inputSchema: { service: 'string' } },
  { name: 'service_logs', description: 'Stream service logs', inputSchema: { service: 'string', lines: 'number' } },
  { name: 'service_restart', description: 'Restart a service', inputSchema: { service: 'string' } },
  
  // AI Operations
  { name: 'ai_chat', description: 'Send chat to AI provider', inputSchema: { model: 'string', messages: 'array' } },
  { name: 'ai_embed', description: 'Generate embedding', inputSchema: { text: 'string', model: 'string' } },
  { name: 'ai_battle', description: 'Run battle arena competition', inputSchema: { task: 'string', models: 'array' } },
  { name: 'ai_evaluate', description: 'Evaluate AI output quality', inputSchema: { output: 'string', criteria: 'array' } },
  
  // Orchestration
  { name: 'swarm_spawn', description: 'Spawn a bee swarm for task', inputSchema: { task: 'string', beeCount: 'number' } },
  { name: 'swarm_status', description: 'Get swarm execution status', inputSchema: { swarmId: 'string' } },
  { name: 'orchestrate_dag', description: 'Execute DAG workflow', inputSchema: { dag: 'object' } },
  { name: 'task_decompose', description: 'Decompose task into subtasks', inputSchema: { task: 'string' } },
  
  // Site & Domain
  { name: 'site_deploy', description: 'Deploy a site to Cloudflare', inputSchema: { siteId: 'string' } },
  { name: 'site_status', description: 'Check site deployment status', inputSchema: { domain: 'string' } },
  { name: 'site_generate', description: 'Generate site from config', inputSchema: { siteId: 'string' } },
  
  // Data & Research
  { name: 'web_search', description: 'Search web via Perplexity Sonar', inputSchema: { query: 'string' } },
  { name: 'doc_search', description: 'Search Heady documentation', inputSchema: { query: 'string' } },
  { name: 'patent_search', description: 'Search patent portfolio', inputSchema: { query: 'string' } },
  
  // System
  { name: 'system_status', description: 'Get full system status', inputSchema: {} },
  { name: 'system_project', description: 'Run full projection cycle', inputSchema: {} },
  { name: 'system_heal', description: 'Trigger self-healing cycle', inputSchema: {} },
  { name: 'csl_evaluate', description: 'Evaluate CSL expression', inputSchema: { expression: 'string', inputs: 'object' } },
  { name: 'phi_scale', description: 'Calculate φ-scaled value', inputSchema: { base: 'number', power: 'number' } },
  { name: 'fibonacci', description: 'Get Fibonacci number', inputSchema: { n: 'number' } },
];
```

Each tool MUST have a real implementation — no stubs or TODOs.

### TASK 2: AI Inference Gateway

Build/complete `src/services/inference-gateway.js`:

```javascript
class InferenceGateway {
  constructor() {
    this.providers = {
      groq: { endpoint: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile'], priority: 1 },
      gemini: { endpoint: 'gemini-api', models: ['gemini-2.0-flash'], priority: 2 },
      claude: { endpoint: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-20250514'], priority: 3 },
      openai: { endpoint: 'https://api.openai.com/v1', models: ['gpt-4o'], priority: 4 },
      huggingface: { endpoint: 'https://api-inference.huggingface.co', models: ['meta-llama/Llama-3-8b-hf'], priority: 5 }
    };
    this.circuitBreakers = {}; // per-provider circuit breakers
  }
  
  // CSL-weighted provider selection
  async selectProvider(task) {
    // Score each provider based on: latency, cost, capability, availability
    // Use CSL cosine similarity between task embedding and provider capability vectors
    // Return provider with highest CSL confidence score above φ-threshold (0.618)
  }
  
  // Route with fallback chain
  async infer(messages, options = {}) {
    // 1. Select best provider via CSL routing
    // 2. Try primary provider
    // 3. On failure, circuit-break and try next in φ-weighted fallback chain
    // 4. φ-scaled backoff between retries: 1618ms, 2618ms, 4236ms
    // 5. Return result with provider metadata
  }
  
  // Embedding gateway
  async embed(text, options = {}) {
    // Route to best embedding provider
    // Support: Nomic, Jina, Cohere, Voyage, local Ollama
    // Return 384-dim vector (match all-MiniLM-L6-v2 standard)
  }
  
  // Battle mode — race multiple providers
  async battle(task, models) {
    // Send same prompt to all specified models simultaneously
    // Collect all responses with timing
    // Score each response using CSL evaluation
    // Return ranked results
  }
}
```

### TASK 3: Worker AI Gateway

Build/complete `cloudflare/worker-ai-gateway/`:

- Edge-deployed inference router
- Sub-50ms routing decisions using Cloudflare Workers AI
- KV-cached responses with φ-scaled TTL
- Request transformation for provider-specific formats
- Response normalization to unified schema

### TASK 4: MCP Gateway for Multi-Server Aggregation

Build `src/mcp/mcp-gateway.js`:

- Aggregates multiple MCP servers into one unified interface
- Supports connecting to external MCP servers (GitHub, Firebase, Perplexity, etc.)
- Tool namespace management to avoid conflicts
- CSL-gated tool selection (only expose tools with confidence > 0.618)
- Connection pooling with Fibonacci-sized pools

### DELIVERABLES

Create a ZIP file named `08-mcp-ai-gateway.zip` containing:

- `heady-mcp-server.js` — Complete MCP server with 31+ tools
- `inference-gateway.js` — Complete multi-provider AI gateway
- `worker-ai-gateway/` — Complete Cloudflare Worker
- `mcp-gateway.js` — Multi-server MCP aggregator
- `mcp-tools-inventory.json` — Complete tool catalog with schemas
- `provider-benchmark.md` — Provider comparison with latency/cost data
- `integration-tests/` — Test scripts for MCP tools and inference gateway
