---
name: heady-trust-receipts
description: Design and implement Heady Trust Receipts and Action Playback for auditability, transparency, and user trust. Use when building action logging, decision replay, accountability trails, consent records, or compliance reporting for Heady agent actions.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Trust Receipts

Use this skill when you need to **design, implement, or query the Trust Receipt system** — Heady's mechanism for recording, replaying, and auditing every significant action taken by agents on behalf of users.

## When to Use This Skill

- Designing the trust receipt schema and storage
- Building action playback — step-by-step replay of what an agent did and why
- Implementing consent records for permission grants and delegations
- Creating compliance reports from the receipt ledger
- Debugging agent behavior by reviewing the action trail
- Designing user-facing transparency dashboards

## Instructions

### 1. Define the Trust Receipt Schema

Every significant agent action generates a receipt:

```yaml
trust_receipt:
  id: uuid
  timestamp: ISO-8601
  actor:
    type: buddy | agent | system
    id: agent-id
    name: display-name
  action:
    type: code-edit | file-read | api-call | message-send | permission-grant | decision
    description: human-readable summary
    target: what was acted upon
  context:
    task_id: parent-task-uuid
    session_id: session-uuid
    trigger: what caused this action (user request, automated rule, delegation)
  authorization:
    permission_used: scope-name
    granted_by: user | parent-agent
    consent_record_id: uuid (if applicable)
  input:
    summary: what the agent received as input
    hash: SHA-256 of full input (for verification without storing sensitive data)
  output:
    summary: what the agent produced
    hash: SHA-256 of full output
    artifacts: [file-paths, urls, references]
  metadata:
    duration_ms: execution time
    model: AI model used
    confidence: agent's self-reported confidence
    risk_level: low | medium | high | critical
```

### 2. Implement Action Playback

Enable step-by-step replay of agent actions:

**Playback View:**
```
Task: "Review and fix the login bug"
  Step 1: [09:14:02] Read file auth/login.ts (permission: read-local)
  Step 2: [09:14:05] Searched memory for "login bug reports" (permission: memory-read)
  Step 3: [09:14:08] Analyzed code — found null check missing on line 47
  Step 4: [09:14:12] Edited auth/login.ts line 47 (permission: write-local)
  Step 5: [09:14:15] Ran test suite — all passing (permission: execute-local)
  Step 6: [09:14:20] Created commit with fix (permission: write-local)
  Result: Bug fixed, tests passing, commit ready for review
```

**Playback controls:**
- Forward/backward step navigation
- Filter by action type or risk level
- Expand any step to see full input/output details
- Compare agent's reasoning with actual outcome

### 3. Record Consent Events

When a user grants or modifies permissions:

```yaml
consent_record:
  id: uuid
  timestamp: ISO-8601
  user_id: user-uuid
  action: grant | revoke | modify
  scope: permission-scope
  target_agent: agent-id
  duration: session | persistent | one-time
  conditions: any restrictions applied
  presentation: what the user was shown (exact consent prompt text)
  decision: approved | denied | modified
  context: why the consent was requested
```

### 4. Build Compliance Reporting

Generate reports from the receipt ledger:

| Report | Purpose | Frequency |
|--------|---------|-----------|
| Action Summary | All actions by time period | Daily/weekly |
| Permission Usage | Which permissions were used and how often | Weekly |
| Risk Report | High/critical risk actions with justifications | On-demand |
| Consent Audit | All permission grants/revocations | Monthly |
| Data Access Log | What personal data was accessed | On-demand |

**Report format:**
- Summary statistics (total actions, by type, by risk level)
- Notable events (high-risk actions, permission changes, errors)
- Trend indicators (increasing/decreasing activity)
- Exportable as CSV, JSON, or PDF

### 5. Design the Transparency Dashboard

User-facing view of agent activity:

| Panel | Shows |
|-------|-------|
| Activity Feed | Real-time stream of agent actions |
| Permission Status | Current active permissions with expiry |
| Weekly Summary | Automated digest of what agents did |
| Data Usage | What personal data was accessed and why |
| Trust Score | Aggregate trust indicator based on agent behavior |

### 6. Implement Tamper Evidence

Receipts must be tamper-evident:

- **Hash chaining** — each receipt includes the hash of the previous receipt
- **Periodic checkpoints** — signed checkpoints at regular intervals
- **Verification API** — allow users to verify receipt chain integrity
- **Immutable storage** — receipts cannot be modified after creation (only annotated)

## Output Format

When designing Trust Receipt features, produce:

1. **Receipt schema definition**
2. **Playback interface wireframe**
3. **Consent record format**
4. **Compliance report templates**
5. **Tamper-evidence mechanism**
6. **Dashboard component specifications**

## Tips

- **Receipt everything** — when in doubt, log it; storage is cheap, lost trust is expensive
- **Summaries are critical** — users will read summaries, not raw logs; invest in clear human-readable descriptions
- **Playback builds trust** — being able to replay and understand what happened is the fastest way to build user confidence
- **Hash, don't store** — for sensitive inputs/outputs, store hashes for verification without retaining the raw data
- **Make compliance easy** — if generating a compliance report requires manual work, it won't happen
