# Local Skills Inventory

**Path:** `/home/user/workspace/skills/`
**Audit date:** 2026-03-10
**Total skill directories:** 18

---

## Inventory

### 1. `create-skill`
- **Type:** Meta / scaffolding skill
- **Purpose:** Creates new Agent Skills following the agentskills.io specification. Generates SKILL.md with YAML frontmatter.
- **Key files:** `SKILL.md`
- **Suite:** Generic

### 2. `design-foundations`
- **Type:** Design system / visual guidelines
- **Purpose:** Universal design principles for color, typography, and visual hierarchy. Provides default palette (Nexus), WCAG AA accessibility rules, and restraint-first philosophy. Shared dependency for other skills.
- **Key files:** `SKILL.md`
- **Suite:** Generic (dependency of `docx`, `website-building`)

### 3. `docx`
- **Type:** Document generation tool skill
- **Purpose:** Create, read, edit, and manipulate Word (.docx) files. Uses pandoc for reading and docx-js for creation. Includes LibreOffice-based .doc-to-.docx conversion.
- **Key files:** `SKILL.md`, `LICENSE.txt`, `scripts/` (Python helpers: `accept_changes.py`, `comment.py`, `office/`, `templates/`)
- **Dependencies:** `design-foundations`
- **Suite:** Generic

### 4. `heady-agent-orchestration`
- **Type:** Multi-agent design pattern skill
- **Purpose:** Designs multi-agent systems with planner/executor/validator roles, swarm coordination, handoff contracts, and resilience rules (fallback owners, retry limits).
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 5. `heady-architecture`
- **Type:** Systems architecture skill
- **Purpose:** Layered architecture design for the Heady platform — interface/edge, gateway/routing, execution/model, memory/persistence, observability/control plane. Covers MCP, Cloudflare, Cloud Run, pgvector, OAuth, WebSocket, SSE.
- **Key files:** `heady-architecture/SKILL.md`, `heady-architecture/templates/architecture-review-template.md`
- **Suite:** Heady (author: perplexity-computer, owner: Eric Head)

### 6. `heady-companion-memory`
- **Type:** Memory/personalization skill
- **Purpose:** Persistent memory layer for assistants — identity, preferences, recurring projects, commitments, sensitive exclusions. Includes proactive suggestion rules and user controls.
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 7. `heady-context-window-manager`
- **Type:** Context management / token optimization skill
- **Purpose:** Multi-tier context window management (hot/warm/cold/archive) with phi-scaled token budgets, context capsules for inter-agent transfer, and score-based eviction.
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 8. `heady-deep-scan`
- **Type:** Codebase scanning / indexing skill
- **Purpose:** Single-pass project mapping and 3D vector memory pull for full codebase awareness. Uses `mcp_Heady_heady_deep_scan` tool. Required before major project work.
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 9. `heady-deploy-debug`
- **Type:** Deployment troubleshooting skill
- **Purpose:** Structured deployment debugging — classifies failures as build-time/deploy-time/runtime, separates symptom from root cause, provides fallback paths. Covers Cloudflare, Cloud Run, Docker, SSL, auth, webhooks.
- **Key files:** `heady-deploy-debug/SKILL.md`, `heady-deploy-debug/templates/incident-runbook-template.md`
- **Suite:** Heady (author: perplexity-computer, owner: Eric Head)

### 10. `heady-mcp-gateway-zero-trust`
- **Type:** MCP infrastructure skill
- **Purpose:** Build MCP gateways with zero-trust execution — CSL-gated tool routing, connection pooling (SSE/WebSocket/stdio), capability-based sandboxing, rate limiting with semantic dedup, SHA-256 audit chain, SOC 2 logging.
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 11. `heady-memory-knowledge-os`
- **Type:** Knowledge management skill
- **Purpose:** Persistent memory and knowledge OS — user profiles, active projects, repo-to-docs conversion, AI-optimized documentation hubs, executive/technical briefings, cross-session continuity.
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 12. `heady-os-orchestrator`
- **Type:** Top-level orchestration skill
- **Purpose:** Cross-domain routing intelligence for the Heady ecosystem. Coordinates research, architecture, patent, competitive, deployment, nonprofit, and product strategy workstreams into unified execution plans.
- **Key files:** `heady-os-orchestrator/SKILL.md`, `heady-os-orchestrator/templates/work-intake-template.md`
- **Suite:** Heady (author: perplexity-computer, owner: Eric Head)

### 13. `heady-product-strategy`
- **Type:** Product strategy / positioning skill
- **Purpose:** Product positioning, launch strategy, roadmap framing, pricing, messaging hierarchy, domain role definition, and go-to-market narrative for the Heady ecosystem.
- **Key files:** `heady-product-strategy/SKILL.md`, `heady-product-strategy/templates/strategy-brief-template.md`
- **Suite:** Heady (author: perplexity-computer, owner: Eric Head)

### 14. `heady-research`
- **Type:** Research / intelligence skill
- **Purpose:** Deep technical and strategic research for the Heady ecosystem — patent-aware framing, competitive analysis, AI ecosystem analysis. Identity: "HeadyResearch, embedded research intelligence for the Heady Latent OS."
- **Key files:** `heady-research/SKILL.md`, `heady-research/templates/report-template.md`
- **Suite:** Heady (author: perplexity-computer, owner: Eric Head, v2.0)

### 15. `heady-service-health-ops`
- **Type:** Operational health / SRE skill
- **Purpose:** Health checks across AI services — availability, latency, error rate, dependency health, configuration drift. Produces triage tables and runbooks for self-healing/auto-remediation.
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 16. `heady-task-decomposition`
- **Type:** Task execution / DAG skill
- **Purpose:** LLM-powered task decomposition — CSL-scored subtask routing, dependency DAG construction (Kahn's algorithm), parallel execution with Fibonacci-based concurrency (maxParallel=8), result aggregation.
- **Key files:** `SKILL.md`
- **Suite:** Heady

### 17. `research-assistant`
- **Type:** General research / analysis skill
- **Purpose:** World-class research with institutional-grade depth — iterative evidence gathering, authoritative source prioritization, inline visualizations. Targets "$200K+ professional deliverable" quality bar.
- **Key files:** `SKILL.md`
- **Suite:** Generic (Perplexity-style)

### 18. `website-building`
- **Type:** Full web development skill (v15)
- **Purpose:** Production-grade websites, web apps, and browser games. Includes design system, typography, motion, layout, CSS/Tailwind, quality standards, and domain-specific guidance. Deploys as static bundles to S3.
- **Key files:** `SKILL.md`, `19-backend.md`, `eslint.config.mjs`, `shared/` (12 design/technical docs), `informational/` (site templates), `webapp/` (app guidance), `game/` (2D canvas, testing, references)
- **Dependencies:** `design-foundations` (bundled in `shared/`)
- **Suite:** Generic

---

## Summary by Type

| Category | Count | Skills |
|---|---|---|
| Heady platform (domain-specific) | 12 | heady-agent-orchestration, heady-architecture, heady-companion-memory, heady-context-window-manager, heady-deep-scan, heady-deploy-debug, heady-mcp-gateway-zero-trust, heady-memory-knowledge-os, heady-os-orchestrator, heady-product-strategy, heady-research, heady-service-health-ops, heady-task-decomposition |
| Generic utility | 5 | create-skill, design-foundations, docx, research-assistant, website-building |
| With templates | 5 | heady-architecture, heady-deploy-debug, heady-os-orchestrator, heady-product-strategy, heady-research |
| With scripts/code | 3 | docx, website-building, heady-deep-scan (MCP tool) |

## Structural Patterns

- **Flat skills** (SKILL.md only): 10 of 18
- **Nested (double-directory):** 5 — heady-architecture, heady-deploy-debug, heady-os-orchestrator, heady-product-strategy, heady-research (each has `<name>/<name>/SKILL.md`)
- **Rich asset skills:** 3 — docx (scripts), website-building (12 shared docs + 3 domain dirs), design-foundations (standalone)
- **Metadata-bearing** (YAML frontmatter with author/version/owner): 5 — heady-architecture, heady-deploy-debug, heady-os-orchestrator, heady-product-strategy, heady-research
