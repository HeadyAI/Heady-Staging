---
name: heady-deploy-debug
description: Use when the user needs deployment planning, debugging, rollout triage, incident analysis, environment fixes, or cross-service troubleshooting across the Heady stack. Triggers include deploy, broken, debug, incident, logs, Cloudflare Pages, Workers, tunnels, Cloud Run, Docker, SSL, auth, webhook, runtime error, latency, and orchestration failure.
metadata:
  author: perplexity-computer
  version: '1.0'
  owner: Eric Head
  suite: heady
---

# Heady Deploy Debug

## When to Use This Skill

Use this skill when the user is shipping or fixing Heady systems and needs structured diagnosis instead of random trial and error.

## Operating Principles

- Reproduce before prescribing
- Prefer smallest viable fix
- Separate symptom, trigger, root cause, and mitigation
- Preserve forward momentum with fallback paths

## Instructions

1. Capture the failure in one sentence.
2. Classify it:
   - build-time
   - deploy-time
   - runtime
   - auth
   - network
   - data
   - external dependency
3. Gather observable signals: errors, logs, routes, headers, environment assumptions, and recent changes.
4. Produce a hypothesis list ranked by likelihood.
5. Propose the fastest validation step for each hypothesis.
6. Recommend the minimal fix and a safer long-term hardening step.
7. If rollout is involved, include rollback and verification steps.

## Output Format

- Symptom
- Likely Root Causes
- Fast Validation Checks
- Recommended Fix
- Hardening Steps
- Rollback Plan
- Heady Integration Opportunity

## Common Heady Context

Consider issues across:

- Cloudflare Pages, Workers, and tunnels
- Cloud Run services and routing gateways
- Docker containers and environment variables
- webhook pipelines and autonomous agents
- auth provider fanout and callback handling
- pgvector connections and persistence flows

## Example Triggers

- My Cloudflare to Cloud Run path is failing intermittently
- Help me debug this HeadyMCP deployment
- The agent orchestration pipeline is timing out
- SSL or OAuth callbacks are broken across domains
