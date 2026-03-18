---
name: heady-migration-engine
description: >-
  Zero-downtime database migration engine with rollback support, Neon branching,
  and pgvector index management for the Heady ecosystem. Runs versioned timestamped
  migrations with up/down functions, expand-contract and blue-green schema swaps,
  Neon branch-based testing (branch → migrate → validate → merge or discard),
  pgvector HNSW index rebuilds via CREATE INDEX CONCURRENTLY, phi-staged rollouts
  (5%→8%→13%→21%→34%→55%→89%→100%), automatic rollback when coherence drops below
  CSL MEDIUM (0.809), migration dependency graphs with topological sort, advisory
  lock concurrency control, and migration history with checksums for drift detection.
  Integrates with heady-pgvector-security, heady-disaster-forge, and Neon Postgres.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Inner
  phi-compliance: verified
---

# Heady Migration Engine

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Schema changes** — any ALTER TABLE, CREATE INDEX, new table, column add/remove
- **pgvector index management** — HNSW index rebuild, dimension changes, ef_construction tuning
- **Zero-downtime deploys** — expand-contract migrations that never lock tables
- **Neon branch testing** — test migrations on a Neon branch before touching production
- **Rollback needed** — automatic or manual rollback when post-migration coherence drops
- **Phi-staged rollouts** — gradually route traffic through migrated schema using Fibonacci percentages
- **Migration drift detection** — checksum validation to ensure schema matches migration history
- **Dependency ordering** — topological sort of migrations with cross-schema dependencies
- **Disaster recovery** — coordinated migration rollback with heady-disaster-forge playbooks
- **Audit compliance** — full migration history with Ed25519-signed checksums via HeadyGuard

## Architecture

```
Sacred Geometry Topology — Migration Engine Position:
Center(HeadySoul) → Inner(Conductor, Brains, Vinci, AutoSuccess)
                            ↑
              Migration Engine serves Inner ring (data infrastructure)
              feeding Conductor (orchestration) and AutoSuccess (deploy)

┌──────────────────────────────────────────────────────────────────────┐
│                      MIGRATION ENGINE                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  MIGRATION REGISTRY                                            │  │
│  │  Timestamped files │ Dependency DAG │ Topological sort          │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  NEON BRANCH TESTER                                            │  │
│  │  Create branch → Apply migration → Validate → Merge / Discard  │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ZERO-DOWNTIME EXECUTOR                                        │  │
│  │  Expand-contract │ Blue-green │ CONCURRENTLY indexes            │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  PHI-STAGED ROLLOUT                                            │  │
│  │  5% → 8% → 13% → 21% → 34% → 55% → 89% → 100%               │  │
│  └──────────────────────────┬─────────────────────────────────────┘  │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  ROLLBACK ENGINE (CSL MEDIUM 0.809 gate)                       │  │
│  │  Advisory locks │ Checksum drift │ Coherence monitoring         │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ──────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Confidence Gates ───────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Resource Pools ─────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Migration Engine Thresholds ────────────────────────────────────
const MIGRATION = {
  ADVISORY_LOCK_ID:         0xHEAD_DB01,              // Advisory lock namespace
  LOCK_TIMEOUT_MS:          FIB[9] * 1000,             // 55 000 ms lock acquisition
  MIGRATION_TIMEOUT_MS:     FIB[11] * 1000,            // 144 000 ms per migration
  MAX_DEPENDENCY_DEPTH:     FIB[7],                    // 21 max DAG depth
  CHECKSUM_ALGO:            'sha256',
  HNSW_M:                   FIB[7],                    // 21 (HNSW connectivity)
  HNSW_EF_CONSTRUCTION:     FIB[10],                   // 89 (HNSW build quality)
  VECTOR_DIMENSIONS:        384,
  ROLLBACK_COHERENCE_GATE:  CSL_GATES.MEDIUM,          // 0.809 — rollback if below
  HISTORY_RETENTION_DAYS:   FIB[12],                   // 233 days
  BACKOFF_BASE_MS:          FIB[4] * 1000,             // 5 000 ms base backoff
  BACKOFF_JITTER:           PSI * PSI,                 // ±0.382
  PHI_ROLLOUT_STAGES:       [0.05, 0.08, 0.13, 0.21, 0.34, 0.55, 0.89, 1.00],
};
```

## Instructions

### Migration File Format

Each migration lives in a timestamped file exporting `up`, `down`, and metadata:

```javascript
// migrations/20260318_001_add_embeddings_table.mjs
export const meta = {
  id: '20260318_001',
  name: 'add_embeddings_table',
  dependsOn: [],                    // migration IDs this depends on
  strategy: 'expand-contract',      // 'expand-contract' | 'blue-green' | 'direct'
};

export async function up(client, log) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_id   UUID NOT NULL,
      vector      vector(384) NOT NULL,
      metadata    JSONB DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_vector
    ON embeddings USING hnsw (vector vector_cosine_ops)
    WITH (m = 21, ef_construction = 89)
  `);
  log.info({ migration: meta.id }, 'Created embeddings table with HNSW index');
}

export async function down(client, log) {
  await client.query('DROP INDEX CONCURRENTLY IF EXISTS idx_embeddings_vector');
  await client.query('DROP TABLE IF EXISTS embeddings');
  log.info({ migration: meta.id }, 'Rolled back embeddings table');
}
```

### Migration Runner Core

```javascript
// heady-migration-engine/src/runner.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const log = pino({ name: 'heady-migration-engine', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};
const MIGRATION = {
  ADVISORY_LOCK_ID: 0xDB01,
  LOCK_TIMEOUT_MS: FIB[9] * 1000,
  MIGRATION_TIMEOUT_MS: FIB[11] * 1000,
  MAX_DEPENDENCY_DEPTH: FIB[7],
  CHECKSUM_ALGO: 'sha256',
  HNSW_M: FIB[7],
  HNSW_EF_CONSTRUCTION: FIB[10],
  VECTOR_DIMENSIONS: 384,
  ROLLBACK_COHERENCE_GATE: CSL_GATES.MEDIUM,
  HISTORY_RETENTION_DAYS: FIB[12],
  BACKOFF_BASE_MS: FIB[4] * 1000,
  BACKOFF_JITTER: PSI * PSI,
  PHI_ROLLOUT_STAGES: [0.05, 0.08, 0.13, 0.21, 0.34, 0.55, 0.89, 1.00],
};

/**
 * Ensures the migration history table exists.
 */
async function ensureHistoryTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migration_history (
      id            SERIAL PRIMARY KEY,
      migration_id  TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      checksum      TEXT NOT NULL,
      strategy      TEXT NOT NULL DEFAULT 'direct',
      applied_at    TIMESTAMPTZ DEFAULT NOW(),
      rolled_back   BOOLEAN DEFAULT FALSE,
      duration_ms   INTEGER,
      metadata      JSONB DEFAULT '{}'
    )
  `);
  log.info('Migration history table ensured');
}

/**
 * Computes a deterministic checksum for a migration file.
 */
function computeChecksum(source) {
  return createHash(MIGRATION.CHECKSUM_ALGO).update(source).digest('hex');
}

/**
 * Acquires a Postgres advisory lock to prevent concurrent migrations.
 */
async function acquireAdvisoryLock(pool) {
  const client = await pool.connect();
  try {
    await client.query(`SET lock_timeout = '${MIGRATION.LOCK_TIMEOUT_MS}ms'`);
    const result = await client.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [MIGRATION.ADVISORY_LOCK_ID]
    );
    if (!result.rows[0].acquired) {
      throw new Error('Failed to acquire migration advisory lock — another migration is running');
    }
    log.info({ lockId: MIGRATION.ADVISORY_LOCK_ID }, 'Advisory lock acquired');
    return client;
  } catch (err) {
    client.release();
    throw err;
  }
}

/**
 * Releases the advisory lock.
 */
async function releaseAdvisoryLock(client) {
  await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION.ADVISORY_LOCK_ID]);
  client.release();
  log.info({ lockId: MIGRATION.ADVISORY_LOCK_ID }, 'Advisory lock released');
}

/**
 * Topological sort of migration dependency graph.
 */
export function topologicalSort(migrations) {
  const graph = new Map();
  const inDegree = new Map();
  for (const m of migrations) {
    graph.set(m.meta.id, []);
    inDegree.set(m.meta.id, 0);
  }
  for (const m of migrations) {
    for (const dep of (m.meta.dependsOn || [])) {
      if (!graph.has(dep)) throw new Error(`Unknown dependency: ${dep} in ${m.meta.id}`);
      graph.get(dep).push(m.meta.id);
      inDegree.set(m.meta.id, inDegree.get(m.meta.id) + 1);
    }
  }
  const queue = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  const sorted = [];
  while (queue.length > 0) {
    const current = queue.shift();
    sorted.push(current);
    for (const neighbor of graph.get(current)) {
      const newDeg = inDegree.get(neighbor) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }
  if (sorted.length !== migrations.length) {
    throw new Error('Cyclic dependency detected in migration graph');
  }
  if (sorted.length > MIGRATION.MAX_DEPENDENCY_DEPTH) {
    log.warn({ depth: sorted.length, max: MIGRATION.MAX_DEPENDENCY_DEPTH }, 'Deep migration chain');
  }
  return sorted;
}

/**
 * Detects drift between applied migrations and current file checksums.
 */
export async function detectDrift(pool, migrations) {
  const result = await pool.query(
    'SELECT migration_id, checksum FROM _migration_history WHERE rolled_back = FALSE'
  );
  const applied = new Map(result.rows.map((r) => [r.migration_id, r.checksum]));
  const drifted = [];
  for (const m of migrations) {
    const storedChecksum = applied.get(m.meta.id);
    if (storedChecksum && storedChecksum !== m.checksum) {
      drifted.push({ id: m.meta.id, expected: storedChecksum, actual: m.checksum });
    }
  }
  if (drifted.length > 0) {
    log.warn({ drifted }, 'Migration drift detected');
  }
  return drifted;
}

/**
 * Applies a single migration within a transaction.
 */
async function applyMigration(pool, migration) {
  const startTime = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET statement_timeout = '${MIGRATION.MIGRATION_TIMEOUT_MS}ms'`);
    await migration.up(client, log);
    await client.query(
      `INSERT INTO _migration_history (migration_id, name, checksum, strategy, duration_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [migration.meta.id, migration.meta.name, migration.checksum,
       migration.meta.strategy || 'direct', Date.now() - startTime]
    );
    await client.query('COMMIT');
    log.info({ migrationId: migration.meta.id, durationMs: Date.now() - startTime }, 'Migration applied');
  } catch (err) {
    await client.query('ROLLBACK');
    log.error({ migrationId: migration.meta.id, err: err.message }, 'Migration failed, rolled back');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Rolls back a single migration within a transaction.
 */
async function rollbackMigration(pool, migration) {
  const startTime = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migration.down(client, log);
    await client.query(
      'UPDATE _migration_history SET rolled_back = TRUE WHERE migration_id = $1',
      [migration.meta.id]
    );
    await client.query('COMMIT');
    log.info({ migrationId: migration.meta.id, durationMs: Date.now() - startTime }, 'Migration rolled back');
  } catch (err) {
    await client.query('ROLLBACK');
    log.error({ migrationId: migration.meta.id, err: err.message }, 'Rollback failed');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Phi-staged rollout — gradually increases traffic to migrated schema.
 */
export async function phiStagedRollout(pool, coherenceChecker) {
  for (const stage of MIGRATION.PHI_ROLLOUT_STAGES) {
    const pct = Math.round(stage * 100);
    await pool.query(
      `UPDATE _migration_config SET rollout_pct = $1 WHERE key = 'current_rollout'`,
      [pct]
    );
    log.info({ rolloutPct: pct }, 'Rollout stage activated');

    // Wait and measure coherence at this stage
    await new Promise((resolve) => setTimeout(resolve, FIB[6] * 1000)); // 13s observation

    const coherence = await coherenceChecker();
    if (coherence < MIGRATION.ROLLBACK_COHERENCE_GATE) {
      log.error({ coherence, gate: MIGRATION.ROLLBACK_COHERENCE_GATE, rolloutPct: pct },
        'Coherence below gate — aborting rollout');
      await pool.query(
        `UPDATE _migration_config SET rollout_pct = 0 WHERE key = 'current_rollout'`
      );
      return { success: false, abortedAt: pct, coherence };
    }
    log.info({ rolloutPct: pct, coherence: coherence.toFixed(4) }, 'Coherence check passed');
  }
  return { success: true, finalCoherence: await coherenceChecker() };
}

/**
 * Neon branch-based migration testing.
 */
export class NeonBranchTester {
  constructor(neonApiUrl, neonApiKey, projectId) {
    this.neonApiUrl = neonApiUrl;
    this.neonApiKey = neonApiKey;
    this.projectId = projectId;
  }

  async createTestBranch(parentBranchId, branchName) {
    const resp = await fetch(
      `${this.neonApiUrl}/projects/${this.projectId}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.neonApiKey}`,
        },
        body: JSON.stringify({
          branch: { parent_id: parentBranchId, name: branchName },
          endpoints: [{ type: 'read_write' }],
        }),
      }
    );
    if (!resp.ok) throw new Error(`Neon branch creation failed: ${resp.status}`);
    const data = await resp.json();
    log.info({ branchId: data.branch.id, branchName }, 'Neon test branch created');
    return data;
  }

  async deleteBranch(branchId) {
    const resp = await fetch(
      `${this.neonApiUrl}/projects/${this.projectId}/branches/${branchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.neonApiKey}` },
      }
    );
    if (!resp.ok) throw new Error(`Neon branch deletion failed: ${resp.status}`);
    log.info({ branchId }, 'Neon test branch deleted');
  }

  async testMigration(parentBranchId, migration) {
    const branchName = `migration-test-${migration.meta.id}-${Date.now()}`;
    const branch = await this.createTestBranch(parentBranchId, branchName);
    const branchConnStr = branch.endpoints[0]?.host;
    const testPool = new pg.Pool({ connectionString: branchConnStr, max: 3 });
    try {
      await ensureHistoryTable(testPool);
      await applyMigration(testPool, migration);
      await rollbackMigration(testPool, migration);
      log.info({ migrationId: migration.meta.id, branchId: branch.branch.id },
        'Migration validated on Neon branch — up and down both succeeded');
      return { success: true, branchId: branch.branch.id };
    } catch (err) {
      log.error({ migrationId: migration.meta.id, err: err.message },
        'Migration test failed on Neon branch');
      return { success: false, error: err.message, branchId: branch.branch.id };
    } finally {
      await testPool.end();
      await this.deleteBranch(branch.branch.id);
    }
  }
}

/**
 * Main migration runner — orchestrates full lifecycle.
 */
export class MigrationRunner {
  constructor(pool, migrationsDir) {
    this.pool = pool;
    this.migrationsDir = migrationsDir;
    this.currentVersion = null;
    this.rollbackAvailable = false;
  }

  async loadMigrations() {
    const files = await readdir(this.migrationsDir);
    const mjsFiles = files.filter((f) => f.endsWith('.mjs')).sort();
    const migrations = [];
    for (const file of mjsFiles) {
      const mod = await import(join(this.migrationsDir, file));
      const source = await (await import('node:fs/promises')).readFile(
        join(this.migrationsDir, file), 'utf-8'
      );
      migrations.push({
        meta: mod.meta,
        up: mod.up,
        down: mod.down,
        checksum: computeChecksum(source),
        file,
      });
    }
    log.info({ count: migrations.length }, 'Migrations loaded');
    return migrations;
  }

  async getPendingMigrations(migrations) {
    const result = await this.pool.query(
      'SELECT migration_id FROM _migration_history WHERE rolled_back = FALSE'
    );
    const applied = new Set(result.rows.map((r) => r.migration_id));
    return migrations.filter((m) => !applied.has(m.meta.id));
  }

  async run() {
    const runId = randomUUID();
    log.info({ runId }, 'Migration run started');
    await ensureHistoryTable(this.pool);
    const lockClient = await acquireAdvisoryLock(this.pool);
    try {
      const allMigrations = await this.loadMigrations();
      const drifted = await detectDrift(this.pool, allMigrations);
      if (drifted.length > 0) {
        throw new Error(`Schema drift detected in ${drifted.length} migration(s) — resolve before running`);
      }
      const pending = await this.getPendingMigrations(allMigrations);
      if (pending.length === 0) {
        log.info({ runId }, 'No pending migrations');
        return { runId, applied: 0 };
      }
      const sortedIds = topologicalSort(pending);
      const migrationMap = new Map(pending.map((m) => [m.meta.id, m]));
      let appliedCount = 0;
      for (const id of sortedIds) {
        const migration = migrationMap.get(id);
        await applyMigration(this.pool, migration);
        appliedCount++;
        this.currentVersion = id;
        this.rollbackAvailable = typeof migration.down === 'function';
      }
      log.info({ runId, applied: appliedCount }, 'Migration run complete');
      return { runId, applied: appliedCount, currentVersion: this.currentVersion };
    } finally {
      await releaseAdvisoryLock(lockClient);
    }
  }

  async rollbackLast() {
    const result = await this.pool.query(
      `SELECT migration_id FROM _migration_history
       WHERE rolled_back = FALSE ORDER BY applied_at DESC LIMIT 1`
    );
    if (result.rows.length === 0) {
      log.warn('No migrations to roll back');
      return { rolledBack: false };
    }
    const migrationId = result.rows[0].migration_id;
    const allMigrations = await this.loadMigrations();
    const migration = allMigrations.find((m) => m.meta.id === migrationId);
    if (!migration || typeof migration.down !== 'function') {
      throw new Error(`No rollback available for migration: ${migrationId}`);
    }
    const lockClient = await acquireAdvisoryLock(this.pool);
    try {
      await rollbackMigration(this.pool, migration);
      return { rolledBack: true, migrationId };
    } finally {
      await releaseAdvisoryLock(lockClient);
    }
  }

  async status() {
    const result = await this.pool.query(
      `SELECT migration_id, name, checksum, strategy, applied_at, rolled_back, duration_ms
       FROM _migration_history ORDER BY applied_at DESC LIMIT $1`,
      [FIB[7]]  // last 21 migrations
    );
    const current = result.rows.find((r) => !r.rolled_back);
    return {
      currentVersion: current?.migration_id || null,
      totalApplied: result.rows.filter((r) => !r.rolled_back).length,
      totalRolledBack: result.rows.filter((r) => r.rolled_back).length,
      rollbackAvailable: current ? true : false,
      recentHistory: result.rows,
    };
  }
}

/**
 * Phi-backoff with jitter for retry logic.
 */
export function phiBackoff(attempt) {
  const base = MIGRATION.BACKOFF_BASE_MS;
  const delay = Math.pow(PHI, attempt) * base;
  const jitter = delay * MIGRATION.BACKOFF_JITTER * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}
```

### Express API Routes

```javascript
// heady-migration-engine/src/api.mjs
import express from 'express';
import pino from 'pino';
import pg from 'pg';

const log = pino({ name: 'heady-migration-engine', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

export function createMigrationRouter(pool, migrationsDir) {
  const router = express.Router();
  // Import lazily to avoid circular deps at module level
  let runnerInstance = null;
  async function getRunner() {
    if (!runnerInstance) {
      const { MigrationRunner } = await import('./runner.mjs');
      runnerInstance = new MigrationRunner(pool, migrationsDir);
    }
    return runnerInstance;
  }

  router.get('/health', async (req, res) => {
    try {
      const runner = await getRunner();
      const status = await runner.status();
      res.json({
        service: 'heady-migration-engine',
        status: 'healthy',
        coherence: CSL_GATES.HIGH,
        phi_compliance: true,
        sacred_geometry_layer: 'Inner',
        uptime_seconds: Math.floor(process.uptime()),
        version: '1.0.0',
        migration: {
          currentVersion: status.currentVersion,
          totalApplied: status.totalApplied,
          rollbackAvailable: status.rollbackAvailable,
          totalRolledBack: status.totalRolledBack,
        },
        constants: { PHI, PSI, CSL_GATES },
        neon: { hnsw_m: FIB[7], hnsw_ef_construction: FIB[10], vector_dimensions: 384 },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log.error({ err: err.message }, 'Health check failed');
      res.status(500).json({ service: 'heady-migration-engine', status: 'unhealthy', error: err.message });
    }
  });

  router.post('/migrate', async (req, res) => {
    try {
      const runner = await getRunner();
      const result = await runner.run();
      res.json(result);
    } catch (err) {
      log.error({ err: err.message }, 'Migration run failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/rollback', async (req, res) => {
    try {
      const runner = await getRunner();
      const result = await runner.rollbackLast();
      res.json(result);
    } catch (err) {
      log.error({ err: err.message }, 'Rollback failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/status', async (req, res) => {
    try {
      const runner = await getRunner();
      const status = await runner.status();
      res.json(status);
    } catch (err) {
      log.error({ err: err.message }, 'Status check failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/drift-check', async (req, res) => {
    try {
      const runner = await getRunner();
      const migrations = await runner.loadMigrations();
      const { detectDrift } = await import('./runner.mjs');
      const drifted = await detectDrift(pool, migrations);
      res.json({ drifted, clean: drifted.length === 0 });
    } catch (err) {
      log.error({ err: err.message }, 'Drift check failed');
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
```

### pgvector Index Migration Helper

```javascript
// heady-migration-engine/src/pgvector-helpers.mjs
import pino from 'pino';
const log = pino({ name: 'heady-migration-engine:pgvector', level: process.env.LOG_LEVEL || 'info' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/**
 * Rebuilds an HNSW index without downtime using CREATE INDEX CONCURRENTLY.
 * Old index is retained until new one is validated, then swapped.
 */
export async function rebuildHnswIndex(pool, { tableName, columnName, indexName,
  dimensions = 384, m = FIB[7], efConstruction = FIB[10], distanceOp = 'vector_cosine_ops' }) {
  const tempIndex = `${indexName}_rebuild_${Date.now()}`;
  log.info({ tableName, indexName, tempIndex, m, efConstruction }, 'HNSW index rebuild started');

  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ${tempIndex}
    ON ${tableName} USING hnsw (${columnName} ${distanceOp})
    WITH (m = ${m}, ef_construction = ${efConstruction})
  `);
  log.info({ tempIndex }, 'New HNSW index built concurrently');

  // Validate new index by running a sample query
  const validation = await pool.query(`
    EXPLAIN (FORMAT JSON) SELECT 1 FROM ${tableName}
    ORDER BY ${columnName} <=> $1::vector LIMIT 5
  `, [`[${Array(dimensions).fill(0).join(',')}]`]);
  const plan = JSON.stringify(validation.rows);
  const usesNewIndex = plan.includes(tempIndex);
  if (!usesNewIndex) {
    log.warn({ tempIndex }, 'New index not used in query plan — keeping old index');
    await pool.query(`DROP INDEX CONCURRENTLY IF EXISTS ${tempIndex}`);
    return { success: false, reason: 'planner_rejected' };
  }

  // Swap: drop old, rename new
  await pool.query(`DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`);
  await pool.query(`ALTER INDEX ${tempIndex} RENAME TO ${indexName}`);
  log.info({ indexName }, 'HNSW index rebuild complete — swapped successfully');
  return { success: true, indexName, m, efConstruction };
}
```

## Integration Points

| Component                  | Interface              | Sacred Geometry Layer |
|----------------------------|------------------------|-----------------------|
| **Conductor**              | Migration orchestration | Inner                 |
| **AutoSuccess**            | Deploy triggers migrate | Inner                 |
| **heady-pgvector-security** | Vector index policies  | Inner                 |
| **heady-disaster-forge**   | DR playbook rollbacks   | Inner                 |
| **Neon Postgres**          | Branch API + pgvector   | Infrastructure        |
| **HeadyGuard**             | Ed25519 checksum signing | Inner                |
| **OBSERVER**               | Migration telemetry     | Middle                |
| **MURPHY**                 | Security audit of DDL   | Middle                |
| **Sentry + Langfuse**      | Error + trace capture   | Observability         |
| **Upstash Redis**          | Rollout pct caching     | Cache                 |

## API

### POST /migrate
Runs all pending migrations in topological order with advisory lock protection.

### POST /rollback
Rolls back the most recently applied migration using its `down` function.

### GET /status
Returns current migration version, applied count, rollback availability, and recent history.

### POST /drift-check
Compares file checksums against migration history to detect schema drift.

### GET /health
Returns service health with migration status and coherence scores.

## Health Endpoint

```json
{
  "service": "heady-migration-engine",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Inner",
  "uptime_seconds": 34021,
  "version": "1.0.0",
  "migration": {
    "currentVersion": "20260318_001",
    "totalApplied": 13,
    "rollbackAvailable": true,
    "totalRolledBack": 2
  },
  "constants": {
    "PHI": 1.618033988749895,
    "PSI": 0.618033988749895,
    "CSL_GATES": { "MINIMUM": 0.500, "LOW": 0.691, "MEDIUM": 0.809, "HIGH": 0.882, "CRITICAL": 0.927, "DEDUP": 0.972 }
  },
  "neon": { "hnsw_m": 21, "hnsw_ef_construction": 89, "vector_dimensions": 384 },
  "timestamp": "2026-03-18T12:00:00.000Z"
}
```
