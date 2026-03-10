# ADR-007: Concurrent-Equals Language

## Status
Accepted

## Context
Priority-based language (primary/secondary, master/slave) creates implicit hierarchies that don't reflect the actual system design where components operate as peers.

## Decision
All system language uses concurrent-equals terminology:
- No "primary/secondary" — use "concurrent instances"
- No "master/slave" — use "coordinator/participant"
- No "priority ranking" — use "CSL-gated scoring"
- Swarm definitions use concurrent capability descriptors

## Consequences
- Language reflects the distributed, non-hierarchical architecture
- CSL gates provide continuous scoring instead of discrete rankings
- Documentation is more accessible and inclusive
