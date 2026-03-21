# Feature Specification: Heady Simulation Sandbox

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / headysystems.com / heady-ai.com  
**Status:** Draft

---

## 1. Purpose

Heady Simulation Sandbox is a safe, isolated execution environment where users and agents can rehearse decisions, test workflows, stress-test task genomes, explore counterfactuals, and run "what if" scenarios before committing to real-world actions. It gives the Heady ecosystem a controlled stage between ideation and execution — reducing costly mistakes, improving plan quality, and building user confidence in AI-generated recommendations.

### Problem Statement
AI recommendations in high-stakes domains (business strategy, code deployment, financial planning, communications) are currently acted upon directly or discarded. There is no intermediate layer where users can say "show me what happens if we follow this plan" and observe simulated outcomes with the AI explaining its reasoning step by step. Without this, users either over-rely on AI outputs or under-utilize them out of distrust.

### Goals
1. Enable a user to run a simulated scenario from any task genome or natural-language "what if" prompt within 30 seconds.
2. Provide structured simulation traces showing each decision step, assumed conditions, and projected outcomes.
3. Allow the user to branch the simulation at any decision node to explore alternative paths.
4. Support dry-run mode for actionable genomes (simulate email send, API call, file write without executing).
5. Deliver a measurable improvement in user confidence scores before executing AI-recommended plans.

### Non-Goals
- Live system simulation with real external API side effects (the sandbox is strictly isolated).
- Multi-user simultaneous collaborative simulation (v2).
- Monte Carlo probabilistic simulation (statistical modeling out of scope for v1).
- Domain-specific physics or financial modeling engines (AI-based qualitative simulation only in v1).

---

## 2. User Experience

### User Personas
- **The Cautious Executor** — wants to see what will happen before pressing "run" on a task genome.
- **The Strategic Thinker** — uses the Sandbox to explore business or project scenarios before committing.
- **The Developer/Tester** — runs genomes in dry-run mode to verify logic without side effects.

### Core UX Flows

**"What If" Simulation from Natural Language**
1. User types in any Heady session: "What if I cold-emailed the top 10 SaaS companies in this list asking for a partnership?"
2. Agent recognizes simulation intent and offers: "Run this as a simulation in the Sandbox?"
3. User confirms. Sandbox opens in a side panel or new tab.
4. Simulation Planner decomposes the scenario into a simulation script:
   ```
   Scenario: Cold email campaign — 10 SaaS companies
   Step 1: Draft email template [AI drafts, shows text]
   Step 2: Target list validation [checks list quality, flags duplicates]
   Step 3: Simulate delivery [assumes 10 recipients, estimates open/response rates]
   Step 4: Simulate responses [AI generates 3 probable response types with reasoning]
   Step 5: Outcome assessment [likely outcomes with confidence labels: High/Medium/Low]
   ```
5. Each step is displayed as an interactive card with: action, assumed conditions, result, confidence level.
6. User can tap any step to branch: "What if email tone was formal instead?" → new branch run.
7. Simulation report can be saved or used to seed a real task genome for execution.

**Genome Dry-Run Mode**
1. User opens a Task Genome in the Genome Library.
2. "Dry Run" button triggers Simulation Sandbox in dry-run mode.
3. Each task node runs:
   - Real logic for safe operations (web_search, llm_transform, file_read)
   - Simulated (mocked) response for side-effect operations (email_send → shows what email would be sent; api_call → shows what request would be made; file_write → shows what file content would be written)
4. Full dry-run trace is displayed with each node's simulated output.
5. User reviews and either approves for real execution or edits the genome.

**Simulation Branching**
- Any simulation step card has a "Branch here" button.
- User specifies the changed condition for the branch.
- Sandbox spawns a parallel simulation branch, displayed side by side with the original.
- User can compare branches on a split-screen view.
- User can "promote" a branch to become the primary simulation or save it separately.

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Simulation Planner | Converts natural-language or genome input into a structured simulation script | heady-ai.com |
| Sandbox Executor | Runs simulation scripts step by step; dispatches real or mocked calls | headysystems.com |
| Mock Service Layer | Intercepts side-effect task types and returns simulated (not real) responses | headysystems.com |
| Branch Manager | Creates, stores, and manages parallel simulation branches | headysystems.com |
| Simulation Store | Persists completed simulation traces and branch trees | headysystems.com |
| Simulation UI | Interactive step-by-step trace viewer with branching controls | headyme.com |
| Confidence Scorer | LLM-based step-level confidence assessment | heady-ai.com |

### Mock Service Map (v1)
| Real Task Type | Mock Behavior |
|---|---|
| `email_send` | Returns simulated send confirmation + "email would contain: [preview]" |
| `api_call` | Returns plausible mock response based on API endpoint pattern |
| `file_write` | Returns content preview of what would be written |
| `web_search` | Executes real search (no side effect; acceptable) |
| `llm_transform` | Executes real inference (no side effect; acceptable) |

---

## 4. Data Flows

### Natural-Language Simulation Flow
```
1. User submits "what if" prompt
2. Simulation Planner: prompt → structured simulation script (LLM call)
3. Script JSON sent to Sandbox Executor
4. Executor iterates through script steps:
   a. Safe steps → dispatched to real services
   b. Side-effect steps → dispatched to Mock Service Layer
   c. Each step result + Confidence Scorer assessment assembled into step card
5. Complete simulation trace returned to Simulation UI
6. Trace saved to Simulation Store
```

### Dry-Run Genome Flow
```
1. User triggers dry-run on genome_id
2. Sandbox Executor fetches genome definition from Genome Store
3. Executor runs genome graph with Mock Service Layer active for all side-effect nodes
4. Real outputs used for safe nodes (web_search, llm_transform)
5. Mock outputs used for side-effect nodes (email_send, api_call, file_write)
6. Full trace + mock output previews returned to Simulation UI
7. User reviews; approves or edits genome
```

### Branch Flow
```
1. User triggers branch at step N with condition change C
2. Branch Manager creates new simulation branch record (parent: original sim, branch_point: step N)
3. Sandbox Executor re-runs from step N with modified condition C
4. Branch trace stored; UI updates to show split-screen comparison
5. User can save branch or promote to primary
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| Execution isolation | Sandbox Executor runs in an isolated environment with no access to production data stores |
| No real side effects | Mock Service Layer is enforced at the Executor level; cannot be bypassed by user config |
| Simulation data | Simulation traces are stored under user's account; not shared or used for training without opt-in |
| Rate limiting | Simulation runs are rate-limited per user (10/hour in v1) to prevent abuse |
| Dry-run confirmation | Before a dry-run transitions to real execution, a mandatory "You are about to execute for real" confirmation is required |
| No external API calls from dry-run | Mock Service Layer blocks all external network calls for side-effect tasks; no credentials are ever used in simulation mode |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| heady-ai.com LLM routing (for Simulation Planner and Confidence Scorer) | heady-ai.com | Required |
| Heady Task Genome (for genome dry-run input) | Second-wave | Complementary |
| headyme.com dashboard (Simulation UI) | headyme.com | Required |
| Mock Service Layer (must mirror all Task Genome task types) | headysystems.com | Required |
| Heady Context Capsule Mesh (to pass simulation results as capsule to execution) | Second-wave | Complementary |

---

## 7. Phased Rollout

### Phase 1 — Simulation Planner + Basic Trace (Weeks 1–4)
- Simulation Planner (natural language → script)
- Sandbox Executor with Mock Service Layer (email_send, api_call, file_write)
- Basic trace UI (linear, no branching)
- Internal alpha: 10 test scenarios
- Success gate: Simulation Planner produces valid script for ≥85% of test prompts; trace renders correctly

### Phase 2 — Genome Dry-Run (Weeks 5–8)
- Genome dry-run integration (reads from Task Genome Library)
- Confidence Scorer per step
- Dry-run → real execution transition flow with confirmation gate
- Closed beta: 30 users
- Success gate: Dry-run mode covers all v1 task types with accurate mock outputs

### Phase 3 — Branching + Simulation Store (Weeks 9–12)
- Branch Manager
- Split-screen branch comparison UI
- Simulation Store (save, name, and revisit past simulations)
- Open launch
- Success gate: ≥25% of genome executions preceded by a dry-run; user confidence score pre-execution increases ≥20% vs. no-sandbox baseline

### Phase 4 — Advanced Scenarios (Weeks 13–16)
- Multi-step counterfactual scenario templates (business strategy, content strategy, outreach)
- Simulation-to-Genome conversion ("promote this simulation script to a real genome")
- Success gate: ≥10 simulation templates in Skill Bazaar

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| What LLM is used for Simulation Planner? Should it be a reasoning-optimized model? | AI/Infra | Yes — before Phase 1 |
| How detailed should mock API responses be? Pattern-matched or LLM-generated? | Engineering | Yes — before Phase 1 |
| Should simulation traces be shareable (link to trace)? | Product | No |
| How do we measure "user confidence improvement"? Survey or behavioral signal? | Product/Data | No — define before Phase 3 |
| Rate limit of 10/hour — is this sufficient for power users? | Product | No |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Simulation plan accuracy | ≥85% valid scripts on first attempt | Phase 1 alpha |
| Dry-run pre-execution rate | ≥25% of actionable genome runs preceded by dry-run | 60 days post Phase 2 |
| User confidence improvement | ≥20% improvement in pre-execution confidence score | 60 days post Phase 3 |
| Post-simulation execution success rate | ≥98% of dry-run-approved runs complete without fatal error | 90 days post Phase 2 |
| Branching usage | ≥15% of simulations include at least one branch | 60 days post Phase 3 |
