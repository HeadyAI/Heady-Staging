# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Checkpoint Protocol
# HEADY_BRAND:END

# /heady-checkpoint — Run HCFullPipeline Checkpoint Protocol

Triggered when user says `/heady-checkpoint` or asks to run a checkpoint.

## Instructions

You are executing the Heady Checkpoint Protocol — the primary self-correction
moment in the HCFullPipeline. Follow each responsibility in order:

### Step 1: Validate Run State
- Read `configs/hcfullpipeline.yaml` and confirm pipeline version
- Check that no critical alarms or data integrity failures exist
- Read `heady-registry.json` for current component statuses

### Step 2: Compare Config Hashes
Compute and compare hashes for all checkpoint sources:
- `configs/hcfullpipeline.yaml`
- `configs/resource-policies.yaml`
- `configs/service-catalog.yaml`
- `configs/governance-policies.yaml`
- `configs/concepts-index.yaml`
- `configs/system-self-awareness.yaml`
- `configs/speed-and-patterns-protocol.yaml`
- `configs/connection-integrity.yaml`

Flag any files that have changed since last checkpoint.

### Step 3: Re-evaluate Health
- Check error rate against threshold (0.15)
- Evaluate readiness score against threshold (60)
- Identify any bottlenecks (hidden, fuzzy goals, bad sequencing, communication drag, under/over-utilization, process creep, cultural blockers)
- Assess cost spend vs daily budget ($50)

### Step 4: Check Concept Alignment
- Read `configs/concepts-index.yaml`
- List implemented vs planned vs public-domain patterns
- Flag any planned patterns that are now implementable
- Suggest missing patterns that would improve reliability/performance/safety

### Step 5: Apply Approved Patterns
- Check `configs/governance-policies.yaml` for auto-enable patterns
- `retry-backoff-jitter` and `idempotent-tasks` can be auto-enabled
- `circuit-breaker`, `saga-compensation`, `bulkhead-isolation`, `event-sourcing`, `cqrs` require approval

### Step 6: Sync Registry
- Read `heady-registry.json`
- Cross-reference against actual files on disk
- Flag any components that are registered but missing, or present but unregistered

### Step 7: Validate Documentation
- Check `docs/DOC_OWNERS.yaml` for freshness
- Flag any docs overdue for review
- Verify docs match current API schemas and configs

### Step 8: Report
Generate a comprehensive checkpoint report with:
- Pipeline version and stage
- Config hash comparison (drift detected Y/N)
- Readiness score assessment
- Concept alignment summary
- Pattern status
- Registry sync status
- Documentation freshness
- Recommended actions

## Stop Rules
- Build aggressively when healthy; repair first when not
- Do NOT keep building when significant errors exist in core infra, data integrity, or security
- Readiness < 50: Recovery mode only
- Readiness 50-70: Maintenance mode
- Readiness 70-85: Normal operation
- Readiness > 85: Full parallelism, aggressive building
