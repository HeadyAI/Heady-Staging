# ADR-005: CSL (Continuous Semantic Logic) Over Boolean Gates

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Traditional boolean logic (if/else, true/false) forces binary decisions in a domain where confidence is continuous. An AI agent's recommendation might be 73% confident — boolean logic loses this nuance.

## Decision

Implement Continuous Semantic Logic (CSL) as the primary decision framework. CSL gates operate on confidence scores [0,1] using cosine similarity as the primary metric. Gate thresholds are φ-derived: MINIMUM≈0.500, LOW≈0.691, MEDIUM≈0.809, HIGH≈0.882, CRITICAL≈0.927. CSL operations: AND (cosine intersection), OR (superposition), NOT (orthogonal projection), IMPLY (projection), XOR, CONSENSUS, GATE.

## Consequences

**Positive:** Nuanced decisions, mathematically grounded, gradual degradation instead of hard failures, patent-protected (60+ provisionals)  
**Negative:** Harder to debug (no simple true/false), requires understanding vector operations, more computation per decision  
**Mitigations:** Structured logging of CSL gate decisions with scores, visualization in HeadyLens dashboard, developer onboarding covers CSL fundamentals
