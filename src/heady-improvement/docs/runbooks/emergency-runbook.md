# Emergency — Runbook

---

## Scenario: Full System Down

### Priority Order (restore in sequence)
1. **auth-session-server** — users can't authenticate without it
2. **heady-brain** — core inference must be available
3. **heady-memory / heady-embed** — vector memory for context
4. **api-gateway** — external API access
5. **heady-conductor** — orchestration layer
6. **All other services** — in any order

### Steps
1. Check GCP status: https://status.cloud.google.com/
2. Check Cloudflare status: https://www.cloudflarestatus.com/
3. Verify DNS resolution: `dig headysystems.com`
4. Check Cloud Run: `gcloud run services list --region us-east1`
5. Restart critical services: `gcloud run services update SERVICE --min-instances=2 --region us-east1`

---

## Scenario: Data Loss

### Steps
1. Stop all write operations immediately
2. Identify scope: which tables/namespaces affected
3. Check latest backup: `gcloud sql backups list --instance=heady-db`
4. Point-in-time recovery: `gcloud sql instances clone heady-db heady-db-recovery --point-in-time=TIMESTAMP`
5. Verify recovered data integrity
6. Swap recovered instance if confirmed good
7. Post-incident: document root cause, update backup frequency

---

## Scenario: Security Breach

### Steps
1. **Contain:** Revoke ALL sessions: call auth-session-server /auth/revoke-all
2. **Contain:** Rotate ALL secrets: API keys, database passwords, Firebase service account
3. **Investigate:** Audit structured logs for unauthorized access patterns
4. **Investigate:** Check HMAC request signing logs for invalid signatures
5. **Eradicate:** Patch vulnerability, deploy fix through emergency CI/CD
6. **Recover:** Issue new sessions, notify affected users
7. **Document:** File incident report using template below

### Incident Report Template
```
Incident ID: HEADY-INC-YYYY-NNN
Severity: P1/P2/P3
Timeline: [Detection → Containment → Eradication → Recovery]
Root Cause:
Impact:
Remediation:
Prevention:
```
