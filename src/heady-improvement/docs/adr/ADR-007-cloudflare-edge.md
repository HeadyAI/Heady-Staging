# ADR-007: Cloudflare Edge + GCP Cloud Run Origin

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Heady serves 9 websites across 50+ domains. Need global CDN, DDoS protection, edge compute, and DNS management.

## Decision

Use Cloudflare as the edge layer (Workers, KV, Pages, DNS) with Google Cloud Run as the origin compute layer. Cloudflare handles: static site serving, edge caching, DDoS protection, DNS for all domains, Workers for light compute. Cloud Run handles: inference, orchestration, auth, API serving.

## Consequences

**Positive:** Sub-50ms edge reads via KV/D1, global CDN, DDoS protection included, Workers for edge AI  
**Negative:** Cloudflare dependency for DNS/edge, dual-vendor complexity (CF + GCP)  
**Mitigations:** Domain DNS is portable, Workers code is standard JS, Cloud Run services are containerized and portable
