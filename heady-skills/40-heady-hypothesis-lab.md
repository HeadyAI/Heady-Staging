---
name: hypothesis-lab
description: >
  Hypothesis Lab for Heady — structured experimentation framework for testing architectural
  decisions, comparing implementation approaches, benchmarking provider performance, and validating
  design hypotheses before committing to production code. Runs controlled A/B experiments using
  web research for external benchmarks, code sandboxes for implementation tests, and connected
  app data for real-world validation. Use when Eric needs to compare AI providers, test
  architectural patterns, validate patent novelty claims, benchmark Heady performance against
  competitors, or make evidence-based technical decisions. Keywords: hypothesis testing, A/B test,
  benchmark, comparison, experiment, validation, evidence, architectural decision, provider
  benchmark, performance test, trade-off analysis, decision framework, Heady validation.
metadata:
  author: HeadySystems
  version: '1.0'
---

# Hypothesis Lab for Heady

> Perplexity Computer Skill — Evidence-based decision making for the Heady ecosystem

## When to Use This Skill

Use when:

- Eric says "should we use X or Y for Z?" — compare approaches with evidence
- Benchmarking AI provider performance (Claude vs GPT vs Gemini vs Groq)
- Validating that a Heady pattern (CSL gates, φ-scaling) outperforms alternatives
- Testing whether a new service architecture will handle expected load
- Comparing Heady's approach against competitor implementations
- Making build-vs-buy decisions for ecosystem components
- Validating patent novelty — does prior art implement the same approach?

## Experiment Framework

### Hypothesis Structure

Every experiment follows the same format:

```
HYPOTHESIS: [Clear, falsifiable statement]
  Example: "φ-scaled backoff reduces retry storms by 40%+ compared to fixed exponential backoff"

VARIABLE: [What changes between conditions]
  Example: "Backoff algorithm (φ-scaled vs fixed 2× vs jittered)"

METRIC: [How we measure the outcome]
  Example: "Mean time to recovery, total retries, p99 latency during storm"

METHOD: [How we'll test this]
  Example: "Simulate 1000 concurrent failures, measure recovery with each algorithm"

EVIDENCE THRESHOLD: [What constitutes proof]
  Example: "φ-scaled must show ≥20% fewer total retries to confirm hypothesis"
```

### Experiment Types

| Type | Method | Best For |
|---|---|---|
| Literature Experiment | Web research + academic papers | Prior art, industry benchmarks |
| Code Experiment | Sandbox implementation + measurement | Algorithm comparison, performance |
| Provider Experiment | Live API calls with timing | AI model comparison, cost analysis |
| Architecture Experiment | Design analysis + simulation | System design decisions |
| Market Experiment | Competitive research + feature comparison | Build vs buy, positioning |

## Instructions

### Running a Literature Experiment

When the question can be answered with existing research:

1. **Formalize the hypothesis** — Write it in the structured format above
2. **Search systematically** —
   - `search_web` for industry benchmarks and case studies
   - `search_vertical` with `vertical='academic'` for research papers
   - `fetch_url` for specific technical documentation
3. **Collect evidence** — For each source, extract:
   - Relevant metric or finding
   - Methodology (how did they test?)
   - Sample size / conditions
   - Applicability to Heady's context
4. **Synthesize** — Do the findings support or refute the hypothesis?
5. **Rate confidence** — Based on evidence quality and quantity

### Running a Code Experiment

When the hypothesis requires testing actual code:

1. **Formalize the hypothesis**
2. **Build the test harness** in workspace:
   ```
   /home/user/workspace/experiments/{experiment-name}/
   ├── hypothesis.md      — Formal hypothesis and metrics
   ├── condition-a/       — First implementation
   ├── condition-b/       — Second implementation
   ├── benchmark.js       — Test script
   └── results.json       — Measured outcomes
   ```
3. **Implement both conditions** — Minimal, focused implementations
4. **Run benchmarks** — Use `bash` to execute, capture timing/metrics
5. **Analyze results** — Statistical comparison (mean, stddev, p-values if sufficient samples)
6. **Deliver verdict** — Which condition wins, by how much, with what confidence

### Running a Provider Experiment

When comparing AI providers:

1. **Define the task** — Same task, same input, multiple providers
2. **Prepare test cases** — At least 5 representative inputs
3. **Execute via available tools** — Use connectors or search to gather latest benchmark data
4. **Compare on multiple dimensions:**
   - Quality (output correctness / coherence)
   - Speed (latency p50, p95, p99)
   - Cost (tokens consumed × per-token price)
   - Reliability (error rate, timeout rate)
5. **Apply Heady's φ-weighted scoring:**
   ```
   Score = (quality × PHI + speed × 1.0 + cost_efficiency × PSI + reliability × PSI²) /
           (PHI + 1.0 + PSI + PSI²)
   ```

### Running an Architecture Experiment

When evaluating design alternatives:

1. **Define the design question** — What are we choosing between?
2. **Research each approach:**
   - Who uses it in production?
   - What scale does it handle?
   - What are the known failure modes?
   - How does it integrate with Heady's existing stack?
3. **Build a comparison matrix:**
   ```
   | Criterion | Weight | Approach A | Approach B | Approach C |
   |---|---|---|---|---|
   | Scalability | PHI | 8/10 | 6/10 | 9/10 |
   | Heady Integration | 1.0 | 9/10 | 5/10 | 7/10 |
   | Complexity | PSI | 4/10 | 8/10 | 3/10 |
   | φ-Weighted Score | — | 7.4 | 6.1 | 6.8 |
   ```
4. **Recommendation with evidence trail**

### Running a Patent Novelty Experiment

When validating that a Heady innovation is novel:

1. **State the claim** — What does the patent assert is new?
2. **Search for prior art:**
   - `search_vertical` with `vertical='academic'` for research papers
   - `search_web` for open-source implementations
   - `search_web` for competitor patents and filings
3. **For each potential prior art:**
   - Does it implement the same method?
   - Does it achieve the same result?
   - Does it use the same approach (φ-scaling, CSL gates, 384D space)?
4. **Novelty assessment:**
   - Novel: No prior art implements this approach
   - Partially novel: Similar approaches exist but Heady's differs in key ways
   - Not novel: Prior art substantially covers this claim

## Output Templates

### Experiment Report

```
## Experiment: [Name]
Date: [Date]
Hypothesis: [Statement]

### Methodology
[How the experiment was conducted]

### Conditions
- Condition A: [Description]
- Condition B: [Description]

### Results
| Metric | Condition A | Condition B | Winner |
|---|---|---|---|
| [Metric 1] | [Value] | [Value] | [A/B] |
| [Metric 2] | [Value] | [Value] | [A/B] |

### Analysis
[Statistical analysis, confidence level, caveats]

### Verdict
**[CONFIRMED / REFUTED / INCONCLUSIVE]**
[Explanation and implications for Heady]

### Recommendations
1. [Action based on findings]
2. [Follow-up experiment if needed]
```

### Quick Decision Matrix

```
## Decision: [Question]

| Factor | Weight | Option A | Option B | Option C |
|---|---|---|---|---|
| [Factor 1] | PHI | [Score] | [Score] | [Score] |
| [Factor 2] | 1.0 | [Score] | [Score] | [Score] |
| [Factor 3] | PSI | [Score] | [Score] | [Score] |
| **φ-Weighted Total** | — | **[Total]** | **[Total]** | **[Total]** |

**Recommendation:** [Option] because [evidence-based reason]
```

## Heady-Specific Experiment Templates

### CSL Gate Threshold Validation
Hypothesis: "CSL gate at 0.809 (MEDIUM) is the optimal threshold for [use case]"
Method: Test with thresholds at 0.691, 0.809, 0.882 — measure precision/recall

### φ-Scaling Superiority
Hypothesis: "φ-scaled parameter X outperforms linear/logarithmic scaling"
Method: Benchmark three scaling functions on same workload

### Provider Routing Optimization
Hypothesis: "Dynamic routing via HeadyConductor outperforms static provider assignment"
Method: Same task set, static vs dynamic routing, measure quality + cost

### Sacred Geometry Topology Efficiency
Hypothesis: "Zone-based routing (center→inner→middle→outer) reduces latency vs flat mesh"
Method: Simulate both topologies with realistic traffic patterns
