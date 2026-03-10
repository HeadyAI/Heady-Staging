# Heady™ Domain Router Service

**Port:** 3366 | **Domain:** router.headysystems.com

Cross-domain link verification and authenticated session handoff across all 9 Heady domains.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/navigation?domain=<host>` | Navigation manifest for a domain |
| GET | `/domains` | Full domain registry |
| POST | `/verify-route` | Verify cross-domain route |
| POST | `/auth-handoff` | Initiate authenticated cross-domain handoff |

## Architecture

Uses the canonical domain registry from `shared/heady-domains.js` and CSL-gated routing
confidence to verify all cross-domain navigation. Auth handoff generates one-time relay
codes consumed by `auth.headysystems.com/relay`.

© 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
