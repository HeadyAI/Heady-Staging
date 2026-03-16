---
name: heady-liquid-crew
description: Use when organizing multi-agent teams with defined roles, goals, backstories, and stigmergic self-organization. Absorbed from CrewAI's role-based agent pattern. Keywords include crew, team, role, goal, backstory, stigmergy, self-organization, multi-agent, CrewAI.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: LiquidCrew
  absorption_source: "CrewAI (45.9K★) → role/goal/backstory agents + stigmergic self-organization"
  super_prompt_section: "§5.4"
---

# Heady™ Liquid Crew (LiquidCrew)

## When to Use This Skill

Use this skill when:
- Assembling teams of specialized AI agents for complex tasks
- Defining agent roles, goals, and backstories for persona-driven execution
- Implementing stigmergic self-organization (agents communicate through shared environment)
- Coordinating sequential, parallel, or hierarchical task delegation

## Architecture

### Agent Definition

| Field | Purpose |
|---|---|
| **Role** | Agent's job title / specialization |
| **Goal** | What the agent must accomplish |
| **Backstory** | Context that shapes the agent's approach |
| **Tools** | Available MCP tools / liquid nodes |
| **Memory** | Agent-specific vector memory namespace |

### Crew Patterns

| Pattern | Flow | Best For |
|---|---|---|
| **Sequential** | Agent A → B → C | Step-by-step workflows |
| **Parallel** | [A, B, C] simultaneously | Independent sub-tasks |
| **Hierarchical** | Manager delegates to workers | Complex decomposition |
| **Stigmergic** | Agents react to shared environment changes | Self-organizing swarms |

### Stigmergic Coordination

Instead of direct agent-to-agent messages:
1. Agent modifies shared environment (Redis state)
2. Other agents observe changes and self-trigger
3. No central coordinator needed
4. Emergent organization from simple rules

## Instructions

### Building a Crew

1. Define agents with role/goal/backstory
2. Define tasks with expected outputs
3. Assign tasks to agents
4. Choose coordination pattern (sequential/parallel/hierarchical/stigmergic)
5. Set shared memory namespace for inter-agent context
6. Execute crew with initial context
7. Collect and merge outputs

## Output Format

- Per-Agent Execution Log
- Task Completion Report
- Inter-Agent Communication Trace
- Crew Performance Metrics
