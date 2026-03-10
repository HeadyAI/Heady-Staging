# Heady Architecture Overview

## System Design
Heady operates as an autonomous digital nervous system with 20+ AI agents organized into
6 categories. It uses a **Liquid Architecture** where services dynamically scale to demand.

## Data Flow
```
User → AI Gateway (auth + rate limit) → HeadyBrain (reasoning)
  → HeadySoul (alignment + veto) → HeadyBattle (validation)
  → HeadySims (Monte Carlo) → Arena Mode → HeadyVinci (learning) → Response
```

## Auto-Success Engine
135 background tasks across 9 categories run every 30 seconds:
- health_monitoring, agent_lifecycle, memory_maintenance
- security_scanning, performance_optimization, learning_feedback
- checkpoint_management, connectivity_checks, self_healing

Errors are learning events, not failures. The engine uses golden-ratio-based
retry intervals (phi-exponential backoff).

## Infrastructure
- **Edge:** Cloudflare DNS, Tunnels, Workers, KV, Pages, Access
- **Application:** Node.js 20 (Express), React + Vite
- **AI:** Ollama (local) + Claude, GPT, Gemini, Groq (external)
- **Cloud:** Google Cloud Vertex AI, Cloud Run, Storage
- **Protocol:** MCP for unified tool access

## Implemented Patterns
Orchestrator-Promoter, deterministic builds, checkpoint recovery,
rate limiting, idempotent tasks, multi-worktree Git

## Planned Patterns
Circuit breakers, bulkheads, event sourcing, CQRS, saga orchestration
