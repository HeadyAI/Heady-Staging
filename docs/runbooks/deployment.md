# Deployment

## Pre-Deploy
- [ ] Tests pass (`npm test`)
- [ ] Audit clean (`npm audit`)
- [ ] Env valid (`node scripts/validate-env.js`)
- [ ] Changelog updated

## Cloudflare Pages
Auto-deployed on push to `main` via GitHub Actions.

## Cloud Run
Tag a release: `git tag v0.2.0 && git push origin v0.2.0`

## Rollback
Cloudflare: Use dashboard. Cloud Run: `gcloud run services update-traffic heady --to-revisions=PREV=100`
