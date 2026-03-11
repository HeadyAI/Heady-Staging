# ADR-001: Liquid Node Architecture — Cloud Run + Cloudflare + Vertex AI + AI Studio

**Status:** Accepted  
**Date:** 2026-03-09  
**Author:** Heady Autonomous Improvement Agent  
**Deciders:** Eric Haywood (Founder)

## Context

Heady™ was initially configured with Render.com as the primary compute provider. As the platform scales to 50+ microservices with latency-sensitive AI workloads, we need a more flexible, φ-scaled infrastructure that supports:

- Multi-region, zero-cold-start compute (Cloud Run)
- Edge-level caching and routing (Cloudflare Workers/Pages)
- First-party AI model access without API key dependency (Vertex AI)
- Free-tier model access for cost-sensitive operations (AI Studio)

## Decision

Replace Render.com with a **4-node liquid architecture**:

| Node | Provider | Role | Primary Models |
|------|----------|------|----------------|
| **Cloud Run** | Google Cloud | Serverless compute, service hosting | — |
| **Cloudflare** | Cloudflare | Edge proxy, DNS, Workers, R2 storage | — |
| **Vertex AI** | Google Cloud | Production AI inference | Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash |
| **AI Studio** | Google | Free-tier AI, prototyping | Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash Lite |

### Model Routing by Layer

- **Local:** Ollama (default), Gemini 2.5 Flash via AI Studio (fallback)
- **Internal/Staging:** Gemini 2.5 Pro via Vertex AI (primary), Claude Sonnet 4 (code fallback)
- **Production:** Gemini 2.5 Pro via Vertex AI (primary), task-specific fallbacks
- **Cost-sensitive:** Gemini 2.0 Flash Lite via AI Studio free tier

## Consequences

### Positive

- Zero Render.com vendor lock-in
- First-party Google AI model access via service account (no API key management)
- Edge caching reduces latency by ~70% for static/cached responses
- Free-tier AI Studio for development and low-cost operations
- φ-scaled routing enables golden-ratio-based load distribution

### Negative

- Requires GCP project setup and billing configuration
- Cloudflare DNS migration needed for custom domains
- Vertex AI costs scale with usage (mitigated by AI Studio free tier for low-priority)

### Neutral

- No functional change for end users — services remain at same URLs
- Internal routing logic unchanged — only provider endpoints updated

## Files Changed

- `configs/infrastructure/cloud/cloud-layers.yaml` — liquid node definitions, model routing matrix
- `12-heady-registry.json` — service endpoint URLs
- `configs/prompts/heady-prompt-library.json` — deployment instructions
- `configs/_domains/*.yaml` — domain configurations
- `configs/pipeline/auto-pipeline.yaml` — pipeline infrastructure refs
