---
name: delegation-architect
description: >
  Delegation Architect for Heady — intelligent orchestration of Perplexity Computer subagents,
  cron jobs, and external tools specifically optimized for Heady ecosystem work. Knows which
  Heady tasks can be parallelized, which require sequential execution, how to split monorepo
  work across agents without conflicts, and how to coordinate multi-PR workflows. Manages
  credit budgets, prevents context overflow, and ensures every delegated task follows Heady's
  production standards (φ-math, zero placeholders, structured logging, health endpoints). Use
  when Eric assigns large Heady projects that need to be decomposed and delegated across multiple
  agents or scheduled tasks. Keywords: delegation, subagent, orchestration, parallel execution,
  PR coordination, monorepo, task decomposition, credit budget, Heady workflow, multi-agent,
  coding agent, batch processing, cron scheduling.
metadata:
  author: HeadySystems
  version: '1.0'
---

# Delegation Architect for Heady

> Perplexity Computer Skill — Optimal task decomposition and delegation for Heady projects

## When to Use This Skill

Use when:

- Eric assigns a large Heady project that needs multiple parallel workstreams
- Building multiple services, bees, or modules simultaneously
- Coordinating PRs that must land in the correct order
- Managing credit-intensive operations (wide_research, batch processing)
- Setting up recurring Heady maintenance tasks (monitoring, cleanup, audits)
- Any Heady task that benefits from being split across subagents

## Heady Delegation Principles

### 1. The Heady Standards Preamble

Every delegated task MUST include this context in its objective:

```
HEADY STANDARDS (non-negotiable):
- All numeric constants derive from φ (1.618), ψ (0.618), or Fibonacci sequences
- Zero console.log — use pino structured JSON logging
- Zero localStorage — use httpOnly cookies + sessionStorage
- Zero hardcoded URLs — use environment variables
- Zero TODO/FIXME/placeholder/stub
- Every service has /health endpoint returning coherence scores
- All APIs handle success + error with CSL-classified errors
- All inputs validated, all secrets externalized
- All logs structured JSON with correlation IDs
- Code pushes to HeadyMe fork (not HeadySystems org)
```

### 2. Task Decomposition Rules

When splitting Heady work across agents:

```
PARALLELIZE:
  ✓ Independent services (different directories)
  ✓ Documentation + code (no conflicts)
  ✓ Research + implementation (sequential but separate)
  ✓ Different domains (headyme.com vs headybuddy.org)
  ✓ Skills creation (each skill is independent)
  ✓ Test suites + implementation (if tests are pre-defined)

SERIALIZE:
  ✗ Services with shared dependencies (wire after both exist)
  ✗ Gateway + services (gateway needs service endpoints first)
  ✗ Database schema + services (schema first)
  ✗ Auth system + anything requiring auth
  ✗ Shared utility modules + consumers

FILE ISOLATION:
  - Each parallel agent MUST work in its own directory
  - Shared files (package.json, SERVICE_INDEX.json) are updated ONLY by parent
  - Use workspace files for inter-agent communication
```

### 3. Sacred Geometry Work Distribution

Map tasks to zones for natural parallelization:

```
Center Work (HeadySoul): Always single-agent, core identity
Inner Work (Conductor, Brains, Vinci, AutoSuccess): Up to 4 parallel agents
Middle Work (6 services): Up to 3 parallel agents (pair related services)
Outer Work (8 services): Up to 4 parallel agents
Governance Work (6 services): Up to 2 parallel agents
```

## Instructions

### Large Project Decomposition

When Eric gives a big Heady task:

1. **Inventory the work** — List every module, service, or artifact needed
2. **Map dependencies** — Which pieces depend on others?
3. **Identify parallelization opportunities** — Group independent tasks
4. **Estimate agent count** — Balance parallelism vs credit cost:
   ```
   For N independent tasks:
   - N ≤ 3: Do them sequentially (cheaper, simpler)
   - 3 < N ≤ 8: Spawn up to FIB[4]=3 parallel agents
   - 8 < N ≤ 21: Spawn up to FIB[5]=5 parallel agents
   - N > 21: Use wide_research/wide_browse for batch, or serialize
   ```
5. **Write agent objectives** — Each objective must:
   - Include the Heady Standards Preamble
   - Specify exact output file paths (no overlaps between agents)
   - Reference input files by absolute path
   - Define success criteria
   - Preload relevant skills

### Subagent Objective Template

```
TASK: [Specific deliverable]
INPUT: [Files to read from workspace]
OUTPUT: [Exact file paths to create]
SKILLS LOADED: [List preloaded skills]

HEADY STANDARDS: [Full preamble]

INSTRUCTIONS:
1. Read [input files] for context
2. Build [specific thing] following Heady conventions
3. Write output to [exact paths]
4. Verify: no placeholders, health endpoint works, phi-math constants used

SUCCESS CRITERIA:
- [ ] All files created at specified paths
- [ ] Zero TODO/placeholder/stub
- [ ] Health endpoint returns coherence score
- [ ] All constants derive from φ or Fibonacci
```

### Multi-PR Coordination

When a project requires multiple PRs to the HeadyMe fork:

```
PR Ordering Strategy:
1. Foundation PRs first (shared utilities, schemas, configs)
2. Service PRs next (independent services, parallel if possible)
3. Integration PRs last (gateway wiring, cross-service connections)
4. Documentation PR final (reflects final state)

Branch Naming: feature/{project-name}/{component}
  Example:
    feature/ambient-intelligence/core-service
    feature/ambient-intelligence/buddy-integration
    feature/ambient-intelligence/gateway-wiring

Conflict Prevention:
  - Each PR modifies a disjoint set of files
  - SERVICE_INDEX.json updates happen in the integration PR only
  - package.json changes happen in the foundation PR only
```

### Recurring Task Setup

For ongoing Heady maintenance:

```
Daily Tasks (cron):
  - Health check all 175 services
  - Coherence drift monitoring
  - Stale file detection
  - Provider cost tracking

Weekly Tasks (cron):
  - Full ecosystem audit
  - Skill coverage gap analysis
  - Patent-to-code traceability update
  - Dependency vulnerability scan

On-Demand (manual trigger):
  - Full monorepo maintenance
  - Multi-service deployment
  - Architecture review
```

### Credit-Aware Delegation

Budget management for expensive operations:

```
Cost Awareness:
  - Each subagent consumes credits proportional to complexity
  - wide_research with 20+ entities needs confirm_action
  - Parallel agents consume simultaneously
  - Prefer sequential for simple tasks (lower total cost)

Optimization Strategies:
  - Write detailed objectives to reduce agent iteration
  - Preload skills to avoid agent re-loading
  - Save shared context to workspace files (don't repeat in each objective)
  - Use coding subagents for code (specialized, efficient)
  - Use research subagents for research (cheaper for web tasks)
```

## Delegation Decision Tree

```
Eric's Request
  │
  ├─→ Single file/skill? → Do it directly (no delegation)
  │
  ├─→ 2-3 related modules? → Sequential execution (one at a time)
  │
  ├─→ 3-8 independent modules? → Parallel subagents (FIB[4]=3 agents)
  │   └─→ Save shared context to workspace first
  │   └─→ Assign non-overlapping file paths
  │   └─→ Aggregate results after all complete
  │
  ├─→ 8+ independent entities (research)? → wide_research
  │   └─→ Create entities file
  │   └─→ confirm_action if 20+
  │
  ├─→ 8+ URLs to browse? → wide_browse
  │   └─→ Create URLs file
  │   └─→ confirm_action if 20+
  │
  ├─→ Recurring task? → schedule_cron
  │   └─→ Include full context in task description
  │   └─→ Set up state tracking in cron_tracking/
  │
  └─→ Time-delayed task? → pause_and_wait
      └─→ Calculate wait time with Python
```

## Anti-Patterns

- Never spawn agents without the Heady Standards Preamble
- Never let two agents write to the same file
- Never spawn more agents than needed — costs compound
- Never delegate without clear success criteria
- Never skip file path specification — agents default to random locations
- Never forget to preload skills — agents waste steps reloading
- Never inline large data in objectives — save to files and reference paths
- Never create crons without full self-contained context in the task description
