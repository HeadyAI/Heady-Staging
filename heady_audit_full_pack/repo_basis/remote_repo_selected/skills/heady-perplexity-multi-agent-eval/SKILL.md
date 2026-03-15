---
name: heady-perplexity-multi-agent-eval
description: Skill for evaluating orchestration quality in concurrent agent systems. Use when measuring multi-agent step completion rates, utility scoring for swarm tasks, latency distribution across 17 swarms, or benchmarking HeadyBee concurrent execution against single-agent baselines. References microsoft/autogen benchmarks. Triggers on "multi-agent eval", "swarm performance", "concurrent agent", "AutoGen benchmark", "step completion", "utility score", or any multi-agent evaluation task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: evaluation
---

# Heady Perplexity Multi-Agent Eval

## When to Use This Skill

Use this skill when:

- Benchmarking Heady's 17-swarm concurrent architecture
- Comparing HeadyBee performance against single-agent approaches
- Measuring step completion across multi-hop agent tasks
- Computing utility scores for bee task outputs
- Evaluating swarm coordination quality
- Testing that no swarm has implicit ranking/priority over others

## Evaluation Framework

Reference architectures:
- [microsoft/autogen](https://github.com/microsoft/autogen) — multi-agent conversation benchmarks
- [langchain-ai/agent-evals](https://github.com/langchain-ai/agent-evals) — trajectory evaluation

## Key Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Step Completion Rate | % of agent steps completing without timeout | ≥ 90% |
| Swarm Concurrency Factor | avg parallel swarms per task | ≥ 3 of 17 |
| Equal-Status Verification | No swarm completes > 2x faster than others (drift indicator) | Variance < 20% |
| Utility Score | Relevance × Accuracy × Efficiency (0..1) | ≥ 0.75 |
| CSL Domain Match Rate | % of tasks routed to correct swarm | ≥ 95% |
| No-Ranking Compliance | 0 priority-related delays | 100% |

## Instructions

### Step 1 — AutoGen Benchmark Adaptation

```python
# Adapt AutoGen's math/coding benchmarks for Heady swarm evaluation
# Reference: https://github.com/microsoft/autogen

import asyncio
import httpx

HEADY_ORCHESTRATION = "http://heady-orchestration:8202"

async def run_heady_swarm_task(task: dict) -> dict:
    """Send a task to Heady orchestration and measure execution."""
    start = asyncio.get_event_loop().time()
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{HEADY_ORCHESTRATION}/dispatch",
            json=task,
        )
    elapsed = asyncio.get_event_loop().time() - start
    result = response.json()
    return {
        "task_id": result.get("taskId"),
        "swarm_id": result.get("routedSwarmId"),
        "domain": result.get("routedDomain"),
        "csl_score": result.get("cslScore", 0),
        "dispatched": result.get("dispatched", False),
        "elapsed_ms": elapsed * 1000,
    }

async def run_concurrency_benchmark(num_tasks: int = 17) -> dict:
    """Run N tasks simultaneously — verify all dispatch concurrently."""
    tasks = [
        {"type": "research", "domain": d, "payload": {"query": f"test {d}"}}
        for d in ["security", "inference", "memory", "context", "deployment",
                  "data", "research", "monitoring", "edge", "integration",
                  "analysis", "reliability", "fintech", "documentation",
                  "testing", "governance", "orchestration"][:num_tasks]
    ]
    
    start = asyncio.get_event_loop().time()
    results = await asyncio.gather(*[run_heady_swarm_task(t) for t in tasks])
    total_ms = (asyncio.get_event_loop().time() - start) * 1000
    
    # Verify concurrent execution (all tasks should complete within 2× of the fastest)
    latencies = [r["elapsed_ms"] for r in results if r["dispatched"]]
    min_ms = min(latencies)
    max_ms = max(latencies)
    concurrency_ok = (max_ms / min_ms) < 2.0  # No task > 2x slower than fastest
    
    return {
        "total_dispatched":   sum(1 for r in results if r["dispatched"]),
        "total_tasks":        num_tasks,
        "concurrency_factor": len(set(r["swarm_id"] for r in results if r["dispatched"])),
        "min_ms":             min_ms,
        "max_ms":             max_ms,
        "concurrent_ok":      concurrency_ok,
        "avg_csl_score":      sum(r["csl_score"] for r in results) / len(results),
    }

asyncio.run(run_concurrency_benchmark())
```

### Step 2 — Utility Scoring

```javascript
// Compute utility score for a bee task output
function computeUtilityScore(output, expected) {
  const PHI = 1.618033988749895;
  const PSI = 1 / PHI;

  // Relevance: CSL score of output vs expected domain
  const relevance = output.cslScore || 0;

  // Accuracy: % of expected fields present in output
  const expectedKeys = Object.keys(expected || {});
  const presentKeys  = expectedKeys.filter(k => output.result?.[k] !== undefined);
  const accuracy     = expectedKeys.length > 0 ? presentKeys.length / expectedKeys.length : 1;

  // Efficiency: inverse of normalized latency (faster = more efficient)
  const latencyMs    = output.ms || 0;
  const maxExpectedMs = 30_000; // 30s ceiling
  const efficiency   = Math.max(0, 1 - (latencyMs / maxExpectedMs));

  // Phi-weighted fusion: relevance carries PSI weight, accuracy and efficiency split remainder
  const utility = (relevance * PSI) + (accuracy * PSI * PSI) + (efficiency * (1 - PSI - PSI * PSI));

  return { utility, relevance, accuracy, efficiency };
}
```

### Step 3 — Equal-Status Compliance Test

```javascript
// Verify no swarm has systemic timing advantage over others
async function testEqualStatusCompliance() {
  const PHI = 1.618033988749895;
  const swarmDomains = [
    'orchestration', 'inference', 'memory', 'context', 'security',
    'deployment', 'data', 'research', 'monitoring', 'edge',
    'integration', 'analysis', 'reliability', 'fintech',
    'documentation', 'testing', 'governance',
  ];

  const timings = {};
  await Promise.all(swarmDomains.map(async domain => {
    const t0 = Date.now();
    await fetch('http://heady-orchestration:8202/dispatch', {
      method: 'POST',
      body: JSON.stringify({ type: 'probe', domain, payload: {} }),
    });
    timings[domain] = Date.now() - t0;
  }));

  const times = Object.values(timings);
  const mean  = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length;
  const stdDev = Math.sqrt(variance);
  const cv     = stdDev / mean; // Coefficient of variation

  return {
    mean: mean.toFixed(1),
    stdDev: stdDev.toFixed(1),
    cv: cv.toFixed(3),
    compliant: cv < 0.20, // < 20% variation → equal status achieved
    timings,
  };
}
```

## References

- [microsoft/autogen](https://github.com/microsoft/autogen)
- [langchain-ai/agentevals](https://github.com/langchain-ai/agentevals)
- Heady orchestration: `heady-orchestration` port 8202
- Heady eval service: `heady-eval` port 8401
