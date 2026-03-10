# @heady/migration-service

Schema migration engine for PostgreSQL + pgvector with φ-scaled versioning, advisory lock safety, and CSL-gated rollback confidence.

## Overview

- **Port:** 4020
- **Health:** `GET /health`
- **Purpose:** Manages database schema versions, applies forward migrations, and supports CSL-confidence-gated rollbacks

## Features

- Advisory lock protection (prevents concurrent migrations)
- Checksum verification on every migration file
- φ-scaled retry with backoff on connection failures
- CSL-gated rollback: only rolls back when confidence score exceeds `HIGH ≈ 0.882`
- Built-in pgvector extension setup + HNSW index migration
- Structured JSON logging throughout

## Built-in Migrations

1. **001-init-schema** — Core tables (`heady_sessions`, `heady_events`, `heady_audit_log`)
2. **002-pgvector-setup** — Enable pgvector, create `heady_vectors` table with HNSW indexes
3. **003-search-indexes** — Full-text search with tsvector triggers

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PG_CONNECTION_STRING` | — | PostgreSQL connection string (required) |
| `MIGRATIONS_DIR` | `./migrations` | Directory containing `.sql` migration files |
| `LOCK_TIMEOUT_MS` | `6854` | Advisory lock timeout (φ-backoff level 4) |
| `PORT` | `4020` | Health endpoint port |

## Usage

```bash
docker compose up migration-service
```

© 2026 HeadySystems Inc. — Eric Haywood, Founder
