# Heady Prompt Library

> **Organized, deduplicated, and optimized prompt collection**
> HeadySystems Inc. — Eric Haywood, Founder
> Last updated: 2026-03-13

---

## Directory Structure

```
docs/prompts/
├── core/           ← System-level prompts (use these for agent initialization)
├── agents/         ← Agent-specific prompts (Buddy, Master)
├── domain/         ← Domain-specific prompts (deployment, security, architecture, etc.)
├── operational/    ← Rebuild & operational playbooks
└── README.md       ← This file
```

---

## Core Prompts (`core/`)

These are the primary system prompts. Use the one matching your target model.

| File | Model Target | Size | Description |
|------|-------------|------|-------------|
| `SYSTEM-PROMPT-v3.md` | **All models** | 31KB | The canonical system prompt v3.0. Identity, architecture, node registry, bee catalog, pipeline stages, φ-math. **Use this as the base.** |
| `SYSTEM-PROMPT-CLAUDE-v3.md` | Claude | 31KB | Claude-optimized v3.0 with emphasis on shipping, wiring, and verifying. |
| `SYSTEM-PROMPT-CHATGPT-v3_1.md` | ChatGPT | 22KB | Adds the Defect Eradication Layer on top of v3.0: P0-P4 priority ladder, repo integrity gate, emergency stabilize playbook. |
| `SYSTEM-PROMPT-PERPLEX-v5.md` | Perplexity | 10KB | v5.0 Super Kernel with YAML frontmatter constants, 6-layer boot sequence, CSL truth table, adaptive temperature formula. |
| `EXTENDED-PROMPT-AND-BACKLOG.md` | Any | 47KB | Deep-dive architecture + 6-phase implementation backlog (20+ tasks). Liquid node graph, HeadyBee anatomy, HeadySwarm protocol, latent space ops, vector space operations. |

### Which core prompt to use?

```
Claude/Anthropic  → SYSTEM-PROMPT-CLAUDE-v3.md
ChatGPT/OpenAI    → SYSTEM-PROMPT-CHATGPT-v3_1.md
Perplexity        → SYSTEM-PROMPT-PERPLEX-v5.md
Gemini/Other      → SYSTEM-PROMPT-v3.md (universal)
Deep planning     → EXTENDED-PROMPT-AND-BACKLOG.md
```

---

## Agent Prompts (`agents/`)

Specialized prompts for specific Heady agents.

| File | Size | Description |
|------|------|-------------|
| `BUDDY-SYSTEM-PROMPT.md` | 39KB | HeadyBuddy companion agent. Full personality, context, and behavioral rules. |
| `MASTER-PROMPT.md` | 12KB | HeadyCognition master persona. Cognitive architecture and decision-making. |
| `MASTER-SYSTEM-PROFILE.md` | 29KB | Full agent profile config for the master system agent. |

---

## Domain Prompts (`domain/`)

Task-specific prompts for Perplexity and other research agents.

| File | Size | Domain |
|------|------|--------|
| `PROMPT-01-full-production-deployment.md` | 4KB | Production deployment across all domains |
| `PROMPT-02-naming-audit-enforcement.md` | 4KB | Naming conventions and audit |
| `PROMPT-03-service-wiring-validation.md` | 4KB | Service wiring verification |
| `PROMPT-04-build-planned-services.md` | 5KB | Building planned services |
| `PROMPT-05-liquid-architecture-projection.md` | 6KB | Liquid architecture and monorepo projection |
| `PROMPT-06-csl-sacred-geometry-phi-math.md` | 6KB | CSL engine and φ-mathematics |
| `PROMPT-07-cicd-security-observability.md` | 7KB | CI/CD, security hardening, observability |
| `PROMPT-08-mcp-tools-ai-gateway.md` | 7KB | MCP tools and AI gateway integration |
| `PERPLEX-EXTENDED-AUTONOMOUS.md` | 8KB | Extended autonomous Perplexity mode |
| `PERPLEX-COMPUTER-CONTEXT.md` | 24KB | Computer context for Perplexity |
| `PERPLEX-COMPARISON.md` | 290KB | Full comparison and analysis prompt |

---

## Operational Prompts (`operational/`)

Rebuild and maintenance playbooks.

| File | Size | Description |
|------|------|-------------|
| `FULL-REBUILD-PROMPT.md` | 31KB | Complete system rebuild from scratch |
| `PROMPT-PACK.md` | 4KB | Quick-reference prompt pack |

---

## Optimization Notes

### Deduplication Applied
- **v3.0, v3.1, v3.2** were near-identical (30-31KB each). Consolidated to one canonical `SYSTEM-PROMPT-v3.md`.
- Multiple copies across Dropzone, Downloads, docs/strategic/ have been consolidated here.
- The `docs/strategic/` copies remain as symlink targets for backward compatibility.

### Version Lineage
```
v3.0 (PROMPT-CLAUDE-HEADY-LIQUID.md)    ← Base: Claude-optimized
  └─ v3.1 (Prompt-ChatGPT-Unified.md)   ← Adds: Defect Eradication Layer
  └─ v3.2 (Downloads/v3_2.md)           ← Identical to v3.0
  └─ v5.0 (Prompt-Perplex-Unified.md)   ← Adds: YAML kernel, 6-layer boot
Extended Backlog                         ← Standalone: Deep architecture + task backlog
```

### Key Directives Across All Prompts

1. **Ship complete systems** — no placeholders, no TODOs
2. **Wire everything** — every service connected and communicating
3. **Verify before declaring done** — run it, test it, prove it
4. **φ-mathematics everywhere** — all constants derive from golden ratio
5. **AutoContext is mandatory** — 5-pass enrichment on every operation
6. **Memory writeback** — every result indexes back to T1
7. **Fix root causes** — no retry wrappers around bugs
8. **Zero hardcoded secrets** — env vars or secret managers only
