# Domain Router Service

**Port:** 3366 | **Pool:** Hot | **Domain:** router.headysystems.com

## Overview
Verifies and facilitates cross-domain navigation across all 9 Heady domains. Ensures every link is authenticated, CSL-gated, and logged for analytics.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/navigation` | Navigation manifest |
| `GET` | `/domains` | Full domain registry |
| `POST` | `/verify-route` | Verify cross-domain route |
| `POST` | `/auth-handoff` | Initiate authenticated handoff |

## Route Verification
For every cross-domain link, the router:
1. Validates destination against canonical domain registry
2. Calculates CSL routing confidence = min(source CSL, dest CSL)
3. Confirms confidence ≥ CSL_THRESHOLDS.MINIMUM (0.500)
4. Logs the route for analytics

## Auth Handoff
When a user navigates between domains:
1. Router generates one-time relay code via `cross-domain-auth.js`
2. Returns handoff URL pointing to auth.headysystems.com/relay
3. Relay verifies code, sets session cookie, redirects to destination
