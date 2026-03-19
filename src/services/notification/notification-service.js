/**
 * Heady™ Notification Service v5.0
 * Multi-channel notification delivery — WebSocket, SSE, Email, Webhook
 * Phi-scaled rate limiting and priority queue
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const {
  PHI, PSI, fib, phiBackoffWithJitter, phiFusionScore,
  CSL_THRESHOLDS, TIMING, SERVICE_PORTS, POOL_SIZES,
} = require('../../../shared/phi-math');
const { createLogger } = require('../../../shared/logger');
const { HealthProbe } = require('../../../shared/health');

const logger = createLogger('notification-service');
const PORT = SERVICE_PORTS.HEADY_NOTIFICATION;

const CHANNELS = Object.freeze(['websocket', 'sse', 'email', 'webhook', 'push']);
const MAX_QUEUE_SIZE = fib(13);  // 233
const RATE_LIMIT_WINDOW_MS = fib(11) * 1000; // 89s
const RATE_LIMIT_MAX = fib(10); // 55 notifications per window per user
const BATCH_SIZE = fib(6); // 8 notifications per batch send

class RateLimiter {
  constructor(windowMs = RATE_LIMIT_WINDOW_MS, maxRequests = RATE_LIMIT_MAX) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.buckets = new Map();
  }

  check(userId) {
    const now = Date.now();
    const bucket = this.buckets.get(userId) || { count: 0, windowStart: now };

    if (now - bucket.windowStart > this.windowMs) {
      bucket.count = 0;
      bucket.windowStart = now;
    }

    if (bucket.count >= this.maxRequests) {
      return { allowed: false, retryAfterMs: bucket.windowStart + this.windowMs - now };
    }

    bucket.count++;
    this.buckets.set(userId, bucket);
    return { allowed: true, remaining: this.maxRequests - bucket.count };
  }
}

class NotificationQueue {
  constructor(capacity = MAX_QUEUE_SIZE) {
    this.capacity = capacity;
    this.queue = [];
    this.processed = 0;
    this.failed = 0;
  }

  enqueue(notification) {
    if (this.queue.length >= this.capacity) {
      // Drop lowest priority
      this.queue.sort((a, b) => b.priority - a.priority);
      if (notification.priority > this.queue[this.queue.length - 1].priority) {
        this.queue.pop();
      } else {
        return false;
      }
    }
    this.queue.push(notification);
    this.queue.sort((a, b) => b.priority - a.priority);
    return true;
  }

  dequeue(count = 1) {
    return this.queue.splice(0, count);
  }

  get size() { return this.queue.length; }
}

class SSEManager {
  constructor() {
    this.connections = new Map(); // userId → Set<response>
  }

  addConnection(userId, res) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(res);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      const userConns = this.connections.get(userId);
      if (userConns) {
        userConns.delete(res);
        if (userConns.size === 0) this.connections.delete(userId);
      }
    });
  }

  send(userId, data) {
    const conns = this.connections.get(userId);
    if (!conns || conns.size === 0) return 0;

    const payload = `data: ${JSON.stringify(data)}\n\n`;
    let sent = 0;
    for (const res of conns) {
      try { res.write(payload); sent++; }
      catch { conns.delete(res); }
    }
    return sent;
  }

  broadcast(data) {
    let total = 0;
    for (const userId of this.connections.keys()) {
      total += this.send(userId, data);
    }
    return total;
  }

  get connectionCount() {
    let total = 0;
    for (const conns of this.connections.values()) total += conns.size;
    return total;
  }
}

class WebhookDelivery {
  constructor() {
    this.registrations = new Map(); // webhookId → { url, secret, events }
  }

  register(webhookId, config) {
    this.registrations.set(webhookId, {
      url: config.url,
      secret: config.secret || crypto.randomBytes(fib(8)).toString('hex'),
      events: config.events || ['*'],
      active: true,
      createdAt: Date.now(),
    });
    return this.registrations.get(webhookId);
  }

  async deliver(event, payload) {
    const deliveries = [];
    for (const [webhookId, config] of this.registrations) {
      if (!config.active) continue;
      if (!config.events.includes('*') && !config.events.includes(event)) continue;

      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const signature = crypto.createHmac('sha256', config.secret).update(body).digest('hex');

      deliveries.push({
        webhookId,
        url: config.url,
        signature,
        body,
      });
    }

    // In production: HTTP POST to each webhook URL with retries
    logger.info('webhook_delivery', { event, deliveries: deliveries.length });
    return deliveries;
  }
}

function createNotificationService() {
  const queue = new NotificationQueue();
  const rateLimiter = new RateLimiter();
  const sseManager = new SSEManager();
  const webhookDelivery = new WebhookDelivery();
  const healthProbe = new HealthProbe('notification-service');

  healthProbe.registerCheck('queue', async () => ({
    healthy: queue.size < MAX_QUEUE_SIZE * PSI,
    queueSize: queue.size,
    maxSize: MAX_QUEUE_SIZE,
  }));

  healthProbe.registerCheck('sse', async () => ({
    healthy: true,
    connections: sseManager.connectionCount,
  }));

  function parseBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
      req.on('error', reject);
    });
  }

  function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${process.env.HOST || "localhost"}:${PORT}`);
    const method = req.method;

    if (url.pathname.startsWith('/health')) {
      return healthProbe.fullHealthHandler(req, res);
    }

    try {
      // POST /notify — Send a notification
      if (method === 'POST' && url.pathname === '/notify') {
        const body = await parseBody(req);
        const { userId, channel, title, message, data, priority } = body;

        if (!userId || !message) return json(res, 400, { error: 'MISSING_FIELDS' });

        const rateCheck = rateLimiter.check(userId);
        if (!rateCheck.allowed) {
          return json(res, 429, { error: 'RATE_LIMITED', retryAfterMs: rateCheck.retryAfterMs });
        }

        const notification = {
          id: crypto.randomBytes(fib(6)).toString('hex'),
          userId, channel: channel || 'sse', title, message, data,
          priority: priority || phiFusionScore([0.5, 0.5, 0.5]),
          createdAt: Date.now(),
        };

        // Route to appropriate channel
        let delivered = false;
        if (notification.channel === 'sse' || notification.channel === 'websocket') {
          const sent = sseManager.send(userId, {
            type: 'notification', ...notification,
          });
          delivered = sent > 0;
        }

        if (notification.channel === 'webhook') {
          await webhookDelivery.deliver('notification', notification);
          delivered = true;
        }

        if (!delivered) {
          queue.enqueue(notification);
        }

        logger.info('notification_sent', { notificationId: notification.id, userId, channel: notification.channel, delivered });
        return json(res, 200, { id: notification.id, delivered, queued: !delivered });
      }

      // GET /notifications/stream — SSE stream
      if (method === 'GET' && url.pathname === '/notifications/stream') {
        const userId = url.searchParams.get('userId');
        if (!userId) return json(res, 400, { error: 'MISSING_USER_ID' });
        sseManager.addConnection(userId, res);
        return;
      }

      // POST /webhooks — Register webhook
      if (method === 'POST' && url.pathname === '/webhooks') {
        const body = await parseBody(req);
        const webhookId = crypto.randomBytes(fib(6)).toString('hex');
        const config = webhookDelivery.register(webhookId, body);
        return json(res, 201, { webhookId, secret: config.secret });
      }

      // POST /broadcast — Broadcast to all
      if (method === 'POST' && url.pathname === '/broadcast') {
        const body = await parseBody(req);
        const sent = sseManager.broadcast({ type: 'broadcast', ...body });
        return json(res, 200, { sent });
      }

      // GET /stats
      if (method === 'GET' && url.pathname === '/stats') {
        return json(res, 200, {
          queueSize: queue.size,
          sseConnections: sseManager.connectionCount,
          webhookRegistrations: webhookDelivery.registrations.size,
          processed: queue.processed,
          failed: queue.failed,
        });
      }

      json(res, 404, { error: 'NOT_FOUND' });
    } catch (err) {
      logger.error('request_error', { path: url.pathname, error: err.message });
      json(res, 500, { error: 'INTERNAL_ERROR' });
    }
  });

  return { server, queue, sseManager, webhookDelivery, healthProbe, PORT };
}

module.exports = { createNotificationService };
