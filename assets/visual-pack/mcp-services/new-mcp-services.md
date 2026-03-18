# New MCP Services — Expansion Pack

## 8 New Model Context Protocol Services for the Heady Ecosystem

---

### 1. **heady-mcp-memory-explorer**
> Visual memory graph traversal and semantic search via MCP

**Tools:**
- `memory_search_semantic` — Search 384D vector memory with natural language queries
- `memory_graph_traverse` — Walk entity relationships in the knowledge graph  
- `memory_timeline` — Retrieve memories by time range with phi-decay scoring
- `memory_consolidate` — Trigger manual memory consolidation cycle
- `memory_diff` — Compare two memory snapshots to detect drift

**Transport:** JSON-RPC over SSE (streaming for large result sets)
**CSL Gate:** LOW (0.691) — read-only memory access  
**Use Case:** IDE integration for developer context enrichment, HeadyBuddy conversation grounding

---

### 2. **heady-mcp-swarm-commander**
> Remote swarm lifecycle management via MCP

**Tools:**
- `swarm_spawn` — Create a new swarm with bee composition and consensus mode
- `swarm_status` — Get real-time swarm health, progress, and voting status
- `swarm_message` — Send directives to an active swarm
- `swarm_dissolve` — Gracefully terminate a swarm with final report
- `swarm_list` — List all active swarms with Sacred Geometry placement

**Transport:** Bidirectional WebSocket (real-time swarm event streaming)
**CSL Gate:** HIGH (0.882) — swarm operations are consequential  
**Use Case:** Dashboard swarm management, automated pipeline orchestration

---

### 3. **heady-mcp-oracle-query**
> Query the OracleChain audit log for decision history

**Tools:**
- `oracle_search` — Semantic search over past decisions by context
- `oracle_verify` — Verify a receipt's cryptographic integrity (Ed25519)
- `oracle_chain_walk` — Walk the Merkle-linked decision chain
- `oracle_replay` — Replay a past decision with current context for comparison
- `oracle_stats` — Aggregate statistics on decision patterns

**Transport:** JSON-RPC over SSE  
**CSL Gate:** MEDIUM (0.809) — audit access with governance controls  
**Use Case:** Compliance auditing, decision pattern analysis, governance dashboards

---

### 4. **heady-mcp-embedding-forge**
> On-demand embedding generation and comparison via MCP

**Tools:**
- `embed_text` — Generate 384D embeddings for text via multi-provider router
- `embed_compare` — Compare two embeddings with cosine similarity + CSL analysis
- `embed_cluster` — Cluster a set of embeddings using phi-scaled K-means
- `embed_reduce` — Reduce dimensionality for visualization (384D → 3D via UMAP)
- `embed_batch` — Batch embed with Fibonacci-sized chunks and progress streaming

**Transport:** JSON-RPC (simple request/response)  
**CSL Gate:** LOW (0.691) — computational utility service  
**Use Case:** Data science workflows, semantic analysis, IDE code similarity tools

---

### 5. **heady-mcp-pipeline-orchestrator**
> Full HCFullPipeline lifecycle control via MCP

**Tools:**
- `pipeline_run` — Execute a full 21-stage HCFP run with configuration
- `pipeline_checkpoint` — Save/restore pipeline checkpoint state
- `pipeline_stage_status` — Get detailed status of any pipeline stage
- `pipeline_replay` — Replay a failed pipeline from last checkpoint
- `pipeline_metrics` — Per-stage latency, throughput, and cost metrics

**Transport:** Bidirectional WebSocket (live pipeline event streaming)  
**CSL Gate:** HIGH (0.882) — pipeline execution is resource-intensive  
**Use Case:** CI/CD integration, automated testing pipelines, batch processing

---

### 6. **heady-mcp-sacred-topology**
> Query and visualize the Sacred Geometry node topology

**Tools:**
- `topology_map` — Get the full Sacred Geometry topology with node placements
- `topology_health` — Health status of all nodes across all 7 layers
- `topology_route` — Calculate optimal routing path between two nodes
- `topology_simulate` — Simulate node failure and visualize cascade effects
- `topology_rebalance` — Suggest optimal node rebalancing for current load

**Transport:** JSON-RPC over SSE  
**CSL Gate:** MEDIUM (0.809) — topology queries are read-mostly  
**Use Case:** System architecture visualization, capacity planning, chaos engineering

---

### 7. **heady-mcp-budget-tracker**
> Real-time token budget and cost tracking via MCP

**Tools:**
- `budget_status` — Current token/credit consumption across all providers
- `budget_forecast` — Phi-scaled cost projection based on current burn rate
- `budget_alert` — Set/manage budget threshold alerts (Fibonacci-tiered)
- `budget_optimize` — Suggest provider routing changes to reduce cost
- `budget_history` — Historical cost data with phi-bucketed time windows

**Transport:** JSON-RPC with optional SSE for real-time alerts  
**CSL Gate:** LOW (0.691) — informational service  
**Use Case:** FinOps dashboards, automated cost optimization, budget governance

---

### 8. **heady-mcp-midi-bridge**
> MIDI-driven system control and sonification via MCP

**Tools:**
- `midi_send` — Send MIDI events to Heady's MIDI bridge (notes, CC, sysex)
- `midi_listen` — Subscribe to MIDI input events from hardware controllers
- `midi_map` — Map MIDI CC to system parameters (e.g., CC1 → LLM temperature)
- `midi_sonify` — Convert system metrics to MIDI output in real-time
- `midi_tempo` — Set Ableton Link tempo for synchronized MIDI timing

**Transport:** Bidirectional WebSocket (low-latency MIDI requires < 10ms)  
**CSL Gate:** LOW (0.691) — creative/experimental service  
**Use Case:** Live system monitoring via audio, creative coding performances, hardware controller integration

---

## MCP Service Registry Pattern

All services register with the HeadyMCP Gateway:

```javascript
mcpGateway.register({
  name: 'heady-mcp-memory-explorer',
  version: '1.0.0',
  transport: 'sse',
  cslGate: CSL_GATES.LOW,
  tools: [...],
  healthEndpoint: '/health',
  rateLimits: {
    free: FIB[8],   // 21 req/s
    pro: FIB[10],   // 55 req/s
    enterprise: FIB[12] // 144 req/s
  }
});
```

## Discovery via .well-known

Each service publishes a Server Card at:
```
/.well-known/mcp-server-card.json
```

Containing tool schemas, CSL requirements, transport type, and rate limits per the MCP 2026 spec.
