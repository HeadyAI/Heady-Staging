---
name: heady-perplexity-code-review
description: Skill for Perplexity to review generated code against all 8 Heady Unbreakable Laws, the 10 Master Directives, and the no-ranking architecture principle. Use when asked to review, audit, check, verify, validate, or critique any code file in the Heady ecosystem. Triggers on phrases like "review this code", "check this file", "audit the service", "does this follow the laws", or "is this production ready".
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: quality
---

# Heady Perplexity Code Review

## When to Use This Skill

Use this skill when:

- Reviewing any generated service implementation
- Auditing orchestration files for priority/ranking language
- Checking that AutoContext middleware is properly wired
- Verifying health endpoints are correctly implemented
- Ensuring phi-scaled constants are used (not magic numbers)
- Confirming no hardcoded loopback contamination in production code
- Validating error handling and typed error classes

## Instructions

### Review Pass 1 — Ranking Language Audit (CRITICAL)

Search for and flag any occurrence of:

```
❌ FORBIDDEN TERMS (in task/work classification context):
- "priority" (as a field name or enum value)
- "CRITICAL", "HIGH", "MEDIUM", "LOW" (as task importance levels)
- "EMERGENCY", "URGENT", "NORMAL" (as task classifications)
- "priorityQueue", "sortByPriority", "priorityScore"
- "HIGH_RISK", "LOW_RISK" (as work classifiers)
- "Tier 1", "Tier 2", "Tier 3" (for categorizing work)
- SLA strings like "< 60s for MEDIUM, < 300s for HIGH"

✅ PERMITTED (these are NOT ranking):
- "cslScore" (geometric relevance)
- "phi", "PHI", "fibonacci" (math constants)
- "domain" matching scores
- pressure levels for ADAPTIVE THROTTLING (not work ranking)
```

### Review Pass 2 — 8 Unbreakable Laws Compliance

| Law | Check |
|-----|-------|
| 1. Thoroughness | Every function has error handling with typed error classes |
| 2. Solutions Only | No `// DEFERRED_WORK_MARKER: fix later`, no `catch(e) { console.log(e) }` |
| 3. Context Maximization | `autoContextMiddleware` imported and applied to routes |
| 4. Deployable | No hardcoded loopback literals, no stand-in marker functions, no scaffold markerbed imports |
| 5. Cross-Env Purity | All URLs use `process.env.*`, never hardcoded |
| 6. 10K-Bee Scale | Fibonacci pool sizes, phi-scaled timeouts |
| 7. Auto-Success Integrity | Phi-heartbeat present if service manages lifecycle |
| 8. Arena Mode | At least one alternative approach considered |

### Review Pass 3 — Service Structure Checklist

```
[ ] /health endpoint returns { status, service, uptime, version }
[ ] /healthz endpoint present (alias)
[ ] SIGTERM handler for graceful shutdown
[ ] Correlation ID attached to every log entry
[ ] emitSpan() called for all significant operations
[ ] Consul registration on startup
[ ] Bulkhead semaphore for per-service concurrency limits
[ ] All environment variables validated at startup
[ ] JSDoc on every exported function
```

### Review Pass 4 — CSL Routing Verification

```
[ ] Tasks routed by domain match, not by importance
[ ] cslGate() function used for threshold checks
[ ] CSL_GATES.include / CSL_GATES.boost / CSL_GATES.inject used correctly
[ ] No priority constants imported from phi-math.js (they don't exist there)
[ ] routeTaskByDomain() used in orchestrators, not sortByPriority()
```

### Output Format

```markdown
## Code Review: {filename}

### PASS / FAIL

### Critical Issues (must fix before merge)
- Issue: {description}
  Location: line {N}
  Fix: {specific fix}

### Warnings (should fix)
- ...

### Law Compliance
| Law | Status | Notes |
|-----|--------|-------|

### Ranking Language Found
{list of found instances with line numbers, or "None found — PASS"}

### Summary
Score: {0-100}
Recommendation: {APPROVE / REQUEST_CHANGES / BLOCK}
```

## Examples

**Input**: swarm-coordinator.js with priority constants
**Output**: Code review flagging all `PRIORITY.HIGH` usages with line numbers, specific replacement code using CSL routing

**Input**: New service index.js
**Output**: Full 4-pass review with compliance score and any missing health endpoints or AutoContext wiring flagged
