# ADR-008: Concurrent-Equals Scheduling

**Status:** Accepted  
**Date:** 2026-03-10  
**Author:** Eric Haywood  

## Context

Traditional task schedulers use priority levels that cause starvation — low-priority tasks may never execute under sustained load. In a 17-swarm AI system, every swarm's work is important.

## Decision

Adopt concurrent-equals scheduling where all tasks receive equal scheduling weight. No task is "higher priority" than another. Instead, tasks have CSL confidence scores that influence execution order within the same scheduling quantum, but cannot starve other tasks. The 17-Swarm Matrix operates as concurrent-equals: every swarm gets fair scheduling time.

## Consequences

**Positive:** No priority starvation, fair resource distribution, simpler reasoning about system behavior  
**Negative:** Cannot express "this is urgent" — all tasks treated equally, may delay genuinely critical work  
**Mitigations:** Circuit breakers and health checks detect and isolate failing tasks. Emergency tasks use a separate execution lane (not priority — just a dedicated resource pool). CSL confidence scoring provides nuanced ordering within scheduling quanta.
