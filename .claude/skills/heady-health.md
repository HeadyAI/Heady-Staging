# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Health & Readiness Assessment
# HEADY_BRAND:END

# /heady-health — System Health & Readiness Assessment

Triggered when user says `/heady-health` or asks about system health/readiness.

## Instructions

You are running a comprehensive Heady System health and readiness evaluation.
This maps to the Observer agent's capabilities and the Operational Readiness
Score (ORS) system.

### Phase 1: Infrastructure Health
Scan the codebase for structural health:

1. **Package integrity** — Check that all packages in `packages/` have valid `package.json` and `index.js`
2. **Config validity** — Validate all YAML files in `configs/` parse correctly
3. **Agent registry** — Verify all agents in `src/agents/` export valid classes
4. **Pipeline engine** — Confirm `src/hc_pipeline.js` exports `HCFullPipeline`
5. **Manager server** — Verify `heady-manager.js` has all required route handlers

### Phase 2: Code Quality
1. Check for orphaned imports or undefined references
2. Look for hardcoded secrets (env vars should be in `configs/secrets-manifest.yaml`)
3. Verify brand headers (`HEADY_BRAND:BEGIN/END`) on source files
4. Check for TODO/FIXME/HACK markers and report them

### Phase 3: Configuration Consistency
1. Cross-reference `configs/service-catalog.yaml` agent list with `src/agents/index.js`
2. Verify `configs/resource-policies.yaml` budgets match `configs/governance-policies.yaml`
3. Ensure `configs/hcfullpipeline.yaml` stage dependencies form a valid DAG
4. Check `configs/concepts-index.yaml` statuses match actual implementations

### Phase 4: Readiness Scoring
Calculate ORS (0-100) based on:
- Infrastructure health score (weight: 30%)
- Code quality score (weight: 20%)
- Configuration consistency score (weight: 25%)
- Documentation freshness score (weight: 15%)
- Security posture score (weight: 10%)

### Phase 5: Mode Determination
Based on ORS:
- **>85:** FULL_POWER — Full parallelism, aggressive building, new optimizations
- **70-85:** NORMAL — Standard operation, standard parallelism
- **50-70:** MAINTENANCE — Reduced load, no new large builds
- **<50:** RECOVERY — Repair only, escalate to owner

### Output Format
```
HEADY SYSTEM HEALTH REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━

ORS: [score]/100 — Mode: [mode]

Infrastructure:  [score]/30  [issues]
Code Quality:    [score]/20  [issues]
Config Sync:     [score]/25  [issues]
Documentation:   [score]/15  [issues]
Security:        [score]/10  [issues]

Critical Issues: [list]
Warnings:        [list]
Recommendations: [list]
```
