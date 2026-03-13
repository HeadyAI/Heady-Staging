# PROMPT 1: Full Production Deployment & Version Unification

## For: Perplexity Computer

## Objective: Deploy every Heady service to Cloud Run/Cloudflare and unify all versions to 3.2.3

---

## INSTRUCTIONS FOR PERPLEXITY COMPUTER

You are working on the Heady™ AI Platform monorepo owned by Heady™Me (github.com/HeadyMe). Your task is to bring the **entire system to full production live status** by deploying all services and unifying all version numbers.

**READ THE ATTACHED CONTEXT FILES FIRST** — especially `00-HEADY-MASTER-CONTEXT.md`, `package.json`, `heady-registry.json`, and `docker-compose.production.yml`.

### TASK 1: Unify All Versions to 3.2.3

Open the GitHub repo `HeadyMe/Heady-pre-production-9f2f0642` and fix every version mismatch:

1. **`heady-registry.json`** — Change `"version": "3.0.1"` to `"3.2.3"` everywhere it appears (services.core.*, services.resilience.*, etc.)
2. **`heady-registry.json`** — Change `"environment": "pre-production"` to `"production"`
3. **`heady-registry.json`** — Change `deployments.cloud-run.region` from `"us-central1"` to `"us-east1"`
4. **`docker-compose.production.yml`** — Change all `${HEADY_VERSION:-v3.2.2}` to `${HEADY_VERSION:-v3.2.3}` and update the header comment from `v3.2.2` to `v3.2.3`
5. **Every `package.json` in `services/*/`** — Ensure version is `3.2.3`
6. **Every `package.json` in `packages/*/`** — Ensure version is `3.2.3`

### TASK 2: Deploy All Cloud Run Services

Using the GCP project `gen-lang-client-0920560496` in region `us-east1`:

```bash
# For each service directory that has a Dockerfile or package.json:
cd services/heady-brain && gcloud run deploy heady-brain --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-conductor && gcloud run deploy heady-conductor --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-mcp && gcloud run deploy heady-mcp --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-buddy && gcloud run deploy heady-buddy --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-infer && gcloud run deploy heady-infer --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-embed && gcloud run deploy heady-embed --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-guard && gcloud run deploy heady-guard --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-health && gcloud run deploy heady-health --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-vector && gcloud run deploy heady-vector --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-projection && gcloud run deploy heady-projection --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-eval && gcloud run deploy heady-eval --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-cache && gcloud run deploy heady-cache --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-security && gcloud run deploy heady-security --source . --region us-east1 --allow-unauthenticated --quiet
cd services/heady-onboarding && gcloud run deploy heady-onboarding --source . --region us-east1 --allow-unauthenticated --quiet
```

### TASK 3: Deploy All Cloudflare Workers

Using Cloudflare Account `8b1fa38f282c691423c6399247d53323`:

```bash
# Deploy all workers from workers/ and cloudflare/ directories
cd workers && npx wrangler deploy
cd cloudflare/heady-edge-node && npx wrangler deploy
cd cloudflare/worker-ai-gateway && npx wrangler deploy
cd cloudflare/worker-heady-router && npx wrangler deploy
cd cloudflare/worker-mcp-telemetry && npx wrangler deploy
```

### TASK 4: Update heady-registry.json Projection Endpoints

After deployment, update the `projections.targets` section with the actual Cloud Run URLs returned from deployment.

### DELIVERABLES

Create a ZIP file named `01-deployment-results.zip` containing:

- `deployment-log.md` — Full log of every deployment command and its result
- `service-urls.json` — Map of every deployed service to its live URL
- `version-audit.json` — Before/after version numbers for every file changed
- Updated `heady-registry.json` with all fixes applied
- Updated `docker-compose.production.yml` with version bump
