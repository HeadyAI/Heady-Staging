# Heady™ Auth Session Server — Central Authentication

> Port: 3360 | Domain: auth.headysystems.com
> Author: Eric Haywood <eric@headysystems.com>
> © 2026 HeadySystems Inc. — 51 Provisional Patents

## Overview

Central authentication server for the Heady™ sovereign AI platform. Verifies Firebase ID tokens and issues httpOnly `__Host-heady_session` cookies with fingerprint binding. Supports cross-domain session relay via postMessage iframe.

## φ-Scaled Constants

| Constant | Value | Derivation |
|---|---|---|
| Short session TTL | 29 034s | PHI_TIMING.PHI_7 / 1000 |
| Remember-me TTL | 86 400s | 24h |
| Rate — anonymous | 34 req/min | fib(9) |
| Rate — authenticated | 89 req/min | fib(11) |
| Rate — enterprise | 233 req/min | fib(13) |
| Rate window | 55 000ms | fib(10) × 1000 |
| Fingerprint length | 21 hex | fib(8) |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/session/create` | Create session from Firebase ID token |
| GET | `/validate` | Validate current session |
| POST | `/session/refresh` | Refresh session (CSL-gated: >61.8% consumed) |
| POST | `/session/destroy` | Destroy session |
| GET | `/relay?origin=` | Cross-domain relay iframe |
| GET | `/metrics` | Prometheus metrics |

## Origin Whitelist

headyme.com, headysystems.com, heady-ai.com, headyos.com, headyconnection.org, headyconnection.com, headyex.com, headyfinance.com, admin.headysystems.com

## Quick Start

```bash
cd services/auth-session
npm install
SERVICE_PORT=3360 node index.js
```

## Health Check

```bash
curl http://localhost:3360/health
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SERVICE_PORT` | Listen port | 3360 |
| `SESSION_SECRET` | HMAC signing secret | auto-generated |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase service account path | — |
