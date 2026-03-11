---
name: heady-perplexity-deep-research
description: Skill for using Perplexity Sonar Pro for automated deep research with citation injection into the Heady vector memory. Use when the task requires searching the web for current information, academic papers, patent prior art, competitive intelligence, technology comparisons, regulatory updates, or any factual research that needs citations embedded into HeadyAutoContext. Triggers on phrases like "research", "find sources", "look up", "cite", "investigate", or any query requiring real-time web knowledge.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: research
---

# Heady Perplexity Deep Research

## When to Use This Skill

Use this skill when:

- Gathering competitive intelligence on AI platforms and tools
- Researching patent prior art for HeadySystems IP portfolio
- Finding academic papers on vector databases, embedding models, CSL algorithms
- Investigating regulatory requirements (GDPR, HIPAA, SOC 2)
- Discovering new MCP servers, tools, and integrations
- Building evidence-based architecture decisions
- Generating cited reference materials for any Heady domain

## Instructions

### Step 1 — Define Research Scope

Before searching, define:
- **Primary question**: single clear research objective
- **Domain tags**: which Heady swarms should receive the findings (security, research, fintech, etc.)
- **Citation depth**: how many sources (default: 5-8 sources per major claim)
- **Recency window**: always include a current-year query for time-sensitive topics

### Step 2 — Search Strategy

Use parallel queries to cover multiple angles:

```
Query set example for "vector database comparison":
1. "pgvector vs Pinecone vs Weaviate performance 2026"
2. "best open source vector database embedding retrieval benchmarks"
3. "Cloudflare Vectorize vector search edge computing"
```

Always use `search_web` for general research and `search_vertical` with `vertical: 'academic'` for papers and `vertical: 'people'` for expert identification.

### Step 3 — Citation Format

Every finding must include:
- Source URL (full URL, not shortened)
- Publication date or access date
- Source authority score (0-1, based on domain reputation)
- Relevance to Heady domain

Format: `[Source Name](https://url) — accessed YYYY-MM-DD`

### Step 4 — Vector Memory Injection

After research, index findings into HeadyAutoContext:

```javascript
await fetch(`${AUTOCONTEXT_URL}/context/index`, {
  method: 'POST',
  body: JSON.stringify({
    source: 'perplexity-research',
    query: originalQuery,
    findings: citedFindings,
    tags: domainTags,
    cslScore: relevanceScore,
  }),
});
```

### Step 5 — Output Format

Research output should be structured as:

```markdown
## Research: {topic}

### Key Findings
1. Finding with inline citation [Source](url)

### Evidence Summary
| Claim | Source | Date | Authority |
|-------|--------|------|-----------|

### Gaps Identified
- What was NOT found and why it matters

### Injected Into Vector Memory
- {N} findings indexed with tags: {tags}
```

## Examples

**Input**: "Research MCP server implementations for vector databases"
**Output**: Structured findings from npm, GitHub, Hugging Face with citations, indexed into vector memory with tags `['mcp', 'vector', 'database']`

**Input**: "Find academic papers on CSL cosine similarity routing"
**Output**: Papers from arXiv, ACL, NeurIPS with DOIs, relevance scores, and vector memory injection receipt
