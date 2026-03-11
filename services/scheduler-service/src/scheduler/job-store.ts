import { Pool } from 'pg';
import pino from 'pino';

export interface ScheduledJob {
  id: string;
  name: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  schedule: Record<string, unknown>;
  maxRetries: number;
  timeout: number;
  retryCount: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExecutionRecord {
  lastRunAt: Date;
  lastError: string | null;
  retryCount: number;
  status: string;
}

interface JobRow {
  id: string;
  name: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  schedule: Record<string, unknown>;
  max_retries: number;
  timeout_ms: number;
  retry_count: number;
  last_run_at: Date | null;
  next_run_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export class JobStore {
  private pool: Pool;
  private logger: pino.Logger;

  constructor(pool: Pool, logger: pino.Logger) {
    this.pool = pool;
    this.logger = logger;
  }

  public async createJob(job: {
    id: string;
    name: string;
    type: string;
    payload: Record<string, unknown>;
    schedule: Record<string, unknown>;
    maxRetries: number;
    timeout: number;
  }): Promise<ScheduledJob> {
    try {
      const query = `
        INSERT INTO scheduler_jobs (
          id, name, type, payload, status, schedule,
          max_retries, timeout_ms, retry_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
        RETURNING
          id, name, type, payload, status, schedule,
          max_retries, timeout_ms, retry_count,
          last_run_at, next_run_at, last_error,
          created_at, updated_at
      `;

      const result = await this.pool.query(query, [
        job.id,
        job.name,
        job.type,
        JSON.stringify(job.payload),
        'idle',
        JSON.stringify(job.schedule),
        job.maxRetries,
        job.timeout,
      ]);

      const row: JobRow = result.rows[0];

      const createdJob: ScheduledJob = {
        id: row.id,
        name: row.name,
        type: row.type,
        payload: row.payload,
        status: row.status,
        schedule: row.schedule,
        maxRetries: row.max_retries,
        timeout: row.timeout_ms,
        retryCount: row.retry_count,
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      this.logger.debug(
        { component: 'job_store', action: 'create_job', jobId: job.id },
        'Job created'
      );

      return createdJob;
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'create_job', jobId: job.id, error },
        'Failed to create job'
      );

      throw error;
    }
  }

  public async getJob(jobId: string): Promise<ScheduledJob | null> {
    try {
      const query = `
        SELECT
          id, name, type, payload, status, schedule,
          max_retries, timeout_ms, retry_count,
          last_run_at, next_run_at, last_error,
          created_at, updated_at
        FROM scheduler_jobs
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [jobId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row: JobRow = result.rows[0];

      return {
        id: row.id,
        name: row.name,
        type: row.type,
        payload: row.payload,
        status: row.status,
        schedule: row.schedule,
        maxRetries: row.max_retries,
        timeout: row.timeout_ms,
        retryCount: row.retry_count,
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'get_job', jobId, error },
        'Failed to get job'
      );

      throw error;
    }
  }

  public async listJobs(
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ScheduledJob[]> {
    try {
      let query = `
        SELECT
          id, name, type, payload, status, schedule,
          max_retries, timeout_ms, retry_count,
          last_run_at, next_run_at, last_error,
          created_at, updated_at
        FROM scheduler_jobs
      `;

      const params: Array<string | number> = [];

      if (status) {
        query += ` WHERE status = $1`;
        params.push(status);
        query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
        params.push(limit, offset);
      } else {
        query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        params.push(limit, offset);
      }

      const result = await this.pool.query(query, params);

      return result.rows.map((row: JobRow) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        payload: row.payload,
        status: row.status,
        schedule: row.schedule,
        maxRetries: row.max_retries,
        timeout: row.timeout_ms,
        retryCount: row.retry_count,
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'list_jobs', status, limit, offset, error },
        'Failed to list jobs'
      );

      throw error;
    }
  }

  public async countJobs(status?: string): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM scheduler_jobs';
      const params: Array<string> = [];

      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }

      const result = await this.pool.query(query, params);

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'count_jobs', status, error },
        'Failed to count jobs'
      );

      throw error;
    }
  }

  public async updateJobStatus(jobId: string, status: string): Promise<void> {
    try {
      const query = `
        UPDATE scheduler_jobs
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await this.pool.query(query, [status, jobId]);

      this.logger.debug(
        { component: 'job_store', action: 'update_status', jobId, status },
        'Job status updated'
      );
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'update_status', jobId, status, error },
        'Failed to update job status'
      );

      throw error;
    }
  }

  public async recordExecution(jobId: string, execution: ExecutionRecord): Promise<void> {
    try {
      const query = `
        UPDATE scheduler_jobs
        SET
          last_run_at = $1,
          last_error = $2,
          retry_count = $3,
          status = $4,
          next_run_at = CURRENT_TIMESTAMP + INTERVAL '1 second',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `;

      await this.pool.query(query, [
        execution.lastRunAt,
        execution.lastError,
        execution.retryCount,
        execution.status,
        jobId,
      ]);

      this.logger.debug(
        {
          component: 'job_store',
          action: 'record_execution',
          jobId,
          status: execution.status,
          retryCount: execution.retryCount,
          hasError: !!execution.lastError,
        },
        'Job execution recorded'
      );
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'record_execution', jobId, error },
        'Failed to record execution'
      );

      throw error;
    }
  }

  public async deleteJob(jobId: string): Promise<void> {
    try {
      const query = 'DELETE FROM scheduler_jobs WHERE id = $1';
      await this.pool.query(query, [jobId]);

      this.logger.debug(
        { component: 'job_store', action: 'delete_job', jobId },
        'Job deleted'
      );
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'delete_job', jobId, error },
        'Failed to delete job'
      );

      throw error;
    }
  }

  public async getStaleJobs(staleAfterMs: number): Promise<ScheduledJob[]> {
    try {
      const query = `
        SELECT
          id, name, type, payload, status, schedule,
          max_retries, timeout_ms, retry_count,
          last_run_at, next_run_at, last_error,
          created_at, updated_at
        FROM scheduler_jobs
        WHERE
          status != 'completed' AND
          status != 'cancelled' AND
          last_run_at IS NOT NULL AND
          last_run_at < NOW() - INTERVAL '1 millisecond' * $1
        LIMIT 100
      `;

      const result = await this.pool.query(query, [staleAfterMs]);

      return result.rows.map((row: JobRow) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        payload: row.payload,
        status: row.status,
        schedule: row.schedule,
        maxRetries: row.max_retries,
        timeout: row.timeout_ms,
        retryCount: row.retry_count,
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      this.logger.error(
        { component: 'job_store', action: 'get_stale_jobs', staleAfterMs, error },
        'Failed to get stale jobs'
      );

      throw error;
    }
  }
}
