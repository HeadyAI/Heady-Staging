# Local Skills Application Map — Heady Audit Context

**Audit date:** 2026-03-10

---

## Session Skills vs Local Skills

This session has two distinct skill sets:

1. **Session-loaded skills** — registered in the Claude Code runtime (listed in the system prompt)
2. **Local file skills** — present on disk at `/home/user/workspace/skills/` as SKILL.md definitions

The session-loaded skills are: `create-skill`, `design-foundations`, `docx`, `heady-agent-orchestration`, `heady-architecture`, `heady-companion-memory`, `heady-context-window-manager`, `heady-deep-scan`, `heady-deploy-debug`, `heady-mcp-gateway-zero-trust`, `heady-memory-knowledge-os`, `heady-os-orchestrator`, `heady-product-strategy`, `heady-research`, `heady-service-health-ops`, `heady-task-decomposition`, `research-assistant`, `website-building`, plus runtime skills like `coding-workflow`, `commit-push-pr`, `data-analyst`, `data-triage`, `data-workflow`, `pr-description`, `repo-skills`, `code-simplifier`, `simplify`, `loop`, `claude-api`, `keybindings-help`.

---

## Relevance to the Heady Audit Task

### Theme 1: Repository Understanding & Deep Scanning

| Skill | Relevance | How It Applies |
|---|---|---|
| `heady-deep-scan` | **Direct** | Designed to perform single-pass codebase mapping before major work. The audit task is exactly this use case — building full awareness of the remote-headyme-main repository. |
| `heady-research` | **Direct** | Embedded research intelligence for the Heady ecosystem. Provides context on headyme.com, headysystems.com, CSL, Sacred Geometry SDK, and other domain concepts encountered in the repo. |
| `research-assistant` | **Supporting** | General deep-research methodology — iterative evidence gathering, authoritative source prioritization. Useful for producing institutional-grade audit deliverables. |
| `repo-skills` (session) | **Supporting** | Scans cloned repos for skill definitions. Relevant to discovering and indexing the 77+ skills inside remote-headyme-main itself. |

### Theme 2: Architecture & Infrastructure Analysis

| Skill | Relevance | How It Applies |
|---|---|---|
| `heady-architecture` | **Direct** | Layered architecture analysis (edge, gateway, execution, memory, observability). Maps directly to understanding the repo's MCP gateways, Cloudflare Workers, Cloud Run services, pgvector memory, and agent orchestration. |
| `heady-mcp-gateway-zero-trust` | **Direct** | Zero-trust MCP gateway design. The repo has 80+ MCP-related files — this skill provides the architectural lens to evaluate MCP server implementations, tool routing, sandboxing, and audit logging found in the codebase. |
| `heady-deploy-debug` | **Contextual** | Deployment troubleshooting across Cloudflare, Cloud Run, Docker. Relevant for understanding the 4 Dockerfiles, 8 Cloudflare Workers, and multiple deployment pipelines in the repo. |

### Theme 3: Agent & Swarm Orchestration

| Skill | Relevance | How It Applies |
|---|---|---|
| `heady-agent-orchestration` | **Direct** | Multi-agent design with planner/executor/validator roles and swarm coordination. The repo contains a swarm coordinator (44 KB), 17-swarm orchestrator (24 KB), and 70+ bee agents — this skill defines the pattern those components follow. |
| `heady-task-decomposition` | **Direct** | LLM-powered task decomposition with CSL scoring and DAG execution. The repo's `csl-engine.js` (34 KB), `src/orchestration/`, and pipeline-runner implement exactly this pattern. |
| `heady-context-window-manager` | **Supporting** | Phi-scaled context tiers and inter-agent context capsules. Relevant to understanding `src/context/`, `src/bees-memory/`, and the repo's phi-math packages. |
| `heady-os-orchestrator` | **Supporting** | Top-level cross-domain routing across research, architecture, deployment, and strategy tracks. Maps to the repo's `heady-manager.js` (53 KB) and `agent-orchestrator.js`. |

### Theme 4: Governance, Laws & Directives

| Skill | Relevance | How It Applies |
|---|---|---|
| `heady-service-health-ops` | **Direct** | Health checks, drift detection, self-healing. The repo contains `drift-detector.js`, `self-healing.yml` workflow, health bees, and governance enforcement — all patterns this skill codifies. |
| `heady-companion-memory` | **Contextual** | Persistent memory with preference learning. Relates to the repo's memory bees, `bees-memory/`, and memory MCP service. |
| `heady-memory-knowledge-os` | **Contextual** | Knowledge OS with repo-to-docs conversion and AI-optimized documentation. Relates to the repo's documentation infrastructure and knowledge management services. |

### Theme 5: Product & Strategy Context

| Skill | Relevance | How It Applies |
|---|---|---|
| `heady-product-strategy` | **Contextual** | Ecosystem positioning and domain role definition. Provides strategic lens for understanding the repo's 9+ headyme/heady domains and multi-property architecture. |

### Theme 6: General Utility (Not Heady-Specific)

| Skill | Relevance | How It Applies |
|---|---|---|
| `coding-workflow` (session) | **Supporting** | General code workflow for branching and PRs. |
| `commit-push-pr` (session) | **Supporting** | Git operations for audit output delivery. |
| `docx` | **Low** | Word document generation. Could be used to produce formatted audit deliverables if .docx output were requested. |
| `design-foundations` | **Low** | Visual design system. Not directly relevant to repository audit. |
| `website-building` | **Low** | Web development. Not directly relevant to repository audit. |
| `create-skill` | **Low** | Skill scaffolding. Not applicable to audit task. |
| `data-analyst` / `data-triage` (session) | **Low** | Database querying. Would be relevant if the audit involved querying Heady's data stores. |

---

## Major Themes Covered by Local Skills

| # | Theme | Skills Covering It | Repo Areas It Maps To |
|---|---|---|---|
| 1 | **Multi-agent orchestration** | heady-agent-orchestration, heady-os-orchestrator, heady-task-decomposition | `src/orchestration/`, `src/agents/`, `heady-manager.js`, swarm-coordinator, bee-factory |
| 2 | **MCP infrastructure** | heady-mcp-gateway-zero-trust, heady-architecture | `src/mcp/`, `services/heady-mcp*/`, `workers/mcp-*`, `mcp-gateway.js` |
| 3 | **Cognitive / CSL engine** | heady-task-decomposition, heady-context-window-manager | `csl-engine.js`, `packages/phi-math/`, `src/cognitive/` |
| 4 | **Memory & knowledge** | heady-companion-memory, heady-memory-knowledge-os, heady-context-window-manager | `src/bees-memory/`, `services/heady-memory/`, `services/memory_mcp/` |
| 5 | **Deployment & operations** | heady-deploy-debug, heady-service-health-ops | `infra/`, `deployment/`, `.github/workflows/`, Dockerfiles, cloudbuild |
| 6 | **Research & intelligence** | heady-research, research-assistant | `src/deep-research.js`, `heady-research/`, `docs/` |
| 7 | **Codebase awareness** | heady-deep-scan | Full repo scanning for initial context |
| 8 | **Product strategy** | heady-product-strategy | Multi-domain ecosystem (headyme, headysystems, headyconnection, etc.) |

---

## Gaps

Skills present in the repo but **not** available locally:

- No local skill for **battle arena** systems (repo has `battle-arena-protocol.js`, arena bees)
- No local skill for **sacred geometry / phi-math** computations (repo has `sacred-geometry.js`, `packages/phi-math/`)
- No local skill for **billing / monetization** (repo has `services/billing-service/`, `hc_billing.js`)
- No local skill for **creative / MIDI** operations (repo has `src/creative/`, `services/heady-midi/`)
- No local skill for **security hardening** beyond MCP (repo has `heady-mcp-security/`, `security-middleware/`, `heady-pqc-security/`)
