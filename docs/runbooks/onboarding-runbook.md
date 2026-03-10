# Onboarding Runbook

**Service:** onboarding | **Port:** 3365

## Health Check
```bash
curl http://localhost:3365/health
```

## Common Issues

### 1. Step Progress Not Saving
**Symptom:** Users repeat completed steps
**Cause:** Session not linked to onboarding state
**Resolution:**
1. Verify auth cookie is present
2. Check userId in onboarding progress store
3. If in-memory: restart clears progress (use Redis in production)

### 2. UI Not Loading
**Symptom:** Blank page at `/ui/`
**Resolution:**
1. Check static file serving at `services/onboarding/ui/`
2. Verify CSP allows inline styles (`'unsafe-inline'` for onboarding UI)
3. Check browser console for blocked resources
