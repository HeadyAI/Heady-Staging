# Runbook: Deployment Rollback

## Symptom
Canary failure (DEPL_9002) or deployment rollback triggered (DEPL_9001).

## Diagnosis
1. Check deployment status in Cloud Build / GitHub Actions
2. Review canary metrics vs baseline
3. Check error rate: `GET /errors/analytics`
4. Check health across all services

## Resolution
### Automatic Rollback
1. System detects canary failure (error rate > phiThreshold(3) ≈ 88.2%)
2. Previous version automatically restored
3. Feature flags for new features rolled back one Fibonacci step
4. Notification sent via notification service

### Manual Rollback
1. Revert to previous Docker image: `gcloud run services update-traffic {service} --to-revisions={prev-revision}=100`
2. Roll back database migrations: `POST /migration/rollback`
3. Reset feature flags: `POST /flags/rollback`
4. Verify health across all services

### Post-Rollback
1. Investigate root cause using CQRS event replay
2. Review deployment diff
3. Update ADR if architecture change needed
4. Re-deploy with fix after validation
