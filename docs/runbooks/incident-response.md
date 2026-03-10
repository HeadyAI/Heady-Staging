# Runbook: Incident Response

## Severity Levels
| Level | Response Time | Examples |
|-------|--------------|---------|
| P0 — Critical | 15 min | Full outage, data loss, security breach |
| P1 — High | 1 hour | Partial outage, degraded performance |
| P2 — Medium | 4 hours | Non-critical service down, UI issues |
| P3 — Low | 24 hours | Minor bugs, cosmetic issues |

## Steps
1. **Detect** — Monitor alerts via Cloud Logging / dashboard
2. **Acknowledge** — Assign incident owner
3. **Diagnose** — Check Cloud Run logs: `gcloud logging read --project=gen-lang-client-0920560496`
4. **Mitigate** — Roll back if needed: `gcloud run services update-traffic --to-revisions=PREVIOUS`
5. **Resolve** — Deploy fix, verify health endpoints
6. **Postmortem** — Document in `docs/postmortems/YYYY-MM-DD-<title>.md`
