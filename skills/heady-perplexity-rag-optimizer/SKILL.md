---
name: heady-perplexity-rag-optimizer
description: Skill for optimizing Retrieval-Augmented Generation quality in the Heady vector memory system. Use when measuring retrieval signal-to-noise ratio, context precision and recall, improving CSL gate thresholds, tuning embedding models, or optimizing pgvector queries. Triggers on "RAG quality", "retrieval precision", "context noise", "embedding quality", "vector search accuracy", "improve retrieval", or any vector retrieval optimization task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: memory
---

# Heady Perplexity RAG Optimizer

## When to Use This Skill

Use this skill when:

- Retrieval quality is degrading (low precision, high noise)
- CSL gate thresholds need tuning for a new domain
- Embedding model performance needs evaluation
- pgvector query plans need optimization
- Context window is being filled with irrelevant results
- AutoContext enrichment quality is below target

## Retrieval Quality Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Context Precision | Relevant retrieved / Total retrieved | ≥ 0.85 |
| Context Recall | Relevant retrieved / Total relevant | ≥ 0.80 |
| Signal-to-Noise | Relevant tokens / Total tokens | ≥ 0.70 |
| CSL Gate Pass Rate | Passed include gate / Total queries | 60-80% |
| Mean Reciprocal Rank | avg(1 / rank of first relevant) | ≥ 0.75 |
| Latency P95 | 95th percentile retrieval time | ≤ 50ms |

## Instructions

### Step 1 — Baseline Measurement

```javascript
// Run a retrieval quality probe across 100 test queries
async function measureRetrievalQuality(testQueries) {
  const PHI = 1.618033988749895;
  const PSI = 1 / PHI; // ≈ 0.618

  const results = [];
  for (const q of testQueries) {
    const res = await fetch('http://heady-memory:8106/search', {
      method: 'POST',
      body: JSON.stringify({
        query: q.text,
        topK: 8,           // fib(6) = 8
        cslThreshold: PSI, // ≈ 0.618 default include gate
      }),
    }).then(r => r.json());

    results.push({
      query:     q.text,
      retrieved: res.results?.length || 0,
      relevant:  res.results?.filter(r => q.expectedDomains.includes(r.domain)).length || 0,
      topScore:  res.results?.[0]?.cslScore || 0,
      latencyMs: res.latencyMs,
    });
  }

  const precision = results.map(r => r.relevant / Math.max(r.retrieved, 1));
  return {
    avgPrecision: precision.reduce((a, b) => a + b, 0) / precision.length,
    p95LatencyMs: results.map(r => r.latencyMs).sort((a, b) => a - b)[Math.floor(results.length * 0.95)],
  };
}
```

### Step 2 — CSL Gate Tuning

The three CSL gates control retrieval quality:

```javascript
// Current defaults (from phi-math.js)
CSL_GATES = {
  include: 0.382,  // PSI²   — minimum to consider
  boost:   0.618,  // PSI    — amplify in context
  inject:  0.718,  // PSI+0.1 — auto-inject
};

// Tuning strategy:
// - Too many noisy results → RAISE include gate (try 0.45)
// - Too few results / missing relevant context → LOWER include gate (try 0.30)
// - Context window full with irrelevant content → RAISE boost gate
// - Not enough context auto-injected → LOWER inject gate
```

Adjust via environment:
```
CSL_GATE_INCLUDE=0.45
CSL_GATE_BOOST=0.65
CSL_GATE_INJECT=0.75
```

### Step 3 — pgvector Query Optimization

```sql
-- Baseline: sequential scan (slow for >100K vectors)
SELECT id, content, 1 - (embedding <=> $1::vector) as csl_score
FROM heady_memory
WHERE 1 - (embedding <=> $1::vector) >= 0.382
ORDER BY embedding <=> $1::vector
LIMIT 8;

-- Optimized: HNSW index (fast approximate nearest neighbor)
CREATE INDEX heady_memory_hnsw ON heady_memory 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- With domain filtering (push down domain match for better selectivity)
SELECT id, content, domain, 1 - (embedding <=> $1::vector) as csl_score
FROM heady_memory
WHERE domain = $2  -- pre-filter by domain for better selectivity
AND 1 - (embedding <=> $1::vector) >= 0.382
ORDER BY embedding <=> $1::vector
LIMIT 8;
```

### Step 4 — Embedding Model Evaluation

Compare embedding model quality for Heady content:

| Model | Dimensions | Speed | Quality | Recommendation |
|-------|-----------|-------|---------|---------------|
| all-MiniLM-L6-v2 | 384 | Fast | Good | Default (current) |
| all-mpnet-base-v2 | 768 | Medium | Better | Upgrade candidate |
| Cloudflare BGE-large | 1024 | Fast (edge) | Best | Use for edge queries |

Test with:
```bash
# Compare embedding models on Heady domain queries
npx promptfoo eval --config embedding-model-comparison.yaml
```

### Step 5 — Hybrid Search (BM25 + Dense)

For improved recall on sparse queries:

```javascript
// Combine BM25 lexical score with dense cosine score
async function hybridSearch(query, topK = 8) {
  const PSI = 0.618;
  const [dense, sparse] = await Promise.all([
    denseVectorSearch(query, topK * 2),
    bm25Search(query, topK * 2),
  ]);

  // Reciprocal rank fusion
  const scores = new Map();
  dense.forEach((r, i) => scores.set(r.id, (scores.get(r.id) || 0) + PSI / (i + 1)));
  sparse.forEach((r, i) => scores.set(r.id, (scores.get(r.id) || 0) + (1 - PSI) / (i + 1)));

  return [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, topK)
    .map(([id, score]) => ({ id, fusionScore: score }));
}
```

## References

- [Heady vector memory service](http://heady-memory:8106)
- [pgvector documentation](https://github.com/pgvector/pgvector)
- [HNSW algorithm](https://arxiv.org/abs/1603.09320) — Hierarchical Navigable Small World
- Heady skill: `heady-hybrid-vector-search` (existing skill)
