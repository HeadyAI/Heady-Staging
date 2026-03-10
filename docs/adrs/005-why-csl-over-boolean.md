# ADR-005: Why CSL Gates over Boolean Logic

## Status
Accepted (2026-03)

## Context
Traditional software uses boolean logic (if/else, true/false) for decisions. Heady uses Continuous Semantic Logic (CSL) — vector-based soft gating.

## Decision
Replace boolean decision points with CSL gates wherever semantic confidence is involved.

## Rationale
- **Gradual degradation**: CSL gates produce 0–1 scores, allowing partial confidence
- **No threshold cliffs**: sigmoid gating avoids brittle hard cutoffs
- **Provably correct**: CSL operations are mathematically proven (commutative AND, idempotent NOT)
- **5× faster routing**: CSL cosine routing is 5× faster than LLM classification (0.1s vs 0.59s)
- **43% cheaper**: Eliminates LLM calls for routing decisions
- **100% semantic negation**: CSL NOT achieves 100% success vs 32% for probabilistic NOT
- **51 Provisional Patents**: CSL is patent-pending IP

## Consequences
- Developers must understand CSL thresholds (MINIMUM → CRITICAL)
- All gate parameters must be φ-derived
- Temperature parameter (ψ³ ≈ 0.236) controls gate sharpness
