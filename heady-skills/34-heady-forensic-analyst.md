---
name: forensic-analyst
description: >
  Forensic Analyst for Heady — deep investigation tool for debugging system failures, tracing
  data corruption, analyzing security incidents, dissecting performance regressions, and
  conducting post-mortems across the Heady ecosystem. Combines code analysis, log investigation,
  git history forensics, connected app data (GitHub issues/PRs, Slack discussions), and web
  research for known issues into comprehensive root-cause analyses. Use when something breaks
  in the Heady ecosystem, performance degrades, data looks wrong, a security concern surfaces,
  or Eric needs to understand why something happened. Keywords: forensic, investigation, debug,
  root cause, post-mortem, incident, regression, performance, security incident, log analysis,
  git blame, trace, corruption, failure analysis, Heady debugging.
metadata:
  author: HeadySystems
  version: '1.0'
---

# Forensic Analyst for Heady

> Perplexity Computer Skill — Deep investigation and root-cause analysis for the Heady ecosystem

## When to Use This Skill

Use when:

- A Heady service is failing, slow, or producing wrong results
- Eric reports something is broken or "doesn't look right"
- A deployment caused unexpected behavior
- Security concern — unusual activity or potential breach
- Performance regression after changes
- Data inconsistency between services or memory tiers
- Post-mortem needed after an incident
- Coherence scores dropping below thresholds

## Investigation Protocol

### Phase 1: Scene Assessment

Before diving in, establish the scope:

```
INCIDENT REPORT:
  What: [Symptom — what's wrong?]
  When: [When did it start? When was it noticed?]
  Where: [Which service/domain/component?]
  Impact: [Who/what is affected? Severity?]
  Changed: [What changed recently? Deployments, PRs, config?]
  Scope: [Isolated to one service, or cross-cutting?]
```

### Phase 2: Evidence Collection

Gather evidence from all available sources:

```
Code Evidence:
  1. Read the failing code (workspace or GitHub connector)
  2. Check git history for recent changes (git log, git blame)
  3. Review recent PRs that touched affected areas
  4. Diff current state against last known good state

Log Evidence:
  5. Check service logs for errors (structured JSON logs)
  6. Look for correlation IDs to trace request flow
  7. Check health endpoints for coherence scores
  8. Review any monitoring/alerting data

External Evidence:
  9. Search web for known issues with dependencies
  10. Check GitHub issues on upstream libraries
  11. Search for error messages in forums/StackOverflow
  12. Check provider status pages (Cloudflare, GCP, Firebase)

Context Evidence:
  13. Search Slack/email (if connected) for related discussions
  14. Check GitHub issues/PRs for related work
  15. Review Notion docs for relevant design decisions
  16. Check workspace files for recent build context
```

### Phase 3: Hypothesis Generation

Form hypotheses ranked by likelihood:

```
For each hypothesis:
  H[n]: [Description of potential cause]
  Evidence For: [What supports this?]
  Evidence Against: [What contradicts this?]
  Test: [How to confirm or rule out]
  Likelihood: [High / Medium / Low]
```

Hypothesis ranking heuristic:
- Recent changes are the most likely cause (80/20 rule)
- External dependency failures are second most likely
- Design flaws / edge cases are third
- Hardware / infrastructure issues are least likely but highest impact

### Phase 4: Root Cause Isolation

Systematically confirm or eliminate hypotheses:

```
For each hypothesis (highest likelihood first):
  1. Design a minimal test that distinguishes this cause from alternatives
  2. Execute the test:
     - Code test: Read the specific code path, trace the logic
     - Config test: Check environment variables, service configs
     - Dependency test: Search for known issues
     - Data test: Query relevant data stores
  3. Record result: CONFIRMED / ELIMINATED / INCONCLUSIVE
  4. If confirmed → proceed to fix. If eliminated → next hypothesis.
```

### Phase 5: Root Cause Report

Document findings with full evidence chain:

```
## Root Cause Analysis: [Incident Name]
Date: [Date]
Severity: [Critical / Major / Minor]
Duration: [Time from onset to resolution]

### Summary
[One paragraph: what happened, why, and how it was fixed]

### Timeline
- [Time]: First symptom observed
- [Time]: Investigation began
- [Time]: Root cause identified
- [Time]: Fix deployed
- [Time]: Service restored

### Root Cause
[Detailed explanation of what went wrong and why]

### Evidence Chain
1. [Evidence 1] → led to [conclusion 1]
2. [Evidence 2] → confirmed [hypothesis]
3. [Evidence 3] → ruled out [alternative]

### Fix Applied
[What was changed to resolve the issue]
[Code diff or config change]

### Prevention
[How to prevent this class of issue in the future]
1. [Systemic fix 1]
2. [Monitoring improvement]
3. [Process change]

### Heady-Specific Recommendations
[Recommendations mapped to Heady architecture]
- Service health: [Should X check be added to /health?]
- CSL gate: [Should a new gate threshold be introduced?]
- Circuit breaker: [Should failure handling be adjusted?]
- Monitoring: [Should drift detection cover this?]
```

## Specialized Investigation Types

### Performance Regression

```
Evidence Collection:
  - Before/after benchmark data
  - Profile traces (if available)
  - git log --since="[date]" for recent changes
  - Resource utilization (CPU, memory, network)

Common Heady Causes:
  - New service not circuit-broken (cascade failure)
  - HNSW index parameters changed (vector search slowdown)
  - Provider routing change (slower model selected)
  - Fibonacci window size increased (more computation per cycle)
  - Missing cache (removed or expired)
```

### Coherence Drift

```
Evidence Collection:
  - Current coherence scores from /health endpoints
  - Historical coherence data (if tracked)
  - Recent embedding changes
  - Vector memory state

Common Heady Causes:
  - Embedding model change (dimension mismatch)
  - Data ingestion of low-quality content
  - Memory tier promotion without re-embedding
  - Graph RAG relationship corruption
  - Twin drift exceeding COHERENCE_DRIFT_ALERT (0.809)
```

### Security Investigation

```
Evidence Collection:
  - Firewall logs (SemanticFirewall if deployed)
  - Auth logs (Firebase, JWT validation)
  - Request patterns (rate, origin, payload anomalies)
  - Git history for unexpected commits

Common Heady Concerns:
  - Prompt injection through HeadyBuddy
  - API key exposure in logs or responses
  - Unauthorized service-to-service calls
  - OAuth token misuse
```

### Data Inconsistency

```
Evidence Collection:
  - Compare same data across memory tiers (T0, T1, T2)
  - Check CRDT sync state between services
  - Verify embedding dimensions match (384D everywhere)
  - Check timestamp ordering in event streams

Common Heady Causes:
  - CRDT merge conflict resolved incorrectly
  - Memory promotion without re-indexing
  - Embedding dimension mismatch after provider change
  - Race condition in parallel vector updates
```

## Anti-Patterns

- Never assume the cause — always collect evidence first
- Never modify production state during investigation
- Never ignore the "what changed recently" question
- Never stop at the first hypothesis — verify before declaring root cause
- Never write a post-mortem without prevention recommendations
- Never investigate without checking /health endpoints first
