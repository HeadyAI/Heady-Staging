# Tasks Extracted from Platform Reports

**Generated:** 2026-03-15 | **Source:** docs/heady-platform-reports.md (12 reports)
**Method:** Cross-referenced all report findings, recommendations, and gap analysis against existing 138 tasks in `configs/hcfullpipeline-tasks.json` v5.6.0. Below are **net-new tasks** not already tracked.

---

## From Report 1: Executive Architecture Overview

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-001 | Create visual stage-flow diagram (SVG/Mermaid) for the 21-stage pipeline showing parallel vs sequential execution | 3h | DOCUMENTATION | No existing task covers visual pipeline representation |
| NEW-002 | Document all 20 AI node interfaces — input/output contracts, failure modes, CSL scoring behaviors | 4h | DOCUMENTATION | Nodes exist in JSON but no interface specification docs |
| NEW-003 | Validate fullAutoMode governance constraints with integration tests (budget cap, prohibited scopes, confirmation bypass) | 3h | QUALITY | fullAutoMode exists in pipeline but has no test coverage |

## From Report 2: Security Posture & Hardening

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-004 | Create security hardening execution sequence playbook — ordered dependency resolution (SEC-017→SEC-002→SEC-004→SEC-005→SEC-018→SEC-006) | 2h | DOCUMENTATION | Report identified optimal sequencing; no runbook exists |
| NEW-005 | Audit SEC-001 completion claims — verify shared/middleware/cors-whitelist.js deployment across all 16 sites | 2h | QUALITY | SEC-001 marked ✅ but 144 residual instances found (REM-004 tracks reopen but no verification test) |
| NEW-006 | Implement automated security regression CI step — grep-guard against reintroduction of eval(), http://, cors(*) | 3h | SECURITY | Multiple completed security tasks regressed; no CI guard prevents reintroduction |

## From Report 3: Infrastructure Readiness

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-007 | Create Redis latency benchmark suite — measure p50/p95/p99 before and after pooling optimization (INFRA-003) | 2h | QUALITY | Current latency is 143ms; no automated benchmark to track progress |
| NEW-008 | Audit and consolidate 12 Git remotes → target 3-4 remotes max (1 org × 3 environments) | 3h | INFRASTRUCTURE | Report identified 12 remotes across 4 org as excessive |
| NEW-009 | Standardize Git authentication — migrate mixed SSH/PAT auth to single method across all remotes | 2h | SECURITY | Mix of SSH keys and PATs creates credential management complexity |

## From Report 4: Task Inventory & Burndown

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-010 | Create sprint planning board — map 138 tasks to 16-week sprints with dependency resolution | 4h | DOCUMENTATION | Burndown projection exists in report but no actionable sprint board |
| NEW-011 | Build task status dashboard — live view of 138 tasks with category filters, progress bars, dependency graph | 6h | FEATURES | hcfullpipeline-tasks.json has data; no UI exists to visualize it |
| NEW-012 | Automate task status sync — script to update hcfullpipeline-tasks.json status from Git commit messages (feat:/fix:/chore: → matching task ID) | 4h | INFRASTRUCTURE | Manual status tracking will drift from actual completion |

## From Report 5: HCFullPipeline Deep Dive

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-013 | Build pipeline telemetry collector — measure actual vs configured timeouts per stage across production runs | 4h | INFRASTRUCTURE | φ-scaled timeouts configured but no telemetry to validate they're appropriate |
| NEW-014 | Create pipeline variant selector tests — verify fast_path skips correct stages, arena_path excludes execution, learning_path loops correctly | 3h | QUALITY | 5 variants defined; no tests verify correct stage inclusion/exclusion |
| NEW-015 | Document CSL scoring weight rationale — ADR explaining why correctness=34%, safety=21%, etc. and when to adjust | 2h | DOCUMENTATION | Weights exist but no rationale documented |
| NEW-016 | Implement pipeline dry-run mode — execute all stages with mock data to validate wiring without side effects | 4h | FEATURES | No way to test pipeline end-to-end without real execution |

## From Report 7: Quality & Testing

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-017 | Create test coverage measurement infrastructure — configure jest --coverage, set thresholds, add CI gate | 3h | QUALITY | QUAL-001 targets 80% but no measurement tool is configured |
| NEW-018 | Prioritize smoke tests for 43 untested services — generate minimal health check + startup/shutdown test per service | 8h | QUALITY | QUAL-024 asks for tests but doesn't specify minimum viable approach |

## From Report 9: Scaling & Liquid Nodes

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-019 | Build liquid node health aggregator — unified dashboard showing status of all 7 compute providers | 3h | INFRASTRUCTURE | Each provider deployed independently; no unified health view |
| NEW-020 | Create liquid node cost tracker — per-provider cost monitoring with φ-scaled budget alerts | 4h | SCALING | Multi-provider compute needs cost visibility |

## From Report 11: Git & Repository Health

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-021 | Delete 50+ stale remote branches (merged Dependabot, abandoned Copilot/Claude/Codex branches) | 2h | REMEDIATION | 100+ remote branches; many stale |
| NEW-022 | Implement semantic versioning with Git tags (v5.6.0 aligned with hcfullpipeline-tasks.json) | 1h | INFRASTRUCTURE | Zero tags in repository |
| NEW-023 | Set up branch protection rules on main across all remotes (require PR, status checks, no force push) | 2h | SECURITY | Multiple remotes with no branch protection |

## From Report 12: Competitive Landscape

| ID | Task | Hours | Category | Source Insight |
|----|------|-------|----------|---------------|
| NEW-024 | Create competitive comparison page on headysystems.com — feature matrix, unique value props, technical moat | 4h | FEATURES | Report generated matrix but no public-facing comparison exists |
| NEW-025 | Write "Why Heady?" technical blog post — targeting HN/dev.to audience with concrete differentiators | 3h | DOCUMENTATION | Competitive analysis exists internally but isn't externalized |

---

## Summary

| Metric | Value |
|--------|-------|
| **New tasks extracted** | 25 |
| **Total estimated hours** | 81h |
| **By category** | |
| → DOCUMENTATION | 8 tasks, 22h |
| → QUALITY | 5 tasks, 19h |
| → INFRASTRUCTURE | 5 tasks, 16h |
| → SECURITY | 3 tasks, 7h |
| → FEATURES | 3 tasks, 14h |
| → REMEDIATION | 1 task, 2h |
| → SCALING | 1 task, 4h |

## Recommended Priority (Top 10)

1. **NEW-006** — Security regression CI guard (prevents completed fixes from regressing)
2. **NEW-022** — Semantic versioning tags (foundational — 1h)
3. **NEW-017** — Test coverage measurement (unblocks QUAL-001)
4. **NEW-005** — Audit SEC-001 completion (verify CORS fix)
5. **NEW-008** — Consolidate 12 Git remotes
6. **NEW-014** — Pipeline variant tests (verify fast/full/arena/learning paths)
7. **NEW-021** — Delete stale branches (repo hygiene)
8. **NEW-013** — Pipeline telemetry (validate φ-timeouts)
9. **NEW-023** — Branch protection rules
10. **NEW-003** — fullAutoMode governance tests

**Combined with existing 138 tasks: total backlog = 163 tasks, ~691 hours.**
