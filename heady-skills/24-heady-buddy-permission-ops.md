---
name: heady-buddy-permission-ops
description: Design and manage the Heady permission graph and delegation vault. Use when defining permission models, scoping AI companion access, building delegation chains, creating consent flows, or auditing what HeadyBuddy is allowed to do on behalf of the user.
metadata:
  author: eric-haywood
  version: '1.0'
---

# Heady Buddy Permission Ops

Use this skill when you need to **design, configure, audit, or troubleshoot the permission and delegation system** that governs what HeadyBuddy (and other Heady agents) can do on behalf of the user.

## When to Use This Skill

- Designing the permission graph for a new Heady feature or service
- Defining delegation chains — user delegates to Buddy, Buddy delegates to sub-agents
- Building consent and approval flows for sensitive operations
- Auditing existing permissions to ensure least-privilege compliance
- Troubleshooting permission denials or unexpected access
- Creating permission templates for common use cases

## Instructions

### 1. Map the Permission Graph

Define the nodes and edges of the permission graph:

**Nodes** (entities that hold or grant permissions):
- User (root authority)
- HeadyBuddy (primary AI companion)
- Sub-agents (task-specific workers spawned by Buddy)
- External services (APIs, tools, integrations)

**Edges** (permission grants):
```
User --[delegates]--> HeadyBuddy
  scope: [read-files, search-web, draft-messages]
  duration: session | persistent | one-time
  conditions: [workspace-only, business-hours, approval-required]

HeadyBuddy --[delegates]--> Sub-Agent
  scope: [subset of Buddy's permissions]
  duration: task-scoped
  conditions: [inherited + additional constraints]
```

### 2. Define Permission Scopes

Use a hierarchical scope system:

| Scope | Description | Risk Level |
|-------|-------------|------------|
| `read-local` | Read files in current workspace | Low |
| `read-any` | Read any accessible file | Medium |
| `write-local` | Write files in current workspace | Medium |
| `execute-local` | Run code in sandbox | Medium |
| `execute-system` | Run system commands | High |
| `network-read` | Make GET requests to external services | Medium |
| `network-write` | Make POST/PUT/DELETE requests externally | High |
| `send-messages` | Send messages on behalf of user | High |
| `manage-permissions` | Modify permission graph itself | Critical |

### 3. Build Delegation Chains

When Buddy needs to delegate work to sub-agents:

1. **Scope narrowing** — sub-agents NEVER get more permissions than their parent
2. **Time bounding** — delegated permissions expire when the task completes
3. **Audit trail** — every delegation is logged with who, what, when, why
4. **Revocation** — user can revoke any delegation at any time, cascading to sub-agents

### 4. Design Consent Flows

For high-risk operations, define approval workflows:

```
TRIGGER: Agent requests permission with risk >= High
FLOW:
  1. Agent explains what it wants to do and why
  2. User sees a clear, non-technical summary
  3. User approves, denies, or modifies scope
  4. Decision is logged in the Trust Receipt ledger
  5. If approved, permission is granted for the specified duration
```

### 5. Create Permission Templates

Pre-built permission sets for common scenarios:

**Coding Assistant Template:**
```yaml
scopes: [read-local, write-local, execute-local]
duration: session
conditions: [workspace-only]
```

**Research Assistant Template:**
```yaml
scopes: [read-local, network-read, read-any]
duration: session
conditions: [no-credentials-access]
```

**Full Autonomy Template:**
```yaml
scopes: [read-any, write-local, execute-local, network-read, network-write]
duration: persistent
conditions: [approval-required-for-send-messages]
```

### 6. Audit and Compliance

Regularly verify:

- No permission escalation paths exist (sub-agent cannot gain parent permissions)
- All high-risk scopes have consent flows attached
- Expired delegations are cleaned up
- Permission usage matches declared justifications
- Audit logs are complete and tamper-evident

## Output Format

When designing permissions, produce:

1. **Permission graph diagram** (text-based, showing nodes and edges)
2. **Scope table** with risk levels
3. **Delegation chain rules**
4. **Consent flow definitions** for high-risk operations
5. **Audit checklist**

## Tips

- **Default deny** — agents start with zero permissions and must be granted each scope explicitly
- **Prefer narrow scopes** — `read-local` over `read-any`, `execute-local` over `execute-system`
- **Time-bound everything** — persistent permissions should be rare and reviewed regularly
- **Make consent understandable** — non-technical users must be able to understand what they are approving
- **Log everything** — the delegation vault should be a complete, auditable record of all permission events
