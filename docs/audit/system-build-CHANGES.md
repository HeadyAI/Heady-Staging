# CHANGES

## Summary

This improvement pass moved the current Heady system build closer to a runnable local stack instead of stopping at generator-only scaffolding.

## Infrastructure and runtime changes

- Added a root `docker-compose.yml` that defines the 50-service local stack plus an OpenTelemetry collector.
- Added `.github/workflows/ci.yml` for repeatable validation on push and pull request.
- Added `.env.example` with canonical domain URLs and collector/admin defaults.
- Added `ops/otel-collector/otel-collector-config.yaml` so local telemetry wiring has a real collector target.

## Root workflow changes

- Expanded the root `package.json` scripts to include `dev`, `build`, `start`, `lint`, `compose:up`, `compose:down`, `health:all`, and `test:ci`.
- Added `scripts/compliance-check.mjs` to fail fast on runtime-critical localhost contamination and banned placeholder/debug patterns.
- Added `scripts/health-check-all.mjs` to verify all indexed service health endpoints after the stack is started.

## Docker and generator changes

- Updated `scripts/gen-services.py` so generated Dockerfiles now install both the shared platform workspace and the target service workspace.
- Updated generated Dockerfiles to execute service code from the workspace path instead of a flattened `src/` copy.
- Replaced Docker healthcheck targets from `localhost` to `0.0.0.0` across the generated service Dockerfiles.

## Platform configuration changes

- Replaced the default Envoy admin URL in `packages/platform/src/config/index.js` with a mesh-style service DNS target.
- Replaced the default OTLP endpoint in `packages/platform/src/otel/index.js` with the collector service DNS target.
- Reworked `packages/platform/envoy/envoy-bootstrap.yaml` to remove `127.0.0.1` references from the admin bind and local service address blocks.
- Updated the Drupal content sync skill local endpoint reference away from `http://localhost`.

## Test coverage changes

- Added `tests/auth-flow.test.js` for auth relay and platform auth coverage.
- Added `tests/infrastructure-artifacts.test.js` for compose, CI, env, and collector artifacts.
- Added `tests/compliance-runtime.test.js` for runtime localhost contamination and root workflow coverage.

## Site, auth, and documentation hardening

- Updated `build-sites.py` so generated site navigation and footer links resolve section aliases consistently across all domains instead of inheriting mismatched legacy anchors from the registry.
- Added placeholder-link resolution for footer items such as About, Careers, Memory, Terms, Privacy, Support, and related entries so generated pages no longer ship with `href="#"` dead ends.
- Added hidden alias anchors to generated sections so legacy registry targets like `#cases`, `#contact`, `#value`, `#dashboard`, and similar labels still land on meaningful content.
- Expanded generated auth config for site pages to include relay path and explicit allowed origins.
- Hardened the shared site runtime in both `packages/web-shared/js/heady-shared.js` and the mirrored site runtime copy to use config-driven auth origins, nonce-bound relay validation, iframe sandboxing, and visible `heady:error` dispatching instead of silent listener failure.
- Updated `docs/platform-build-summary.md` to remove superseded `CLOSED/OPEN/HALF_OPEN` language and replace the `HIGH` example tier with `PASS`.
- Added tests covering shared auth runtime hardening and generated-site placeholder-link removal.

## Header and metadata normalization

- Updated repeated service and platform source headers from `60+ Provisional Patents` to `51 Provisional Patents` to match the founder instruction and current patent count framing across the bundle.
- Re-ran the workspace-wide banned-pattern audit after the header normalization pass to confirm the old patent-count wording no longer remains.

## Validation completed

- Regenerated the service artifacts after updating the Dockerfile generator.
- Removed the stale legacy `services/heady-hot-cold-router/` scaffold that conflicted with the corrected 50-service inventory and still contained outdated Docker patterns.
- Rebuilt the generated sites after the navigation and auth hardening changes.
- Ran the compliance checker successfully.
- Ran the full local test suite successfully.
- Re-ran the full local test suite and compliance checker successfully after the patent-count normalization pass.
- Confirmed Docker and Docker Compose are not installed in this environment, so an actual stack bring-up could not be executed here.
- Confirmed with runtime checks that `docker` and `docker-compose` binaries are unavailable in this environment.
