# Incident Playbook: Authentication Failures Across Domains

**Severity:** CRITICAL
**Impact:** Users cannot sign in. Cross-domain session propagation fails. All authenticated features broken.

## Symptoms

- auth.headysystems.com returns 500 on /api/sessions
- __Host-heady_session cookie not being set
- Relay iframe postMessage not received by target domains
- Firebase Admin SDK throws "invalid credential" errors

## Diagnosis Steps

1. **Check auth-session-server health**

```bash
curl -s https://auth.headysystems.com/health | jq .
```

2. **Verify Firebase service account**

```bash
gcloud iam service-accounts describe firebase-adminsdk@gen-lang-client-0920560496.iam.gserviceaccount.com
```

3. **Test session creation**

```bash
curl -v -X POST https://auth.headysystems.com/api/sessions -H "Content-Type: application/json" -d '{"firebaseIdToken":"TEST"}' 2>&1 | grep -i "set-cookie\|HTTP/"
```

4. **Check relay iframe accessibility**

```bash
curl -s -o /dev/null -w "%{http_code}" https://auth.headysystems.com/relay
```

5. **Verify SSL certificate**

```bash
echo | openssl s_client -connect auth.headysystems.com:443 -servername auth.headysystems.com 2>/dev/null | openssl x509 -noout -dates
```

## Remediation

- If Firebase credential expired: Rotate service account key in Secret Manager, redeploy auth-session-server
- If cookie not set: Verify HTTPS termination, check __Host- prefix requirements (Secure, Path=/, no Domain)
- If relay iframe blocked: Check CSP frame-ancestors directive includes all 9 Heady domains
- If SSL expired: Cloudflare auto-renews certificates, but verify DNS is proxied (orange cloud)
- If all else fails: Force redeploy auth-session-server with fresh image

## Rollback

```bash
gcloud run services update-traffic auth-session-server --to-revisions=PREVIOUS_REVISION=100 --region=us-east1
```

## Post-Incident Review

- [ ] Verify all 9 domains can authenticate end-to-end
- [ ] Check: was secret rotation scheduled but not completed?
- [ ] Review: should we add a secondary auth provider as fallback?
- [ ] Add auth flow to chaos engineering test suite

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
