/**
 * Colab Gateway — Type Definitions
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;

export type RuntimeStatus = 'connecting' | 'ready' | 'busy' | 'draining' | 'disconnected' | 'error';
export type WorkloadType = 'embedding' | 'inference' | 'training' | 'fine_tuning' | 'evaluation';
export type ExecutionLane = 'realtime' | 'balanced' | 'batch';

export interface ColabRuntime {
  readonly runtimeId: string;
  readonly name: string;
  readonly gpuType: string;
  readonly vramGb: number;
  readonly computeUnits: number;
  readonly status: RuntimeStatus;
  readonly currentLoad: number;
  readonly maxConcurrent: number;
  readonly lastHeartbeat: string;
  readonly connectedAt: string;
  readonly capabilities: ReadonlyArray<WorkloadType>;
  readonly endpoint: string;
}

export interface WorkloadRequest {
  readonly requestId: string;
  readonly type: WorkloadType;
  readonly lane: ExecutionLane;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly estimatedVramMb: number;
  readonly timeout: number;
  readonly userId: string;
  readonly createdAt: string;
  readonly relevanceScore?: number;
}

export interface WorkloadResult {
  readonly requestId: string;
  readonly runtimeId: string;
  readonly status: 'completed' | 'failed' | 'timeout';
  readonly result: unknown;
  readonly error: string | null;
  readonly durationMs: number;
  readonly gpuUtilization: number;
  readonly completedAt: string;
}

export interface BridgeMessage {
  readonly jsonrpc: '2.0';
  readonly id: string;
  readonly method: string;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface BridgeResponse {
  readonly jsonrpc: '2.0';
  readonly id: string;
  readonly result?: unknown;
  readonly error?: { code: number; message: string; data?: unknown };
}

export interface GatewayHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly runtimes: ReadonlyArray<{ id: string; status: RuntimeStatus; load: number }>;
  readonly activeWorkloads: number;
  readonly queueDepth: Record<ExecutionLane, number>;
  readonly uptime: number;
  readonly coherenceScore: number;
}
