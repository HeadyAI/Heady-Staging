# Deployment — Runbook

---

## Symptom: Failed Deploy

### Diagnosis
1. Check CI logs: GitHub Actions → failed step
2. Check Docker build: `docker build -t test .` locally
3. Check Artifact Registry: `gcloud artifacts docker images list us-east1-docker.pkg.dev/gen-lang-client-0920560496/cloud-run-source-deploy/`
4. Check Cloud Run: `gcloud run services describe SERVICE --region us-east1`

### Remediation
1. If build fails → fix source code, re-trigger CI
2. If push fails → check GCP credentials and Artifact Registry permissions
3. If Cloud Run fails → check health probe (must respond 200 within 10s of startup)
4. Rollback: `gcloud run services update-traffic SERVICE --to-revisions=PREVIOUS_REVISION=100 --region us-east1`

---

## Symptom: Canary Failure

### Diagnosis
1. Check canary health: compare error rates between canary and stable
2. Check traffic split: `gcloud run services describe SERVICE --region us-east1 --format='value(status.traffic)'`

### Remediation
1. Immediate rollback: route 100% to previous revision
2. Investigate: check structured logs filtered by revision tag
3. Fix and redeploy through full canary cycle (6.18% → 38.2% → 61.8% → 100%)

---

## Symptom: Database Migration Failure

### Diagnosis
1. Check migration logs
2. Check pgvector extension: `SELECT * FROM pg_extension WHERE extname='vector';`
3. Check connection pool: PgBouncer stats

### Remediation
1. Rollback: apply down migration
2. If extension missing: `CREATE EXTENSION IF NOT EXISTS vector;`
3. If pool exhausted: restart PgBouncer, increase default_pool_size
