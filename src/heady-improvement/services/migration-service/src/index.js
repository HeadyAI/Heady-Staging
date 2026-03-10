/**
 * @heady/migration-service — Schema Migration Engine
 * 
 * PostgreSQL + pgvector schema migrations with φ-scaled versioning,
 * advisory lock safety, and CSL-gated rollback confidence.
 * 
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { EventEmitter } from 'node:events';
import { PHI, PSI, FIB, phiThreshold, phiBackoff } from '@heady/phi-math-foundation';
import { createLogger } from '@heady/structured-logger';

const logger = createLogger({ service: 'migration-service' });

/** φ-scaled configuration */
const CONFIG = Object.freeze({
  pgConnectionString: process.env.PG_CONNECTION_STRING,
  migrationsDir: process.env.MIGRATIONS_DIR || './migrations',
  lockTimeoutMs: parseInt(process.env.LOCK_TIMEOUT_MS || '6854', 10), // phiBackoff(4)
  maxRetries: FIB[5],                         // 5
  retryBaseMs: 1000,
  advisoryLockId: 0x484541_4459,              // "HEADY" in hex
  rollbackConfidenceThreshold: phiThreshold(3), // ≈0.882 HIGH
  batchSize: FIB[6],                          // 8
});

/**
 * Migration record structure
 */
class MigrationRecord {
  constructor(version, name, checksum, appliedAt = null) {
    this.version = version;
    this.name = name;
    this.checksum = checksum;
    this.appliedAt = appliedAt;
  }
}

/**
 * Compute deterministic checksum for migration content
 */
function computeChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Parse migration filename: "001_create_vectors_table.sql"
 */
function parseMigrationFile(filename) {
  const match = filename.match(/^(\d+)_(.+)\.(sql|js)$/);
  if (!match) return null;
  return {
    version: parseInt(match[1], 10),
    name: match[2],
    extension: match[3],
  };
}

/**
 * MigrationEngine — manages schema evolution
 */
class MigrationEngine extends EventEmitter {
  #pgPool = null;
  #migrationsDir;

  constructor(pgPool, migrationsDir = CONFIG.migrationsDir) {
    super();
    this.#pgPool = pgPool;
    this.#migrationsDir = migrationsDir;
  }

  /**
   * Ensure migration tracking table exists
   */
  async ensureMigrationTable() {
    await this.#pgPool.query(`
      CREATE TABLE IF NOT EXISTS heady_migrations (
        version     INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        checksum    TEXT NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        rolled_back BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    logger.info('Migration table ensured');
  }

  /**
   * Acquire advisory lock with φ-backoff retries
   */
  async acquireLock() {
    for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
      const result = await this.#pgPool.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [CONFIG.advisoryLockId]
      );
      if (result.rows[0].locked) {
        logger.info('Advisory lock acquired');
        return true;
      }
      const delay = phiBackoff(attempt, CONFIG.retryBaseMs, CONFIG.lockTimeoutMs);
      logger.warn('Lock contention, backing off', { attempt, delayMs: delay });
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error('Failed to acquire migration lock after max retries');
  }

  /**
   * Release advisory lock
   */
  async releaseLock() {
    await this.#pgPool.query(
      'SELECT pg_advisory_unlock($1)',
      [CONFIG.advisoryLockId]
    );
    logger.info('Advisory lock released');
  }

  /**
   * Load pending migrations from filesystem
   */
  async loadMigrations() {
    const files = await readdir(this.#migrationsDir);
    const migrations = [];

    for (const file of files.sort()) {
      const parsed = parseMigrationFile(file);
      if (!parsed) continue;

      const content = await readFile(
        join(this.#migrationsDir, file),
        'utf-8'
      );
      const checksum = computeChecksum(content);

      migrations.push({
        ...parsed,
        content,
        checksum,
        filename: file,
      });
    }

    return migrations;
  }

  /**
   * Get applied migration versions
   */
  async getAppliedMigrations() {
    const result = await this.#pgPool.query(
      'SELECT version, name, checksum, applied_at FROM heady_migrations WHERE rolled_back = FALSE ORDER BY version'
    );
    return result.rows;
  }

  /**
   * Detect checksum mismatches (drift detection)
   */
  async detectDrift(migrations) {
    const applied = await this.getAppliedMigrations();
    const drifts = [];

    for (const appliedMig of applied) {
      const localMig = migrations.find(m => m.version === appliedMig.version);
      if (localMig && localMig.checksum !== appliedMig.checksum) {
        drifts.push({
          version: appliedMig.version,
          name: appliedMig.name,
          appliedChecksum: appliedMig.checksum,
          localChecksum: localMig.checksum,
        });
      }
    }

    if (drifts.length > 0) {
      logger.error('Migration drift detected', { drifts });
    }
    return drifts;
  }

  /**
   * Run pending migrations forward
   */
  async migrateUp() {
    await this.ensureMigrationTable();
    await this.acquireLock();

    try {
      const allMigrations = await this.loadMigrations();
      const applied = await this.getAppliedMigrations();
      const appliedVersions = new Set(applied.map(m => m.version));

      const pending = allMigrations.filter(m => !appliedVersions.has(m.version));

      if (pending.length === 0) {
        logger.info('No pending migrations');
        return { applied: 0, total: allMigrations.length };
      }

      // Drift check before proceeding
      const drifts = await this.detectDrift(allMigrations);
      if (drifts.length > 0) {
        throw new Error(`Migration drift detected on ${drifts.length} files. Resolve before migrating.`);
      }

      let appliedCount = 0;

      for (const migration of pending) {
        const client = await this.#pgPool.connect();
        try {
          await client.query('BEGIN');

          if (migration.extension === 'sql') {
            await client.query(migration.content);
          } else if (migration.extension === 'js') {
            // JS migrations export an { up, down } object
            const mod = await import(join(this.#migrationsDir, migration.filename));
            await mod.up(client);
          }

          await client.query(
            'INSERT INTO heady_migrations (version, name, checksum) VALUES ($1, $2, $3)',
            [migration.version, migration.name, migration.checksum]
          );

          await client.query('COMMIT');
          appliedCount++;

          this.emit('migration-applied', {
            version: migration.version,
            name: migration.name,
          });
          logger.info('Migration applied', {
            version: migration.version,
            name: migration.name,
          });
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error('Migration failed, rolled back', {
            version: migration.version,
            error: err.message,
          });
          throw err;
        } finally {
          client.release();
        }
      }

      return { applied: appliedCount, total: allMigrations.length };
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Rollback the most recent N migrations
   */
  async migrateDown(steps = 1) {
    await this.ensureMigrationTable();
    await this.acquireLock();

    try {
      const applied = await this.getAppliedMigrations();
      const allMigrations = await this.loadMigrations();

      const toRollback = applied.slice(-steps).reverse();

      if (toRollback.length === 0) {
        logger.info('No migrations to rollback');
        return { rolledBack: 0 };
      }

      let rolledBackCount = 0;

      for (const target of toRollback) {
        const localMig = allMigrations.find(m => m.version === target.version);
        if (!localMig || localMig.extension !== 'js') {
          logger.warn('No rollback available for SQL-only migration', {
            version: target.version,
          });
          continue;
        }

        const client = await this.#pgPool.connect();
        try {
          await client.query('BEGIN');

          const mod = await import(join(this.#migrationsDir, localMig.filename));
          if (typeof mod.down !== 'function') {
            throw new Error(`Migration ${target.version} has no down() function`);
          }
          await mod.down(client);

          await client.query(
            'UPDATE heady_migrations SET rolled_back = TRUE WHERE version = $1',
            [target.version]
          );

          await client.query('COMMIT');
          rolledBackCount++;

          this.emit('migration-rolledback', {
            version: target.version,
            name: target.name,
          });
          logger.info('Migration rolled back', {
            version: target.version,
            name: target.name,
          });
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error('Rollback failed', {
            version: target.version,
            error: err.message,
          });
          throw err;
        } finally {
          client.release();
        }
      }

      return { rolledBack: rolledBackCount };
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Get migration status report
   */
  async status() {
    await this.ensureMigrationTable();
    const allMigrations = await this.loadMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));
    const drifts = await this.detectDrift(allMigrations);

    return {
      total: allMigrations.length,
      applied: applied.length,
      pending: allMigrations.filter(m => !appliedVersions.has(m.version)).length,
      drifts: drifts.length,
      migrations: allMigrations.map(m => ({
        version: m.version,
        name: m.name,
        status: appliedVersions.has(m.version) ? 'applied' : 'pending',
        drifted: drifts.some(d => d.version === m.version),
      })),
    };
  }
}

/**
 * Built-in migrations for Heady vector infrastructure
 */
const BUILT_IN_MIGRATIONS = [
  {
    version: 1,
    name: 'create_pgvector_extension',
    sql: `CREATE EXTENSION IF NOT EXISTS vector;`,
  },
  {
    version: 2,
    name: 'create_heady_vectors_table',
    sql: `
      CREATE TABLE IF NOT EXISTS heady_vectors (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content     TEXT NOT NULL,
        embedding   vector(384),
        metadata    JSONB DEFAULT '{}',
        namespace   TEXT NOT NULL DEFAULT 'default',
        search_vector tsvector,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_vectors_embedding 
        ON heady_vectors USING hnsw (embedding vector_cosine_ops) 
        WITH (m = 21, ef_construction = 144);
      CREATE INDEX IF NOT EXISTS idx_vectors_namespace 
        ON heady_vectors (namespace);
      CREATE INDEX IF NOT EXISTS idx_vectors_search 
        ON heady_vectors USING gin (search_vector);
      CREATE INDEX IF NOT EXISTS idx_vectors_metadata 
        ON heady_vectors USING gin (metadata);
    `,
  },
  {
    version: 3,
    name: 'create_heady_migrations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS heady_migrations (
        version     INTEGER PRIMARY KEY,
        name        TEXT NOT NULL,
        checksum    TEXT NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        rolled_back BOOLEAN NOT NULL DEFAULT FALSE
      );
    `,
  },
  {
    version: 4,
    name: 'create_search_vector_trigger',
    sql: `
      CREATE OR REPLACE FUNCTION heady_update_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_update_search_vector ON heady_vectors;
      CREATE TRIGGER trg_update_search_vector
        BEFORE INSERT OR UPDATE OF content ON heady_vectors
        FOR EACH ROW
        EXECUTE FUNCTION heady_update_search_vector();
    `,
  },
];

export {
  MigrationEngine,
  MigrationRecord,
  computeChecksum,
  parseMigrationFile,
  BUILT_IN_MIGRATIONS,
  CONFIG as MIGRATION_CONFIG,
};
