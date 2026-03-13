# Heady Directive: LFS → DVC Migration + Services Roadmap

**Priority:** High
**Scope:** All HeadyMe organization repos + platform services

---

## Part A: DVC Migration

### Step 1 — Create the bucket
Create a Backblaze B2 bucket in region `us-west-002`, private,
with server-side encryption. Create an application key `heady-dvc-key`
scoped to this bucket with read/write/list/delete capabilities.

### Step 2 — Create the data registry
Create GitHub repo `HeadyMe/heady-data-registry` (private).
Initialize with the files from `registry/`. Configure the DVC remote
with B2 credentials. Push to GitHub.

### Step 3 — Audit all HeadyMe repos for LFS usage
For each of the 13 HeadyMe repos and 7 HeadySystems repos:
- Check for `.gitattributes` containing `filter=lfs`
- Run `git lfs ls-files` to identify tracked large files
- Record file paths, sizes, and types

### Step 4 — Migrate each repo
For each repo with LFS data:
1. Initialize DVC
2. Use `migrate-lfs-path.sh` with the registry clone alongside
3. Verify `dvc pull` retrieves all data correctly
4. Verify all tests and builds pass
5. Push the updated repo

### Step 5 — Set org-level secrets
Set `HEADY_B2_KEY_ID` and `HEADY_B2_APPLICATION_KEY` as org secrets
on HeadyMe GitHub org, visible to all repos.

### Step 6 — Update all CI/CD
Add the DVC pull step to every repo's CI pipeline.

### Step 7 — Update Colab runtimes
Add DVC bootstrap to all Heady Colab notebooks.
Store B2 credentials in Colab Secrets.

### Step 8 — Decommission LFS
Remove all `filter=lfs` lines. Run `git lfs uninstall`.
Reduce GitHub LFS budget to zero.

---

## Part B: Services Roadmap

### Wave 1 (Immediate)
1. **HeadyVault**: Wrap Infisical or Vault for centralized secrets
2. **HeadyBus**: Deploy Apache Pulsar or Redis Streams for async messaging
3. **HeadyGate**: Build AI gateway for model routing, caching, budgets

### Wave 2 (Core Intelligence)
4. **HeadyObserver**: Instrument with OpenTelemetry, build behavioral layer
5. **HeadyKnowledge**: Agentic RAG over all Heady repos/data/skills
6. **HeadyScheduler**: Priority-based workload scheduling across Colab/GPU

### Wave 3 (Operational Maturity)
7. **HeadyFlags**: Feature flag service for safe model/skill rollouts
8. **HeadyIdentity**: Agent IAM with scoped permissions per node
9. **HeadyEval**: Automated evaluation harness for all agents/skills
10. **HeadyRegistry**: Harbor-based artifact/model registry

### Wave 4 (Scale)
11. **HeadyMeter**: Usage metering and cost attribution
12. **HeadyAudit**: Immutable audit logging
13. **HeadyEdge**: Edge inference via Cloudflare Workers AI
14. **HeadyPortal**: Unified developer portal

---

## Ongoing Protocol

For all future large data:
- ALWAYS add to `heady-data-registry` first
- ALWAYS track with `dvc add` and push with `dvc push`
- NEVER commit files >10 MB directly to any code repo
- Consumer repos use `dvc import` to reference registry data
- CI and Colab runtimes use `dvc pull` with env-var credentials
