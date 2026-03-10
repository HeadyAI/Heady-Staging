# search-service debug guide

## Purpose
Hybrid lexical and vector query routing across docs, services, and public pages.

## Health checks
- `/health` verifies the runtime shell, AutoContext middleware, and request handling path.
- `/status` exposes in-memory counters and service metadata.

## Expected inputs
- Domain: `search`
- Port: `8913`
- AutoContext upstream: `http://heady-auto-context:8907`

## Common failure shapes
- AutoContext unreachable: requests continue, but enrichment falls back to an empty context bundle.
- Consul unavailable: service still starts, but discovery registration logs a warning.
- OTel collector unavailable: spans fall back to stdout log records.

## Fast verification
1. Start the service with Node or Compose.
2. Hit `/health` and confirm `status: ok`.
3. Call one domain route and inspect `/status` for counter changes.
