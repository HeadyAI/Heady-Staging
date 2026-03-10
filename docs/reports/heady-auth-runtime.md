# Heady auth runtime rebuild

## What changed
- Replaced client-side local session persistence with centralized auth launch behavior in `packages/auth-widget/auth-widget.js`.
- Replaced browser storage in `packages/auto-context/auto-context-bridge.js` with sessionStorage plus in-memory and BroadcastChannel sync.
- Rebuilt `apps/auth/index.html` as a real central login surface that posts to `/api/auth/email` and `/api/auth/anonymous`.
- Added `apps/auth/login.html` so the requested `/login` path now has a concrete file artifact in the bundle.
- Added `services/user-facing/heady-auth/` as the central auth relay service with signed cookie minting and Firebase Identity Toolkit support.
- Replaced the Drupal default-secret fallback with a required environment variable.
- Replaced the shared Consul loopback health registration example with a service-address based health URL.

## Remaining integration work
- OAuth provider callback handlers still need to be wired server-side if Google and GitHub OAuth are required beyond the central launch entrypoints.
- Site-local cookie exchange for fully isolated custom domains still requires the final edge or backend deployment pattern to be chosen.
