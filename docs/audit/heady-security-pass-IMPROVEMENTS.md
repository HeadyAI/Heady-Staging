# IMPROVEMENTS

## High-value improvements completed
- Enforced stricter mTLS behavior so verified CA material is required for secure mode.
- Added an explicit opt-in path for insecure local development instead of silently weakening transport security.
- Routed boot-time TLS creation through a shared security module for more consistent behavior.
- Added default authentication enforcement for voice WebSocket upgrades.
- Added structured logging for boot events, mTLS state, and voice message parsing errors.
- Replaced several fixed operational constants in the health monitor with phi/fibonacci-derived values.
- Added focused automated tests for the new hardening behavior.
- Improved repository hygiene by ignoring certs, keys, and local API-key manifests at the root.
- Repaired broken root workflow scripts by adding concrete wrappers for site deployment, Cloud Run deployment, health checks, and Sacred Genesis bundle rebuilds.
- Replaced the placeholder `scripts/smoke-test.mjs` with a real delegation path to the structured CI smoke suite.
- Rewrote `scripts/validate-no-localhost.mjs` into a valid executable validator for deployable surfaces.
- Added `scripts/setup-dev.sh` to bootstrap local development with prerequisite checks, dependency install, and container startup.
- Added `ERROR_CODES.md` and four service runbooks under `docs/runbooks/` to strengthen operational documentation.
- Restored `.agents/skills/heady-auto-flow/SKILL.md` with a complete skill definition instead of an empty file.
- Repaired canonical deploy-surface endpoint defaults so active code paths prefer internal service DNS names or production-ready hostnames instead of localhost fallbacks.
- Converted additional gateway, dashboard, and inference logs to structured JSON events.
- Added `HEADY_NEXT_ACTIONS.md` so the remaining blocked work is captured as executable operator guidance rather than left implicit.

## Batch 3 improvements
- Eliminated wildcard CORS from six active service endpoints (api-gateway, SSE streaming, compute dashboard, MCP transport worker, projection SSE, MCP transport node). All now use env-driven `HEADY_CORS_ORIGINS` allowlists or static domain lists with `Vary: Origin`.
- Replaced all `console.log`/`console.error` in the API gateway with structured JSON to stdout/stderr, including replacing the ANSI banner with a machine-parseable boot event.
- Replaced `console.warn` CORS-blocked logging with structured JSON stderr in both cors-policy modules.
- Added error visibility to 10 previously-silent `catch (_) {}` blocks across the infer router, self-healer, conductor integration, and projection SSE — errors now emit events or structured warnings.
- Hardened two placeholder endpoints in heady-brain (chat, analyze) to return 501 instead of fake 200 responses, preventing clients from treating stubs as real service output.
- Added 13 focused tests in `tests/production-hardening-batch3.test.js` covering every change in this batch.

## Batch 4 improvements
- Added error visibility to 8 more previously-silent `catch (_) {}` blocks across swarm-coordinator, response-cache, all four inference providers (openai, local, groq, google), projection-swarm, and cloud-conductor-integration.
- Converted all `console.log`/`console.error` in `services/heady-vector/server.js` to structured JSON via `structuredLog()`/`structuredError()` helpers.
- Eliminated wildcard CORS from 8 additional active endpoints/configs: colab-mcp-bridge (SSE + REST + preflight), service-routes (4 endpoints), dynamic-site-server, auth-page-server, edge-worker, sdk-services SSE, and three domain-registry config entries (headyapi, headymcp, headyio). Also removed hardcoded wildcard from edge/domain-router config.
- Tightened `heady-vector` CORS from `origin: '*'` default to env-driven `HEADY_CORS_ORIGINS` with `credentials: true`.
- Hardened `respawn-controller.js` to return `false` instead of silently pretending restarts succeed when no mechanism is wired.
- Hardened `quarantine-manager.js` to log a structured warning when quarantine isolation can't actually remove services from routing.
- Added `docs/runbooks/public-domain-health.md` documenting the Cloudflare 522 outage condition across all public Heady domains, with triage steps and recovery guidance.
- Added 22 focused tests in `tests/production-hardening-batch4.test.js` covering every change in this batch.
- **Cumulative across all batches**: 39 tests pass, 0 regressions.

## Batch 5 improvements
- Fixed the last active CORS wildcard fallback in the API gateway v2 — `(origin || '*')` → `(origin || 'null')` so requests without an `Origin` header no longer receive `Access-Control-Allow-Origin: *`.
- Added error visibility to 14 more previously-silent `catch` blocks across 5 files: heady-api-gateway-v2.js (4 lazy-singleton getters), heady-auto-context.js (6 catches: imports, watchers, pattern/domain gathering), heady-cli.js (4 catches: AutoContext load, domain registry, history I/O), cli-auth.js (1 catch: credential load), projection/index.js (1 catch: conductor heartbeat).
- Converted all 3 `console.log`/`console.error` calls in `src/core/heady-api-gateway-v2.js` entrypoint to structured JSON events.
- Converted all 8 `console.log`/`console.warn`/`console.error` calls in `services/heady-web/template-engine/site-router.js` to structured JSON via `structuredLog()`/`structuredWarn()`/`structuredError()` helpers.
- Added `HEADY_REQUIRE_FIREBASE_ADMIN` production gate to the onboarding auth callback — returns 501 with structured warning when strict mode is enabled but firebase-admin SDK verification isn't wired, preventing unauthenticated token acceptance in production.
- Added `lookup_user_failed` structured logging to the previously-silent lookupUser catch in the auth callback.
- Added 28 focused tests in `tests/production-hardening-batch5.test.js` covering every change in this batch.
- **Cumulative across all batches**: 67 tests pass (28 + 22 + 13 + 4), 0 regressions.

## Batch 6 improvements
- Replaced the remaining `console.warn` usage in `services/heady-web/src/vector-federation.js` with structured JSON stderr events and added explicit peer-failure telemetry during federated search.
- Eliminated the last active wildcard CORS settings in the web delivery surface: `apps/headyweb/nginx.conf`, `apps/headyweb/webpack.config.js`, root `webpack.config.js`, and `templates/template-heady-ui/webpack.config.js` now use first-party or env-driven origin reflection with `Vary: Origin`.
- Removed wildcard behavior from `src/middleware/cors-policy.js` public paths by validating and reflecting allowed origins for `allowAll` and `publicCors()` flows.
- Deduplicated the shared CORS middleware by making `src/middleware/security/cors-policy.js` a canonical re-export of `src/middleware/cors-policy.js`, reducing future drift risk.
- Added `tests/production-hardening-batch6.test.js` with 7 focused assertions covering the batch 6 web-surface and middleware hardening changes.
- **Cumulative across all batches**: 74 tests pass (7 + 28 + 22 + 13 + 4), 0 regressions.

## Batch 7 improvements
- Migrated `services/heady-health/probe-orchestrator.js` off CLI-style console output and onto the shared structured logger, adding machine-parseable events for sweep lifecycle, per-domain progress, per-probe results, summary, CLI completion, CLI failure, and usage guidance.
- Replaced probe orchestrator round-number cadence defaults with fibonacci-derived values from the canonical phi math helper, reducing another high-visibility pocket of hardcoded operational constants.
- Added bounded timeout handling for all probe HTTP helper paths, including explicit timeout rejection for GET/header requests.
- Added `tests/production-hardening-batch7.test.js` with 4 focused assertions covering the batch 7 hardening changes.
- Updated live-site documentation so the repo now explicitly preserves both the earlier Cloudflare 522 evidence and the newer reachable/redirecting browser evidence instead of overwriting one with the other.
- Updated operator guidance to prevent overclaiming `docker-compose.yml` as all-50-service coverage.
- **Cumulative across all batches**: 78 tests pass (4 + 7 + 28 + 22 + 13 + 4), 0 regressions.

## Batch 8 improvements
- Added 5 missing audited public domains to `domain-router.js` so they resolve to their correct projections instead of returning null or falling through to the default.
- Added 9 missing UI entries to `ui-registry.js` for the audited domains and their www aliases, plus `admin.headysystems.com`.
- Added 4 missing domain definitions (headyos, headyfinance, headyex) and expanded headyconnection aliases in `domain-registry.js`.
- Fixed `vertical-registry.json` headysystems config_path from `headyme/config.json` to `headysystems/config.json`, preventing cross-vertical content bleed.
- Corrected headyconnection canonical/alias direction: `.org` is now canonical (matching browser audit), `.com` is alias.
- Added `admin.headysystems.com` to headysystems aliases across all routing surfaces, fixing the browser-observed headyex navigation path issue.
- Added `vertical_default_fallback` structured warning in site-router.js so silent wrong-vertical serving becomes visible in logs.
- Improved docs/README.md with a domain routing table, routing config file index, operator runbook links, and quick reference cross-link.
- Added `tests/routing-docs-auth-pass.test.js` with targeted assertions covering all 8 audited domains across domain-router, ui-registry, vertical-registry, and domain-registry, plus fallback warning behavior and docs existence.
- **Cumulative across all batches**: 78 + batch 8 tests, 0 regressions.

## Recommended next wave
- Remove committed secrets and private keys from git history and rotate all exposed credentials.
- Select one canonical source tree and archive or delete mirrored duplicates from active build paths.
- Run a repo-wide founder-name correction pass to normalize references to Eric Haywood.
- Add broader tests for boot, auth, health, and WebSocket security flows.
- Add CI security gates that fail builds when `.env`, `certs/`, `*.key`, or known secret patterns are committed.
- Expand the bounded hardening pass into service-by-service workstreams once the canonical source tree is confirmed.
- Continue structured logging migration across remaining active orchestration and health-operation surfaces.
- Reconcile the live public-domain audit conflict with repeated browser-visible checks plus direct origin verification.
- Provide a real reachable smoke target through `SMOKE_BASE_URL` or `HEADY_PUBLIC_BASE_URL` before treating smoke failures as product regressions.
