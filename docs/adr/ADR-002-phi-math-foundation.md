# ADR-002: Phi-Math Foundation for All System Constants

## Status
Accepted

## Date
2025-11-20

## Context
Software systems accumulate "magic numbers" — arbitrary constants like timeouts of 30 seconds, cache sizes of 1000, retry counts of 3, and thresholds of 0.75. These constants are typically chosen based on developer intuition or copied from examples, with no mathematical relationship between them. Over time, they create maintenance burden as engineers wonder why a value was chosen and whether changing it would break something. In a system with 60+ microservices, hundreds of configuration parameters, and complex interactions between components, undocumented magic numbers become a significant source of operational risk.

## Decision
We adopt the phi-math foundation, which derives all system constants from the golden ratio (phi = 1.618), its conjugate (psi = 0.618), and the Fibonacci sequence. Every timeout, cache size, pool limit, threshold, retry count, batch size, and weight in the Heady platform is computed from these mathematical roots using standardized derivation functions.

The canonical implementation is shared/phi-math.js, which exports all derivation functions: phiThreshold(level, spread) for confidence thresholds, fib(n) for sizing, phiBackoff(attempt, baseMs, maxMs) for retry timing, phiFusionWeights(n) for multi-factor scoring, phiResourceWeights(n) for pool allocation, and phiTokenBudgets(base) for context window management.

## Consequences

### Benefits
Every constant in the system can be traced to its mathematical derivation. An engineer examining a timeout of 4236ms can immediately recognize it as phi-cubed times 1000. A cache size of 987 is identifiable as fib(16). A threshold of 0.882 is phiThreshold(3), the HIGH confidence level. This eliminates the "why is this value here?" question that plagues conventional systems.

The mathematical relationships between constants ensure coherent scaling behavior. When a cache grows from fib(14) to fib(16), the growth factor is approximately phi-squared, maintaining the same proportional relationships with associated timeouts and batch sizes that also scale by phi-derived factors.

### Risks
Engineers unfamiliar with phi-math may find the system initially confusing. We mitigate this through comprehensive documentation in the phi-math foundation skill, JSDoc annotations on every function, and a lookup table that maps common arbitrary values to their phi-derived equivalents.

### Related ADRs
ADR-001 (CSL engine), ADR-003 (embedding router), ADR-005 (Sacred Geometry topology)
