# HEADY_BRAND:BEGIN
# Heady Systems - Claude Code Integration
# HEADY_BRAND:END

# Heady Claude Code Skills & Agents

Complete Claude Code integration for the HeadyMonorepo, derived from deep scanning
of all Heady directives, unbreakable laws, skills, tools, and workflows.

## Skills (Slash Commands)

| Command | Description |
|---------|-------------|
| `/heady-checkpoint` | Run HCFullPipeline Checkpoint Protocol (14-step validation) |
| `/heady-health` | System Health & Readiness Assessment (ORS scoring) |
| `/heady-pipeline` | Pipeline Operations — status, DAG, stages, agents, resources |
| `/heady-audit` | Security & Compliance Audit (secrets, access, brand, deps) |
| `/heady-brain` | System Brain — self-awareness, bottlenecks, MC mindset |
| `/heady-supervisor` | Multi-Agent Supervisor — task routing, agent health |
| `/heady-build` | Build & Deploy Operations (clean/incremental, pre-deploy) |
| `/heady-research` | Research Before Build — pattern mining, concept extraction |
| `/heady-critique` | Self-Critique & Improvement Loop (7 bottleneck categories) |
| `/heady-drift` | Configuration Drift Detection & Resolution |
| `/heady-patterns` | Pattern Recognition & Evolution Analysis |
| `/heady-governance` | Governance & Policy Compliance Check |

## Agents (Subagent Types)

| Agent | Role | Criticality |
|-------|------|-------------|
| `heady-orchestrator` | HCFullPipeline Orchestrator-Conductor | Critical |
| `heady-builder` | Build & Deploy Agent | High |
| `heady-auditor` | Security & Compliance Agent | Medium |
| `heady-researcher` | Knowledge & Pattern Mining Agent | Medium |
| `heady-observer` | Monitoring & Health Agent | Critical |
| `heady-deployer` | Infrastructure Deployment Agent | High |

## Unbreakable Laws

1. **Determinism** — Same inputs = same plan graph
2. **Safety First** — Correctness over speed
3. **Build or Repair** — Repair before building when unhealthy
4. **User First** — User tasks have absolute priority
5. **Live Production** — Deploy, run, improve (not hypothetical)
6. **Self-Awareness** — Assume not optimized, seek improvement
7. **No Secrets** — Never hardcode, always env vars
8. **Least Privilege** — Minimal access per role
9. **Docs-as-Code** — Outdated docs = defect
10. **Seamlessness** — One coherent multi-channel product

## Key Reference Files

- `.claude/HEADY_DEEP_SCAN.md` — Complete intelligence extraction
- `configs/hcfullpipeline.yaml` — Master pipeline definition
- `configs/system-self-awareness.yaml` — Self-knowledge protocol
- `configs/service-catalog.yaml` — Agent/service registry
- `configs/governance-policies.yaml` — Policies and access control
- `configs/skills-registry.yaml` — Full skill definitions
- `CLAUDE.md` — Project instructions and system context

## Architecture

```
User Request
    ↓
Orchestrator (heady-orchestrator)
    ↓
Pipeline: channel-entry → ingest → plan → execute → recover
              → self-critique → optimize → finalize → monitor
    ↓
Agents: builder | researcher | deployer | auditor | observer | claude-code
    ↓
Supervisor: capability-match | direct | load-balanced | parallel-fanout
    ↓
Node Pools: HOT (2s) | WARM (10s) | COLD (60s)
```
