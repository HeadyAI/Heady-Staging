# ADR-006: Why φ-Derived Constants over Magic Numbers

## Status
Accepted (2026-01)

## Context
Software typically uses arbitrary constants (100, 500, 0.8, 30000). These "magic numbers" have no mathematical relationship to each other, making tuning unpredictable.

## Decision
Every constant in the Heady platform must derive from the golden ratio (φ ≈ 1.618) or Fibonacci sequences.

## Rationale
- **Mathematical harmony**: φ-derived values form a coherent, self-similar system
- **Predictable scaling**: φ^n progression provides natural geometric scaling
- **Fibonacci resonance**: Fibonacci numbers optimize resource allocation (proven in nature)
- **No arbitrary tuning**: Remove the need for "what value should this be?" debates
- **Sacred Geometry alignment**: Supports the broader architectural philosophy
- **Patent differentiation**: φ-derived architecture is part of 51 provisional patent claims

## Implementation
- All constants import from `shared/phi-math.js`
- φ-compliance checker enforces the rule: `scripts/phi-compliance-check.js`
- Scorecard maintained at `PHI-COMPLIANCE-SCORECARD.md`

## Consequences
- Nearest Fibonacci may not perfectly match the "ideal" value — acceptable tradeoff
- Developers must learn φ-math vocabulary
- Code review must enforce the zero-magic-numbers rule
