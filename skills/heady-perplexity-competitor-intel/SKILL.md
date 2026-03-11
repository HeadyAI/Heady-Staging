---
name: heady-perplexity-competitor-intel
description: Skill for competitive intelligence gathering on AI platforms, agent frameworks, and developer tools competing with HeadySystems. Use when asked to research competitors, compare platforms, analyze market positioning, track competitor releases, or build competitive battlecards. Triggers on "competitor", "vs", "compare", "market analysis", "competitive landscape", "what does OpenAI/Anthropic/Google do", or any competitive research task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: strategy
---

# Heady Perplexity Competitor Intel

## When to Use This Skill

Use this skill when:

- Building competitive battlecards for investor presentations
- Tracking competitor product launches and pricing changes
- Analyzing OpenAI, Anthropic, Google DeepMind, Mistral, Cohere positioning
- Researching AI agent framework competitors (AutoGen, CrewAI, LangGraph)
- Monitoring MCP ecosystem competitors
- Tracking vector database market (Pinecone, Weaviate, Qdrant vs HeadyMemory)

## Competitor Landscape (Heady's Primary Markets)

| Market | Key Competitors |
|--------|----------------|
| AI Agent Platforms | AutoGen, CrewAI, LangGraph, Bee Agent Framework |
| Vector Memory | Pinecone, Weaviate, Qdrant, pgvector |
| AI Gateway/Routing | LiteLLM, OpenRouter, Portkey |
| MCP Servers | Anthropic MCP registry, npm @modelcontextprotocol |
| Edge AI | Cloudflare Workers AI, Vercel AI SDK |
| Headless CMS | Contentful, Sanity, Drupal (co-opted as partner) |

## Instructions

### Step 1 — Define Intel Objective

Specify:
- Which competitor(s) to analyze
- Which market segment (agent orchestration, vector memory, gateway, etc.)
- Time window (last 30/90/180 days for recent activity)
- Intel depth (feature list vs deep architecture analysis)

### Step 2 — Data Collection

Search across:
1. Competitor product pages and documentation
2. GitHub repos (stars, recent commits, issues)
3. Hacker News, Reddit r/MachineLearning for community sentiment
4. LinkedIn for team size and hiring signals
5. Crunchbase for funding and growth signals
6. ArXiv for technical papers backing competitor claims

### Step 3 — Competitive Matrix

Build a scoring matrix for each competitor vs HeadySystems:

| Dimension | HeadySystems | Competitor | Winner |
|-----------|-------------|-----------|--------|
| Agent concurrency model | Concurrent equal-status (no ranking) | {their model} | |
| Context injection | HeadyAutoContext (mandatory everywhere) | {their approach} | |
| Vector memory | 384-dim pgvector + 3D octree | {their storage} | |
| Routing mechanism | CSL cosine similarity | {their routing} | |
| Sacred geometry | Yes (phi-scaling throughout) | No | Heady |
| Multi-model council | Yes (7+ providers) | Limited | |
| MCP integration | Full (8+ MCP servers) | Partial | |
| Open source | Core open, enterprise closed | {their model} | |

### Step 4 — Battlecard Format

```markdown
## Competitive Battlecard: HeadySystems vs {Competitor}

### Why We Win
- {3-5 specific technical advantages}

### Where They Win
- {honest assessment of competitor strengths}

### Objection Handlers
| Objection | Response |
|-----------|----------|

### When to Mention This Competitor
- {scenarios where this comparison arises}

### Deal Intelligence
- Pricing signal: {what we know about their pricing}
- Enterprise readiness: {their enterprise capabilities}
```

### Step 5 — Monitoring Cadence

Set up ongoing monitoring for:
- GitHub release tags on key repos
- Product changelog pages (weekly)
- Pricing page changes (monthly)
- Funding announcements (on-demand via X/LinkedIn)

## Examples

**Input**: "Compare HeadySystems to Microsoft AutoGen"
**Output**: Full competitive analysis with architectural comparison, feature matrix, battlecard, and HeadySystems differentiation narrative

**Input**: "What is Anthropic's MCP ecosystem status as of 2026?"
**Output**: Current MCP registry size, server count, popular integrations, and gap analysis vs HeadyMCP
