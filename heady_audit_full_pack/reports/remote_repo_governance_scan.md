# Governance Scan: Directives, Laws, and Pipelines

**Repository:** remote-headyme-main
**Audit date:** 2026-03-10

---

## 1. Directives

Core directive files defining system behavior and operating principles.

| File Path | Purpose |
|---|---|
| `directives/SYSTEM_PRIME_DIRECTIVE.md` | Top-level system prime directive |
| `directives/MASTER_DIRECTIVES.md` | Master set of operational directives |
| `directives/UNBREAKABLE_LAWS.md` | Immutable operating laws |
| `directives/LAW-07-auto-success-engine.md` | Auto-success engine law definition |
| `directives/RECONCILIATION_DECISIONS.md` | Reconciliation and conflict resolution decisions |
| `directives/source/` | Source-of-truth copies of the above directives |

### Animal-Layer Directives (in `directives/`)

| File | Purpose |
|---|---|
| `ANT_TASK_LAYER.md` | Task decomposition and execution layer |
| `BEAVER_BUILD_LAYER.md` | Build and construction layer |
| `DOLPHIN_CREATIVITY_LAYER.md` | Creative output layer |
| `EAGLE_OMNISCIENCE_LAYER.md` | Omniscient awareness/monitoring layer |
| `ELEPHANT_MEMORY_LAYER.md` | Long-term memory layer |
| `OWL_WISDOM_LAYER.md` | Wisdom and decision-making layer |
| `RABBIT_MULTIPLICATION_LAYER.md` | Scaling/replication layer |

### Directives in Other Locations

| File Path | Purpose |
|---|---|
| `heady-cognition/directives/DIR-06-07-08-persona-pipeline-learning.md` | Persona, pipeline, and learning directives |
| `heady-full-rebuild/directives/DIR-06-07-08-persona-pipeline-learning.md` | Same directive (rebuild copy) |
| `docs/MASTER_DIRECTIVES.md` | Documentation copy of master directives |
| `heady-10-10/docs/MASTER_DIRECTIVES.md` | Module-level copy |
| `heady-cognition/prompts/MASTER_DIRECTIVES.md` | Prompt-embedded directives |
| `heady-cognition/prompts/SYSTEM_PRIME_DIRECTIVE.md` | Prompt-embedded prime directive |
| `heady-cognition/prompts/UNBREAKABLE_LAWS.md` | Prompt-embedded laws |
| `docs/deployment/heady-deployment-directives.json` | Deployment-specific directives (JSON) |
| `reports/heady-deployment-directives.json` | Deployment directives report |
| `configs/pipeline/iterative-rebuild-directive.yaml` | Pipeline rebuild directive |

---

## 2. Laws (LAW-01 through LAW-08)

Numbered "laws" governing agent behavior and system operation. Found in multiple locations (canonical set in `heady-cognition/laws/` and `heady-10-10/laws/`).

| Law | Title | Representative Path |
|---|---|---|
| LAW-01 | Thoroughness Over Speed | `heady-cognition/laws/LAW-01-thoroughness-over-speed.md` |
| LAW-02 | Solutions Not Workarounds | `heady-cognition/laws/LAW-02-solutions-not-workarounds.md` |
| LAW-03 | Context Maximization | `heady-cognition/laws/LAW-03-context-maximization.md` |
| LAW-04 | Implementation Completeness | `heady-cognition/laws/LAW-04-implementation-completeness.md` |
| LAW-05 | Cross-Environment Purity | `heady-cognition/laws/LAW-05-cross-environment-purity.md` |
| LAW-06 | Ten-Thousand Bee Scale | `heady-cognition/laws/LAW-06-ten-thousand-bee-scale.md` |
| LAW-07 | Auto-Success Engine | `heady-cognition/laws/LAW-07-auto-success-engine.md` |
| LAW-08 | Arena Mode Default | `heady-cognition/laws/LAW-08-arena-mode-default.md` |

**Copies also in:** `heady-full-rebuild/laws/`, `heady-10-10/laws/`, `archetypes/`, root-level `LAW-07-auto-success-engine.md`.

---

## 3. Pipeline Configuration Files

### Core Pipeline Configs

| File Path | Purpose |
|---|---|
| `hcfullpipeline.json` (root, 54 KB) | Full pipeline definition (JSON) |
| `configs/hcfullpipeline.json` | Pipeline config (configs dir) |
| `configs/hcfullpipeline.yaml` | Pipeline config (YAML variant) |
| `configs/hcfullpipeline-canonical.json` | Canonical pipeline definition |
| `configs/hcfullpipeline-phi.json` | Phi-math variant pipeline config |
| `configs/hcfullpipeline-sovereign.json` | Sovereign pipeline config |
| `configs/hcfullpipeline-bundle.yaml` | Bundled pipeline config |
| `configs/pipeline/pipeline.yaml` | Base pipeline YAML |
| `configs/pipeline/auto-pipeline.yaml` | Auto-pipeline configuration |
| `configs/pipeline/hcfullpipeline-config.yaml` | Full pipeline settings |
| `configs/pipeline/hcfp_website_superiority_pipeline.json` | Website pipeline specialization |

### Pipeline Source Code

| File Path | Purpose |
|---|---|
| `src/pipeline/pipeline-core.js` | Core pipeline execution logic |
| `src/pipeline/pipeline-infra.js` | Pipeline infrastructure layer |
| `src/pipeline/pipeline-handlers.js` | Pipeline event handlers |
| `src/pipeline/pipeline-pools.js` | Pipeline connection pooling |
| `src/pipeline/hc-full-pipeline-v3.js` | Full pipeline v3 implementation |
| `src/orchestration/hc-full-pipeline.js` | Orchestration-level pipeline |
| `src/orchestration/pipeline-orchestrator.js` | Pipeline orchestration coordinator |
| `src/orchestration/pipeline-telemetry.js` | Pipeline telemetry/observability |
| `src/hcfp/pipeline-runner.js` | Pipeline runner entry point |
| `src/bootstrap/pipeline-wiring.js` | Pipeline dependency wiring |
| `src/routes/pipeline-api.js` | Pipeline API routes |
| `python/core/pipeline.py` | Python pipeline core |
| `otel-wrappers/eval-pipeline.traced.js` | OpenTelemetry-traced eval pipeline |
| `services/hcfullpipeline-executor/` | Pipeline executor microservice |
| `packages/hcfullpipeline/` | Pipeline as shared package |

---

## 4. CI/CD Pipelines (GitHub Actions)

| Workflow File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Core CI pipeline |
| `.github/workflows/ci-cd.yaml` | Combined CI/CD pipeline |
| `.github/workflows/ci-bootstrap.yml` | CI bootstrap/setup |
| `.github/workflows/heady-cicd.yml` | Heady-specific CI/CD |
| `.github/workflows/heady-validator.yml` | Heady validation checks |
| `.github/workflows/deploy.yml` | Standard deployment |
| `.github/workflows/deploy-cloud-run.yml` | Google Cloud Run deployment |
| `.github/workflows/deploy-edge.yml` | Edge (Cloudflare) deployment |
| `.github/workflows/deploy-full.yml` | Full-stack deployment |
| `.github/workflows/production-deploy.yml` | Production deployment |
| `.github/workflows/liquid-deploy.yml` | Liquid deployment system |
| `.github/workflows/promote-to-staging.yml` | Staging promotion |
| `.github/workflows/promote-to-main.yml` | Production promotion |
| `.github/workflows/promotion-pipeline.yml` | Promotion pipeline orchestrator |
| `.github/workflows/rollback.yml` | Rollback automation |
| `.github/workflows/pre-deploy-check.yml` | Pre-deployment validation |
| `.github/workflows/quality-gates.yml` | Quality gate checks |
| `.github/workflows/performance-baseline.yml` | Performance regression baseline |
| `.github/workflows/learning-pipeline.yml` | Learning/training pipeline |
| `.github/workflows/pilot-cicd.yml` | Pilot environment CI/CD |
| `.github/workflows/self-healing.yml` | Self-healing automation |

### Security-Focused CI Pipelines

| Workflow File | Purpose |
|---|---|
| `.github/workflows/sast-pipeline.yml` | Static application security testing |
| `.github/workflows/dast-pipeline.yml` | Dynamic application security testing |
| `.github/workflows/container-scan.yml` | Container image scanning |
| `.github/workflows/dependency-check.yml` | Dependency vulnerability check |
| `.github/workflows/dependency-review.yml` | Dependency review on PRs |
| `.github/workflows/secret-scan.yml` | Secret scanning |
| `.github/workflows/secret-scanning.yml` | Secret scanning (alternate) |
| `.github/workflows/security-gate.yml` | Security gate validation |
| `.github/workflows/security-scan.yml` | General security scan |
| `.github/workflows/semgrep-rules.yaml` | Semgrep static analysis rules |
| `ci-pipelines/sast-pipeline.yml` | Standalone SAST pipeline |
| `ci-pipelines/dast-pipeline.yml` | Standalone DAST pipeline |
| `ci-pipelines/container-scan.yml` | Standalone container scan |
| `ci-pipelines/dependency-check.yml` | Standalone dependency check |
| `ci-pipelines/security-gate.yml` | Standalone security gate |
| `ci-pipelines/semgrep-rules.yaml` | Standalone Semgrep rules |

### Infrastructure CI/CD

| File Path | Purpose |
|---|---|
| `cloudbuild.yaml` (root) | Google Cloud Build main config |
| `infra/ci-cd-pipeline.yml` | Infrastructure CI/CD |
| `heady-build/cloudbuild.yaml` | Build module Cloud Build |
| `heady-deploy/cloudbuild.yaml` | Deploy module Cloud Build |
| `deployment/cloudbuild.yaml` | Deployment Cloud Build |
| `deployment/dynamic-sites/cloudbuild-sites.yaml` | Dynamic sites deployment |

---

## 5. Governance & Compliance Files

| File Path | Purpose |
|---|---|
| `.github/CODEOWNERS` | Code ownership assignments |
| `branch-protection/CODEOWNERS` | Branch-level code ownership |
| `SECURITY.md` | Security policy |
| `CONTRIBUTING.md` | Contribution guidelines |
| `AGENTS.md` | Agent operating rules |
| `CLAUDE.md` | Claude Code conventions |
| `configs/governance/mcp-governance.yml` | MCP governance rules |
| `configs/governance-policies.yaml` | Platform governance policies |
| `compliance-templates/` | Compliance documentation templates |
| `branch-protection/SECURITY.md` | Branch protection security policy |
| `credential-rotation/` | Credential rotation automation |
| `heady-mcp-security/` | MCP security hardening |
| `security-middleware/` | Security middleware implementations |
| `renovate.json` | Automated dependency updates |
| `.githooks/` | Git hooks for enforcement |
| `DEPRECATED.md` | Deprecation notices |
