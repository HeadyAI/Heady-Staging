# HEADY™ — Extended Autonomous Operations Prompt
>
> Use this prompt WITH the context file (perplexity-computer-context.md) to execute a full autonomous health, optimization, and improvement cycle.

---

## INSTRUCTION

You are executing a **full autonomous maintenance and improvement cycle** for the Heady™ AI Platform. The foundation for ALL changes is the **HeadyMe GitHub organization repositories** and the existing **Heady project data**. Do not invent features — extend what exists. Deliver ALL output files as a **single downloadable ZIP** named `heady-autonomous-cycle-YYYY-MM-DD.zip` with `MANIFEST.md` and `APPLY.sh` included.

Execute the following phases in order. After each phase, emit a checkpoint. If any phase produces findings requiring action, generate the fix files and include them in the ZIP.

---

## PHASE 1: HEALTH AUDIT

1. **Dependency scan** — Analyze `package.json` for outdated, deprecated, or vulnerable dependencies. Check that `overrides` are still needed. Verify HeadyCore replacements (27 packages replaced by internal modules) are complete and nothing is double-imported.
2. **Environment validation** — Review `.env.template` and `src/config/env-schema.js`. Identify any env vars referenced in code but missing from the template. Flag any secrets that should not be in `.env.example`.
3. **Docker health** — Review `Dockerfile.production` for outdated base images, security issues, unnecessary layers, or missing healthcheck improvements.
4. **CI pipeline** — Review `.github/workflows/` and `cloudbuild.yaml` for broken steps, missing security gates (TruffleHog, CodeQL, npm audit, SBOM, Trivy), or opportunities to speed up builds.
5. **Boot sequence** — Trace `heady-manager.js` through all 10 boot phases. Identify any services that would fail to mount and suggest fixes. Verify Phase 7 service-registry covers all 116 services in `src/services/`.

**Deliverables:** `reports/health-audit.md`, any fix files.

---

## PHASE 2: CODE QUALITY

1. **ESLint compliance** — Generate or update `.eslintrc.js` rules for the current codebase patterns. Identify files with the most violations.
2. **Dead code scan** — Find unused exports, unreachable code, orphan files not imported anywhere.
3. **Duplicate detection** — Find near-identical logic across services that should be consolidated.
4. **Type safety** — Review `tsconfig.json` settings. Identify JavaScript files that would benefit from TypeScript conversion or JSDoc annotations.
5. **HeadyCore module completeness** — Verify all 27 replaced packages (`node-fetch`, `dotenv`, `express`, `redis`, `pg`, `openai`, etc.) have complete HeadyCore equivalents and no service is still importing the original package.

**Deliverables:** `reports/code-quality.md`, fix files, new/updated configs.

---

## PHASE 3: TEST COVERAGE

1. **Coverage gap analysis** — Map which of the 116 services have tests vs which don't. Prioritize by criticality.
2. **Generate missing tests** — For each service WITHOUT tests, generate a test file at `tests/{service-name}.test.js` following existing test patterns. Tests must use Jest, respect phi-based coverage tiers, and test the service's primary exports.
3. **Fix broken tests** — Run `npm test` mentally against the test suite and identify tests likely to fail due to missing mocks, outdated imports, or changed APIs.
4. **Integration test gaps** — Identify which boot phases, MCP tools, and API routes lack integration tests.

**Deliverables:** `tests/*.test.js` files, `reports/test-coverage.md`.

---

## PHASE 4: SECURITY HARDENING

1. **Secrets audit** — Scan for hardcoded secrets, API keys, or tokens in source files.  Verify `.gitignore` covers all sensitive paths.
2. **Auth flow review** — Trace `src/bootstrap/auth-engine.js` and `src/auth/` for authentication bypass paths, missing CSRF protection, or insecure session handling.
3. **Input validation** — Review API routes for missing input validation, SQL injection vectors, or command injection risks.
4. **PQC status** — Verify `pqc_enabled: true` in config is actually wired through to `src/security/` and `quantum-bridge.js`.
5. **Dependency vulnerabilities** — Generate `npm audit` equivalent findings. Verify `overrides` in package.json address known CVEs.

**Deliverables:** `reports/security-audit.md`, fix files.

---

## PHASE 5: PERFORMANCE OPTIMIZATION

1. **Cold start optimization** — Analyze the 10-phase boot sequence for parallelization opportunities. Which phases can run concurrently?
2. **Service mount time** — The try/require pattern in Phase 7 is sequential. Identify services that could be lazily loaded or deferred.
3. **Memory footprint** — Identify services that load large data structures at boot vs on-demand.
4. **Vector memory** — Review `vector_memory` config (HNSW m:32, ef:200, dim:1536). Validate these are optimal for the workload. Check octree depth:8 appropriateness.
5. **Connection pooling** — Review Redis, PostgreSQL, and external API connection pooling for leaks or misconfiguration.

**Deliverables:** `reports/performance.md`, optimized files.

---

## PHASE 6: MCP + PROMPT SYSTEM

1. **MCP tool coverage** — Verify all 42 MCP tools have working handlers. Map tool names to actual skill files.
2. **Prompt library integrity** — Validate all 64 prompts in `deterministic-prompt-manager.js` match `heady-prompt-library.json`. Flag mismatches.
3. **Prompt variable coverage** — For each prompt, verify all `{{VARIABLE}}` placeholders have documented types and defaults.
4. **MCP transport** — Verify both stdio and streamable-http transports work. Check protocol version alignment.

**Deliverables:** `reports/mcp-audit.md`, fix files, updated prompts.

---

## PHASE 7: DOCUMENTATION

1. **README accuracy** — Verify root `README.md` matches current architecture, commands, and deployment targets.
2. **API docs** — Generate or update `docs/API_REFERENCE.md` from actual route mounts in `src/bootstrap/service-registry.js` and `src/bootstrap/inline-routes.js`.
3. **Architecture map** — Update `docs/ARCHITECTURE-MAP.md` to reflect current 10-phase boot, 116 services, 20 agents, 42 MCP tools.
4. **Onboarding guide** — Verify `SETUP_GUIDE.md` works for a clean clone on Linux with Node 20+.

**Deliverables:** Updated docs.

---

## PHASE 8: DEPLOYMENT READINESS

1. **Cloud Run config** — Verify `cloudbuild.yaml` builds and deploys correctly to `heady-production` project in `us-central1`.
2. **Cloudflare workers** — Verify edge worker configs in `configs/cloudflare-workers/` are current and match deployed workers.
3. **Domain routing** — Verify all 9 domains in `heady.config.yaml` resolve correctly and route to the right services.
4. **HuggingFace Spaces** — Verify deployment configs for the 4 HF spaces are current.
5. **Environment parity** — Verify env vars in `.env.template` match what Cloud Run expects.

**Deliverables:** `reports/deployment-readiness.md`, fix files.

---

## PHASE 9: AUTONOMOUS IMPROVEMENT

1. **Self-improvement candidates** — Analyze the codebase for the top 10 highest-impact improvements: refactoring opportunities, performance wins, reliability improvements.
2. **Pattern convergence** — Identify patterns used inconsistently across services and generate unified implementations.
3. **Sacred Geometry compliance** — Verify phi-based scaling is applied consistently in timeouts, retries, coverage thresholds, and UI proportions.
4. **CSL gate coverage** — Identify files still using discrete if/else logic that should use Continuous Semantic Logic gates.

**Deliverables:** improvement files, `reports/self-improvement.md`.

---

## PHASE 10: SUMMARY RECEIPT

Generate a final `SUMMARY_RECEIPT.md` containing:

```
# Heady™ Autonomous Cycle — YYYY-MM-DD

## Completed Phases: [list]
## Total Findings: [count by severity: critical/warning/info]
## Files Generated: [count, broken down by new/updated]
## Actions Taken: [bullet list]
## Items Requiring Human Attention: [numbered list with rationale]
## Next Recommended Cycle: [description + timing]
## ZIP Contents: [file tree]
```

---

## RULES

- Ground EVERY recommendation in actual HeadyMe repo code — cite file paths
- Never invent APIs, endpoints, or services not in the repos
- Flag any new additions as `[NEW — NOT IN REPO]`
- Deliver ALL files as a single ZIP
- Use phi (1.618) for any numeric scaling decisions
- Follow existing naming conventions (HeadyCapitalized, lowercase-bees, HC prefix)
- Every fix must include rollback instructions
