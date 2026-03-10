# ADR-010: Feature Flags with Fibonacci Rollout Steps

## Status
Accepted

## Context
Feature rollouts need gradual, predictable progression with easy rollback.

## Decision
Rollout follows Fibonacci percentage steps: 2% → 5% → 13% → 21% → 55% → 100%
- Deterministic user bucketing via SHA-256 hash
- φ-weighted variant distribution (control: ψ ≈ 0.618, treatment: ψ² ≈ 0.382)
- CSL-gated segment targeting
- A/B testing with conversion tracking

## Consequences
- Gradual exposure catches issues early
- Each step roughly doubles the previous (Fibonacci growth)
- Rollback is a single step back
- Experiments produce statistically meaningful results at each step
