---
name: heady-swarm-template-ops
description: Use when managing the HeadySwarm dynamic creation lifecycle — template matching, provisioning, parallel execution, convergence, deployment, and template extraction. Implements §33's 7-phase creation protocol and 13 swarm template types. Keywords include swarm template, dynamic creation, bee factory, template matching, swarm lifecycle, template extraction, self-replicating.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: HeadySwarmDynamicCreation
  absorption_source: "§33 — HeadySwarm Dynamic Creation Protocol"
  super_prompt_section: "§33"
---

# Heady™ Swarm Template Ops (Dynamic Creation Protocol)

## When to Use This Skill

Use this skill when:
- Creating new swarm execution patterns from scratch
- Matching incoming tasks to existing swarm templates
- Extracting reusable templates from successful swarm runs
- Managing the bee factory and dynamic bee type creation

## Architecture

### 7-Phase Creation Lifecycle

| Phase | Action |
|---|---|
| 1. Intent Decomposition | CSL classifies, Rabbit generates 5+ paths, Conductor selects optimal DAG |
| 2. Template Matching | CSL ≥ 0.618 → instantiate template; else synthesize new DAG |
| 3. Provisioning | Allocate bees, GPU tasks to Colab cluster |
| 4. Parallel Execution | Independent branches concurrent, progress via Redis Streams |
| 5. Convergence | Integration tests, security scan, deployability check |
| 6. Deploy & Register | Target environment deploy, liquid node registration |
| 7. Template Extraction | Abstract successful pattern into reusable template with score |

### 13 Template Types

| Template | Purpose |
|---|---|
| `template-connector-oauth` | OAuth2-based API connector |
| `template-connector-apikey` | API key-based connector |
| `template-connector-webhook` | Incoming webhook handler |
| `template-connector-scraper` | Web scraping connector |
| `template-app-nextjs` | Next.js full-stack app |
| `template-app-worker` | Cloudflare Worker |
| `template-app-bot` | Discord/Slack/Telegram bot |
| `template-app-extension` | Browser/IDE extension |
| `template-bee-custom` | Custom bee type for bee-factory-v2 |
| `template-skill-prompt` | Prompt-based agentic skill |
| `template-mcp-server` | MCP server from OpenAPI spec |
| `template-swarm-bee` | Swarm with custom bee composition |
| `template-heady-ui` | HeadyOS UI component/page |

### Template Scoring

Each template accumulates a score from successful instantiations:
- Score > 0.9 → "gold" template (highly reliable)
- Score 0.618–0.9 → "silver" (good but may need tuning)
- Score < 0.618 → review needed, may be retired

## Instructions

### Creating a New Swarm

1. Receive task intent from user or pipeline
2. Run CSL classification against template registry
3. If match found (CSL ≥ 0.618): instantiate template with task-specific params
4. If no match: synthesize new DAG using Rabbit's 5+ path generation
5. Provision bees from bee-factory-v2
6. Execute with parallel branching via Redis Streams
7. Converge: run integration tests + security scan
8. Deploy and register as liquid node
9. Extract template from successful execution for reuse

### Dynamic Bee Type Creation

1. Define bee manifest (name, role, input/output types, tools)
2. Generate implementation from `template-swarm-bee`
3. WASM sandbox test execution
4. Register in bee-factory-v2 (capacity: fib(11) = 89 types)
5. Persist template for future instantiation

## Output Format

- Swarm Execution Report
- Template Registry Delta
- Bee Allocation Map
- Performance Comparison (template vs. from-scratch)
