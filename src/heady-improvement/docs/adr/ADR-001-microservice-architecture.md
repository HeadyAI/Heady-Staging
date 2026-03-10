# ADR-001: Microservice Architecture for 50+ Services

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Heady™ is a sovereign AI operating system spanning inference, memory, agents, orchestration, security, monitoring, web interfaces, data, and integrations. Monolithic architecture would create a single point of failure, prevent independent scaling of AI-intensive services, and make it impossible to deploy different services to different compute targets (Cloudflare edge, Cloud Run, local GPU).

## Decision

Adopt a domain-bounded microservice architecture with 50+ services organized into 9 domains: Inference (heady-brain, heady-brains, heady-infer, ai-router, model-gateway), Memory (heady-embed, heady-memory, heady-vector, heady-projection), Agents (heady-bee-factory, heady-hive, heady-federation), Orchestration (heady-soul, heady-conductor, heady-orchestration, auto-success-engine, hcfullpipeline-executor, heady-chain, prompt-manager), Security (heady-guard, heady-security, heady-governance, secret-gateway), Monitoring (heady-health, heady-eval, heady-maintenance, heady-testing), Web (heady-web, heady-buddy, heady-ui, heady-onboarding, heady-pilot-onboarding, heady-task-browser), Data (heady-cache), Integration (api-gateway, domain-router, mcp-server, and 10+ connectors).

## Consequences

**Positive:**
- Independent scaling: heady-brain can scale to 10 instances while heady-midi stays at 1
- Independent deployment: fix heady-auth without redeploying heady-brain
- Technology flexibility: Next.js for onboarding, vanilla JS for sites, Python for conductor
- Fault isolation: heady-midi failure doesn't affect inference pipeline
- Team scalability: different developers can own different domains

**Negative:**
- Operational complexity: 50 Dockerfiles, 50 health checks, 50 log streams
- Network latency: inter-service calls add ~1-5ms per hop (mitigated by NATS event bus for async, gRPC for sync)
- Data consistency: distributed transactions require saga pattern
- Debugging: distributed tracing (OpenTelemetry) required to follow request across services

**Mitigations:**
- Shared packages (@heady/phi-math-foundation, @heady/structured-logger, @heady/health-probes, @heady/schema-registry) reduce code duplication
- Docker Compose for local development, Turborepo for build caching
- PgBouncer for connection pooling (Fibonacci-sized: 34 default, 233 max)
- Envoy sidecar for mTLS, circuit breaking, and observability
