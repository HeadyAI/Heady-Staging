# External Skills & Integration Research Notes

**Generated**: 2026-03-09  
**Source**: `/home/user/workspace/external-sources-notes.md` + additional research  
**Purpose**: Reference notes for external tools/skills to integrate into the Heady platform

---

## External Tools Referenced in heady-build-inputs.md

### 1. promptfoo

**URL**: https://www.promptfoo.dev/docs/intro/  
**Type**: npm CLI + library  
**Purpose**: LLM evaluation, hallucination detection, tool selection accuracy benchmarking

**Integration with Heady**:
- Used by `heady-eval` (port 8401) and `heady-perplexity-eval-orchestrator` skill
- Config: `promptfoo.config.yaml` at repo root
- Tests CSL routing accuracy, AutoContext enrichment presence, and domain match quality
- Install: `npm install -g promptfoo` or `npx promptfoo eval`

**Key features relevant to Heady**:
- Custom provider support → test any HTTP endpoint (heady-brain, heady-soul, etc.)
- JavaScript assertion engine → verify `output.cslScore >= 0.618`, `output.enriched === true`
- Red-teaming for prompt injection detection (integrates with heady-guard)
- CI/CD integration via GitHub Actions for automated eval on each PR

**Skill**: `heady-perplexity-eval-orchestrator` includes promptfoo config examples

---

### 2. Weights & Biases Weave

**URL**: https://docs.wandb.ai/weave  
**Type**: Python library + cloud dashboard  
**Purpose**: Agent metrics dashboard (step utility, robustness, trajectory quality)

**Integration with Heady**:
- Python client connects to Heady HTTP endpoints
- `@weave.op()` decorator traces every Heady agent call as a W&B op
- Dashboard at wandb.ai shows: task completion rate, CSL score distributions, latency heatmaps
- Project name: `heady-eval`
- Install: `pip install weave wandb`

**Key features relevant to Heady**:
- Op versioning → track how heady-brain behavior changes across deployments
- Dataset + eval → attach test inputs to ops for reproducible benchmarking
- Scorers → custom Python functions score outputs (CSL match, enrichment presence)
- Integrates with promptfoo via shared test dataset format

**Skill**: `heady-perplexity-eval-orchestrator` includes W&B Weave Python examples

---

### 3. langchain-ai/agentevals

**URL**: https://github.com/langchain-ai/agentevals  
**Type**: Python library  
**Purpose**: Agent trajectory evaluation, completion rate benchmarks, tool call accuracy

**Integration with Heady**:
- `AgentEval` class wraps Heady orchestration endpoint
- Trajectory evaluator scores multi-hop agent tasks (e.g. research → embed → retrieve)
- Comparison to AutoGen benchmarks for competitive positioning
- Install: `pip install agentevals`

**Key features relevant to Heady**:
- `TrajectorySimilarityEvaluator` → compare actual vs expected CSL routing paths
- `ToolCallAccuracyEvaluator` → verify MCP tool selection was correct
- Support for multi-turn conversation evaluation (HeadyBuddy sessions)

---

### 4. langchain-ai/agent-evals

**URL**: https://github.com/langchain-ai/agent-evals  
**Note**: Separate from `agentevals` — this is a benchmark suite  
**Purpose**: Standard benchmarks for agent completion rates

**Integration with Heady**:
- Use tau-bench and hotpotqa benchmarks adapted for Heady domain queries
- Run against `hcfullpipeline-executor` (port 8601) to measure 21-stage pipeline quality
- Compare Heady completion rate against published LangGraph/AutoGen baselines

---

### 5. microsoft/autogen

**URL**: https://github.com/microsoft/autogen  
**Type**: Python framework  
**Purpose**: Multi-agent conversation and benchmark suites

**Integration with Heady**:
- AutoGen's MATH and HumanEval benchmarks adapted for Heady swarm evaluation
- The `heady-perplexity-multi-agent-eval` skill includes AutoGen benchmark adaptation pattern
- Key comparison: AutoGen uses sequential agent-to-agent conversation; Heady uses concurrent equal-status swarm dispatch — benchmark both for competitive positioning
- Install: `pip install pyautogen`

**Relevant benchmarks**:
- `math_solver`: tests heady-brain reasoning quality
- `code_executor`: tests heady-infer + silicon-bridge code generation
- `retrieval_qa`: tests heady-memory + CSL retrieval quality

---

### 6. Cloudflare Workers AI

**URL**: https://developers.cloudflare.com/workers-ai/  
**Type**: Edge inference service  
**Purpose**: Zero-latency classification and inference at the edge

**Integration with Heady**:
- Used by `silicon-bridge` service (port 8807) for edge routing decisions
- Models available: `@cf/baai/bge-large-en-v1.5` (1024-dim embeddings) for high-quality retrieval
- `@cf/meta/llama-3.1-8b-instruct` for fast edge inference (< 100ms)
- Heady Cloudflare account: `8b1fa38f282c691423c6399247d53323`
- Workers AI binding in `wrangler.toml`:
  ```toml
  [ai]
  binding = "AI"
  ```
- Invocation from Worker:
  ```javascript
  const result = await env.AI.run('@cf/baai/bge-large-en-v1.5', {
    text: [inputText],
  });
  // result.data[0] = 1024-dim embedding
  ```

**Heady-specific use cases**:
1. Edge-based CSL domain matching before routing to Cloud Run services
2. Pre-classification of webhook payloads (Drupal, Discord) at the edge
3. Fast embedding for Cloudflare Vectorize (edge vector store companion to pgvector)

**Skill**: `heady-edge-ai` (existing skill in Heady ecosystem) covers Workers AI in detail

---

### 7. Firebase Extensions

**URL**: https://firebase.google.com/docs/extensions  
**Type**: Firebase managed extensions  
**Purpose**: Pre-built server-side integrations for Firebase projects

**Integration with Heady**:
- Firebase project: `gen-lang-client-0920560496`
- Relevant extensions:
  - **Firestore Vector Search** (`firestore-multimodal-genai`): vector similarity search directly in Firestore
  - **Search with Algolia** (`firestore-algolia-search`): full-text search for Drupal content backup
  - **Resize Images** (`storage-resize-images`): auto-resize Drupal media assets on upload
  - **Trigger Email** (`firestore-send-email`): transactional email for HeadyConnection.org grant notifications

**Installation**:
```bash
firebase ext:install firebase/firestore-multimodal-genai \
  --project=gen-lang-client-0920560496
```

**Heady-specific**: `heady-firebase-auth-orchestrator` skill covers auth setup; Firebase Extensions complement by handling Firestore vector search and automated triggers.

---

### 8. Drupal JSON:API

**URL**: https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module  
**Type**: Drupal core module (enabled by default in Drupal 8.7+)  
**Purpose**: RESTful content API for headless CMS integration

**Integration with Heady**:
- Full implementation in `drupal-vector-sync.js` (port 8809)
- All 13 content types accessible via `/jsonapi/node/{type}`
- Authentication via Drupal Simple OAuth module (client_credentials grant)
- Include related entities: `?include=field_image,field_tags`

**Key JSON:API patterns**:

```
# List articles changed since ISO timestamp
GET /jsonapi/node/article?filter[changed][condition][path]=changed&filter[changed][condition][operator]=>&filter[changed][condition][value]=2026-03-01T00:00:00Z

# Get single node by UUID  
GET /jsonapi/node/article?filter[id]=550e8400-e29b-41d4-a716-446655440000

# Create article (requires auth)
POST /jsonapi/node/article
Content-Type: application/vnd.api+json
{
  "data": {
    "type": "node--article",
    "attributes": { "title": "...", "body": { "value": "...", "format": "basic_html" } }
  }
}
```

**Webhook setup** (via Drupal Webhooks module):
- Module: `composer require drupal/webhooks`
- Configure at: `/admin/config/services/webhooks`
- Payload signed with HMAC-SHA256; key stored in Heady `secret-gateway` service

---

### 9. Google SEO Starter Guide

**URL**: https://developers.google.com/search/docs/fundamentals/seo-starter-guide  
**Type**: Official Google documentation  
**Purpose**: SEO best practices for all 9 Heady sites

**Heady implementation requirements** (per `heady-perplexity-content-generation` skill):

```html
<!-- Required for all 9 Heady sites -->
<title>[Primary Keyword] | [Site Name]</title>  <!-- 50-60 chars -->
<meta name="description" content="[150-160 chars with CTA]">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://[domain]/og-image.png">
<link rel="canonical" href="https://[domain]/[path]">

<!-- JSON-LD structured data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Site Name]",
  "url": "https://[domain]",
  "logo": "https://[domain]/logo.png",
  "sameAs": ["https://github.com/HeadyMe", "https://headyme.com", ...]
}
</script>
```

**Additional SEO factors for Heady**:
- Core Web Vitals: LCP < 2.5s (glassmorphism canvas animations deferred)
- Mobile-first: all sites responsive with Fibonacci grid breakpoints
- Internal linking: cross-site navigation connects all 9 domains (positive for link equity)
- Drupal content as FAQ structured data: `@type: FAQPage` for HeadyConnection FAQ pages

---

### 10. WCAG 2.1

**URL**: https://www.w3.org/TR/WCAG21/  
**Type**: W3C Web Accessibility Guidelines  
**Purpose**: Accessibility compliance for all 9 Heady sites

**Heady compliance targets** (per `heady-sacred-geometry-css-generator` skill):

| Criterion | Requirement | Heady Implementation |
|-----------|-------------|---------------------|
| 1.4.3 Contrast | 4.5:1 AA | #e8e8f0 on #0a0a0f = 16.4:1 (AAA) |
| 1.4.11 Non-text | 3:1 | Accent colors verified against background |
| 2.1.1 Keyboard | All interactive | `tabindex`, `role`, `onkeydown` handlers |
| 2.4.1 Skip Navigation | Required | `<a href="#main">Skip to content</a>` |
| 2.4.7 Focus Visible | Required | `outline: 2px solid var(--accent)` on `:focus-visible` |
| 3.3.2 Labels | Required | All form inputs have `<label>` elements |
| 4.1.2 ARIA | Required | Custom elements (`heady-auth-widget`) have ARIA roles |

**Testing tools**:
- axe-core (automated: `npm install axe-core`)
- WAVE browser extension (manual)
- Lighthouse accessibility audit (CI/CD via GitHub Actions)

---

## MCP Server Skills to Discover

Per the build brief, the following external skill sources should be searched:

| Source | Query | Purpose |
|--------|-------|---------|
| npm | `@modelcontextprotocol/server-*` | Official Anthropic MCP servers |
| GitHub | `topic:mcp-server` | Community MCP implementations |
| Hugging Face | `mcp` in Spaces | AI-powered MCP tools |

**Known official MCP servers** (Anthropic registry):
- `@modelcontextprotocol/server-filesystem` — file system access
- `@modelcontextprotocol/server-github` — GitHub API
- `@modelcontextprotocol/server-postgres` — PostgreSQL queries
- `@modelcontextprotocol/server-brave-search` — web search
- `@modelcontextprotocol/server-google-maps` — location services

All should be wired through the `mcp-server` service (port 8800) with CSL-gated tool routing.

---

## Vector Database Optimization Resources

For `heady-perplexity-rag-optimizer` skill implementation:

| Resource | URL | Purpose |
|----------|-----|---------|
| pgvector HNSW | github.com/pgvector/pgvector | Approximate NN index for heady-memory |
| Qdrant filtering | qdrant.tech/documentation | Reference for payload-filtered vector search |
| Weaviate hybrid | weaviate.io/developers/weaviate/search/hybrid | BM25 + dense hybrid pattern |
| BEIR benchmarks | github.com/beir-cellar/beir | Standard retrieval quality benchmarks |

---

## Summary

All 10 external references from `external-sources-notes.md` have been:
1. **Documented** with integration patterns specific to Heady
2. **Referenced** in the relevant skill files (14 skills created)
3. **Implemented** where applicable (Drupal JSON:API in `drupal-vector-sync.js`, Cloudflare Workers AI in `silicon-bridge`, promptfoo in `heady-eval` service)

The `heady-perplexity-eval-orchestrator`, `heady-perplexity-rag-optimizer`, and `heady-perplexity-multi-agent-eval` skills provide the primary integration paths for the evaluation frameworks (promptfoo, W&B Weave, agentevals, autogen).
