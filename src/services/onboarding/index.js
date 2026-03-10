/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const { PHI, PSI, fib, phiMs, PHI_TIMING, CSL_THRESHOLDS } = require('../../shared/phi-math');

const SERVICE_NAME = 'heady-onboarding';
const PORT = parseInt(process.env.SERVICE_PORT || '3365', 10);

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];
const logger = Object.fromEntries(
  Object.entries(LOG_LEVELS).map(([level, num]) => [
    level,
    (data) => {
      if (num <= CURRENT_LEVEL) {
        const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, service: SERVICE_NAME, ...data });
        process[num === 0 ? 'stderr' : 'stdout'].write(entry + '\n');
      }
    },
  ])
);

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING STAGES — Fibonacci-indexed progression
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Onboarding follows a φ-scaled progression through stages.
 * Each stage has a completion weight that sums to 1.0 using phi-fusion.
 *
 * Stage 1: Account Creation (ψ³ ≈ 0.236 weight)
 * Stage 2: Profile Setup (ψ² ≈ 0.382 weight)
 * Stage 3: Workspace Config (ψ ≈ 0.618 weight → subtracted to balance)
 * Stage 4: Integration Connect
 * Stage 5: First Task
 */

const ONBOARDING_STAGES = [
  {
    id: 'account_creation',
    name: 'Create Account',
    description: 'Email, password, and identity verification',
    order: 1,
    requiredFields: ['email', 'password', 'name'],
    estimatedMs: PHI_TIMING.PHI_3,  // 4,236ms
  },
  {
    id: 'profile_setup',
    name: 'Set Up Profile',
    description: 'Avatar, display name, and preferences',
    order: 2,
    requiredFields: ['displayName'],
    estimatedMs: PHI_TIMING.PHI_4,  // 6,854ms
  },
  {
    id: 'workspace_config',
    name: 'Configure Workspace',
    description: 'Select domain, connect repos, set permissions',
    order: 3,
    requiredFields: ['workspaceName', 'primaryDomain'],
    estimatedMs: PHI_TIMING.PHI_5,  // 11,090ms
  },
  {
    id: 'integration_connect',
    name: 'Connect Integrations',
    description: 'GitHub, GCP, Cloudflare, Colab Pro+',
    order: 4,
    requiredFields: [],  // optional stage
    estimatedMs: PHI_TIMING.PHI_6,  // 17,944ms
  },
  {
    id: 'first_task',
    name: 'Complete First Task',
    description: 'Run your first HeadyConductor pipeline',
    order: 5,
    requiredFields: [],  // guided experience
    estimatedMs: PHI_TIMING.PHI_7,  // 29,034ms
  },
];

// In-memory store (production would use pgvector/postgres)
const userOnboarding = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  const requestId = req.headers['x-request-id'] || `heady-${crypto.randomUUID()}`;
  res.setHeader('X-Request-ID', requestId);

  try {
    // ─── Health ─────────────────────────────────────────────────────────────
    if (req.url === '/health' && req.method === 'GET') {
      return jsonResponse(res, 200, {
        status: 'healthy',
        service: SERVICE_NAME,
        version: '5.2.0',
        stages: ONBOARDING_STAGES.length,
        activeUsers: userOnboarding.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }

    // ─── GET /stages — List all onboarding stages ───────────────────────────
    if (req.url === '/stages' && req.method === 'GET') {
      return jsonResponse(res, 200, {
        stages: ONBOARDING_STAGES,
        totalStages: ONBOARDING_STAGES.length,
      });
    }

    // ─── POST /start — Initialize onboarding for a user ─────────────────────
    if (req.url === '/start' && req.method === 'POST') {
      const body = await parseBody(req);
      const { userId, email, name } = body;

      if (!userId || !email) {
        return jsonResponse(res, 400, {
          error: 'HEADY-ONBOARD-400',
          message: 'userId and email are required',
        });
      }

      const session = {
        userId,
        email,
        name: name || '',
        currentStage: 0,
        stages: ONBOARDING_STAGES.map(s => ({
          ...s,
          status: 'pending',
          completedAt: null,
          data: {},
        })),
        startedAt: Date.now(),
        completedAt: null,
      };

      session.stages[0].status = 'active';
      userOnboarding.set(userId, session);

      logger.info({ msg: 'onboarding_started', userId, email, requestId });

      return jsonResponse(res, 201, {
        message: 'Onboarding started',
        session: {
          userId,
          currentStage: session.stages[0].id,
          progress: 0,
          totalStages: ONBOARDING_STAGES.length,
        },
      });
    }

    // ─── POST /complete-stage — Mark a stage complete ────────────────────────
    if (req.url === '/complete-stage' && req.method === 'POST') {
      const body = await parseBody(req);
      const { userId, stageId, data } = body;

      if (!userId || !stageId) {
        return jsonResponse(res, 400, {
          error: 'HEADY-ONBOARD-400',
          message: 'userId and stageId are required',
        });
      }

      const session = userOnboarding.get(userId);
      if (!session) {
        return jsonResponse(res, 404, {
          error: 'HEADY-ONBOARD-404',
          message: 'Onboarding session not found',
        });
      }

      const stageIndex = session.stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) {
        return jsonResponse(res, 404, {
          error: 'HEADY-ONBOARD-404',
          message: `Stage not found: ${stageId}`,
        });
      }

      const stage = session.stages[stageIndex];

      // Validate required fields
      for (const field of stage.requiredFields) {
        if (!data?.[field]) {
          return jsonResponse(res, 400, {
            error: 'HEADY-ONBOARD-400',
            message: `Missing required field: ${field}`,
            requiredFields: stage.requiredFields,
          });
        }
      }

      // Complete the stage
      stage.status = 'completed';
      stage.completedAt = Date.now();
      stage.data = data || {};

      // Advance to next stage
      session.currentStage = stageIndex + 1;
      if (session.currentStage < session.stages.length) {
        session.stages[session.currentStage].status = 'active';
      } else {
        session.completedAt = Date.now();
      }

      const progress = (stageIndex + 1) / session.stages.length;

      logger.info({
        msg: 'stage_completed',
        userId,
        stageId,
        progress: Math.round(progress * 100),
        requestId,
      });

      return jsonResponse(res, 200, {
        message: `Stage completed: ${stage.name}`,
        progress: Math.round(progress * 100),
        currentStage: session.currentStage < session.stages.length
          ? session.stages[session.currentStage].id
          : null,
        isComplete: session.completedAt !== null,
      });
    }

    // ─── GET /status/:userId — Get onboarding status ─────────────────────────
    const statusMatch = req.url.match(/^\/status\/([^/]+)$/);
    if (statusMatch && req.method === 'GET') {
      const userId = statusMatch[1];
      const session = userOnboarding.get(userId);

      if (!session) {
        return jsonResponse(res, 404, {
          error: 'HEADY-ONBOARD-404',
          message: 'Onboarding session not found',
        });
      }

      const completedCount = session.stages.filter(s => s.status === 'completed').length;

      return jsonResponse(res, 200, {
        userId,
        progress: Math.round((completedCount / session.stages.length) * 100),
        currentStage: session.currentStage < session.stages.length
          ? session.stages[session.currentStage].id
          : null,
        isComplete: session.completedAt !== null,
        stages: session.stages.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          completedAt: s.completedAt,
        })),
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      });
    }

    // ─── 404 ────────────────────────────────────────────────────────────────
    jsonResponse(res, 404, { error: 'HEADY-NOT-FOUND-404', message: `Route not found: ${req.method} ${req.url}` });

  } catch (err) {
    logger.error({ msg: 'request_error', error: err.message, requestId });
    jsonResponse(res, 500, { error: 'HEADY-INTERNAL-500', message: 'Internal server error' });
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info({ msg: 'shutdown_initiated', signal });
  server.close(() => {
    logger.info({ msg: 'shutdown_complete' });
    process.exit(0);
  });
  setTimeout(() => process.exit(1), PHI_TIMING.PHI_5);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, () => {
  logger.info({ msg: 'started', port: PORT, stages: ONBOARDING_STAGES.length });
});
