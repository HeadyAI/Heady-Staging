---
name: heady-perplexity-eval-orchestrator
title: Heady Perplexity Eval Orchestrator
description: Agent evaluation metrics — task success rate, tool accuracy, trajectory quality
triggers: eval, evaluation, metrics, agent quality, benchmarks
version: 1.0.0
author: HeadySystems Inc.
---

# Heady Perplexity Eval Orchestrator

Agent evaluation metrics — task success rate, tool accuracy, trajectory quality

## Purpose
Evaluate Heady agent performance using standardized metrics — task success rate, tool selection accuracy, trajectory quality, with 85-95% completion targets.

## Metrics
- **Task Success Rate**: Percentage of tasks completed to spec (target: 85-95%)
- **Tool Selection Accuracy**: How often the right tool is chosen first try
- **Trajectory Quality**: Efficiency of the action sequence (fewer steps = better)
- **CSL Relevance Score**: Average cosine similarity of results to task intent
- **Latency**: Time from task submission to completion (φ-scaled thresholds)
- **Cost Efficiency**: Credits consumed per successful task completion

## Evaluation Protocol
1. Submit task to HeadyBee workers
2. Record all tool calls, intermediate results, and final output
3. CSL-score final output against task intent vector
4. Measure trajectory length vs optimal path
5. Log all metrics to DuckDB analytics
6. Feed results back to pattern evolution engine

## Integration
- HeadyArena for competitive A/B evaluation
- HeadyVinci for pattern learning from evaluations
- HeadyAutoContext for indexing evaluation results
- Auto-Success Engine for dynamic threshold adjustment


---
*© 2026 HeadySystems Inc. — 51+ Provisional Patents — Sacred Geometry v4.0*
