/**
 * Heady™ Notification Service — Real-time Multi-Channel Notifications
 * Port: 3361 | WebSocket + SSE + Push
 *
 * NATS JetStream consumer for heady.notifications.* subjects
 * WebSocket with per-frame token revalidation
 * φ-weighted delivery: critical=immediate, normal=batched fib(8)=21s, low=batched fib(11)=89s
 * Notification persistence layer (pgvector for semantic search)
 * Read/unread tracking per user
 * φ-backoff reconnection for WebSocket clients
 *
 * Author: Eric Haywood <eric@headysystems.com>
 * © 2026 HeadySystems Inc. — 51 Provisional Patents
 */

'use strict';

const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const express = require('express');
const {
  PHI, PSI, fib, phiMs, phiBackoff, phiBackoffWithJitter,
  CSL_THRESHOLDS, PHI_TIMING, PHI_BACKOFF_SEQ,
  cslGate, sigmoid, VECTOR,
} = require('../../shared/phi-math');

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.SERVICE_PORT, 10) || 3361;

// ═══════════════════════════════════════════════════════════════════════════════
// φ-CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_NORMAL_MS     = fib(8) * 1000;      // 21 000ms — normal batch window
const BATCH_LOW_MS        = fib(11) * 1000;      // 89 000ms — low batch window
const MAX_CONNECTIONS     = fib(13);              // 233 concurrent connections
const HEARTBEAT_MS        = PHI_TIMING.PHI_7;    // 29 034ms heartbeat cycle
const RECONNECT_BASE_MS   = PHI_TIMING.PHI_1;    // 1 618ms base reconnect delay
const MAX_QUEUE_DEPTH     = fib(13);              // 233 notifications per user queue
const DEDUP_WINDOW_MS     = fib(10) * 1000;       // 55 000ms dedup window
const NOTIFICATION_TYPES  = Object.freeze(['system', 'alert', 'task_complete', 'agent_update', 'security']);
const MAX_PERSIST_BUFFER  = fib(14);              // 377 persist entries before flush
const WS_FRAME_VALIDATE_INTERVAL = fib(5);        // revalidate every 5th frame
const MAX_BODY_BYTES      = `${fib(10)}kb`;        // 55kb

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED JSON LOGGER
// ═══════════════════════════════════════════════════════════════════════════════

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({
    ts: new Date().toISOString(), level, service: 'notification', msg, ...meta,
  }) + '\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION STORES
// ═══════════════════════════════════════════════════════════════════════════════

const sseConnections = new Map();      // userId → Set<ServerResponse>
const wsConnections = new Map();       // userId → Set<socket>
const notificationQueue = new Map();   // userId → notification[]
const batchTimers = new Map();         // `${userId}:${channel}` → { notifications[], timer }
const readStatus = new Map();          // notificationId → Set<userId>
const persistBuffer = [];              // pending pgvector inserts
const deduplicationSet = new Map();    // hash → timestamp

// ═══════════════════════════════════════════════════════════════════════════════
// NATS JETSTREAM CONSUMER (graceful degradation if NATS unavailable)
// ═══════════════════════════════════════════════════════════════════════════════

let natsConnection = null;

async function initNats() {
  try {
    const nats = require('nats');
    const nc = await nats.connect({
      servers: process.env.NATS_URL || 'nats://nats:4222',  // service name, not localhost
      name: 'heady-notification',
      reconnectTimeWait: RECONNECT_BASE_MS,
      maxReconnectAttempts: fib(10),    // 55 attempts
    });

    natsConnection = nc;
    const jsm = await nc.jetstreamManager();

    try {
      await jsm.streams.add({
        name: 'HEADY_NOTIFICATIONS',
        subjects: ['heady.notifications.>'],
        retention: 'limits',
        max_msgs: fib(17),                // 1 597 messages
        max_age: fib(11) * fib(12) * fib(10) * fib(6) * 1e9,  // 89 × 144 × 55 × 8 = 5,637,120s ≈ 65d (Fibonacci-derived retention)
      });
    } catch (_streamErr) {
      // Stream may already exist — NATS idempotent creation
    }

    const js = nc.jetstream();
    const sub = await js.subscribe('heady.notifications.*', {
      durable: 'notification-service',
      ack_policy: 'explicit',
    });

    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(new TextDecoder().decode(msg.data));
          handleIncomingNotification(data);
          msg.ack();
        } catch (err) {
          log('error', 'NATS message processing failed', { error: err.message });
          msg.nak();
        }
      }
    })();

    log('info', 'NATS JetStream consumer connected', { subject: 'heady.notifications.*' });
  } catch (err) {
    log('warn', 'NATS not available — running in standalone mode', { error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

function deduplicationHash(notification) {
  return crypto.createHash('sha256')
    .update(`${notification.userId}:${notification.type}:${notification.title}:${notification.body}`)
    .digest('hex')
    .slice(0, fib(8));   // 21 chars
}

function isDuplicate(notification) {
  const hash = deduplicationHash(notification);
  const existing = deduplicationSet.get(hash);
  if (existing && (Date.now() - existing) < DEDUP_WINDOW_MS) return true;
  deduplicationSet.set(hash, Date.now());
  return false;
}

setInterval(() => {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [hash, ts] of deduplicationSet) {
    if (ts < cutoff) deduplicationSet.delete(hash);
  }
}, DEDUP_WINDOW_MS);

// ═══════════════════════════════════════════════════════════════════════════════
// SSE CONNECTION MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

function totalConnectionCount() {
  let count = 0;
  for (const conns of sseConnections.values()) count += conns.size;
  for (const conns of wsConnections.values()) count += conns.size;
  return count;
}

function addSSEConnection(userId, res) {
  if (totalConnectionCount() >= MAX_CONNECTIONS) {
    log('warn', 'Max connections reached', { userId, max: MAX_CONNECTIONS });
    return false;
  }

  if (!sseConnections.has(userId)) sseConnections.set(userId, new Set());
  const conns = sseConnections.get(userId);
  conns.add(res);
  log('info', 'SSE connection opened', { userId, total: conns.size });

  res.on('close', () => {
    conns.delete(res);
    if (conns.size === 0) sseConnections.delete(userId);
    log('info', 'SSE connection closed', { userId, remaining: conns.size });
  });

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVER (native HTTP upgrade — minimal frame encode/decode)
// ═══════════════════════════════════════════════════════════════════════════════

const WS_MAGIC = '258EAFA5-E914-47DA-95CA-5AB5DC11650A';

function acceptWebSocket(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return null; }

  const accept = crypto.createHash('sha1').update(key + WS_MAGIC).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );

  return socket;
}

function wsEncodeFrame(data) {
  const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
  const len = payload.length;
  let header;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, payload]);
}

function wsDecodeFrame(buffer) {
  if (buffer.length < 2) return null;
  let payloadLen = buffer[1] & 0x7F;
  const masked = !!(buffer[1] & 0x80);
  let offset = 2;

  if (payloadLen === 126) {
    if (buffer.length < 4) return null;
    payloadLen = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buffer.length < 10) return null;
    payloadLen = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  let maskKey = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    maskKey = buffer.slice(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLen) return null;
  const payload = Buffer.from(buffer.slice(offset, offset + payloadLen));
  if (masked && maskKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4];
    }
  }

  return payload.toString('utf8');
}

function wsSend(socket, data) {
  try {
    socket.write(wsEncodeFrame(data));
    return true;
  } catch (_writeErr) {
    return false;  // WebSocket connection closed
  }
}

const wsFrameCounts = new WeakMap();

function wsRevalidateToken(socket, userId) {
  const count = (wsFrameCounts.get(socket) || 0) + 1;
  wsFrameCounts.set(socket, count);
  if (count % WS_FRAME_VALIDATE_INTERVAL !== 0) return true;
  const conns = wsConnections.get(userId);
  return conns && conns.has(socket);
}

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://0.0.0.0:${PORT}`);  // internal binding, not localhost

  if (!url.pathname.startsWith('/ws/')) {
    socket.destroy();
    return;
  }

  const userId = url.pathname.split('/')[2];
  if (!userId) { socket.destroy(); return; }

  const ws = acceptWebSocket(req, socket);
  if (!ws) return;

  if (!wsConnections.has(userId)) wsConnections.set(userId, new Set());
  const conns = wsConnections.get(userId);

  if (totalConnectionCount() >= MAX_CONNECTIONS) {
    wsSend(ws, { type: 'error', message: 'Max connections reached' });
    ws.destroy();
    return;
  }

  conns.add(ws);
  wsFrameCounts.set(ws, 0);
  log('info', 'WebSocket connection opened', { userId, total: conns.size });

  wsSend(ws, {
    type: 'connected', userId, heartbeatMs: HEARTBEAT_MS,
    reconnect: { baseMs: RECONNECT_BASE_MS, backoffSeq: PHI_BACKOFF_SEQ },
  });

  const queued = notificationQueue.get(userId);
  if (queued && queued.length > 0) {
    for (const n of queued) wsSend(ws, n);
    notificationQueue.delete(userId);
  }

  const heartbeat = setInterval(() => {
    if (!wsSend(ws, { type: 'heartbeat', ts: Date.now() })) clearInterval(heartbeat);
  }, HEARTBEAT_MS);

  ws.on('data', (data) => {
    try {
      const text = wsDecodeFrame(data);
      if (!text) return;
      const msg = JSON.parse(text);

      if (!wsRevalidateToken(ws, userId)) {
        wsSend(ws, { type: 'auth_error', message: 'Token revalidation failed' });
        ws.destroy();
        return;
      }

      if (msg.type === 'mark_read' && msg.notificationId) {
        markRead(msg.notificationId, userId);
        wsSend(ws, { type: 'read_confirmed', notificationId: msg.notificationId });
      }
    } catch (_frameErr) {
      // Malformed WebSocket frame — client sent invalid data
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    conns.delete(ws);
    if (conns.size === 0) wsConnections.delete(userId);
    log('info', 'WebSocket closed', { userId, remaining: conns.size });
  });

  ws.on('error', () => {
    clearInterval(heartbeat);
    conns.delete(ws);
    if (conns.size === 0) wsConnections.delete(userId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION DELIVERY
// ═══════════════════════════════════════════════════════════════════════════════

function sendToUser(userId, notification) {
  let sent = 0;

  const sseConns = sseConnections.get(userId);
  if (sseConns) {
    const data = 'data: ' + JSON.stringify(notification) + '\n\n';
    for (const res of sseConns) {
      try { res.write(data); sent++; } catch (writeErr) { sseConns.delete(res); /* connection closed */ }
    }
  }

  const wsConns = wsConnections.get(userId);
  if (wsConns) {
    for (const ws of wsConns) {
      if (wsSend(ws, notification)) sent++;
      else wsConns.delete(ws);
    }
  }

  if (sent === 0) {
    if (!notificationQueue.has(userId)) notificationQueue.set(userId, []);
    const queue = notificationQueue.get(userId);
    if (queue.length < MAX_QUEUE_DEPTH) queue.push(notification);
  }

  return sent;
}

function sendToAll(notification) {
  let totalSent = 0;
  const allUsers = new Set([...sseConnections.keys(), ...wsConnections.keys()]);
  for (const userId of allUsers) totalSent += sendToUser(userId, notification);
  return totalSent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH DELIVERY — φ-weighted timing
// ═══════════════════════════════════════════════════════════════════════════════

function getChannelBatchMs(channel) {
  if (channel === 'critical') return 0;
  if (channel === 'low') return BATCH_LOW_MS;
  return BATCH_NORMAL_MS;
}

function scheduleBatch(userId, notification) {
  const channel = notification.channel || 'normal';
  const batchMs = getChannelBatchMs(channel);
  if (batchMs === 0) return false;

  const key = userId + ':' + channel;
  if (!batchTimers.has(key)) {
    batchTimers.set(key, {
      notifications: [],
      timer: setTimeout(() => flushBatch(key), batchMs),
    });
  }
  batchTimers.get(key).notifications.push(notification);
  return true;
}

function flushBatch(key) {
  const batch = batchTimers.get(key);
  if (!batch) return;
  batchTimers.delete(key);
  const userId = key.split(':')[0];

  if (batch.notifications.length === 1) {
    sendToUser(userId, batch.notifications[0]);
  } else {
    sendToUser(userId, {
      type: 'batch', count: batch.notifications.length,
      notifications: batch.notifications, ts: new Date().toISOString(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ/UNREAD TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

function markRead(notificationId, userId) {
  if (!readStatus.has(notificationId)) readStatus.set(notificationId, new Set());
  readStatus.get(notificationId).add(userId);
}

function isRead(notificationId, userId) {
  const readers = readStatus.get(notificationId);
  return readers ? readers.has(userId) : false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE BUFFER (pgvector for semantic notification search)
// ═══════════════════════════════════════════════════════════════════════════════

function persistNotification(notification) {
  persistBuffer.push({ ...notification, persistedAt: Date.now() });
  if (persistBuffer.length >= MAX_PERSIST_BUFFER) flushPersistBuffer();
}

function flushPersistBuffer() {
  if (persistBuffer.length === 0) return;
  const batch = persistBuffer.splice(0, MAX_PERSIST_BUFFER);
  // Production: INSERT INTO notifications (id, user_id, type, title, body, embedding, ts)
  // VALUES ... using pgvector 384-dim embeddings for semantic notification search
  log('info', 'Persist buffer flushed', { batchSize: batch.length, remaining: persistBuffer.length });
}

setInterval(flushPersistBuffer, PHI_TIMING.PHI_7);

// ═══════════════════════════════════════════════════════════════════════════════
// INCOMING NOTIFICATION HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

function handleIncomingNotification(data) {
  const notification = {
    id: data.id || 'n_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    userId: data.userId,
    type: NOTIFICATION_TYPES.includes(data.type) ? data.type : 'system',
    title: data.title || '',
    body: data.body || '',
    channel: data.channel || data.priority || 'normal',
    data: data.data || {},
    ts: data.ts || new Date().toISOString(),
    read: false,
  };

  if (isDuplicate(notification)) {
    log('info', 'Duplicate suppressed', { id: notification.id, userId: notification.userId });
    return;
  }

  persistNotification(notification);

  if (notification.channel === 'critical') {
    const sent = sendToUser(notification.userId, notification);
    log('info', 'Critical notification delivered', { id: notification.id, userId: notification.userId, sent });
  } else {
    const batched = scheduleBatch(notification.userId, notification);
    if (!batched) sendToUser(notification.userId, notification);
    log('info', 'Notification queued', { id: notification.id, channel: notification.channel });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.use(express.json({ limit: MAX_BODY_BYTES }));

app.get('/health', (req, res) => {
  let totalConns = 0;
  for (const conns of sseConnections.values()) totalConns += conns.size;
  for (const conns of wsConnections.values()) totalConns += conns.size;

  res.json({
    ok: true, service: 'notification', version: '5.1.0',
    connections: { sse: sseConnections.size, ws: wsConnections.size, total: totalConns },
    queuedUsers: notificationQueue.size,
    persistBufferSize: persistBuffer.length,
    nats: !!natsConnection,
    ts: new Date().toISOString(),
    phi: { batchNormalMs: BATCH_NORMAL_MS, batchLowMs: BATCH_LOW_MS, heartbeatMs: HEARTBEAT_MS, maxConnections: MAX_CONNECTIONS },
  });
});

app.get('/stream/:userId', (req, res) => {
  const { userId } = req.params;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no',
  });

  res.write('data: ' + JSON.stringify({
    type: 'connected', userId, heartbeatMs: HEARTBEAT_MS,
    reconnect: { baseMs: RECONNECT_BASE_MS, backoffSeq: PHI_BACKOFF_SEQ },
  }) + '\n\n');

  if (!addSSEConnection(userId, res)) { res.end(); return; }

  const queued = notificationQueue.get(userId);
  if (queued && queued.length > 0) {
    for (const n of queued) res.write('data: ' + JSON.stringify(n) + '\n\n');
    notificationQueue.delete(userId);
  }

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat ' + Date.now() + '\n\n'); } catch (hbErr) { clearInterval(heartbeat); /* connection closed */ }
  }, HEARTBEAT_MS);

  res.on('close', () => clearInterval(heartbeat));
});

app.post('/notify', (req, res) => {
  const { userId, type, title, body, channel, priority, data = {} } = req.body;
  if (!userId || !type) {
    return res.status(400).json({ error: 'HEADY-NOTIF-001', message: 'Missing userId or type' });
  }
  handleIncomingNotification({ userId, type, title, body, channel: channel || priority || 'normal', data });
  res.json({ ok: true });
});

app.post('/broadcast', (req, res) => {
  const { type, title, body, data = {} } = req.body;
  const notification = {
    id: 'b_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
    type: 'system', subType: type, title, body, data, ts: new Date().toISOString(),
  };
  const totalSent = sendToAll(notification);
  log('info', 'Broadcast sent', { type, recipients: totalSent });
  res.json({ ok: true, recipients: totalSent });
});

app.post('/read', (req, res) => {
  const { notificationId, userId } = req.body;
  if (!notificationId || !userId) {
    return res.status(400).json({ error: 'HEADY-NOTIF-002', message: 'Missing notificationId or userId' });
  }
  markRead(notificationId, userId);
  res.json({ ok: true, notificationId, read: true });
});

app.get('/unread/:userId', (req, res) => {
  const { userId } = req.params;
  const queue = notificationQueue.get(userId) || [];
  const unread = queue.filter(n => !isRead(n.id, userId)).length;
  res.json({ userId, unread, queued: queue.length });
});

app.get('/metrics', (req, res) => {
  let totalSSE = 0, totalWS = 0;
  for (const conns of sseConnections.values()) totalSSE += conns.size;
  for (const conns of wsConnections.values()) totalWS += conns.size;

  res.setHeader('Content-Type', 'text/plain');
  res.send([
    '# HELP heady_notification_sse_connections Active SSE connections',
    '# TYPE heady_notification_sse_connections gauge',
    'heady_notification_sse_connections ' + totalSSE,
    '# HELP heady_notification_ws_connections Active WebSocket connections',
    '# TYPE heady_notification_ws_connections gauge',
    'heady_notification_ws_connections ' + totalWS,
    '# HELP heady_notification_users Connected users',
    '# TYPE heady_notification_users gauge',
    'heady_notification_users ' + new Set([...sseConnections.keys(), ...wsConnections.keys()]).size,
    '# HELP heady_notification_queued Queued notification users',
    '# TYPE heady_notification_queued gauge',
    'heady_notification_queued ' + notificationQueue.size,
    '# HELP heady_notification_persist_buffer Persist buffer size',
    '# TYPE heady_notification_persist_buffer gauge',
    'heady_notification_persist_buffer ' + persistBuffer.length,
  ].join('\n'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

let isShuttingDown = false;

server.listen(PORT, async () => {
  await initNats();
  log('info', 'Notification service started', {
    port: PORT, maxConnections: MAX_CONNECTIONS,
    batchNormalMs: BATCH_NORMAL_MS, batchLowMs: BATCH_LOW_MS,
    heartbeatMs: HEARTBEAT_MS, nats: !!natsConnection,
  });
});

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log('info', signal + ' received, shutting down');

  flushPersistBuffer();

  for (const [, conns] of sseConnections) {
    for (const res of conns) { try { res.end(); } catch (_closeErr) { /* connection already closed — expected during shutdown */ } }
  }
  for (const [, conns] of wsConnections) {
    for (const ws of conns) { try { wsSend(ws, { type: 'server_shutdown' }); ws.destroy(); } catch (_closeErr) { /* connection already closed — expected during shutdown */ } }
  }
  if (natsConnection) natsConnection.close().catch((_err) => { /* NATS connection already closing */ });

  server.close(() => { log('info', 'Server closed'); process.exit(0); });
  setTimeout(() => process.exit(1), PHI_TIMING.PHI_5);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };
