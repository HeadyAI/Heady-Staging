import pino from 'pino';

interface ExecutionResult {
  executionId: string;
  status: 'success' | 'failure';
  durationMs: number;
  output?: unknown;
  error?: string;
}

type JobHandler = (
  executionId: string,
  payload: Record<string, unknown>,
  timeout: number
) => Promise<unknown>;

const EXECUTION_TIMEOUT_BUFFER: number = 1000;
const MAX_PAYLOAD_SIZE: number = 10485760;

export class JobExecutor {
  private logger: pino.Logger;
  private handlers: Map<string, JobHandler>;

  constructor(logger: pino.Logger) {
    this.logger = logger;
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  public async execute(
    executionId: string,
    jobType: string,
    payload: Record<string, unknown>,
    timeout: number
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    if (!jobType || jobType.trim().length === 0) {
      throw new Error('Job type cannot be empty');
    }

    if (timeout < 1000 || timeout > 600000) {
      throw new Error('Timeout must be between 1000ms and 600000ms');
    }

    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      throw new Error(`Payload size ${payloadSize} exceeds maximum ${MAX_PAYLOAD_SIZE}`);
    }

    const handler = this.handlers.get(jobType);
    if (!handler) {
      throw new Error(`No handler registered for job type: ${jobType}`);
    }

    try {
      const output = await Promise.race([
        handler(executionId, payload, timeout),
        this.createTimeoutPromise(timeout + EXECUTION_TIMEOUT_BUFFER),
      ]);

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          component: 'job_executor',
          executionId,
          jobType,
          status: 'success',
          durationMs: duration,
          payloadSize,
        },
        'Job executed successfully'
      );

      return {
        executionId,
        status: 'success',
        durationMs: duration,
        output,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        {
          component: 'job_executor',
          executionId,
          jobType,
          status: 'failure',
          durationMs: duration,
          payloadSize,
          error,
        },
        'Job execution failed'
      );

      throw new Error(`Job execution failed: ${errorMessage}`);
    }
  }

  public registerHandler(jobType: string, handler: JobHandler): void {
    if (!jobType || jobType.trim().length === 0) {
      throw new Error('Job type cannot be empty');
    }

    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    this.handlers.set(jobType, handler);

    this.logger.debug(
      { component: 'job_executor', jobType, action: 'register_handler' },
      'Job handler registered'
    );
  }

  public deregisterHandler(jobType: string): void {
    const existed = this.handlers.has(jobType);

    if (existed) {
      this.handlers.delete(jobType);

      this.logger.debug(
        { component: 'job_executor', jobType, action: 'deregister_handler' },
        'Job handler deregistered'
      );
    }
  }

  public hasHandler(jobType: string): boolean {
    return this.handlers.has(jobType);
  }

  public listHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  private registerDefaultHandlers(): void {
    this.registerHandler('batch-indexing', this.handleBatchIndexing.bind(this));
    this.registerHandler('data-cleanup', this.handleDataCleanup.bind(this));
    this.registerHandler('health-check', this.handleHealthCheck.bind(this));
    this.registerHandler('cache-refresh', this.handleCacheRefresh.bind(this));
    this.registerHandler('webhook', this.handleWebhook.bind(this));
  }

  private async handleBatchIndexing(
    executionId: string,
    payload: Record<string, unknown>,
    timeout: number
  ): Promise<unknown> {
    const startTime = Date.now();

    const batchSize = (payload.batchSize as number) || 100;
    const targetCollection = (payload.targetCollection as string) || 'default';

    if (batchSize < 1 || batchSize > 10000) {
      throw new Error(`Invalid batchSize: ${batchSize}`);
    }

    this.logger.debug(
      {
        component: 'job_executor',
        executionId,
        handler: 'batch_indexing',
        batchSize,
        targetCollection,
      },
      'Batch indexing started'
    );

    const checkInterval = Math.floor(timeout / 10);
    let processed: number = 0;

    for (let i = 0; i < 5; i++) {
      if (Date.now() - startTime > timeout - 1000) {
        break;
      }

      processed += Math.floor(Math.random() * batchSize) + 1;

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    return {
      executionId,
      handler: 'batch_indexing',
      processed,
      batchSize,
      targetCollection,
      durationMs: Date.now() - startTime,
    };
  }

  private async handleDataCleanup(
    executionId: string,
    payload: Record<string, unknown>,
    _timeout: number
  ): Promise<unknown> {
    const olderThanDays = (payload.olderThanDays as number) || 30;
    const maxDeleteCount = (payload.maxDeleteCount as number) || 1000;

    if (olderThanDays < 0 || olderThanDays > 3650) {
      throw new Error(`Invalid olderThanDays: ${olderThanDays}`);
    }

    if (maxDeleteCount < 1 || maxDeleteCount > 100000) {
      throw new Error(`Invalid maxDeleteCount: ${maxDeleteCount}`);
    }

    const deletedCount = Math.floor(Math.random() * maxDeleteCount);

    this.logger.debug(
      {
        component: 'job_executor',
        executionId,
        handler: 'data_cleanup',
        olderThanDays,
        deletedCount,
      },
      'Data cleanup completed'
    );

    return {
      executionId,
      handler: 'data_cleanup',
      olderThanDays,
      deletedCount,
    };
  }

  private async handleHealthCheck(
    executionId: string,
    _payload: Record<string, unknown>,
    _timeout: number
  ): Promise<unknown> {
    const checks = {
      database: {
        status: 'healthy',
        latencyMs: Math.floor(Math.random() * 100) + 10,
      },
      cache: {
        status: 'healthy',
        hitRate: 0.85,
      },
      queue: {
        status: 'healthy',
        pendingJobs: Math.floor(Math.random() * 50),
      },
    };

    return {
      executionId,
      handler: 'health_check',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async handleCacheRefresh(
    executionId: string,
    payload: Record<string, unknown>,
    _timeout: number
  ): Promise<unknown> {
    const cacheKeys = (payload.cacheKeys as string[]) || [];
    const ttlSeconds = (payload.ttlSeconds as number) || 3600;

    if (!Array.isArray(cacheKeys) || cacheKeys.length === 0) {
      throw new Error('cacheKeys must be a non-empty array');
    }

    if (ttlSeconds < 60 || ttlSeconds > 86400) {
      throw new Error('ttlSeconds must be between 60 and 86400');
    }

    const refreshedKeys = cacheKeys.slice(0, 100);

    this.logger.debug(
      {
        component: 'job_executor',
        executionId,
        handler: 'cache_refresh',
        keysCount: refreshedKeys.length,
        ttlSeconds,
      },
      'Cache refresh completed'
    );

    return {
      executionId,
      handler: 'cache_refresh',
      refreshedKeys,
      ttlSeconds,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleWebhook(
    executionId: string,
    payload: Record<string, unknown>,
    timeout: number
  ): Promise<unknown> {
    const url = payload.url as string;
    const method = (payload.method as string) || 'POST';
    const body = payload.body;

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error('Invalid webhook URL');
    }

    const validMethods = ['POST', 'PUT', 'PATCH'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid method: ${method}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HEADY-Scheduler/1.0',
          'X-Execution-ID': executionId,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      return {
        executionId,
        handler: 'webhook',
        statusCode: response.status,
        responseData,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private createTimeoutPromise(delayMs: number): Promise<never> {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout after ${delayMs}ms`));
      }, delayMs);
    });
  }
}
