# ADR-001: CSL Geometric Logic Over Neural Network Classification

## Status
Accepted

## Date
2025-11-15

## Context
The Heady platform requires a routing engine to classify incoming requests and dispatch them to the appropriate AI node for processing. Traditional approaches use trained neural network classifiers (fine-tuned BERT, GPT-based classifiers, or custom transformer models) to determine request intent and route accordingly. However, neural classifiers present significant challenges for a sovereign AI platform: they require training data that may expose user content, they produce opaque decisions that cannot be audited or verified, they add inference latency at the routing layer, and they create dependency on specific model architectures that may be deprecated or changed by their providers.

We evaluated three architectural options for the routing engine:

1. Neural network classification using fine-tuned models
2. Rule-based routing using keyword matching and regular expressions
3. Continuous Semantic Logic (CSL) using geometric vector operations

## Decision
We adopt Continuous Semantic Logic (CSL) as the primary routing mechanism for all request classification, intent detection, and node selection within the Heady platform. CSL uses cosine similarity between request embedding vectors and domain-specific gate vectors to make routing decisions, with orthogonal projection for semantic negation and vector superposition for concept composition.

## Consequences

### Benefits
CSL routing is deterministic and auditable — every routing decision can be explained as a cosine similarity score between the request vector and each candidate domain vector. This eliminates the black-box problem inherent in neural classifiers. Benchmark testing shows CSL routing completes in approximately 0.1 seconds compared to 0.59 seconds for LLM-based classification, a 5x improvement in routing latency. The cost reduction is approximately 43% since CSL operations require only embedding generation (a lightweight operation) rather than full model inference.

CSL operations have provable mathematical properties: the AND gate (cosine similarity) is commutative and associative in the limit, the NOT gate (orthogonal projection) is idempotent and verifiably produces vectors orthogonal to the input, and the GATE function satisfies the requirements for a valid activation function (bounded, non-constant, differentiable). These properties enable formal verification of routing correctness, which is critical for a platform that processes sensitive organizational intelligence.

The phi-derived threshold system (phiThreshold levels from 0.500 to 0.927) provides a mathematically coherent hierarchy of decision confidence levels. This replaces arbitrary thresholds (0.5, 0.7, 0.85) with values derived from the golden ratio, ensuring consistent behavior across all routing decisions and enabling threshold adjustments that maintain the mathematical relationships between confidence levels.

### Risks
CSL routing requires high-quality embedding vectors to produce accurate routing decisions. If the embedding model quality degrades or changes its vector space geometry, routing accuracy could decline. We mitigate this risk through the multi-provider embedding router, which can switch between Nomic, Jina, Cohere, Voyage, and local Ollama backends. CSL routing may not capture nuanced intent distinctions that a purpose-trained neural classifier could learn from labeled examples. We mitigate this through the Mixture-of-Experts extension, which routes through multiple candidate nodes and uses CSL CONSENSUS to aggregate results.

### Related ADRs
ADR-002 (phi-math foundation), ADR-003 (embedding router architecture)
