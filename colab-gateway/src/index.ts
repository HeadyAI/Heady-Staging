/**
 * Colab Gateway — HTTP Server (Port 3360)
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

import http from 'http';
import crypto from 'crypto';
import {
  PHI, PSI, FIB,
  type ColabRuntime, type WorkloadRequest, type GatewayHealthStatus,
  type RuntimeStatus, type WorkloadType
} from './types.js';
import { RuntimeManager } from './runtime-manager.js';
import { WorkloadRouter } from './workload-router.js';
import { BridgeProtocol } from './bridge-protocol.js';

const log = (level: string, msg: string, meta?: Record<string, string | number | boolean>) => {
  process.stdout.write(JSON.stringify({
    level, service: 'colab-gateway', msg,
    timestamp: new Date().toISOString(), version: '1.0.0', ...meta
  }) + '\n');
};

const PORT = parseInt(process.env.COLAB_GATEWAY_PORT ?? '3360', 10);
const runtimeManager = new RuntimeManager();
const workloadRouter = new WorkloadRouter(runtimeManager);
const bridge = new BridgeProtocol();
const startTime = Date.now();

// Register 3 Colab Pro+ runtimes
const runtimeConfigs: Array<Omit<ColabRuntime, 'lastHeartbeat' | 'connectedAt'>> = [
  {
    runtimeId: 'colab-runtime-alpha',
    name: 'Alpha Runtime (Embeddings & Inference)',
    gpuType: 'A100',
    vramGb: FIB[8] * FIB[3], // 42 GB
    computeUnits: FIB[11],    // 89 CU
    status: 'ready' as RuntimeStatus,
    currentLoad: 0,
    maxConcurrent: FIB[5],    // 5 concurrent
    capabilities: ['embedding', 'inference', 'evaluation'] as WorkloadType[],
    endpoint: process.env.COLAB_ALPHA_ENDPOINT ?? ''
  },
  {
    runtimeId: 'colab-runtime-beta',
    name: 'Beta Runtime (Training & Fine-tuning)',
    gpuType: 'A100',
    vramGb: FIB[8] * FIB[3], // 42 GB
    computeUnits: FIB[11],    // 89 CU
    status: 'ready' as RuntimeStatus,
    currentLoad: 0,
    maxConcurrent: FIB[3],    // 2 concurrent (training is heavy)
    capabilities: ['training', 'fine_tuning', 'inference'] as WorkloadType[],
    endpoint: process.env.COLAB_BETA_ENDPOINT ?? ''
  },
  {
    runtimeId: 'colab-runtime-gamma',
    name: 'Gamma Runtime (General Purpose)',
    gpuType: 'T4',
    vramGb: FIB[7] + FIB[3], // 15 GB
    computeUnits: FIB[9],     // 34 CU
    status: 'ready' as RuntimeStatus,
    currentLoad: 0,
    maxConcurrent: FIB[6],    // 8 concurrent
    capabilities: ['embedding', 'inference', 'evaluation'] as WorkloadType[],
    endpoint: process.env.COLAB_GAMMA_ENDPOINT ?? ''
  }
];

for (const cfg of runtimeConfigs) {
  runtimeManager.register({
    ...cfg,
    lastHeartbeat: new Date().toISOString(),
    connectedAt: new Date().toISOString()
  });
}

function jsonRes(res: http.ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > FIB[12] * 1024) { req.destroy(); reject(new Error('body_too_large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const baseHost = process.env.COLAB_GATEWAY_HOST ?? req.headers.host ?? 'gateway.internal';
  const url = new URL(req.url ?? '/', `http://${baseHost}`);
  const method = req.method ?? 'GET';
  const path = url.pathname;

  try {
    if (path === '/health') {
      const runtimes = runtimeManager.getAll();
      const healthy = runtimeManager.getHealthy();
      const health: GatewayHealthStatus = {
        status: healthy.length >= FIB[2] ? 'healthy' : healthy.length >= FIB[1] ? 'degraded' : 'unhealthy',
        runtimes: runtimes.map(r => ({ id: r.runtimeId, status: r.status, load: r.currentLoad })),
        activeWorkloads: runtimes.reduce((sum, r) => sum + r.currentLoad, 0),
        queueDepth: workloadRouter.getQueueDepths(),
        uptime: (Date.now() - startTime) / 1000,
        coherenceScore: healthy.length / runtimes.length
      };
      jsonRes(res, 200, health as unknown as Record<string, unknown>);
      return;
    }

    if (path === '/ready') {
      jsonRes(res, 200, { ready: true, service: 'colab-gateway', port: PORT, runtimes: runtimeManager.getHealthy().length });
      return;
    }

    if (path === '/api/workload/submit' && method === 'POST') {
      const body = await readBody(req);
      const parsed = JSON.parse(body) as Partial<WorkloadRequest> & { type?: WorkloadType };
      if (!parsed.type || !parsed.payload || !parsed.userId) {
        jsonRes(res, 400, { error: 'invalid_request' });
        return;
      }

      const request: WorkloadRequest = {
        ...parsed,
        lane: parsed.lane ?? 'balanced',
        estimatedVramMb: parsed.estimatedVramMb ?? 0,
        timeout: parsed.timeout ?? FIB[9] * 1000,
        requestId: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      } as WorkloadRequest;
      const queued = workloadRouter.enqueue(request);
      if (!queued) { jsonRes(res, 429, { error: 'queue_full' }); return; }

      const results = await workloadRouter.dispatchBatch(runtimeManager.getHealthy().length || FIB[2]);
      const result = results.find(r => r.requestId === request.requestId);

      if (result) {
        jsonRes(res, 200, result as unknown as Record<string, unknown>);
      } else {
        jsonRes(res, 202, { queued: true, requestId: request.requestId, drained: results.length });
      }
      return;
    }

    if (path === '/api/runtimes' && method === 'GET') {
      const runtimes = runtimeManager.getAll();
      jsonRes(res, 200, { runtimes: runtimes as unknown as Record<string, unknown>[] });
      return;
    }

    if (path === '/api/runtimes/heartbeat' && method === 'POST') {
      const body = await readBody(req);
      const { runtimeId } = JSON.parse(body);
      const updated = runtimeManager.updateHeartbeat(runtimeId);
      jsonRes(res, updated ? 200 : 404, { updated });
      return;
    }

    if (path === '/api/queue/status' && method === 'GET') {
      jsonRes(res, 200, { depths: workloadRouter.getQueueDepths(), bridgePending: bridge.getPendingCount() });
      return;
    }

    jsonRes(res, 404, { error: 'not_found', path });
  } catch (err) {
    log('error', 'request_error', { path, error: err instanceof Error ? err.message : 'unknown_error' });
    jsonRes(res, 500, { error: 'internal_server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  log('info', 'colab_gateway_started', { port: PORT, runtimes: runtimeConfigs.length });
});

const shutdown = () => {
  log('info', 'graceful_shutdown_initiated');
  server.close(() => { log('info', 'server_closed'); process.exit(0); });
  setTimeout(() => process.exit(1), FIB[8] * 1000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
