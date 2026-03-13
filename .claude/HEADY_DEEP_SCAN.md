# HEADY_BRAND:BEGIN
# Heady Systems - Deep Scan: Directives, Laws, Skills, Tools & Workflows
# HEADY_BRAND:END

# Heady Deep Scan — Complete Intelligence Extraction

## Unbreakable Laws (Extracted from all configs)

### 1. Determinism Law
> Given the same input (hcfullpipeline.yaml, resource-policies.yaml, dependency versions),
> the system MUST produce the same plan graph and same task routing decisions.
> Randomness is seeded ("heady-sacred-geometry-seed") and logged per run.

### 2. Safety-First Law
> Safety and correctness ALWAYS override speed. Privacy and least-privilege data access.
> Budget-aware model selection. User-facing latency targets must be met.

### 3. Build-or-Repair Law
> Build aggressively when healthy; repair first when not. Do NOT keep building when
> significant errors exist in core infra, data integrity, or security.

### 4. User-First Law
> User-initiated tasks have absolute priority. Background tasks run only when user
> queues are empty and ORS >= maintenance threshold. Must pause when new user work arrives.

### 5. Live Production Law
> This is real, not hypothetical. Deploy, run automatically, continuously improve.
> Avoid 'maybe someday' language. Default to deployment-oriented actions.

### 6. Self-Awareness Law
> Assume the system is NOT fully optimized. Actively seek improvement in every interaction.
> Stagnant patterns are bugs. Latency above target is a performance bug.

### 7. No Secrets Law
> Never hardcode secrets. Timing-safe API key validation. Quarterly rotation policy.
> Secrets managed via HeadyVault with 45 secrets across 6 categories.

### 8. Least Privilege Law
> Access control per role. Restricted domains require elevated permissions.
> External comms treated as untrusted. Data sensitivity classification enforced.

### 9. Documentation-as-Code Law
> Outdated documentation is treated as a defect. When mismatch between docs and
> behavior is detected, create an incident task and prevent drift.

### 10. Seamlessness Law
> The entire ecosystem must feel like one coherent, fast, multi-channel product.
> Shared identity, shared context, consistent behavior across all channels.

---

## Pipeline Stages (12 Stages + 2 Lanes)

| # | Stage | Checkpoint | Parallel | Key Tasks |
|---|-------|-----------|----------|-----------|
| 0 | Channel Entry | No | Yes | resolve identity, sync context, route |
| 1 | Ingest | Yes | Yes | news, repos, APIs, health, patterns |
| 2 | Plan (MC-Powered) | Yes | No | task graph, MC selection, priorities, costs |
| 3 | Execute Major Phase | Yes | Yes | route to agents, monitor, collect results |
| 4 | Recover | Yes | No | evaluate failures, compensate, retry, escalate |
| 5 | Self-Critique | Yes | No | critique, bottlenecks, improvements, meta-analysis |
| 6 | Optimize | Yes | Yes | patterns, MC weights, caches, concurrency |
| 7 | Finalize | Yes | No | persist, registry, readiness, docs, email |
| 8 | Monitor & Feedback | Yes | Yes | MC timing, patterns, metrics, seamlessness |
| 9 | Cross-Device Sync | Yes | Yes | state sync, verification |
| 10 | Sync Priority | Yes | Yes | priority changes |
| 11 | Deploy Priority | Yes | Yes | priority deployment |
| PQC | Post-Quantum Crypto | Yes | Yes | PQC keys, certs, validation |
| Crypto | Cryptography | Yes | Yes | keys, encrypt, decrypt |

**Lanes:** pqc (2AM daily), priority (on file change), improvement (every 15 min)

---

## Agent Catalog (8 Agents)

| Agent | Skills | Criticality | Timeout |
|-------|--------|-------------|---------|
| claude-code | code-analysis, security-audit, documentation, concept-alignment, task-planning, governance-check, readiness-eval | high | 120s |
| builder | build, deploy, test, lint | high | 30s |
| researcher | news-ingestion, concept-extraction, trend-analysis | medium | 45s |
| deployer | render-deploy, docker-build, cloud-bridge, env-sync | high | 60s |
| auditor | code-audit, security-scan, brand-check, dependency-audit | medium | 40s |
| observer | health-check, metrics-collection, alert-evaluation, readiness-probe | critical | 15s |
| swarm-coordinator | task-distribution, concurrent-execution, dependency-resolution, phi-backoff-retry | critical | — |
| colab-ops | embedding, inference, training, autonomous-learning, health-check | high | — |

---

## Skills Registry (18 Skills)

| Skill | Category | Auto-Run |
|-------|----------|----------|
| hcfp_clean_build | build | No |
| cross_platform_deploy | deployment | No |
| hcfp_pdca_implementation | quality | No |
| headylens_zero_defect | quality | Yes |
| checkpoint_sync | sync | Yes |
| heady_sync | sync | No |
| monte_carlo_optimization | optimization | No |
| imagination_engine | intelligence | No |
| pattern_recognition | intelligence | Yes |
| research_before_build | research | Yes |
| hcfp_self_knowledge | learning | Yes |
| hcip_infrastructure_setup | infrastructure | No |
| docker_mcp_setup | infrastructure | No |
| branding_protocol | branding | Yes |
| two_base_fusion | integration | No |
| hc_autobuild | automation | Yes |
| workspace_integration | integration | No |
| naming-audit | naming | trigger-based |

---

## Routing Strategies

1. **CAPABILITY_MATCH** — Default: auto-select by skill matching
2. **DIRECT** — Named agent(s)
3. **LOAD_BALANCED** — Round-robin across healthy
4. **PARALLEL_FANOUT** — All matching concurrently
5. **SEMANTIC** — Vector-space similarity routing (swarm-coordinator)

---

## Bottleneck Categories (7)

1. Hidden bottlenecks — one step throttles everything
2. Fuzzy goals — busy but unaligned
3. Bad work sequencing — dependencies unmapped
4. Communication drag — too many async threads
5. Under/over-utilization — illusion of abundance
6. Process creep — overhead without pruning
7. Cultural blockers — perfectionism, fear

---

## Key Protocols

### Checkpoint Protocol (14 responsibilities)
validate_run_state → compare_config_hashes → reevaluate_plan_and_health →
check_concept_alignment → update_logs_and_owner → apply_approved_patterns →
sync_registry_entries → sync_documentation → validate_notebooks →
check_doc_ownership_freshness → evaluate_self_critique_findings →
check_mc_drift_alerts → verify_channel_health → check_public_domain_alignment

### Self-Critique Protocol
answer → critique (3 weaknesses) → refine → learn

### Monte Carlo Mindset
Explore multiple paths, not just one linear chain. Sample different scenarios.
Use diversity of attempts to improve robustness.

### Speed Protocol
Latency is a defect. Prefer fast paths. Fallback only on failure. Keep warm pools.

### Pattern Evolution
Assume improvable. Freeze only when proven near-optimal. Weekly re-check.
Convergence: variance < 0.05 over 20+ samples.

---

## Resource Budgets

| Resource | Limit |
|----------|-------|
| Daily spend | $50 |
| Weekly spend | $300 |
| Monthly spend | $1200 |
| API requests/min | 120 |
| LLM requests/min | 60 |
| Daily token budget | 500,000 |
| Max concurrent tasks | 8 |
| Max parallel agents | 6 |
| Circuit breaker threshold | 5 failures |
| Circuit breaker reset | 30s |

---

## Operational Readiness Score (ORS)

| Range | Mode | Behavior |
|-------|------|----------|
| >85 | FULL_POWER | Full parallelism, aggressive building, new optimizations |
| 70-85 | NORMAL | Standard operation, standard parallelism |
| 50-70 | MAINTENANCE | Reduced load, no new large builds |
| <50 | RECOVERY | Repair only, escalate to owner |

---

## Multi-Brain Architecture

| Brain | Focus |
|-------|-------|
| HeadySystems | sys-ops, coding agent, OS automation, infra MCP tools |
| HeadyMe | personal wellbeing, coaching, teaching, wealth |
| HeadyConnection | community impact, BD, grants, ethics |
| HeadyWeb | web platform, content, onboarding, demos |
| HeadyBuddy | companion, quick assistant, context keeper |

---

## Config Ecosystem (90+ YAML files)

Core configs that Claude skills reference:
- `hcfullpipeline.yaml` — Master pipeline (12 stages, 3 lanes)
- `resource-policies.yaml` — Budgets, limits, circuit breakers
- `service-catalog.yaml` — 8 services, 8 agents, 8 integrations
- `governance-policies.yaml` — Access control, security, change policies
- `concepts-index.yaml` — 12 implemented, 4 planned, 7 public domain patterns
- `system-self-awareness.yaml` — Self-knowledge, bottlenecks, improvement loops
- `speed-and-patterns-protocol.yaml` — Speed directive, pattern evolution
- `skills-registry.yaml` — 18 skills across 8 categories
- `agentic-coding.yaml` — Agent roles, structured loops, spec-driven dev
