# AGENTS.md — Mandatory Rules for ALL AI Agents Working on Heady

> **This file is loaded automatically by all IDE AI agents (Antigravity, Windsurf, Cursor, etc.)**
> Any agent that modifies code in this repository MUST follow these rules.

## MANDATORY FIRST STEP

**Before doing ANYTHING, read `HEADY_CONTEXT.md` in the repository root.**

This file contains:

- Live infrastructure URLs (Cloud Run, Cloudflare Workers)
- Monorepo structure and key file locations
- Technology stack and deployment commands
- Sacred rules that must never be violated

If `HEADY_CONTEXT.md` is stale (>24h), run:

```bash
bash .agents/context/context-scan.sh /home/headyme/Heady
```

## SACRED RULES — ZERO TOLERANCE

1. **NO LOCALHOST.** Never serve sites via localhost, local dev server, or tunnels. Everything deploys to Cloud Run or Cloudflare.
2. **NO PLACEHOLDERS.** Every line of code must be real, functional, and connected.
3. **NO ASKING PERMISSION** for obvious fixes. Fix it and report results.
4. **φ-SCALED MATH.** All spacing, sizing, scoring uses golden ratio (1.618).
5. **CSL GATES.** Decisions use continuous confidence scores (0→1), not boolean.
6. **DEPLOY TO CLOUD.** `gcloud run deploy` or Cloudflare API. Period.

## PRE-ACTION CONTEXT CHECK

Before every significant action (file edit, deploy, refactor), verify:

1. ✅ Have I read `HEADY_CONTEXT.md`?
2. ✅ Am I using Cloud Run URLs, not localhost?
3. ✅ Do I know which service owns this code?
4. ✅ Am I using real API endpoints, not mocked ones?
5. ✅ Does my change follow φ-scaled patterns?

## DEPLOYMENT CHECKLIST

Before deploying anything:

1. Read `HEADY_CONTEXT.md` for current live URLs
2. Use `--region us-east1` for Cloud Run
3. Use `--allow-unauthenticated` unless auth is specifically needed
4. For CF Workers, use multipart upload (ES modules require it)
5. After deploy, verify the live URL responds correctly

## KEY CONTEXT

- **GCP Project:** `gen-lang-client-0920560496`
- **CF Account:** `8b1fa38f282c691423c6399247d53323`
- **Onboarding URL:** `https://heady-onboarding-609590223909.us-east1.run.app`
- **IDE URL:** `https://heady-ide-bf4q4zywhq-ue.a.run.app`
- **Version:** 3.2.3
- **Monorepo:** `/home/headyme/Heady/`
