# GAPS_FOUND.md — Heady™ Production Audit

**Audited:** 2026-03-09 · **Auditor:** Autonomous Improvement Agent

## 🔴 Critical Gaps

### DNS / Domain Configuration

- **0/11 public domains resolve** — headyme.com, headysystems.com, headybuddy.org, headymcp.com, headyio.com, headyconnection.org, headyapi.com, headyos.com, headyweb.com (404), headybot.com, headycloud.com
- **All subdomain CNAME/A records missing** — manager.headysystems.com, api.headysystems.com, conductor.headysystems.com, etc.
- **Root cause:** DNS zones not configured to point to Cloud Run service URLs

### CORS Security (FIXED)

- **14 instances** of `Access-Control-Allow-Origin: '*'` across 9 source files
- Files: cors-policy.js (×2), edge-worker.js, projection-sse.js, mcp-transport.js, auth-page-server.js, dynamic-site-server.js, domain-registry.js, domain-router.js, colab-mcp-bridge.js (×3), heady-api-gateway-v2.js
- **Status:** ✅ Fixed — replaced with origin-whitelisted CORS

### localStorage Token Storage (FIXED)

- `template-bee.js`: auth sessions stored in localStorage
- `generate-verticals.js`: auth tokens, device IDs, WARP flags stored in localStorage
- **Status:** ✅ Fixed — migrated to sessionStorage + httpOnly cookie pattern

## 🟡 Medium Gaps

### Build System

- **Turbo workspace conflict** — `services/heady-web` and `apps/headyweb` both named `heady-web-portal`
- **Status:** ✅ Fixed — renamed `services/heady-web` to `@heady/heady-web-shell`

### Infrastructure References

- **Render.com references** across 9 config files (registries, cloud-layers, prompt library, pipeline)
- **Status:** ✅ Fixed — replaced with Cloud Run + Cloudflare + Vertex AI + AI Studio as liquid nodes

### OAuth2 Integration

- `auth-manager.js` `handleOAuth2Callback` is a stub (TODO at line 330)
- Uses `auth.example.com` placeholder URL instead of real OIDC provider

### Model Routing

- Model router referenced deprecated model names (claude-3.5-sonnet, gpt-4o-mini)
- **Status:** ✅ Fixed — updated to Gemini 2.5 Pro (Vertex AI) as primary across all layers

## 🟢 Minor Gaps

### Documentation

- No ADR (Architecture Decision Record) documents
- Test suite blocked by Turbo conflict (Wave 1 fix should resolve)
- Cloud Run logs inaccessible (CI service account missing `logging.logEntries.list`)
- `generate-verticals.js` login handler references `logger` which may be undefined in browser context

### Code Quality

- 2 TODO comments in production code (bee-factory-v2.js:1036, auth-manager.js:330)
- `console.log` used extensively (~1000+ instances in src/) instead of structured logging
- Several services in `services/` directory lack entry point files (server.js/index.js)
- Found references to "Eric Head", updated to "Eric Haywood" per autonomous improvement prompt.
- Identified multiple `console.log` instances needing upgrade to structured logging.
- `auth-session-server` was missing from `docker-compose.yml`.
- `auth.headysystems.com` static index content wasn't fully initialized.
- Extensively found `console.log` throughout `src/` and `services/` codebases (1000+ instances) without `pino` structured logging. Left as TODO for subsequent iteration since large automated regex string replacement risks syntax errors and destructions across 50 microservices.
- No direct Google Secret Manager integration implemented for environment secrets. Needs HashiCorp Vault or GSM SDK logic added to core orchestrators.
