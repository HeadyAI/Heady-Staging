---
name: heady-perplexity-eval-orchestrator
description: Skill for orchestrating agent evaluation metrics in the Heady platform. Use when measuring task success rate, tool selection accuracy, trajectory quality, or when integrating promptfoo, Weights & Biases Weave, or langchain-ai/agent-evals for benchmarking. Target completion rate is 85-95%. Triggers on "evaluate agent", "measure performance", "promptfoo", "wandb weave", "agent evals", "task success rate", "benchmark", or any agent quality measurement task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: evaluation
---

# Heady Perplexity Eval Orchestrator

## When to Use This Skill

Use this skill when:

- Setting up promptfoo test suites for Heady AI endpoints
- Configuring Weights & Biases Weave for agent metrics dashboards
- Running langchain-ai/agent-evals benchmarks on HeadyBuddy or HeadyBrain
- Measuring task completion rates across 17 swarms
- Evaluating tool selection accuracy for MCP tool calls
- Tracking trajectory quality for multi-step agent tasks

## Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Task Completion Rate | 85-95% | % of tasks reaching RECEIPT stage |
| Tool Selection Accuracy | 90%+ | % of MCP tool calls selecting correct tool |
| CSL Gate Precision | 95%+ | % of routed tasks matching correct domain |
| Context Enrichment Rate | 100% | % of requests with AutoContext enrichment |
| Health Check Pass Rate | 99.9% | % of /health checks returning 200 |
| Avg Pipeline Latency | < 30s | End-to-end HCFullPipeline duration |

## Instructions

### Step 1 — promptfoo Setup

Reference: https://www.promptfoo.dev/docs/intro/

```yaml
# promptfoo.config.yaml
providers:
  - id: http
    config:
      url: http://heady-brain:8100
      method: POST
      body:
        query: "{{query}}"
      headers:
        X-Heady-Domain: inference

tests:
  - description: "CSL routing accuracy"
    vars:
      query: "analyze security vulnerability in auth module"
    assert:
      - type: javascript
        value: "output.routedDomain === 'security'"
      - type: javascript
        value: "output.cslScore >= 0.618"
  
  - description: "AutoContext enrichment"
    vars:
      query: "process user onboarding event"
    assert:
      - type: javascript
        value: "output.contextEnriched === true"
```

Run: `npx promptfoo eval --config promptfoo.config.yaml`

### Step 2 — Weights & Biases Weave Integration

Reference: https://docs.wandb.ai/weave

```python
import weave
from weave import op

weave.init("heady-eval")

@op()
def heady_brain_call(query: str, domain: str) -> dict:
    import httpx
    response = httpx.post("http://heady-brain:8100/process", json={
        "query": query, "domain": domain
    })
    return response.json()

# Track a full evaluation run
@weave.op()
def run_heady_eval_suite(test_cases: list) -> dict:
    results = []
    for tc in test_cases:
        result = heady_brain_call(tc["query"], tc["domain"])
        results.append({
            "input": tc,
            "output": result,
            "csl_match": result.get("cslScore", 0) >= 0.618,
            "enriched": result.get("contextEnriched", False),
        })
    
    success_rate = sum(1 for r in results if r["csl_match"]) / len(results)
    return {"success_rate": success_rate, "results": results}
```

### Step 3 — Agent Evals Framework

Reference: https://github.com/langchain-ai/agentevals

```python
from agentevals import AgentEval, TaskResult

eval_suite = AgentEval(
    name="heady-agent-quality",
    tasks=[
        {
            "task": "route_and_process",
            "input": {"query": "deploy heady-brain service"},
            "expected_domain": "deployment",
            "expected_min_csl": 0.618,
        },
    ],
)

# Run against Heady endpoint
results = eval_suite.run(
    agent_fn=lambda task: call_heady_pipeline(task),
    metrics=["task_completion", "tool_accuracy", "trajectory_quality"],
)
print(f"Completion rate: {results.completion_rate:.1%}")
```

### Step 4 — Heady Eval Dashboard (heady-eval service, port 8401)

The `heady-eval` service aggregates all eval metrics:

```
GET /eval/summary
→ {
    taskCompletionRate: 0.923,
    toolSelectionAccuracy: 0.941,
    cslGatePrecision: 0.978,
    contextEnrichmentRate: 1.0,
    avgPipelineMs: 18450,
    swarmMetrics: {...},
    evaluatedAt: "2026-03-09T..."
  }
```

### Step 5 — CSL Quality Measurement

```javascript
// Measure CSL routing quality across 1000 test queries
async function measureCSLQuality(testQueries) {
  const results = await Promise.all(
    testQueries.map(q => fetch('http://heady-soul:8102/dispatch', {
      method: 'POST',
      body: JSON.stringify(q),
    }).then(r => r.json()))
  );
  
  return {
    totalQueries:     results.length,
    successfulRoutes: results.filter(r => r.cslScore >= 0.618).length,
    precision:        results.filter(r => r.cslScore >= 0.618).length / results.length,
    avgCSLScore:      results.reduce((s, r) => s + r.cslScore, 0) / results.length,
  };
}
```

## References

- [promptfoo documentation](https://www.promptfoo.dev/docs/intro/)
- [Weights & Biases Weave](https://docs.wandb.ai/weave)
- [langchain-ai/agentevals](https://github.com/langchain-ai/agentevals)
- Heady eval service: `heady-eval` port 8401
