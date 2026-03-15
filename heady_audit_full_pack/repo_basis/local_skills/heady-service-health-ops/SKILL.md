# Heady Service Health Ops

## When to Use This Skill

Use this skill when the user asks for:

- health checks across AI services
- service drift or deployment drift review
- recovery steps for failing orchestration services
- self-healing or auto-remediation plans
- operational dashboards and runbooks

## Instructions

1. List the services or components under review.
2. Classify each as:
   - healthy
   - degraded
   - unknown
   - failing
3. For each component, inspect the five operational layers:
   - availability
   - latency
   - error rate
   - dependency health
   - configuration drift
4. If the user provides logs or endpoints, summarize the likely failure domain first instead of jumping to fixes.
5. Produce a triage table with:
   - component
   - symptom
   - likely cause
   - verification step
   - fix priority
6. Recommend remediation in this order:
   - safe restart or reconnect
   - configuration correction
   - dependency repair
   - rollback
   - deeper redesign if recurring
7. When relevant, add automation ideas for:
   - heartbeats
   - alert thresholds
   - fallback activation
   - drift detection
   - Monte Carlo or canary validation before deploy
8. End with:
   - Most Likely Root Cause
   - Fastest Safe Fix
   - Preventive Controls

## Output Pattern

- Current State
- Risk Table
- Triage Steps
- Recovery Plan
- Prevention Plan

## Example Prompts

- Diagnose why my AI microservices are drifting out of sync
- Build a recovery playbook for my orchestrator and worker services
- Help me design self-healing checks for my deployment stack

## Provenance

This skill is grounded in the public HeadyMe dashboard "Service Health" section on [headyme.com](https://headyme.com/), which shows services such as heady-manager, hcfp-auto-success, and lens-feeder as online, and in public HeadySystems descriptions of "6-signal drift detection" and "Monte Carlo validation on every deploy" on [headysystems.com](https://headysystems.com/).