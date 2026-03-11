import express, { Express, Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { SchedulerEngine } from './scheduler/engine';
import { JobStore } from './scheduler/job-store';
import { JobExecutor } from './scheduler/executor';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

const httpLogger = pinoHttp({ logger });

const PHI: number = 1.618033988749895;

interface JobRequest {
  name: string;
  type: string;
  payload: Record<string, unknown>;
  schedule: {
    type: 'fibonacci' | 'once' | 'manual';
    level?: number;
    timestamp?: number;
  };
  maxRetries?: number;
  timeout?: number;
}

interface JobResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  nextRunAt?: string;
  schedule: Record<string, unknown>;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  database: {
    connected: boolean;
    latencyMs: number;
  };
  scheduler: {
    activeJobs: number;
    totalJobsProcessed: number;
  };
}

class SchedulerService {
  private app: Express;
  private pool: Pool;
  private logger: pino.Logger;
  private schedulerEngine: SchedulerEngine;
  private jobStore: JobStore;
  private jobExecutor: JobExecutor;
  private port: number;
  private isHealthy: boolean = false;
  private totalJobsProcessed: number = 0;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3370', 10);
    this.logger = logger;

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'heady',
      user: process.env.DB_USER || 'heady_user',
      password: process.env.DB_PASSWORD || 'heady_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(dbConfig);

    this.jobStore = new JobStore(this.pool, this.logger);
    this.jobExecutor = new JobExecutor(this.logger);
    this.schedulerEngine = new SchedulerEngine(
      this.jobStore,
      this.jobExecutor,
      PHI,
      this.logger
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeDatabase();
  }

  private setupMiddleware(): void {
    this.app.use(httpLogger);
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(this.errorHandler.bind(this));
  }

  private setupRoutes(): void {
    this.app.post('/api/scheduler/jobs', this.handleCreateJob.bind(this));
    this.app.get('/api/scheduler/jobs', this.handleListJobs.bind(this));
    this.app.delete('/api/scheduler/jobs/:id', this.handleCancelJob.bind(this));
    this.app.post('/api/scheduler/jobs/:id/trigger', this.handleTriggerJob.bind(this));
    this.app.get('/health', this.handleHealth.bind(this));
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query(`
        CREATE TABLE IF NOT EXISTS scheduler_jobs (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(50) NOT NULL,
          schedule JSONB NOT NULL,
          max_retries INTEGER DEFAULT 3,
          timeout_ms INTEGER DEFAULT 30000,
          retry_count INTEGER DEFAULT 0,
          last_run_at TIMESTAMP,
          next_run_at TIMESTAMP,
          last_error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_scheduler_status ON scheduler_jobs (status);
        CREATE INDEX IF NOT EXISTS idx_scheduler_next_run ON scheduler_jobs (next_run_at);
        CREATE INDEX IF NOT EXISTS idx_scheduler_created ON scheduler_jobs (created_at DESC);
      `);

      client.release();
      this.isHealthy = true;

      this.logger.info({ component: 'database' }, 'Database initialized successfully');

      await this.schedulerEngine.start();

      this.logger.info({ component: 'scheduler' }, 'Scheduler engine started');
    } catch (error) {
      this.logger.error({ component: 'database', error }, 'Failed to initialize database');
      this.isHealthy = false;
      setTimeout(() => this.initializeDatabase(), 5000);
    }
  }

  private async handleCreateJob(
    req: Request<any, any, JobRequest>,
    res: Response
  ): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const { name, type, payload, schedule, maxRetries = 3, timeout = 30000 } = req.body;

      if (!name || name.trim().length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Job name is required',
          requestId,
        });
        return;
      }

      if (!type || type.trim().length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Job type is required',
          requestId,
        });
        return;
      }

      if (!schedule || !schedule.type) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Schedule with type is required',
          requestId,
        });
        return;
      }

      const validMaxRetries = Math.max(0, Math.min(maxRetries, 10));
      const validTimeout = Math.max(1000, Math.min(timeout, 600000));

      const jobId = uuidv4();

      const job = await this.jobStore.createJob({
        id: jobId,
        name,
        type,
        payload,
        schedule,
        maxRetries: validMaxRetries,
        timeout: validTimeout,
      });

      await this.schedulerEngine.scheduleJob(jobId, schedule);

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          component: 'scheduler',
          action: 'create_job',
          requestId,
          jobId,
          jobType: type,
          scheduleType: schedule.type,
          durationMs: duration,
        },
        'Job created'
      );

      const response: JobResponse = {
        id: job.id,
        name: job.name,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt?.toISOString() || new Date().toISOString(),
        nextRunAt: job.nextRunAt?.toISOString(),
        schedule: job.schedule,
      };

      res.status(201).json({
        success: true,
        requestId,
        job: response,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error(
        {
          component: 'scheduler',
          action: 'create_job',
          requestId,
          error,
          durationMs: Date.now() - startTime,
        },
        'Failed to create job'
      );
      throw error;
    }
  }

  private async handleListJobs(
    req: Request<any, any, any, { status?: string; limit?: string; offset?: string }>,
    res: Response
  ): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const status = req.query.status as string | undefined;
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const jobs = await this.jobStore.listJobs(status, limit, offset);
      const total = await this.jobStore.countJobs(status);

      const duration = Date.now() - startTime;

      const responses: JobResponse[] = jobs.map((job) => ({
        id: job.id,
        name: job.name,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt?.toISOString() || new Date().toISOString(),
        nextRunAt: job.nextRunAt?.toISOString(),
        schedule: job.schedule,
      }));

      this.logger.info(
        {
          component: 'scheduler',
          action: 'list_jobs',
          requestId,
          jobsCount: jobs.length,
          total,
          status,
          durationMs: duration,
        },
        'Jobs listed'
      );

      res.json({
        success: true,
        requestId,
        jobs: responses,
        count: jobs.length,
        total,
        limit,
        offset,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error(
        { component: 'scheduler', action: 'list_jobs', requestId, error },
        'Failed to list jobs'
      );
      throw error;
    }
  }

  private async handleCancelJob(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Valid job ID is required',
          requestId,
        });
        return;
      }

      const job = await this.jobStore.getJob(id);

      if (!job) {
        res.status(404).json({
          error: 'Not found',
          message: 'Job not found',
          requestId,
        });
        return;
      }

      await this.jobStore.updateJobStatus(id, 'cancelled');
      await this.schedulerEngine.cancelJob(id);

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          component: 'scheduler',
          action: 'cancel_job',
          requestId,
          jobId: id,
          durationMs: duration,
        },
        'Job cancelled'
      );

      res.json({
        success: true,
        requestId,
        message: 'Job cancelled',
        jobId: id,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error(
        { component: 'scheduler', action: 'cancel_job', requestId, error },
        'Failed to cancel job'
      );
      throw error;
    }
  }

  private async handleTriggerJob(
    req: Request<{ id: string }>,
    res: Response
  ): Promise<void> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      const { id } = req.params;

      if (!id || !this.isValidUuid(id)) {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Valid job ID is required',
          requestId,
        });
        return;
      }

      const job = await this.jobStore.getJob(id);

      if (!job) {
        res.status(404).json({
          error: 'Not found',
          message: 'Job not found',
          requestId,
        });
        return;
      }

      const executionId = await this.schedulerEngine.triggerJobNow(id);

      const duration = Date.now() - startTime;

      this.totalJobsProcessed += 1;

      this.logger.info(
        {
          component: 'scheduler',
          action: 'trigger_job',
          requestId,
          jobId: id,
          executionId,
          durationMs: duration,
        },
        'Job triggered'
      );

      res.json({
        success: true,
        requestId,
        message: 'Job triggered',
        jobId: id,
        executionId,
        durationMs: duration,
      });
    } catch (error) {
      this.logger.error(
        { component: 'scheduler', action: 'trigger_job', requestId, error },
        'Failed to trigger job'
      );
      throw error;
    }
  }

  private async handleHealth(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const client = await this.pool.connect();
      const dbStartTime = Date.now();
      await client.query('SELECT 1');
      const dbLatency = Date.now() - dbStartTime;
      client.release();

      const activeJobs = await this.jobStore.countJobs('running');

      const health: HealthStatus = {
        status: this.isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: {
          connected: true,
          latencyMs: dbLatency,
        },
        scheduler: {
          activeJobs,
          totalJobsProcessed: this.totalJobsProcessed,
        },
      };

      const statusCode = this.isHealthy ? 200 : 503;
      res.status(statusCode).json(health);

      this.logger.debug(
        {
          component: 'health',
          statusCode,
          durationMs: Date.now() - startTime,
          dbLatencyMs: dbLatency,
          activeJobs,
        },
        'Health check completed'
      );
    } catch (error) {
      this.logger.error(
        { component: 'health', error, durationMs: Date.now() - startTime },
        'Health check failed'
      );

      const health: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: {
          connected: false,
          latencyMs: Date.now() - startTime,
        },
        scheduler: {
          activeJobs: 0,
          totalJobsProcessed: this.totalJobsProcessed,
        },
      };

      res.status(503).json(health);
    }
  }

  private errorHandler(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    this.logger.error({ component: 'error_handler', error }, 'Unhandled error');

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  public async start(): Promise<void> {
    try {
      this.app.listen(this.port, () => {
        this.logger.info(
          { component: 'server', port: this.port, environment: process.env.NODE_ENV },
          'Scheduler service started'
        );
      });
    } catch (error) {
      this.logger.fatal({ component: 'server', error }, 'Failed to start scheduler service');
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info({ component: 'server' }, 'Shutting down scheduler service');
    await this.schedulerEngine.stop();
    await this.pool.end();
  }
}

const service = new SchedulerService();

process.on('SIGTERM', async () => {
  service.logger.info({ signal: 'SIGTERM' }, 'Received termination signal');
  await service.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  service.logger.info({ signal: 'SIGINT' }, 'Received interrupt signal');
  await service.shutdown();
  process.exit(0);
});

service.start().catch((error) => {
  logger.fatal({ error }, 'Fatal error during startup');
  process.exit(1);
});
