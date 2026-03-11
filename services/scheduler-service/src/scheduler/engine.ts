import pino from 'pino';
import { JobStore, ScheduledJob } from './job-store';
import { JobExecutor } from './executor';
import { v4 as uuidv4 } from 'uuid';

const FIBONACCI_INTERVALS: number[] = [
  1000, 1000, 2000, 3000, 5000, 8000, 13000, 21000, 34000, 55000, 89000, 144000, 233000, 377000,
  610000, 987000, 1597000, 2584000,
];

const PHI: number = 1.618033988749895;
const MIN_INTERVAL: number = 1000;
const MAX_INTERVAL: number = 2592000000;
const CHECK_INTERVAL: number = 5000;

interface ScheduleConfig {
  type: 'fibonacci' | 'once' | 'manual';
  level?: number;
  timestamp?: number;
}

interface JobTimerState {
  jobId: string;
  timerId: NodeJS.Timeout | null;
  nextRunAt: Date;
}

export class SchedulerEngine {
  private jobStore: JobStore;
  private jobExecutor: JobExecutor;
  private logger: pino.Logger;
  private timers: Map<string, JobTimerState>;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private phi: number;

  constructor(jobStore: JobStore, jobExecutor: JobExecutor, phi: number, logger: pino.Logger) {
    this.jobStore = jobStore;
    this.jobExecutor = jobExecutor;
    this.logger = logger;
    this.phi = phi;
    this.timers = new Map();
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn({ component: 'scheduler_engine' }, 'Scheduler engine already running');
      return;
    }

    this.isRunning = true;

    const allJobs = await this.jobStore.listJobs(undefined, 10000, 0);

    for (const job of allJobs) {
      if (job.status !== 'cancelled' && job.status !== 'completed') {
        await this.scheduleJob(job.id, job.schedule);
      }
    }

    this.checkInterval = setInterval(
      () => this.checkAndExecutePendingJobs(),
      CHECK_INTERVAL
    );

    this.logger.info({ component: 'scheduler_engine' }, 'Scheduler engine started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    for (const [jobId, state] of this.timers) {
      if (state.timerId) {
        clearTimeout(state.timerId);
      }
      this.timers.delete(jobId);
    }

    this.logger.info({ component: 'scheduler_engine' }, 'Scheduler engine stopped');
  }

  public async scheduleJob(jobId: string, schedule: ScheduleConfig): Promise<void> {
    const existingState = this.timers.get(jobId);
    if (existingState?.timerId) {
      clearTimeout(existingState.timerId);
    }

    if (schedule.type === 'manual') {
      this.timers.set(jobId, {
        jobId,
        timerId: null,
        nextRunAt: new Date(Date.now() + MAX_INTERVAL),
      });

      this.logger.debug(
        { component: 'scheduler_engine', jobId, scheduleType: 'manual' },
        'Job scheduled as manual'
      );

      return;
    }

    if (schedule.type === 'once' && schedule.timestamp) {
      const nextRunAt = new Date(schedule.timestamp);
      const delay = nextRunAt.getTime() - Date.now();

      if (delay <= 0) {
        await this.executeJob(jobId);
        return;
      }

      const timerId = setTimeout(() => this.executeJob(jobId), Math.min(delay, MAX_INTERVAL));

      this.timers.set(jobId, { jobId, timerId, nextRunAt });

      this.logger.debug(
        {
          component: 'scheduler_engine',
          jobId,
          scheduleType: 'once',
          delayMs: delay,
        },
        'Job scheduled for one-time execution'
      );

      return;
    }

    if (schedule.type === 'fibonacci') {
      const level = Math.max(0, Math.min(schedule.level || 0, FIBONACCI_INTERVALS.length - 1));
      const interval = FIBONACCI_INTERVALS[level];
      const nextRunAt = new Date(Date.now() + interval);

      const timerId = setTimeout(() => this.executeAndReschedule(jobId, schedule, level), interval);

      this.timers.set(jobId, { jobId, timerId, nextRunAt });

      this.logger.debug(
        {
          component: 'scheduler_engine',
          jobId,
          scheduleType: 'fibonacci',
          level,
          intervalMs: interval,
        },
        'Job scheduled with Fibonacci interval'
      );

      return;
    }

    throw new Error(`Unknown schedule type: ${schedule.type}`);
  }

  public async triggerJobNow(jobId: string): Promise<string> {
    const job = await this.jobStore.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const executionId = await this.executeJob(jobId);

    this.logger.info(
      { component: 'scheduler_engine', jobId, executionId, action: 'manual_trigger' },
      'Job triggered manually'
    );

    return executionId;
  }

  public async cancelJob(jobId: string): Promise<void> {
    const state = this.timers.get(jobId);

    if (state?.timerId) {
      clearTimeout(state.timerId);
    }

    this.timers.delete(jobId);

    this.logger.info(
      { component: 'scheduler_engine', jobId },
      'Job cancelled and timer cleared'
    );
  }

  private async executeAndReschedule(
    jobId: string,
    schedule: ScheduleConfig,
    currentLevel: number
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await this.executeJob(jobId);

      const nextLevel = Math.min(currentLevel + 1, FIBONACCI_INTERVALS.length - 1);

      const updatedSchedule: ScheduleConfig = {
        type: 'fibonacci',
        level: nextLevel,
      };

      await this.scheduleJob(jobId, updatedSchedule);

      const duration = Date.now() - startTime;

      this.logger.debug(
        {
          component: 'scheduler_engine',
          jobId,
          action: 'reschedule',
          previousLevel: currentLevel,
          nextLevel,
          durationMs: duration,
        },
        'Job rescheduled with next Fibonacci level'
      );
    } catch (error) {
      this.logger.error(
        {
          component: 'scheduler_engine',
          jobId,
          action: 'reschedule',
          error,
          durationMs: Date.now() - startTime,
        },
        'Failed to reschedule job'
      );
    }
  }

  private async executeJob(jobId: string): Promise<string> {
    const job = await this.jobStore.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === 'cancelled' || job.status === 'completed') {
      return 'skipped';
    }

    const executionId = uuidv4();
    const startTime = Date.now();

    try {
      await this.jobStore.updateJobStatus(jobId, 'running');

      const result = await this.jobExecutor.execute(
        executionId,
        job.type,
        job.payload,
        job.timeout
      );

      const duration = Date.now() - startTime;

      await this.jobStore.recordExecution(jobId, {
        lastRunAt: new Date(),
        lastError: null,
        retryCount: 0,
        status: 'idle',
      });

      this.logger.info(
        {
          component: 'scheduler_engine',
          action: 'job_executed',
          jobId,
          executionId,
          durationMs: duration,
          result,
        },
        'Job executed successfully'
      );

      return executionId;
    } catch (error) {
      const duration = Date.now() - startTime;

      const currentJob = await this.jobStore.getJob(jobId);
      const retryCount = (currentJob?.retryCount || 0) + 1;
      const shouldRetry = retryCount <= (currentJob?.maxRetries || 3);

      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.jobStore.recordExecution(jobId, {
        lastRunAt: new Date(),
        lastError: errorMessage,
        retryCount,
        status: shouldRetry ? 'retrying' : 'failed',
      });

      if (shouldRetry) {
        const backoffMs = this.calculatePhiBackoff(retryCount, currentJob?.timeout || 30000);

        setTimeout(() => this.executeJob(jobId), backoffMs);

        this.logger.warn(
          {
            component: 'scheduler_engine',
            action: 'job_retry',
            jobId,
            executionId,
            retryCount,
            backoffMs,
            durationMs: duration,
            error,
          },
          'Job failed, will retry'
        );
      } else {
        this.logger.error(
          {
            component: 'scheduler_engine',
            action: 'job_failed',
            jobId,
            executionId,
            retryCount,
            durationMs: duration,
            error,
          },
          'Job execution failed and exhausted retries'
        );
      }

      throw error;
    }
  }

  private async checkAndExecutePendingJobs(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const now = new Date();
      const jobs = await this.jobStore.listJobs(undefined, 1000, 0);

      for (const job of jobs) {
        if (
          job.status !== 'cancelled' &&
          job.status !== 'completed' &&
          job.nextRunAt &&
          job.nextRunAt <= now
        ) {
          try {
            const schedule = job.schedule as ScheduleConfig;
            const state = this.timers.get(job.id);

            if (!state || !state.timerId) {
              await this.scheduleJob(job.id, schedule);
            }
          } catch (error) {
            this.logger.warn(
              { component: 'scheduler_engine', jobId: job.id, error },
              'Failed to check or reschedule job'
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        { component: 'scheduler_engine', action: 'check_pending', error },
        'Error checking pending jobs'
      );
    }
  }

  private calculatePhiBackoff(retryCount: number, baseTimeout: number): number {
    const exponentialFactor = Math.pow(this.phi, retryCount);
    const backoff = baseTimeout * exponentialFactor;

    return Math.min(Math.max(backoff, MIN_INTERVAL), MAX_INTERVAL);
  }
}
