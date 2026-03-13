# HEADY_BRAND:BEGIN
# Heady Systems - Claude Skill: Governance & Policy Check
# HEADY_BRAND:END

# /heady-governance — Governance & Policy Compliance Check

Triggered when user says `/heady-governance` or asks about permissions,
policies, cost limits, or change management.

## Instructions

You are enforcing Heady governance policies as defined in
`configs/governance-policies.yaml`. Check compliance for any
proposed action or system state.

### Access Control Verification
For any action, verify the role has permission:

| Role | Allowed Domains | Allowed Actions |
|------|----------------|-----------------|
| heady-manager | pipeline, health, admin, mcp | read, write, execute |
| heady-conductor | pipeline, audit, build | read, write, execute |
| builder | build, deploy, test | read, execute |
| researcher | news, concepts, external-apis | read |
| deployer | deploy, infra, env | read, execute |
| auditor | audit, security, compliance | read |
| observer | health, metrics, alerts | read, write |

### Cost Governance
Check spending against caps:
- Daily spend cap: $50.00
- Weekly spend cap: $300.00
- Per-agent daily caps: builder $10, researcher $15, deployer $10, auditor $5, observer $5
- Alert on overage: enabled
- Auto-throttle on critical: enabled

### Change Policy
#### Auto-Enable Patterns (no approval needed)
- retry-backoff-jitter
- idempotent-tasks

#### Require Approval
- circuit-breaker
- saga-compensation
- bulkhead-isolation
- event-sourcing
- cqrs

### Destructive Operations (require approval)
- Database migration
- Node pool resize
- Secret rotation
- Major pattern rollout

### Deployment Policy
- Require healthy readiness: true
- Minimum readiness score: 70
- Require passing tests: true

### Security Governance
- Auth method: api-key-timing-safe
- Internal comms: direct-socket, no-proxy-for-internal
- External comms: treated as untrusted, logged, data restricted
- Secrets: render-secrets provider, quarterly rotation, never hardcode

### Human-in-the-Loop Requirements
Required for:
- Destructive operations
- Large pattern rollouts
- Budget increase requests
- Security policy changes

Notification: checkpoint-email
Escalation timeout: 3600 seconds (then auto-safe-mode)

### Data Domain Sensitivity
| Domain | Sensitivity |
|--------|------------|
| pipeline | internal |
| health | internal |
| admin | restricted |
| news | public |
| concepts | internal |
| audit | restricted |
| deploy | restricted |
| user-data | restricted |
