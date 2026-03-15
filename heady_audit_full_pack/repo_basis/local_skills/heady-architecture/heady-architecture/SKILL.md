---
name: heady-architecture
description: Use when the user needs system architecture design, integration planning, protocol choices, data flow design, or implementation tradeoffs for the Heady platform. Triggers include MCP, Cloudflare, Cloud Run, pgvector, vector memory, multi-agent orchestration, workers, gateway, streaming, OAuth, OIDC, WebSocket, SSE, API design, and full-stack AI architecture.
metadata:
  author: perplexity-computer
  version: '1.0'
  owner: Eric Head
  suite: heady
---

# Heady Architecture

## When to Use This Skill

Use this skill when the user needs a systems-level technical plan for Heady infrastructure, APIs, memory, auth, streaming, or agent coordination.

## Core View

Think in terms of layered architecture:

- interface and edge layer
- gateway and routing layer
- execution and model layer
- memory and persistence layer
- observability and control plane

## Instructions

1. Start with the user's functional goal.
2. Identify required layers, protocols, data flows, and failure points.
3. Map the system across likely Heady components such as Cloudflare Pages, Workers, Cloud Run, GCP services, PostgreSQL with pgvector, and external models or APIs.
4. Compare at least two architecture options when tradeoffs exist.
5. Evaluate:
   - latency
   - reliability
   - auth complexity
   - cost posture
   - scaling behavior
   - vendor lock-in
   - developer ergonomics
6. Recommend one architecture and explain why.
7. Include rollout sequencing when useful.

## Output Format

- Architecture Goal
- Proposed Topology
- Request and Data Flow
- Tradeoffs
- Failure Modes
- Recommended Stack
- Next Build Steps
- Heady Integration Opportunity

## Special Attention Areas

- MCP server and tool routing
- vector search and memory pipelines
- real-time streams via WebSocket or SSE
- OAuth 2.1 and OIDC flows
- edge versus centralized inference
- multi-agent coordination and auditability

## Example Triggers

- Design a better MCP architecture for HeadyMCP
- Compare SSE versus WebSocket for HeadyBuddy streaming
- Plan pgvector memory topology for Heady latent memory
- Design the Cloudflare to Cloud Run gateway path for HeadyAI
