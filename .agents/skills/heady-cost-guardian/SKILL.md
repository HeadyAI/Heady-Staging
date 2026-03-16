---
name: heady-cost-guardian
description: Use when tracking and optimizing spending across all AI providers, cloud services, and API subscriptions. Manages key rotation, rate limit optimization, and cost-aware provider routing. Keywords include cost, spending, budget, provider routing, key rotation, rate limits, billing, optimization.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: CostGuardianSwarm
  absorption_source: "§33.4 — Autonomous Maintenance Swarms"
  super_prompt_section: "§33.4"
---

# Heady™ Cost Guardian (CostGuardianSwarm)

## When to Use This Skill

Use this skill when:
- Monitoring spending across AI providers (Anthropic, OpenAI, Google, Groq)
- Optimizing provider routing to minimize cost while maintaining quality
- Rotating API keys across organization segments to manage rate limits
- Generating cost reports and budget projections

## Architecture

### Provider Cost Matrix

| Provider | Pricing Model | Optimization Strategy |
|---|---|---|
| Anthropic | Per-token (input/output) | Route simple tasks to Haiku, complex to Opus |
| OpenAI | Per-token (tiered) | Use GPT-4o-mini for classification, GPT-4o for generation |
| Google | Per-character / per-token | Gemini Flash for bulk, Pro for quality |
| Groq | Per-token (fast inference) | Latency-sensitive tasks |
| Colab Pro+ | Monthly subscription (4×) | Maximize GPU utilization, avoid idle |

### Key Rotation Strategy

```
For each provider:
  1. Track per-key usage against rate limits
  2. When key approaches 80% of rate limit: rotate to next key
  3. Distribute keys across org segments (HeadySystems, HeadyConnection)
  4. Alert if total capacity < projected demand
```

## Instructions

### Running Cost Audit

1. Query each provider's usage API for current billing period
2. Calculate per-task cost breakdown
3. Identify cost outliers (tasks costing > 3σ from mean)
4. Recommend optimization: model downgrade, caching, batching
5. Check API key rate limit utilization across all keys
6. Rotate keys approaching limits
7. Generate cost projection for next billing cycle

## Output Format

- Current Spend by Provider (table)
- Cost Optimization Recommendations
- Key Rotation Actions Taken
- Budget Projection (30-day forecast)
