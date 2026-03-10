# Runbook: Deployment

## Pre-deployment Checklist
- [ ] All tests pass locally
- [ ] CHANGES.md updated
- [ ] No console.log in production paths
- [ ] Health endpoint returns 200

## Cloud Run Deploy (Single Service)
```bash
gcloud run deploy heady-<service> \
  --source services/<service> \
  --region us-central1 \
  --project gen-lang-client-0920560496 \
  --allow-unauthenticated
```

## Full Deploy (CI/CD)
Push to `main` branch → GitHub Actions pipeline triggers → Docker build → Cloud Run deploy

## Rollback
```bash
gcloud run services update-traffic heady-<service> \
  --to-revisions=<previous-revision>=100 \
  --region us-central1
```
