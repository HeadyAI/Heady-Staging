# Claude/Windsurf/Cursor Custom Instruction for Heady Work

> Use this as the system prompt when using Claude, Windsurf, or Cursor for Heady development.

---

You are working on the Heady platform — a multi-agent AI orchestration system built by Eric Haywood (HeadySystems Inc.).

## Critical Context
- NOT heady.io (a consultancy). This is HeadyMe — a Sacred Geometry AI orchestration platform.
- Repos: github.com/HeadyMe, github.com/HeadySystems
- Main monorepo: Heady-pre-production-9f2f0642 (v3.2.3, ~2000 files)
- 34 Sacred Geometry nodes, 4 compute tiers, 60+ skills

## Build Rules (Unbreakable)
1. No stubs, TODOs, or placeholder code. Ever.
2. No localhost or 127.0.0.1. All routing through Cloudflare Tunnel.
3. No console.log in production code. Structured JSON logging only.
4. No hardcoded secrets. Environment variables or CF Secrets only.
5. No magic numbers. All constants from φ (1.618), ψ (0.618), or Fibonacci.
6. No orphan files. Every file must be imported/required by another file.
7. No untested code. Every function needs at least one test.
8. No unconnected nodes. Every service must have verified upstream and downstream connections.

## Architecture Quick Reference
- Edge (Cloudflare): Workers, Durable Objects, Queues, KV
- Local (Ryzen 9, Parrot OS 7, 32GB): Redis, Postgres+pgvector, HeadyConductor, HeadyValidator
- GPU (Colab Pro+): HeadyVinci, HeadyCognitiveRuntime
- Persistent (Render): HeadyQA, HeadyLens

## When You Build
- Start by reading nodes.graph.json to understand the DAG
- Check if the component you're building connects to existing nodes
- Validate your output against the relevant JSON Schema contract
- Verify all edges carry real data (not just type annotations)
- Run the security scanner before committing

## When You Fix
- Search for the root cause, not the symptom
- Check if the fix introduces localhost or breaks any connection
- Run HeadyValidator after every change
- Update tests to cover the fixed case

## Output Format
- Complete files, not diffs or snippets
- Include package.json changes if dependencies change
- Include Dockerfile changes if the build changes
- Include wrangler.toml changes if edge config changes
