---
name: heady-arena-productization
description: Productize the Heady Arena for multi-model comparison and intelligent route selection. Use when designing model evaluation frameworks, building routing logic that picks the best AI model for a task, creating arena UX for competitive evaluation, or planning arena-as-a-service offerings.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Arena Productization

Use this skill when you need to **productize, extend, or optimize the Heady Arena** — transforming competitive multi-model evaluation from an internal tool into a user-facing product with intelligent routing, comparison UX, and arena-as-a-service capabilities.

## When to Use This Skill

- Designing the user-facing arena experience for model comparison
- Building intelligent route selection — automatically picking the best model for a task
- Creating evaluation frameworks with custom criteria and scoring
- Planning arena-as-a-service for external developers
- Optimizing model selection based on cost, latency, and quality tradeoffs
- Designing leaderboard and benchmarking systems

## Instructions

### 1. Define the Arena Product Model

The Arena operates in three modes:

| Mode | User Experience | Use Case |
|------|----------------|----------|
| **Auto-Route** | Invisible — system picks best model | Default for most tasks |
| **Compare** | Side-by-side results from 2-3 models | When user wants to evaluate options |
| **Tournament** | Full arena with all models competing | Critical decisions, benchmarking |

### 2. Design Intelligent Route Selection

The router picks the optimal model based on:

```yaml
routing_signals:
  task_type: code | analysis | creative | conversation | reasoning
  complexity: simple | moderate | complex
  latency_requirement: real-time (<2s) | interactive (<10s) | batch (>10s)
  cost_sensitivity: low | medium | high
  quality_requirement: good-enough | high | best-possible
  domain: general | specialized (legal, medical, code, etc.)
  context_size: small (<4K) | medium (<32K) | large (>32K)
```

**Routing decision matrix:**

| Signal Combo | Route To | Reasoning |
|-------------|----------|-----------|
| Simple + real-time + cost-sensitive | Fast/small model | Speed and cost matter more than peak quality |
| Complex + best-possible | Large model or arena | Quality is paramount |
| Code + high quality | Code-specialized model | Domain expertise matters |
| Creative + moderate | Mid-tier model | Creativity doesn't always need the biggest model |

### 3. Build the Comparison UX

Side-by-side model comparison interface:

```
┌─────────────────────┬─────────────────────┐
│ Model A: Claude     │ Model B: GPT-4      │
├─────────────────────┼─────────────────────┤
│ Response here...    │ Response here...     │
│                     │                      │
│ Latency: 1.2s      │ Latency: 2.1s        │
│ Tokens: 450        │ Tokens: 380          │
│ Cost: $0.003       │ Cost: $0.004         │
├─────────────────────┼─────────────────────┤
│ [Pick Winner]       │ [Pick Winner]        │
└─────────────────────┴─────────────────────┘
Quality Score: A=87 | B=82 | Criteria: accuracy, completeness
```

**Comparison features:**
- Synchronized scrolling for long responses
- Diff highlighting for factual differences
- Quality scoring with configurable criteria
- Cost and latency breakdowns
- One-click winner selection that feeds the routing model

### 4. Design the Evaluation Framework

Custom evaluation criteria system:

```yaml
evaluation:
  criteria:
    - name: accuracy
      weight: 0.3
      description: Factual correctness of the response
    - name: completeness
      weight: 0.25
      description: Covers all aspects of the query
    - name: code_quality
      weight: 0.25
      description: Clean, efficient, bug-free code
    - name: clarity
      weight: 0.2
      description: Easy to understand and act on
  scoring: 1-10 per criterion, weighted average
  evaluators: [auto-eval, user-vote, expert-review]
```

### 5. Build the Leaderboard

Track model performance over time:

| Model | Elo Rating | Win Rate | Avg Quality | Avg Latency | Cost/Query |
|-------|-----------|----------|-------------|-------------|------------|
| Model A | 1580 | 68% | 8.7 | 1.1s | $0.003 |
| Model B | 1520 | 62% | 8.4 | 2.0s | $0.004 |
| Model C | 1490 | 55% | 8.1 | 0.8s | $0.001 |

**Leaderboard features:**
- Filter by task type, domain, and time period
- Elo-based ranking from pairwise comparisons
- Trend charts showing rating changes over time
- Breakdown by specific evaluation criteria

### 6. Plan Arena-as-a-Service

For external developers:

- **API** — submit tasks, get routed results or multi-model comparisons
- **Webhooks** — notification when arena evaluations complete
- **Custom models** — developers can register their own models in the arena
- **Private arenas** — isolated evaluation environments for sensitive workloads
- **Usage tiers** — free (limited comparisons), pro (unlimited + routing), enterprise (custom models + SLA)

## Output Format

When productizing Arena features, produce:

1. **Product mode definitions** (auto-route, compare, tournament)
2. **Routing logic specification** with decision matrix
3. **Comparison UX wireframes**
4. **Evaluation criteria schema**
5. **Leaderboard design**
6. **API specification** (if arena-as-a-service)

## Tips

- **Auto-route is the default** — most users shouldn't need to think about model selection
- **Comparisons build trust** — letting users see alternatives makes them confident in the routed choice
- **Elo ratings are intuitive** — borrowed from chess, users understand relative rankings
- **Cost matters** — always show cost alongside quality; the best model isn't always worth 10x the price
- **Feed wins back into routing** — every user vote improves the router; this is a flywheel
- **Don't over-evaluate** — running 7 models for every query is expensive; reserve tournaments for high-value decisions
