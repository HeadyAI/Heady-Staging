# CHANGES

## Scope
This bounded pass focused on production-safe hardening and correctness fixes in the cloned `Heady-pre-production-9f2f0642` repository.

## Code changes made

### Security hardening
- Hardened `src/security/mtls.js` to require a readable CA bundle before enabling strict certificate verification.
- Added an explicit insecure-development override path instead of silently weakening verification.
- Switched outbound mTLS agent socket limits to a Fibonacci-derived default instead of a fixed `50`.
- Improved mTLS logging to use structured logger output rather than console fallbacks.

### Server boot path
- Refactored `src/bootstrap/server-boot.js` to use the shared mTLS factory rather than manually loading key material.
- Removed permissive `rejectUnauthorized: false` behavior from the default HTTPS boot path.
- Added default authentication gating for voice WebSocket upgrades.
- Restricted voice session IDs to a safe path pattern.
- Added bounded session expiry using a Fibonacci-derived TTL.
- Replaced swallowed voice message parsing failures with structured error logging.
- Replaced ANSI banner logging with structured boot metadata.

### Health monitoring
- Updated `src/monitoring/health-monitor.js` to derive health thresholds, intervals, pool sizing, and retry values from canonical phi/fibonacci helpers instead of fixed numbers.
- Replaced silent shutdown and Redis initialization failures with structured warnings.
- Replaced self-healing console errors with structured logger output.

### Repository hygiene
- Updated root `.gitignore` to exclude committed certificate material, private keys, API key manifests, and common secret-bearing artifacts while still allowing explicit public certificate bundles.

### Tests
- Added `tests/security-hardening-pass.test.js` covering:
  - strict mTLS refusal without a CA bundle
  - explicit insecure-development mTLS override
  - Fibonacci-derived health thresholds
  - rejection of unauthenticated voice WebSocket upgrades by default

### Workflow and documentation repairs
- Fixed root `package.json` script references so deploy, health-check, rebuild, and start flows point at files that now exist in the canonical root tree.
- Added `scripts/rebuild_sacred_genesis.py` as a safe shim to the maintained zip builder.
- Added `scripts/deploy-all-sites.sh`, `scripts/deploy-cloud-run.sh`, and `scripts/health-check-all.sh` wrapper scripts for root-level workflow compatibility.
- Replaced placeholder `scripts/smoke-test.mjs` with a delegating entry point to the structured smoke suite.
- Rewrote `scripts/validate-no-localhost.mjs` into a valid executable validator.
- Added `scripts/setup-dev.sh` for local developer bootstrap.
- Added `ERROR_CODES.md`.
- Added service runbooks in `docs/runbooks/` for `heady-manager`, `heady-auth`, `heady-memory`, and `heady-web`.
- Replaced the empty `.agents/skills/heady-auto-flow/SKILL.md` with a complete skill definition.
- Updated `README.md` activation guidance to use the repaired setup and operational assets.

## Additional canonical-tree repairs
- Corrected `scripts/validate-no-localhost.mjs` so it resolves the repo root correctly and validates only the intended deployable surfaces.
- Tightened the localhost validator scope to ignore archival, local-only, installer, compose, and documentation surfaces while still checking active code/config surfaces.
- Repaired additional active defaults away from localhost-style addresses in:
  - `services/auto-success-engine/src/index.ts`
  - `services/hcfullpipeline-executor/src/index.ts`
  - `services/heady-midi/src/client/hooks/useMidiWebSocket.js`
  - `services/heady-projection/src/server.js`
  - `services/heady-projection/index.js`
  - `services/heady-task-browser/src/index.js`
  - `services/heady-cache/config.js`
  - `services/heady-vector/config.js`
  - `services/heady-infer/config.js`
  - `services/heady-infer/server.js`
  - `services/heady-infer/package.json`
  - `services/heady-onboarding/next.config.js`
  - `services/heady-web/src/services/domain-router.js`
  - `services/heady-web/webpack.config.js`
  - `services/api-gateway.js`
  - `services/silicon_bridge/server.py`
  - `packages/shared/src/config.mjs`
  - `configs/nginx/mtls.conf`
  - `configs/nginx/nginx-mtls.conf`
  - `configs/observability/slo-latency.yaml`
- Shifted several server startup and error paths from ad hoc console output to structured JSON logging.
- Added `HEADY_NEXT_ACTIONS.md` to tell the platform exactly what to do next where this bounded pass could not safely finish autonomously.

## Batch 3 — Production hardening (CORS, structured logging, silent failures, placeholders)

### Permissive CORS elimination
- Replaced wildcard `cors()` in `services/api-gateway.js` with env-driven `HEADY_CORS_ORIGINS` allowlist and credential support.
- Replaced `Access-Control-Allow-Origin: *` in `src/routes/sse-streaming.js` with env-driven origin validation.
- Replaced `Access-Control-Allow-Origin: *` in `src/runtime/compute-dashboard.js` SSE endpoint with env-driven origin validation.
- Replaced `Access-Control-Allow-Origin: *` in `workers/mcp-transport/src/index.ts` (Cloudflare Worker) with a static allowlist and `Vary: Origin`.
- Replaced `Access-Control-Allow-Origin: *` in `src/projection/projection-sse.js` with env-driven origin validation.
- Replaced `Access-Control-Allow-Origin: *` in `src/mcp/mcp-transport.js` SSE handler with env-driven origin validation.

### Structured logging
- Replaced all `console.log` / `console.error` calls in `services/api-gateway.js` with `structuredLog()` / `structuredError()` helpers writing JSON to stdout/stderr.
- Replaced ANSI box-drawing banner in api-gateway startup with a single structured JSON boot event.
- Replaced `console.warn` in `src/middleware/security/cors-policy.js` and `src/middleware/cors-policy.js` with `process.stderr.write` structured JSON output.

### Silent failure path remediation
- Added `routing_error` event emission to two swallowed catches in `src/services/heady-infer/router.js` (custom rule evaluation and budget downgrade).
- Added `callback_error` structured logging to three swallowed catches in `src/src/resilience/self-healer.js` (onStateChange, onQuarantine, onRestore callbacks).
- Added `audit_write_failed` structured warning to `src/projection/conductor-integration.js` audit helper.
- Added `conductor_group_weight_inject_failed` structured warning to conductor group weight injection.
- Added `sse_initial_sync_failed` and `sse_close_failed` structured warnings to two catches in `src/projection/projection-sse.js`.

### Placeholder endpoint hardening
- Changed `services/heady-brain/src/routes/chat.ts` from returning fake echo data (200) to returning 501 Not Implemented with structured warning log.
- Changed `services/heady-brain/src/routes/analyze.ts` from returning fake analysis data (200) to returning 501 Not Implemented with structured warning log.

### Tests
- Added `tests/production-hardening-batch3.test.js` with 13 tests covering all batch 3 changes.

## Batch 4 — Silent failures, structured logging, CORS deep sweep, placeholder hardening, operator docs

### Silent catch block remediation (8 files)
- Added `swarm_subscriber_error` structured logging to swallowed subscriber catch in `swarm-coordinator.js`.
- Added `cache_warm_entry_failed` structured logging to swallowed catch in `src/services/heady-infer/response-cache.js`.
- Added `openai_stream_parse_error` to `src/services/heady-infer/providers/openai.js`.
- Added `local_stream_parse_error` to `src/services/heady-infer/providers/local.js`.
- Added `groq_stream_parse_error` to `src/services/heady-infer/providers/groq.js`.
- Added `google_stream_parse_error` to `src/services/heady-infer/providers/google.js`.
- Added `swarm_audit_dir_failed` to `src/projection/projection-swarm.js`.
- Added `cloud_conductor_audit_write_failed` to `src/projection/cloud-conductor-integration.js`.

### Structured logging migration
- Replaced all `console.log`/`console.error` in `services/heady-vector/server.js` with `structuredLog()`/`structuredError()` helpers writing JSON to stdout/stderr.
- Replaced ANSI-style request logging with structured JSON events.
- Also tightened `heady-vector` CORS from `origin: '*'` fallback to env-driven `HEADY_CORS_ORIGINS` with `credentials: true`.

### Permissive CORS elimination (deep sweep — 8 additional endpoints/configs)
- Replaced `Access-Control-Allow-Origin: *` in `src/mcp/colab-mcp-bridge.js` (SSE, jsonRes, and OPTIONS preflight) with env-driven `HEADY_CORS_ORIGINS` allowlist and `Vary: Origin`.
- Replaced all four `Access-Control-Allow-Origin: *` instances in `src/bootstrap/service-routes.js` with env-driven origins.
- Replaced `Access-Control-Allow-Origin: *` in `src/core/dynamic-site-server.js` with env-driven origin validation and `Vary: Origin`.
- Replaced `Access-Control-Allow-Origin: *` in `src/auth/auth-page-server.js` with env-driven origin validation and `Vary: Origin`.
- Replaced `Access-Control-Allow-Origin: *` in `src/edge/edge-worker.js` `_corsResponse()` with static domain allowlist and `Vary: Origin`.
- Removed hardcoded `Access-Control-Allow-Origin: *` from `src/edge/domain-router.js` headyapi config headers.
- Replaced three `origins: ['*']` entries in `src/config/domain-registry.js` (headyapi, headymcp, headyio) with explicit Heady domain lists.
- Replaced `Access-Control-Allow-Origin: *` in `src/integrations/sdk-services.js` SSE endpoint with env-driven origins.

### Placeholder hardening
- Changed `services/heady-health/resilience/respawn-controller.js` `restartService()` from silently returning `true` to returning `false` with a structured warning that no restart mechanism is wired.
- Changed `services/heady-health/resilience/quarantine-manager.js` `quarantine()` to log a structured warning that isolation is not yet wired to the MCP router or load balancer.

### Operator documentation
- Added `docs/runbooks/public-domain-health.md` documenting the Cloudflare 522 condition observed across all public Heady domains, with triage steps, recovery guidance, and interpretation notes.

### Tests
- Added `tests/production-hardening-batch4.test.js` with 22 tests covering all batch 4 changes.

## Batch 5 — CORS fallback, silent failures, structured logging, auth placeholder hardening

### CORS wildcard fallback elimination
- Fixed conditional wildcard fallback `(origin || '*')` in `src/core/heady-api-gateway-v2.js` CORS middleware to use `(origin || 'null')`, preventing wildcard `Access-Control-Allow-Origin` for requests without an `Origin` header.

### Silent failure path remediation (14 catches across 5 files)
- Added `optional_dep_missing` structured logging to 4 lazy-singleton getters in `src/core/heady-api-gateway-v2.js` (mesh, obs, cfg, bus).
- Added debug/warn logging to 6 silent catches in `src/services/heady-auto-context.js` (VectorMemory import, cosineSimilarity import, per-dir watcher, fs.watch outer, _gatherPriorPatterns, _gatherDomainContext).
- Added structured event logging to 4 silent catches in `bin/heady-cli.js` (AutoContext load, domain registry read, history load, history save).
- Added `cli_credential_load_failed` structured logging to silent catch in `bin/cli-auth.js` (loadCredentials).
- Added debug log for conductor heartbeat failure in `services/heady-projection/index.js`.

### Structured logging migration (2 services)
- Replaced all `console.log`/`console.error` in `src/core/heady-api-gateway-v2.js` entrypoint with structured JSON events (`gateway_v2_started`, `gateway_v2_shutdown`, `gateway_v2_fatal`).
- Replaced all 8 `console.log`/`console.warn`/`console.error` calls in `services/heady-web/template-engine/site-router.js` with `structuredLog()`/`structuredWarn()`/`structuredError()` helpers writing JSON to stdout/stderr.

### Placeholder hardening — onboarding auth callback
- Added `HEADY_REQUIRE_FIREBASE_ADMIN` environment gate to `services/heady-onboarding/src/app/api/auth/callback/route.ts` — returns 501 with structured warning when server-side token verification is required but firebase-admin is not wired.
- Added `lookup_user_failed` structured logging to the previously-silent `lookupUser()` catch.

### Tests
- Added `tests/production-hardening-batch5.test.js` with 28 tests covering all batch 5 changes.

## Batch 6 — Remaining wildcard CORS cleanup, shared middleware deduplication, vector federation logging

### Structured logging migration
- Replaced remaining `console.warn` calls in `services/heady-web/src/vector-federation.js` with `structuredWarn()` JSON stderr events (`vector_replication_push_failed`, `vector_gossip_cycle_failed`, `vector_gossip_pull_failed`, `vector_federated_search_peer_failed`).
- Added visibility when federated peer search fails instead of silently marking peers inactive.

### Wildcard CORS elimination
- Replaced `Access-Control-Allow-Origin "*"` in `apps/headyweb/nginx.conf` with first-party origin reflection plus `Vary: Origin`.
- Replaced wildcard dev-server CORS headers in `apps/headyweb/webpack.config.js`, root `webpack.config.js`, and `templates/template-heady-ui/webpack.config.js` with env-driven `HEADY_DEV_ALLOWED_ORIGIN` values.
- Removed wildcard public-route behavior in `src/middleware/cors-policy.js` by validating and reflecting allowed origins for `allowAll` and `publicCors()` paths instead of emitting `*`.

### Middleware consistency
- Replaced duplicate implementation in `src/middleware/security/cors-policy.js` with a direct re-export of `src/middleware/cors-policy.js`, making the shared CORS policy canonical and preventing future drift.

### Tests
- Added `tests/production-hardening-batch6.test.js` with 7 tests covering vector-federation logging, nginx/webpack CORS cleanup, and shared middleware deduplication.
- Updated `tests/production-hardening-batch3.test.js` so the security-path CORS middleware assertion matches the new canonical re-export pattern.

## Batch 7 — health probe hardening and live-site evidence reconciliation

### Structured logging and phi/fibonacci timing
- Replaced all CLI/service `console.log` and `console.error` paths in `services/heady-health/probe-orchestrator.js` with the shared structured logger from `src/services/structured-logger.js`.
- Added explicit structured lifecycle events for sweep start, per-domain start, per-probe result, summary, CLI completion, CLI failure, and CLI usage output.
- Replaced round-number probe intervals with fibonacci-derived defaults:
  - ping: `fib(6) * 1000`
  - functional: `fib(9) * 1000`
  - e2e: `fib(13) * 1000`
  - visual: `fib(15) * 1000`
  - sweep: `fib(19) * 1000`
- Replaced fixed HTTP helper timeouts with fibonacci-derived defaults and explicit timeout handling for GET/header requests.
- Exported the new default interval/timeout constants for reuse and testability.

### Tests
- Added `tests/production-hardening-batch7.test.js` with 4 focused assertions covering logger usage, fibonacci-derived timing, lifecycle event emission, and bounded timeout handling.

### Documentation and operator guidance
- Updated `LIVE_SITE_AUDIT_NOTES.md` to preserve the conflict between the earlier browser-visible Cloudflare 522 audit and the latest browser-visible reachable/redirecting audit.
- Updated `HEADY_NEXT_ACTIONS.md` to treat public-domain uptime as unresolved until revalidated and to classify the current `docker-compose.yml` as a bounded local stack rather than proof of all-50-service coverage.

## Verification performed
- Ran: `npx jest tests/production-hardening-batch7.test.js --runInBand` — **4 tests passed**.
- Ran: `npx jest tests/production-hardening-batch6.test.js --runInBand` — **7 tests passed**.
- Ran: `npx jest tests/production-hardening-batch5.test.js --runInBand` — **28 tests passed** (no regression).
- Ran: `npx jest tests/production-hardening-batch4.test.js --runInBand` — **22 tests passed** (no regression).
- Ran: `npx jest tests/production-hardening-batch3.test.js --runInBand` — **13 tests passed** (no regression).
- Ran: `npx jest tests/security-hardening-pass.test.js --runInBand` — **4 tests passed** (no regression).
- Ran: `node ./scripts/validate-no-localhost.mjs` — **passed**.
- Previous verification results still valid:
  - `node ./scripts/generate-service-manifests.mjs` — wrote `artifacts/service-manifests.json`.
  - `node ./scripts/smoke-test.mjs` — structurally valid, but runtime blocked until `SMOKE_BASE_URL` points to a reachable gateway.

## Batch 8 — Routing, docs discoverability, and domain mapping consistency

### Domain routing consistency
- Added 5 missing audited domains to `services/heady-web/src/services/domain-router.js`: `headyos.com`, `headyconnection.com`, `headyfinance.com`, `headyex.com`, `admin.headysystems.com`.
- Added 7 missing entries to `services/heady-web/src/services/ui-registry.js`: `headyos.com`, `www.headyos.com`, `headyconnection.com`, `www.headyconnection.com`, `headyfinance.com`, `www.headyfinance.com`, `headyex.com`, `www.headyex.com`, `admin.headysystems.com`.
- Added 4 missing domains to `src/config/domain-registry.js`: `headyos.com`, `headyfinance.com`, `headyex.com`; added `headyconnection.com` and `www.headyconnection.com` as aliases under `headyconnection.org`.
- Fixed `services/heady-web/template-engine/vertical-registry.json`:
  - Corrected `headysystems` config_path from `headyme/config.json` to `headysystems/config.json`.
  - Swapped `headyconnection` canonical domain from `.com` to `.org` (matching browser audit) and moved `.com` to aliases.
  - Added `admin.headysystems.com` to headysystems aliases.

### Fallback behavior improvement
- Added structured warning (`vertical_default_fallback`) to `services/heady-web/template-engine/site-router.js` when falling back to the default vertical, making silent HeadyMe alias behavior visible in logs.

### Docs discoverability
- Updated `docs/README.md` with a domain routing table, routing config file index, runbook links, and quick reference cross-link.

### Tests
- Added `tests/routing-docs-auth-pass.test.js` with targeted assertions covering:
  - All 8 audited domains resolve correctly in domain-router.js
  - All 8 audited domains have UI entries in ui-registry.js
  - vertical-registry.json structural consistency (headysystems config_path, headyconnection canonical domain, unique vertical IDs)
  - All audited domains are registered in domain-registry.js
  - Default fallback warning is emitted for unknown domains but not for known ones
  - Key doc files exist and docs/README.md contains domain routing section
