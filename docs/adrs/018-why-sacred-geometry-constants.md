# ADR-018: Why Sacred Geometry Constants (φ, Fibonacci, Golden Ratio)

## Status
Accepted

## Context
Software systems are riddled with arbitrary "magic numbers": cache sizes of 100 or 1000, thresholds of 0.5 or 0.8, retry delays of 1s/2s/4s. These values have no mathematical justification — they're engineering folklore. When systems interact, these arbitrary choices create unpredictable resonance patterns.

## Decision
Derive ALL system constants from the golden ratio (φ = 1.6180339887) and its Fibonacci manifestation:

| Constant | Value | Derivation |
|----------|-------|------------|
| φ (phi) | 1.6180339887 | (1 + √5) / 2 |
| ψ (psi) | 0.6180339887 | 1/φ = φ - 1 |
| ψ² | 0.3819660113 | ψ × ψ |
| Cache sizes | 34, 55, 89, 144, 233, 987 | Fibonacci sequence |
| Thresholds | 0.500, 0.691, 0.809, 0.882, 0.927 | phiThreshold(n) = 1 - ψⁿ × 0.5 |
| Backoff | 1s, 1.618s, 2.618s, 4.236s | base × φⁿ |
| Fusion weights | [0.618, 0.382] | [ψ, ψ²] |
| Pool sizes | 34 concurrent, 55 queued | Fibonacci |
| Retry limit | 5 | fib(5) |

## Consequences
**Benefits:**
- Zero magic numbers: every constant has a derivation path from φ
- Self-similarity at every scale: cache eviction uses the same ratio as retry backoff
- Natural efficiency: Fibonacci numbers minimize hash collisions and distribute load evenly
- Aesthetic coherence: the platform's behavior follows patterns found in nature
- Auditability: any constant can be verified by tracing its φ-derivation

**Costs:**
- Unfamiliar to developers accustomed to round numbers
- Fibonacci numbers don't align with base-10 mental arithmetic (34 instead of 30, 89 instead of 100)
- Requires shared/phi-math-v2.js as a dependency for all modules

**Mathematical Foundation:**
- φ² = φ + 1 (golden ratio identity)
- lim F(n+1)/F(n) = φ (Fibonacci convergence)
- φⁿ = F(n)·φ + F(n-1) (Fibonacci-phi relationship)
- Fibonacci numbers are the optimal solution to many combinatorial and resource allocation problems

## References
- shared/phi-math-v2.js: canonical φ-math implementation
- ADR-001: φ-Math Foundation (detailed constant tables)
- ADR-002: CSL Replaces Boolean (threshold derivation)
- All modules importing from shared/phi-math-v2.js
