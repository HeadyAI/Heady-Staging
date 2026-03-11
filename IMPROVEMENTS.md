# IMPROVEMENTS

**Date:** 2026-03-09 · **Version:** v4.1.0

## Security Hardening

### CORS Wildcard Elimination

- Replaced `Access-Control-Allow-Origin: '*'` with origin-whitelisted CORS across **9 files** (14 instances)
- Created shared `packages/shared/cors-whitelist.js` with approved Heady domain list
- Injected `_isHeadyOrigin()` helper into all affected files for runtime origin validation
- Cloud Run `*.run.app` URLs auto-approved; localhost origins only allowed in development

### localStorage → httpOnly Cookie Migration

- `template-bee.js`: `localStorage.setItem('heady_auth_session',...)` → `sessionStorage` + server-side `fetch('/api/auth/session', {credentials:'include'})`
- `generate-verticals.js`: Full auth flow migrated:
  - `localStorage.setItem(TK, params.get('auth_token'))` → `fetch('/api/auth/set-session', {credentials:'include'})`
  - Token verification via `credentials: 'include'` instead of `Authorization: Bearer` header with client-stored token
  - Device ID stored in `sessionStorage` (tab-scoped) instead of `localStorage` (persistent)
  - Session validity reduced from 365 days to 24 hours

## Infrastructure Modernization

### Render → Cloud Run + Cloudflare Migration

- Purged all Render.com references from **9 config/registry files**
- Replaced `onrender.com` URLs with live Cloud Run service URLs (`bf4q4zywhq-uc.a.run.app`)
- Renamed `render_service` keys to `cloud_run_service` in `cloud-layers.yaml`
- Updated deployment prompt in `heady-prompt-library.json` from Render push to `gcloud run deploy`

### Liquid Node Architecture

Added 4 liquid nodes to `cloud-layers.yaml`:

1. **Vertex AI** — `us-central1-aiplatform.googleapis.com/v1` (gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash)
2. **AI Studio** — `generativelanguage.googleapis.com/v1beta` (gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash-lite)
3. **Cloud Run** — `run.googleapis.com/v2` (project: gen-lang-client-0920560496)
4. **Cloudflare** — Workers, Pages, KV, D1, R2 (account: 8b1fa38f282c691423c6399247d53323)

### Model Routing Upgrade

- Primary model across all layers: **Gemini 2.5 Pro** (Vertex AI)
- Fallbacks: Claude Sonnet 4 (code), GPT-4o (research), Ollama (privacy/cost)
- Cost-sensitive: **Gemini 2.0 Flash Lite** (AI Studio free tier)
- Voice: **Gemini 2.5 Flash** (low latency via Vertex AI)

## Build System Fixes

### Turbo Workspace Collision Resolution

- `services/heady-web/package.json`: renamed from `heady-web-portal` to `@heady/heady-web-shell`
- Resolved duplicate name collision with `apps/headyweb/package.json`
- Unblocks `npm test` / `turbo run test` across the monorepo

## Pipeline Verification

- 21-stage HCFullPipeline: 6/6 tests pass (full run, approval gate, skip stages, validation, status, self-awareness)
- Cloud Run: 7/7 services live and healthy
- MCP Bridge: v2.0.0 with 29 vectors, 384 dimensions, GPU enabled, 4 transports active

### Additional Enhancements
- Migrated core services (`heady-manager.js`, `api-gateway.js`) from unformatted `console.log` output to structured JSON logging using `pino`.
- Updated documentation and presentation layer to correctly refer to founder "Eric Haywood".
