# ADR-001: φ-Math Foundation for All Constants

## Status
Accepted

## Context
Heady requires a unified mathematical foundation to eliminate arbitrary "magic numbers" across all modules. Constants like 0.5, 0.7, 100, 500, 1000 appear inconsistently and without justification.

## Decision
All numeric constants derive from φ (1.6180339887), ψ (0.6180339887), ψ² (0.3819660113), and the Fibonacci sequence. This applies to:
- Thresholds (phiThreshold levels 0-4)
- Sizes (Fibonacci: 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597)
- Weights (φ-fusion weights)
- Backoff timing (φ-exponential)
- Resource allocation (Fibonacci ratios)

## Consequences
- Every constant is auditable and traceable to φ
- Module compliance can be verified programmatically
- New modules must import from shared/phi-math-v2.js
- Compliance target: 100% (no magic numbers allowed)
