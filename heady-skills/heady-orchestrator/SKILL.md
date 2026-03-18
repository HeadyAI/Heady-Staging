---
name: heady-orchestrator
description: "Autonomous task orchestration, multi-step workflows, and pipeline execution using Heady™ Orchestration services. Use this skill when the user wants to run complex multi-step tasks, automate workflows, chain tools together, execute pipelines, or coordinate multiple AI operations. Triggers on: 'run the full pipeline', 'auto-flow', 'orchestrate', 'chain these steps', 'automate this', 'multi-step', 'workflow', 'coordinate', 'end-to-end', 'full pipeline', 'HCFP'. Always use this skill for any multi-step automation or orchestration task — it connects to heady_auto_flow, heady_orchestrator, heady_hcfp_status, heady_csl_engine, and heady_agent_orchestration MCP tools."
---

# Heady™ Orchestrator Skill

You are connected to the Heady™ Orchestration tier — the autonomous pipeline engine. This skill coordinates multi-step workflows, chains tools together, and runs the HCFP (Heady Context Flow Processor) for end-to-end task completion.

## Available MCP Tools

### heady_auto_flow
The flagship tool — runs the full auto-success pipeline: Battle → Coder → Analyze → Risks → Patterns via HCFP.

```json
{
  "task": "Build a REST API for user management",
  "code": "// optional starting code",
  "context": "Node.js, Express, PostgreSQL"
}
```

**When to use:** User wants an end-to-end solution — code generation, testing, analysis, and refinement in one shot.

### heady_orchestrator
General-purpose task orchestration — routes tasks to the optimal combination of services.

```json
{
  "tasks": [
    {"tool": "heady_analyze", "args": {"code": "..."}},
    {"tool": "heady_risks", "args": {"code": "..."}},
    {"tool": "heady_refactor", "args": {"code": "..."}}
  ],
  "strategy": "parallel",
  "merge": "unified_report"
}
```

### heady_hcfp_status
Check the status of running HCFP pipelines.

```json
{
  "pipeline_id": "pip_abc123"
}
```

### heady_csl_engine
Execute CSL (Confidence Signal Logic) computations for weighted decision-making.

```json
{
  "signals": [
    {"name": "code_quality", "value": 0.85},
    {"name": "test_coverage", "value": 0.72},
    {"name": "security_score", "value": 0.91}
  ],
  "gate": "BOOST"
}
```

### heady_agent_orchestration
Coordinate multiple AI agents working on different aspects of a task.

```json
{
  "agents": ["coder", "reviewer", "tester"],
  "task": "Implement and validate feature X",
  "coordination": "sequential"
}
```

## Workflows

### Auto-Success Pipeline (HCFP)
The HCFP chains tools in a φ-scaled sequence:

```
Task → Battle Arena (compete solutions)
     → Coder (generate/refine code)
     → Analyze (quality metrics)
     → Risks (vulnerability scan)
     → Patterns (architecture review)
     → Memory (store learnings)
```

Each stage gates on CSL confidence:
- If confidence < 0.382: **retry** the stage
- If confidence ≥ 0.618: **proceed** to next stage
- If confidence ≥ 0.718: **fast-track** (skip optional stages)

### Multi-Agent Coordination
For complex tasks, spin up multiple agents:

1. **Plan** — Use `heady_orchestrator` to decompose the task
2. **Execute** — Use `heady_agent_orchestration` to run agents in parallel
3. **Merge** — Combine agent outputs with CSL-weighted merging
4. **Validate** — Run `heady_auto_flow` on the merged result

## Usage Pattern

When the user gives you a complex task:

1. **Decompose** — Break it into sub-tasks
2. **Route** — Use `heady_orchestrator` to send each sub-task to the right tool
3. **Monitor** — Check `heady_hcfp_status` for pipeline progress
4. **Score** — Use `heady_csl_engine` to compute confidence on the final output
5. **Report** — Present results with CSL confidence scores

## Connection

This skill connects to the HCFP service (port 3330) and Heady Conductor (port 3323) via the MCP server.
