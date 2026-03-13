# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Configuration Drift Detection
# HEADY_BRAND:END

# /heady-drift — Configuration Drift Detection & Resolution

Triggered when user says `/heady-drift` or asks about config consistency,
drift detection, or registry sync.

## Instructions

You are running Heady's configuration drift detection — ensuring all configs,
docs, registry, and source code remain consistent.

### Phase 1: Config Hash Comparison
Check all checkpoint config sources for consistency:
1. `configs/hcfullpipeline.yaml` — Pipeline definition
2. `configs/resource-policies.yaml` — Resource limits
3. `configs/service-catalog.yaml` — Service/agent registry
4. `configs/governance-policies.yaml` — Access/security policies
5. `configs/concepts-index.yaml` — Pattern tracking
6. `configs/system-self-awareness.yaml` — Self-knowledge
7. `configs/speed-and-patterns-protocol.yaml` — Speed protocol
8. `configs/connection-integrity.yaml` — Connection health
9. `configs/skills-registry.yaml` — Skill definitions

For each: read the file, compute a content hash, compare with last known state.

### Phase 2: Registry vs Disk Reconciliation
Read `heady-registry.json` and cross-reference:
- Every registered component exists on disk at stated path
- Every significant file on disk is registered
- Versions match between registry and package.json files
- Endpoints and healthCheck paths are correct

### Phase 3: Service Catalog vs Source Code
Compare `configs/service-catalog.yaml` with actual implementations:
- Every agent listed has a corresponding class in `src/agents/`
- Skills listed match skills defined in agent constructors
- Tools listed are actually available
- Routing strategies match supervisor implementation

### Phase 4: Pipeline Config vs Handlers
Verify `configs/hcfullpipeline.yaml` stages have matching handlers:
- Every task in every stage has a registered handler in `src/agents/pipeline-handlers.js`
- Dependencies form a valid DAG (no cycles)
- Checkpoint flags are correct
- Node pool assignments match task criticality

### Phase 5: Documentation Freshness
Check `docs/DOC_OWNERS.yaml`:
- Every config file has an assigned owner
- Review dates are not overdue
- Content in docs matches actual API behavior
- README sections reference current endpoints/ports

### Output Format
```
HEADY DRIFT DETECTION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Config Hashes:
  hcfullpipeline.yaml:      [hash] [MATCH/DRIFT]
  resource-policies.yaml:    [hash] [MATCH/DRIFT]
  service-catalog.yaml:      [hash] [MATCH/DRIFT]
  ...

Registry Drift:
  Missing on disk:    [list]
  Unregistered:       [list]
  Version mismatch:   [list]

Service Catalog Drift:
  Missing agents:     [list]
  Skill mismatches:   [list]

Pipeline Handler Drift:
  Unhandled tasks:    [list]
  Invalid deps:       [list]

Documentation:
  Overdue reviews:    [list]
  Content mismatch:   [list]

Recommended Fixes:
  1. [specific fix]
  2. [specific fix]
```

### Standing Rule
Outdated documentation is treated as a defect. When a mismatch between
docs and behavior is detected, flag it as an incident.
