---
name: heady-evolution-swarm
description: Use when discovering new tools, evaluating them against current Heady capabilities, and proposing absorption into the platform. Implements pipeline stages 17-19 (OPTIMIZATION_OPS, CONTINUOUS_SEARCH, EVOLUTION). Keywords include evolution, discovery, absorption, new tools, capability assessment, competitive analysis, continuous improvement.
metadata:
  author: HeadySystems
  version: '1.0'
  liquid_node: EvolutionSwarm
  absorption_source: "§33.4 — Autonomous Maintenance Swarms"
  super_prompt_section: "§33.4"
---

# Heady™ Evolution Swarm

## When to Use This Skill

Use this skill when:
- Discovering new AI tools, libraries, or patterns that could enhance Heady
- Evaluating a tool's capabilities against existing liquid nodes
- Proposing absorption of a new platform into the Heady ecosystem
- Running competitive analysis against emerging AI coding agents

## Architecture

### Discovery → Evaluate → Absorb Pipeline

```
EvolutionSwarm
  ├─ DiscoveryBee → Scan GitHub trending, HN, ArXiv, Product Hunt
  ├─ EvaluationBee → Compare features against Heady capability matrix
  ├─ GapAnalysisBee → Identify unique capabilities not in Heady
  ├─ AbsorptionDesignBee → Map to liquid node architecture
  └─ IntegrationBee → Generate skill or connector implementation
```

### Evaluation Criteria

| Criterion | Weight | Measurement |
|---|---|---|
| GitHub stars / growth rate | 0.15 | Community traction |
| Unique capability not in Heady | 0.30 | Gap coverage |
| Architecture compatibility | 0.25 | Fits liquid node pattern |
| License compatibility | 0.15 | Apache2/MIT/BSD preferred |
| Maintenance health | 0.15 | Recent commits, issue response |

## Instructions

### Running Evolution Cycle

1. Scan trending repositories (GitHub, HN front page, ArXiv cs.AI)
2. Filter for AI agent / coding / orchestration tools
3. Compare each against Heady's 89+ connectors and 100+ skills
4. Score using evaluation criteria
5. For score > 0.618: generate absorption proposal
6. Proposal includes: liquid node mapping, skill definition, integration effort
7. Submit to governance log for review

## Output Format

- Discovery Report (ranked tools)
- Gap Analysis Matrix
- Absorption Proposals
- Competitive Position Update
