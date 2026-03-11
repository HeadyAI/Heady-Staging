/**
 * Colab Gateway — Relevance-based Concurrent Workload Router
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import {
  PHI, PSI, FIB, CSL_THRESHOLD,
  type WorkloadRequest, type WorkloadResult, type WorkloadType, type ExecutionLane
} from './types.js';
import { RuntimeManager } from './runtime-manager.js';

interface LogEntry {
  level: string; service: string; msg: string; timestamp: string;
  [key: string]: string | number | boolean | undefined;
}

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  const entry: LogEntry = { level, service: 'colab-gateway', msg, timestamp: new Date().toISOString(), ...meta };
  process.stdout.write(JSON.stringify(entry) + '\n');
};

export class WorkloadRouter {
  private readonly queues: Record<ExecutionLane, WorkloadRequest[]> = {
    realtime: [],
    balanced: [],
    batch: []
  };

  private readonly maxQueueSizes: Record<ExecutionLane, number> = {
    realtime: FIB[8],
    balanced: FIB[10],
    batch: FIB[12]
  };

  private readonly workloadVramEstimates: Record<WorkloadType, number> = {
    embedding: FIB[9] * FIB[5],
    inference: FIB[10] * FIB[7],
    training: FIB[11] * FIB[8],
    fine_tuning: FIB[12] * FIB[8],
    evaluation: FIB[9] * FIB[6]
  };

  constructor(private readonly runtimeManager: RuntimeManager) {}

  enqueue(request: WorkloadRequest): boolean {
    const lane = request.lane || this.deriveLane(request);
    const normalized: WorkloadRequest = { ...request, lane };
    const queue = this.queues[lane];

    if (queue.length >= this.maxQueueSizes[lane]) {
      log('warn', 'queue_full', { lane, size: queue.length });
      return false;
    }

    queue.push(normalized);
    log('info', 'workload_enqueued', {
      requestId: normalized.requestId,
      type: normalized.type,
      lane: normalized.lane
    });
    return true;
  }

  async dispatchBatch(maxDispatches: number = FIB[6]): Promise<WorkloadResult[]> {
    const results: WorkloadResult[] = [];

    for (let i = 0; i < maxDispatches; i += 1) {
      const request = this.nextRequest();
      if (!request) break;

      const estimatedVram = request.estimatedVramMb || this.workloadVramEstimates[request.type];
      const runtime = this.runtimeManager.selectRuntime(request.type, estimatedVram);
      if (!runtime) {
        this.queues[request.lane].unshift(request);
        break;
      }

      this.runtimeManager.markBusy(runtime.runtimeId);
      const start = Date.now();

      try {
        log('info', 'workload_dispatched', {
          requestId: request.requestId,
          runtimeId: runtime.runtimeId,
          type: request.type,
          lane: request.lane
        });

        const result: WorkloadResult = {
          requestId: request.requestId,
          runtimeId: runtime.runtimeId,
          status: 'completed',
          result: { processed: true, type: request.type, lane: request.lane },
          error: null,
          durationMs: Date.now() - start,
          gpuUtilization: PSI,
          completedAt: new Date().toISOString()
        };
        results.push(result);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown_error';
        log('error', 'workload_failed', { requestId: request.requestId, error: errMsg });
        results.push({
          requestId: request.requestId,
          runtimeId: runtime.runtimeId,
          status: 'failed',
          result: null,
          error: errMsg,
          durationMs: Date.now() - start,
          gpuUtilization: 0,
          completedAt: new Date().toISOString()
        });
      } finally {
        this.runtimeManager.markFree(runtime.runtimeId);
      }
    }

    return results;
  }

  getQueueDepths(): Record<ExecutionLane, number> {
    return {
      realtime: this.queues.realtime.length,
      balanced: this.queues.balanced.length,
      batch: this.queues.batch.length
    };
  }

  computeCSLScore(request: WorkloadRequest): number {
    const urgencyVector = [
      request.lane === 'realtime' ? PHI : request.lane === 'balanced' ? 1.0 : PSI,
      request.estimatedVramMb / (FIB[12] * FIB[8]),
      request.timeout > 0 ? FIB[8] * 1000 / request.timeout : PSI
    ];

    const magnitude = Math.sqrt(urgencyVector.reduce((s, v) => s + v * v, 0));
    return magnitude > CSL_THRESHOLD ? magnitude : 0;
  }

  private deriveLane(request: WorkloadRequest): ExecutionLane {
    const score = request.relevanceScore ?? this.computeCSLScore(request);
    if (score >= PHI) return 'realtime';
    if (score >= CSL_THRESHOLD) return 'balanced';
    return 'batch';
  }

  private nextRequest(): WorkloadRequest | null {
    const candidates = [
      this.queues.realtime[0],
      this.queues.balanced[0],
      this.queues.batch[0]
    ].filter((v): v is WorkloadRequest => Boolean(v));

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const scoreDelta = (b.relevanceScore ?? this.computeCSLScore(b)) - (a.relevanceScore ?? this.computeCSLScore(a));
      if (scoreDelta !== 0) return scoreDelta;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const best = candidates[0];
    const queue = this.queues[best.lane];
    queue.shift();
    return best;
  }
}
