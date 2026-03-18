---
name: heady-agent-orchestration
description: >
  Use when the user wants a latent OS to decompose work into specialized agents,
  define temporary workers, create a planner-executor-validator structure, or
  coordinate agent handoffs inside a dynamic liquid architecture.
metadata:
  author: HeadySystems Inc.
  version: '3.2.0'
  updated: '2026-03-10'
---

# Heady Agent Orchestration

## When to Use This Skill

- Multi-agent system design
- Runtime worker creation (HeadyBees / BeeFactory)
- Task decomposition into specialist agents
- Planner → Executor → Validator roles
- Swarm coordination or handoff design
- Latent OS operating structure

## Instructions

1. Rewrite the user request as a parent objective
2. Split work into specialized agent tracks (see `docs/agents.md`)
3. For each agent define: role, mission, inputs, outputs, dependencies, success test
4. Use control structure: planning → execution → verification → synthesis
5. Mark agents as persistent vs ephemeral (HeadyBees)
6. Define handoff contracts (JSON schema for outputs)
7. Add resilience: fallback owner, retry limit (φ backoff), escalation path, circuit breaker signals
8. For liquid architecture: define spawn/retire/shift triggers
9. End with: Agent Map, Handoff Rules, Runtime Orchestration Policy

## Integration Points

- `src/agents/` — Agent implementations
- `src/agents/bee-factory.js` — Ephemeral worker factory
- `src/core/liquid-architecture.js` — Dynamic allocation
- `src/core/soul-governance.js` — HeadySoul alignment checks
- `src/core/circuit-breaker.js` — Resilience with φ backoff

## Provenance

Based on HeadyMe bee-factory and HeadyBees agent decomposition model.
Repository: https://github.com/HeadyMe
