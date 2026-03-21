# Feature Specification: Heady Task Genome

**Version:** 1.0  
**Date:** 2026-03-17  
**Author:** Eric Haywood / Heady Ecosystem  
**Domain:** headyme.com / headysystems.com / headybot.com  
**Status:** Draft

---

## 1. Purpose

Heady Task Genome is a structured task decomposition and execution intelligence layer. It gives the Heady ecosystem the ability to break any complex user goal into a typed, versioned, reusable task graph — a "genome" — that can be executed, replayed, branched, monitored, and evolved over time. Unlike a simple to-do list or one-shot agent run, a Task Genome persists the structure of how work was accomplished so that similar future goals can be seeded from prior successful patterns.

### Problem Statement
Users frequently ask Heady agents to accomplish multi-step goals (research + write + format + send, for example). Currently each such request is handled as a fresh inference with no reuse of prior decomposition logic. When a task fails mid-way or the user wants to repeat a similar workflow, they must re-describe the entire plan. This wastes tokens, introduces inconsistency, and prevents the system from learning which task structures work best.

### Goals
1. Enable any agent to decompose a user goal into a typed task graph in < 5 seconds.
2. Persist task graphs as reusable, versioned genome objects in the user's Task Genome Library.
3. Allow users to replay, branch, or modify a genome for new inputs without re-decomposing.
4. Surface pattern-matched genome suggestions when a new goal resembles a prior one.
5. Provide real-time execution status and a post-run audit trail for every genome run.

### Non-Goals
- Multi-user shared task genomes (v2; single-user scope in v1).
- Automated genome mutation/optimization via RL (deferred to Heady Simulation Sandbox track).
- Integration with external project management tools (Jira, Linear) in v1.
- Voice-driven genome creation (v2).

---

## 2. User Experience

### User Personas
- **The Systematic Worker** — wants to define a repeatable workflow once and run it many times with different inputs.
- **The Recovering Over-Prompter** — tired of writing the same long multi-step instructions repeatedly.
- **The Ops Builder** — building automated pipelines on headybot.com using genome-defined task structures.

### Core UX Flows

**Genome Creation from a Goal**
1. User types a complex goal in any Heady session: "Research the top 5 competitors in the MCP space, write a comparison table, and email it to my team."
2. Agent detects multi-step complexity and prompts: "This looks like a multi-step workflow. Would you like to create a Task Genome for it?"
3. User confirms. Agent decomposes the goal into a typed task graph:
   ```
   Goal: Competitor research + report + send
   ├── Task A: Research [type: web_search, input: query, output: results_json]
   ├── Task B: Synthesize [type: llm_transform, input: results_json, output: summary_md]
   ├── Task C: Format [type: template_render, input: summary_md, output: comparison_table_md]
   └── Task D: Send [type: email_send, input: comparison_table_md, output: send_confirmation]
   ```
4. Genome canvas displayed: user can rename nodes, adjust task types, add/remove steps, set conditional branches ("if Task A returns < 3 results, expand search").
5. User names the genome ("Competitor Research Pipeline") and saves to their Genome Library.
6. Genome executes immediately or is scheduled.

**Genome Library**
- List view of all saved genomes with: name, description, last run date, run count, status of last run.
- Click → Genome Detail: visual graph view, run history, version history, fork/branch controls.
- "Run with new inputs" modal: user supplies new input values (e.g., different competitor search query) and launches a new run.
- Version diff view: compare genome v1 vs. v2 node-by-node.

**Genome Suggestions**
- When a user types a new goal, the system checks semantic similarity against their Genome Library.
- If similarity > threshold: "This looks like your Competitor Research Pipeline. Use it as a starting point?"

---

## 3. Architecture

### Components

| Component | Role | Domain |
|---|---|---|
| Genome Decomposer | LLM-powered goal → task graph decomposer | heady-ai.com |
| Genome Store | Versioned storage for genome definitions (graph JSON + metadata) | headysystems.com |
| Genome Executor | Interprets and runs genome graphs; manages task sequencing and branching | headybot.com |
| Task Type Registry | Catalog of available typed task primitives (web_search, llm_transform, etc.) | headysystems.com |
| Run State Store | Real-time execution state per genome run | headysystems.com |
| Genome Suggestion Engine | Semantic similarity matching of new goals vs. genome library | heady-ai.com |
| Genome Canvas UI | Visual graph editor in headyme.com | headyme.com |

### Task Type Primitives (v1)
| Type | Description |
|---|---|
| `web_search` | Executes a web search and returns structured results |
| `llm_transform` | LLM inference step: transform input text to output text |
| `template_render` | Renders a named template with variable substitution |
| `file_read` | Reads a file from Heady Sovereign Workspace Cloud |
| `file_write` | Writes output to a file |
| `email_send` | Sends an email via connected Gmail/SMTP |
| `api_call` | Calls a named external API endpoint |
| `condition_branch` | Evaluates a condition and routes to different next tasks |
| `human_review` | Pauses execution and waits for user approval before continuing |

### Genome Graph Schema (JSON)
```json
{
  "genome_id": "uuid",
  "name": "string",
  "version": "semver",
  "owner_user_id": "uuid",
  "goal_description": "string",
  "nodes": [
    {
      "node_id": "string",
      "task_type": "web_search",
      "label": "string",
      "config": {},
      "inputs": ["upstream_node_id or literal"],
      "outputs": ["downstream_node_id"]
    }
  ],
  "edges": [{"from": "node_id", "to": "node_id", "condition": "optional_expr"}],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## 4. Data Flows

### Decomposition Flow
```
1. User submits complex goal in session
2. Genome Decomposer receives goal text + user's Task Type Registry catalog
3. LLM call: goal → structured task graph JSON
4. JSON validated against Task Type Registry schema
5. Genome canvas rendered in UI for user review/editing
6. User saves → POST /genome {definition_json} → Genome Store
7. Version 1.0 record created
```

### Execution Flow
```
1. User triggers run: POST /genome/{genome_id}/run {input_values}
2. Genome Executor reads genome definition from Genome Store
3. Run State record created (status: RUNNING)
4. Executor walks graph topologically:
   a. For each node: resolve inputs from upstream outputs or user-provided values
   b. Dispatch task to appropriate service (headybot, headyapi, etc.)
   c. On completion: store output, update Run State
   d. On branch: evaluate condition, route accordingly
   e. On human_review: pause execution, notify user
5. On completion: Run State → COMPLETE; run summary written
6. User notified of completion with output summary
```

---

## 5. Security & Privacy

| Control | Implementation |
|---|---|
| Genome isolation | Genomes are user-scoped; no cross-user access without explicit share |
| Task permission enforcement | `email_send`, `api_call`, `file_write` tasks require pre-authorized tool tokens in user's account |
| Human review gates | Any genome with external side-effect tasks (send, write, call) defaults to `human_review` node before execution unless user explicitly removes it |
| Input sanitization | All user-provided input values to genome runs are sanitized before injection into task configs |
| Execution audit | Every genome run produces an immutable run log with task-level inputs and outputs |
| Data residency | Run logs and genome definitions stored per user's data residency setting |

---

## 6. Dependencies

| Dependency | Owner | Status |
|---|---|---|
| headybot.com execution runtime | headybot.com | Required |
| heady-ai.com LLM routing (for Decomposer and llm_transform tasks) | heady-ai.com | Required |
| Task Type Registry (must be defined before decomposer prompt) | headysystems.com | Required |
| headyme.com dashboard (for Genome Canvas UI) | headyme.com | Required |
| Heady Sovereign Workspace Cloud (for file_read/file_write tasks) | Second-wave | Complementary |
| Gmail / email connector (for email_send tasks) | External connector | Complementary |

---

## 7. Phased Rollout

### Phase 1 — Decomposer + Store (Weeks 1–4)
- Goal → task graph decomposition via LLM
- Genome Store with versioning
- Manual execution via API (no UI canvas)
- Task types: web_search, llm_transform, file_read, file_write
- Internal alpha
- Success gate: Decomposer produces valid graph JSON for ≥90% of test prompts

### Phase 2 — Executor + Canvas (Weeks 5–8)
- Genome Executor with linear + conditional branching
- Genome Canvas UI in headyme.com
- human_review gate nodes active by default
- Run State Store + real-time status UI
- Closed beta: 50 users
- Success gate: End-to-end genome create → run → view results in < 60 seconds

### Phase 3 — Suggestion Engine + Full Task Types (Weeks 9–12)
- Genome Suggestion Engine (semantic matching)
- All v1 task types including email_send, api_call
- Genome Library with run history
- Open launch
- Success gate: ≥40% of users who create a genome run it ≥3 times

### Phase 4 — Versioning + Forking (Weeks 13–16)
- Full version diff UI
- Fork/branch from any genome version
- Genome sharing (public link, read-only)
- Success gate: ≥20% of power users maintain ≥3 active genomes

---

## 8. Open Questions

| Question | Owner | Blocking? |
|---|---|---|
| What LLM is used for the Decomposer? Cost per decomposition call? | AI/Infra | Yes — before Phase 1 |
| Should condition_branch expressions use a DSL or natural language evaluated by LLM? | Engineering | Yes — before Phase 1 |
| Max nodes per genome in v1? (Suggest 20 for cost and complexity control) | Engineering | No |
| Should genome run outputs be stored indefinitely or with a TTL? | Product | No |
| How does Genome Executor handle partial failures mid-run? Retry policy? | Engineering | No — define in Phase 2 |

---

## 9. Success Metrics

| Metric | Target | Window |
|---|---|---|
| Decomposer accuracy | ≥90% valid graph JSON on first attempt | Phase 1 alpha |
| Genome creation rate | ≥30% of multi-step request sessions result in a saved genome | 60 days post Phase 3 |
| Genome reuse rate | ≥40% of saved genomes are run ≥2 times | 90 days post Phase 3 |
| Suggestion acceptance rate | ≥25% of genome suggestions accepted by user | 30 days post Phase 3 |
| Execution success rate | ≥95% of genome runs complete without fatal error | Ongoing |
