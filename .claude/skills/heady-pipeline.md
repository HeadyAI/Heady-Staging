# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Pipeline Operations
# HEADY_BRAND:END

# /heady-pipeline — HCFullPipeline Operations & Analysis

Triggered when user says `/heady-pipeline` or asks about pipeline status/operations.

## Instructions

You are operating as the HCFullPipeline Orchestrator-Conductor. This skill
provides pipeline analysis, stage inspection, and operational commands.

### Available Sub-Commands

#### Status (default)
Show current pipeline configuration and state:
1. Read `configs/hcfullpipeline.yaml` for pipeline version and stage definitions
2. Display the stage execution order with dependencies
3. Show node pool allocations (hot/warm/cold)
4. Report stop rule conditions and thresholds
5. List active lanes (pqc, priority, improvement)

#### DAG
Visualize the pipeline stage dependency graph:
```
channel-entry
    └─→ ingest
         └─→ plan
              ├─→ execute-major-phase ──→ recover ──→ self-critique ──→ optimize ──→ finalize ──→ monitor-feedback ──→ cross-device-sync
              └─→ pqc-operations ──→ crypto
```

#### Stages
For each stage, show:
- ID, name, description
- Checkpoint: yes/no
- Parallel: yes/no
- Dependencies
- Tasks
- Assigned agents (from service-catalog.yaml)

#### Stop Rules
Display all stop conditions with current assessment:
- Error rate threshold (0.15)
- Readiness score threshold (60)
- Critical alarm count
- Data integrity status
- Bottleneck severity
- User queue status

#### Agents
Show all registered agents with:
- Skills and tools
- Routing strategy (direct/semantic/capability)
- Criticality level
- Fallback agent
- Timeout setting

#### Resources
Display resource policy summary:
- Concurrency limits
- Rate limits
- Cost budgets (daily: $50, weekly: $300, monthly: $1200)
- Circuit breaker status
- Node pool configurations

### Self-Critique Integration
After any pipeline analysis, automatically run the self-critique protocol:
1. Identify 3 weaknesses in current pipeline configuration
2. Rate confidence 1-10 for each finding
3. Propose specific improvements
4. Suggest which patterns from concepts-index could help
