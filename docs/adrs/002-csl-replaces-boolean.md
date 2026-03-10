# ADR-002: CSL Gates Replace All Boolean Logic

## Status
Accepted

## Context
Traditional if/else branching creates brittle decision boundaries. A score of 0.499 vs 0.501 should not produce completely opposite behavior.

## Decision
Continuous Semantic Logic (CSL) gates replace all boolean if/else decision logic:
```
output = value × sigmoid((cosScore - τ) / temperature)
```
- τ (tau): threshold from phiThreshold(level)
- temperature: ψ³ ≈ 0.236 (default)
- Produces smooth, differentiable transitions

## Consequences
- All decisions are gradient-based, not binary
- Threshold sensitivity is configurable via temperature
- Mathematical properties: bounded, non-constant, differentiable
- CSL operations: AND (cosine), OR (superposition), NOT (orthogonal projection), GATE (sigmoid)
