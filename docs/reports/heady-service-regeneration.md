# Heady service regeneration

## What changed
- Replaced generic incomplete service scaffolds across the service tree with operational request handlers that normalize input, enforce CSL gate awareness, and emit structured operational responses.
- Added `services/shared/domain-runtime.js` to provide typed service errors, execution-plan derivation, and dependency mapping.
- Added `services/user-facing/heady-auth` as the central auth relay runtime for signed cookie sessions and Firebase Identity Toolkit calls.
- Removed hardcoded loopback literals from generated runtime, container health checks, and infrastructure examples inside the rebuilt bundle.
- Added Perplexity Computer head attribution to the application HTML files.

## Current state
- Services now expose concrete domain-processing behavior instead of generic incomplete scaffolding markers.
- The auth runtime exists as a dedicated service with cookie signing and allowlisted redirect validation.
- The bundle also includes deployment directives describing what each site and service should do and where it should run.
