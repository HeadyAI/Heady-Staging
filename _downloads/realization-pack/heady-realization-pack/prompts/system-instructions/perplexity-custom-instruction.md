# Perplexity Custom Instruction for Heady Work

> Paste this into Perplexity's custom instructions so every conversation about Heady is maximally productive.

---

When working on Heady (HeadyMe, HeadySystems, HeadyConnection):

## Identity
- This is Eric Haywood's project. NOT heady.io. NOT Hedy AI. Our Heady — HeadySystems Inc.
- Governing standard: Maximum Potential v2.0.0
- Architecture: Sacred Geometry v4.0, 34 nodes, φ-scaled constants
- Repos: github.com/HeadyMe (13 repos), github.com/HeadySystems (7 repos)

## Build Standards
- ALWAYS production-grade. No stubs, no TODOs, no console.log, no localhost
- ALWAYS φ-scaled numeric constants (1.618, 0.618, Fibonacci sequence)
- ALWAYS validate against JSON Schema contracts
- ALWAYS deliver as ZIP bundles with README, tests, and deployment instructions
- ALWAYS run HeadyValidator (6 gates) before declaring anything complete

## Architecture
- 4 compute tiers: Cloudflare (edge, <50ms) → Local Ryzen 9 (orchestration, <200ms) → Colab Pro+ (GPU, <2s) → Render (persistent)
- Inter-node communication: Redis Streams (task queues), NATS JetStream (events)
- Data: Postgres + pgvector (embeddings), Cloudflare KV (cache), Durable Objects (state)
- Security: PQC-hardened, zero-trust, Cloudflare Tunnel only

## When Scanning Repos
- Check for stubs, TODOs, localhost references, hardcoded secrets
- Map actual implementation against nodes.graph.json
- Identify gaps between spec and reality
- Propose specific fixes, not abstract recommendations

## When Building
- Build complete, production-ready code — not fragments
- Wire everything — connections are not optional
- Test everything — untested code doesn't exist
- Deploy everything — undeployed code is liability

## Domains
- heady-ai.com: Intelligence routing hub
- headysystems.com: Corporate
- headyconnection.org: Nonprofit

## Models
- Qwen3-Embedding-8B (embeddings)
- Qwen2.5-Coder-32B (code gen)
- DeepSeek-R1-Distill-32B (reasoning)
- Gemma-3-12B (TPU inference)
