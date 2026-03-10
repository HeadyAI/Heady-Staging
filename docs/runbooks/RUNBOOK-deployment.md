# Deployment Runbook

**Author**: Eric Haywood, HeadySystems Inc. | **Version**: 4.0.0

## Pre-Deployment Checklist
1. All tests pass (unit, contract, integration)
2. Security scan clean (`npm audit --production --audit-level=high`)
3. Schema backward compatibility verified
4. Feature flags configured with Fibonacci-stepped rollout
5. Phi-math constants verified (`node scripts/verify-phi-constants.js`)
6. CHANGELOG.md updated

## Cloud Run Deployment
```bash
IMAGE="gcr.io/gen-lang-client-0920560496/<service>:$(git rev-parse --short HEAD)"
docker build -t "${IMAGE}" -f services/<service>/Dockerfile .
docker push "${IMAGE}"
gcloud run deploy <service> --image "${IMAGE}" --region us-east1 --memory 1Gi --cpu 2
```

## Fibonacci-Stepped Rollout
0% -> 5% -> 8% -> 13% -> 21% -> 34% -> 55% -> 89% -> 100%
Minimum soak per step: 21 min (P1), 34 min (P2), 55 min (P3)

## Rollback
```bash
gcloud run revisions list --service <service> --region us-east1
gcloud run services update-traffic <service> --region us-east1 --to-revisions <previous>=100
```
