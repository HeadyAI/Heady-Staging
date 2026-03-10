/**
 * Heady Notification Service
 * Real-time notifications via WebSocket + SSE with phi-scaled parameters.
 * (c) 2026 HeadySystems Inc.
 */

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyRateLimit from '@fastify/rate-limit';
import { PHI, FIB, phiBackoff } from '@heady-ai/phi-math-foundation';
import type { WebSocket } from 'ws';

// ---------------------------------------------------------------------------
// Constants derived from phi-math-foundation
// ---------------------------------------------------------------------------

/** phi^7 heartbeat interval in ms (~29034ms per system spec) */
const PHI_7_HEARTBEAT_MS = Math.round(PHI ** 7 * 1000);

/** Fibonacci rate limit: 89 req/min for authenticated users */
const RATE_LIMIT_MAX = FIB[10]; // 89

/** Fibonacci reconnect base for client guidance */
const RECONNECT_BASE_MS = FIB[6] * 100; // 1300ms (13 * 100)

/** Max reconnect ceiling */
const RECONNECT_MAX_MS = FIB[13] * 100; // 61000ms (610 * 100)

const PORT = Number(process.env.SERVICE_PORT ?? process.env.PORT ?? 4321);
const HOST = process.env.HOST ?? '0.0.0.0';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  type: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  topic?: string;
  timestamp: string;
}

interface WsClient {
  kind: 'ws';
  ws: WebSocket;
  userId: string;
  topics: Set<string>;
  alive: boolean;
}

interface SseClient {
  kind: 'sse';
  reply: import('fastify').FastifyReply;
  userId: string;
  topics: Set<string>;
  heartbeatTimer: ReturnType<typeof setInterval>;
}

type Client = WsClient | SseClient;

// ---------------------------------------------------------------------------
// In-memory stores (swap for Redis/Neon in production cluster mode)
// ---------------------------------------------------------------------------

/** userId -> Client[] */
const clients = new Map<string, Client[]>();

/** userId -> Notification[] (bounded ring buffer per user) */
const history = new Map<string, Notification[]>();
const HISTORY_LIMIT = FIB[13]; // 610 notifications per user

/** topic -> Set<userId> */
const subscriptions = new Map<string, Set<string>>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addToHistory(userId: string, notification: Notification): void {
  if (!history.has(userId)) history.set(userId, []);
  const ring = history.get(userId)!;
  ring.push(notification);
  if (ring.length > HISTORY_LIMIT) ring.shift();
}

function removeClient(userId: string, client: Client): void {
  const list = clients.get(userId);
  if (!list) return;
  const idx = list.indexOf(client);
  if (idx !== -1) list.splice(idx, 1);
  if (list.length === 0) clients.delete(userId);
}

function deliverToUser(userId: string, notification: Notification): number {
  const userClients = clients.get(userId);
  if (!userClients) return 0;
  let delivered = 0;
  for (const client of userClients) {
    try {
      if (client.kind === 'ws' && client.ws.readyState === 1) {
        client.ws.send(JSON.stringify({ event: 'notification', payload: notification }));
        delivered++;
      } else if (client.kind === 'sse') {
        client.reply.raw.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
        delivered++;
      }
    } catch {
      // Client disconnected mid-send; cleanup will happen via close handler
    }
  }
  return delivered;
}

function deliverToTopic(topic: string, notification: Notification): number {
  const subscribers = subscriptions.get(topic);
  if (!subscribers) return 0;
  let total = 0;
  for (const userId of subscribers) {
    total += deliverToUser(userId, notification);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Fastify application
// ---------------------------------------------------------------------------

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

async function build() {
  // --- Plugins -----------------------------------------------------------

  await app.register(fastifyWebsocket);

  await app.register(fastifyRateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      // Use X-User-Id header or IP as rate-limit key
      return (req.headers['x-user-id'] as string) ?? req.ip;
    },
  });

  // --- Health ------------------------------------------------------------

  app.get('/health', async () => ({
    status: 'healthy',
    service: 'notification-service',
    version: '2.0.0',
    connections: Array.from(clients.values()).reduce((sum, c) => sum + c.length, 0),
    heartbeatIntervalMs: PHI_7_HEARTBEAT_MS,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }));

  // --- POST /api/notifications/send --------------------------------------

  app.post<{
    Body: {
      userId?: string;
      userIds?: string[];
      type: string;
      title?: string;
      message?: string;
      topic?: string;
      data?: Record<string, unknown>;
    };
  }>('/api/notifications/send', async (req, reply) => {
    const { userId, userIds, type, title, message, topic, data } = req.body ?? {};

    if (!type) {
      return reply.status(400).send({ error: 'type is required' });
    }

    const notification: Notification = {
      id: generateId('notif'),
      type,
      title,
      message,
      topic,
      data,
      timestamp: new Date().toISOString(),
    };

    let totalDelivered = 0;

    // Direct user delivery
    const targets = userIds ?? (userId ? [userId] : []);
    for (const uid of targets) {
      addToHistory(uid, notification);
      totalDelivered += deliverToUser(uid, notification);
    }

    // Topic-based fan-out
    if (topic) {
      totalDelivered += deliverToTopic(topic, notification);
      // Store in history for each topic subscriber
      const subs = subscriptions.get(topic);
      if (subs) {
        for (const uid of subs) {
          if (!targets.includes(uid)) addToHistory(uid, notification);
        }
      }
    }

    return { delivered: totalDelivered, notification };
  });

  // --- GET /api/notifications/:userId ------------------------------------

  app.get<{
    Params: { userId: string };
    Querystring: { limit?: string; offset?: string };
  }>('/api/notifications/:userId', async (req) => {
    const { userId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, HISTORY_LIMIT);
    const offset = Number(req.query.offset) || 0;

    const userHistory = history.get(userId) ?? [];
    const slice = userHistory.slice(
      Math.max(0, userHistory.length - offset - limit),
      userHistory.length - offset,
    );

    return {
      userId,
      total: userHistory.length,
      limit,
      offset,
      notifications: slice.reverse(),
    };
  });

  // --- POST /api/notifications/subscribe ---------------------------------

  app.post<{
    Body: { userId: string; topics: string[] };
  }>('/api/notifications/subscribe', async (req, reply) => {
    const { userId, topics } = req.body ?? {};

    if (!userId || !Array.isArray(topics) || topics.length === 0) {
      return reply.status(400).send({ error: 'userId and topics[] are required' });
    }

    for (const topic of topics) {
      if (!subscriptions.has(topic)) subscriptions.set(topic, new Set());
      subscriptions.get(topic)!.add(userId);
    }

    // Also update topic sets on any currently-connected clients
    const userClients = clients.get(userId) ?? [];
    for (const client of userClients) {
      for (const topic of topics) client.topics.add(topic);
    }

    return { userId, subscribedTopics: topics };
  });

  // --- SSE /api/notifications/stream -------------------------------------

  app.get<{
    Querystring: { userId?: string };
  }>('/api/notifications/stream', async (req, reply) => {
    const userId = req.query.userId;
    if (!userId) {
      return reply.status(400).send({ error: 'userId query param required' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send connected event
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ userId, heartbeatMs: PHI_7_HEARTBEAT_MS })}\n\n`);

    const heartbeatTimer = setInterval(() => {
      try {
        reply.raw.write(`: heartbeat ${new Date().toISOString()}\n\n`);
      } catch {
        clearInterval(heartbeatTimer);
      }
    }, PHI_7_HEARTBEAT_MS);

    const sseClient: SseClient = {
      kind: 'sse',
      reply,
      userId,
      topics: new Set(),
      heartbeatTimer,
    };

    if (!clients.has(userId)) clients.set(userId, []);
    clients.get(userId)!.push(sseClient);

    req.raw.on('close', () => {
      clearInterval(heartbeatTimer);
      removeClient(userId, sseClient);
      app.log.info({ userId, kind: 'sse' }, 'SSE client disconnected');
    });

    // Keep the connection open -- Fastify won't auto-close since we took over reply.raw
    await reply.hijack();
  });

  // --- WebSocket /ws -----------------------------------------------------

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        socket.close(4400, 'userId query param required');
        return;
      }

      const wsClient: WsClient = {
        kind: 'ws',
        ws: socket,
        userId,
        topics: new Set(),
        alive: true,
      };

      if (!clients.has(userId)) clients.set(userId, []);
      clients.get(userId)!.push(wsClient);

      app.log.info({ userId }, 'WebSocket client connected');

      // Send connection acknowledgment with reconnect config
      socket.send(JSON.stringify({
        event: 'connected',
        payload: {
          userId,
          heartbeatMs: PHI_7_HEARTBEAT_MS,
          reconnect: {
            strategy: 'phi-exponential',
            baseMs: RECONNECT_BASE_MS,
            maxMs: RECONNECT_MAX_MS,
            phi: PHI,
          },
        },
      }));

      // Pong handler for heartbeat
      socket.on('pong', () => {
        wsClient.alive = true;
      });

      // Message handler
      socket.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());

          switch (msg.action) {
            case 'subscribe': {
              const topics: string[] = msg.topics ?? [];
              for (const topic of topics) {
                wsClient.topics.add(topic);
                if (!subscriptions.has(topic)) subscriptions.set(topic, new Set());
                subscriptions.get(topic)!.add(userId);
              }
              socket.send(JSON.stringify({ event: 'subscribed', payload: { topics } }));
              break;
            }

            case 'unsubscribe': {
              const topics: string[] = msg.topics ?? [];
              for (const topic of topics) {
                wsClient.topics.delete(topic);
                const subs = subscriptions.get(topic);
                if (subs) {
                  subs.delete(userId);
                  if (subs.size === 0) subscriptions.delete(topic);
                }
              }
              socket.send(JSON.stringify({ event: 'unsubscribed', payload: { topics } }));
              break;
            }

            case 'ping': {
              socket.send(JSON.stringify({ event: 'pong', timestamp: new Date().toISOString() }));
              break;
            }

            default:
              socket.send(JSON.stringify({ event: 'error', payload: { message: `Unknown action: ${msg.action}` } }));
          }
        } catch {
          socket.send(JSON.stringify({ event: 'error', payload: { message: 'Invalid JSON' } }));
        }
      });

      socket.on('close', () => {
        removeClient(userId, wsClient);
        // Clean up empty topic subscriptions
        for (const topic of wsClient.topics) {
          const subs = subscriptions.get(topic);
          if (subs) {
            subs.delete(userId);
            if (subs.size === 0) subscriptions.delete(topic);
          }
        }
        app.log.info({ userId, kind: 'ws' }, 'WebSocket client disconnected');
      });
    });
  });

  // --- WebSocket heartbeat (phi^7 interval) ------------------------------

  const heartbeatInterval = setInterval(() => {
    for (const [userId, userClients] of clients) {
      for (const client of [...userClients]) {
        if (client.kind === 'ws') {
          if (!client.alive) {
            app.log.warn({ userId }, 'WebSocket client failed heartbeat, terminating');
            client.ws.terminate();
            removeClient(userId, client);
            continue;
          }
          client.alive = false;
          try {
            client.ws.ping();
          } catch {
            client.ws.terminate();
            removeClient(userId, client);
          }
        }
      }
    }
  }, PHI_7_HEARTBEAT_MS);

  // --- Graceful shutdown -------------------------------------------------

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down notification-service');
    clearInterval(heartbeatInterval);

    // Close all client connections gracefully
    for (const [, userClients] of clients) {
      for (const client of userClients) {
        try {
          if (client.kind === 'ws') {
            client.ws.close(1001, 'Server shutting down');
          } else if (client.kind === 'sse') {
            clearInterval(client.heartbeatTimer);
            client.reply.raw.end();
          }
        } catch {
          // Already closed
        }
      }
    }
    clients.clear();

    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return app;
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

build()
  .then((server) => server.listen({ port: PORT, host: HOST }))
  .then(() => {
    app.log.info(
      {
        port: PORT,
        heartbeatMs: PHI_7_HEARTBEAT_MS,
        rateLimitPerMin: RATE_LIMIT_MAX,
        reconnectBaseMs: RECONNECT_BASE_MS,
        reconnectMaxMs: RECONNECT_MAX_MS,
      },
      `notification-service listening on ${HOST}:${PORT}`,
    );
  })
  .catch((err) => {
    app.log.error(err, 'Failed to start notification-service');
    process.exit(1);
  });

export { build };
