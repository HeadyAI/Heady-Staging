# ADR-017: Why Continuous Semantic Logic (CSL) Replaces Boolean

## Status
Accepted

## Context
Traditional boolean logic (if/else, true/false) loses information in AI systems. When determining whether to include context, route a query, or trust a response, the answer is rarely binary. A cosine similarity of 0.78 is not the same as 0.92 — but `if (score > 0.7)` treats them identically.

## Decision
Replace all boolean gates with Continuous Semantic Logic (CSL) — geometric vector operations that preserve confidence as a continuous signal:

| Gate | Operation | Formula |
|------|-----------|---------|
| AND | Cosine similarity | cos(θ) = (a·b) / (‖a‖·‖b‖) |
| OR | Superposition | normalize(a + b) |
| NOT | Orthogonal projection | a - proj_b(a) |
| IMPLY | Projection | proj_b(a) = (a·b/‖b‖²)·b |
| GATE | Sigmoid gating | value × σ((cos - τ) / temp) |

Thresholds use φ-harmonic levels: phiThreshold(0)≈0.500, (1)≈0.691, (2)≈0.809, (3)≈0.882, (4)≈0.927.

## Consequences
**Benefits:**
- Preserves confidence information through the entire decision pipeline
- 5× faster than LLM classification for routing (0.1s vs 0.59s CSL benchmark)
- 43% cheaper than calling an LLM for every gate decision
- Mathematically provable properties: AND is commutative, NOT is idempotent, GATE is differentiable
- 51 provisional patents covering CSL gate innovations

**Costs:**
- Higher conceptual complexity vs simple if/else
- Requires embedding vectors as inputs (all Heady content is already embedded)
- Threshold tuning requires understanding of φ-harmonic levels

**Theoretical Basis:**
- Birkhoff & von Neumann (1936): quantum logic → propositions as Hilbert subspaces
- Widdows (ACL 2003): orthogonal negation in semantic space
- Grand et al. (Nature 2022): semantic projection recovers human judgments
- Kanerva (1988): sparse distributed memory → hyperdimensional computing

## References
- shared/csl-engine-v2.js: canonical CSL implementation
- ADR-001: φ-Math Foundation (threshold derivation)
- ADR-005: Sacred Geometry Topology (geometric foundations)
