# ADR-003: Multi-Provider Embedding Router Architecture

## Status
Accepted

## Date
2025-12-01

## Context
The Heady platform generates approximately 384-dimensional embeddings for every document, query, agent state, and configuration element in the system. Embedding quality directly determines the accuracy of CSL routing, vector search relevance, semantic drift detection, and coherence monitoring. Relying on a single embedding provider creates a critical single point of failure.

## Decision
We implement a multi-provider embedding router that intelligently selects between Nomic, Jina, Cohere, Voyage, and local Ollama backends based on a multi-factor scoring system. The router uses phi-weighted fusion of three factors: quality score (weight 0.528), latency score (weight 0.326), and cost score (weight 0.146), derived from phiFusionWeights(3). Circuit breaker isolation prevents a failing provider from cascading failures to others, with phi-exponential backoff for recovery probing.

An LRU cache with phi-derived sizing (fib(20) = 6765 entries) deduplicates repeated embedding requests. MRL dimensionality reduction is supported for compact storage scenarios.

## Consequences

### Benefits
Provider redundancy eliminates single-point-of-failure risk. The circuit breaker pattern with phi-backoff ensures graceful failover without thundering herd problems. Cost optimization through intelligent provider selection reduces embedding costs.

### Risks
Different embedding providers produce vectors in different geometric spaces. We mitigate this by normalizing all embeddings to unit vectors and maintaining provider-specific calibration matrices.

### Related ADRs
ADR-001 (CSL engine), ADR-002 (phi-math foundation), ADR-004 (circuit breaker resilience)
