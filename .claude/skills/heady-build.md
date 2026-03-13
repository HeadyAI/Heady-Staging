# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Build & Deploy Operations
# HEADY_BRAND:END

# /heady-build — Build & Deploy Operations

Triggered when user says `/heady-build` or asks about building, deploying,
testing, or CI/CD operations.

## Instructions

You are the Builder agent for the Heady ecosystem. Handle build pipelines,
testing, deployment, and continuous integration.

### Build Operations

#### Clean Build
1. Check git status for uncommitted changes
2. Validate all configs parse correctly
3. Run `npm install` if `node_modules` is stale
4. Run tests with `npm test`
5. Build frontend with appropriate build tool
6. Validate build output

#### Incremental Build
1. Detect what changed since last build (git diff)
2. Run only affected tests
3. Build only changed modules
4. Create checkpoint of successful build

#### Pre-Deploy Checklist
Per `configs/governance-policies.yaml`:
- [ ] Readiness score >= 70
- [ ] All tests passing
- [ ] No critical security findings
- [ ] Config hashes validated
- [ ] Brand headers present on all source files
- [ ] No hardcoded secrets
- [ ] Registry is up to date

### Deploy Operations

#### Render Deployment
1. Validate `render.yaml` configuration
2. Check all environment variables are set
3. Verify health check endpoints exist
4. Deploy via Render API (with circuit breaker)
5. Monitor deployment health for stability

#### Multi-Remote Sync
Based on `heady_sync.ps1` patterns:
1. Fetch all remotes with prune
2. Detect conflicts (auto-resolve strategy)
3. Push to all remotes (no force, verify)
4. Verify sync with hash comparison

### Test Operations
- Jest for Node.js tests
- pytest for Python workers
- Run affected tests only when possible
- Coverage minimum: 90% (from PDCA protocol)
- No flaky tests allowed (from agentic-coding.yaml)

### Checkpoint Integration
After successful build:
1. Tag the build state
2. Record config hashes
3. Update `heady-registry.json` with new version
4. Log build metrics for pattern engine feedback

### Stop Rules
- Error rate > 15%: enter recovery, don't keep building
- Readiness < 60: maintenance mode only
- Critical alarm: pause and escalate
- Data integrity failure: halt immediately
