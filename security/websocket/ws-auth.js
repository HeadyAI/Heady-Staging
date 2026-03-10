/**
 * Heady WebSocket Authentication — Sacred Genesis v4.0.0
 * Secure WebSocket handshake with session validation and CSRF protection
 *
 * @module ws-auth
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const crypto = require('crypto');
const { PHI, PSI, fib, phiThreshold } = require('../../shared/phi-math');

const MAX_CONNECTIONS = fib(12);
const HEARTBEAT_INTERVAL_MS = fib(9) * 1000;
const CONNECTION_TIMEOUT_MS = fib(11) * 1000;
const MAX_MESSAGE_SIZE = fib(16) * 1024;
const MESSAGE_RATE_LIMIT = fib(11);

const connections = new Map();

function validateUpgrade(req) {
  if (connections.size >= MAX_CONNECTIONS) return { valid: false, error: 'Maximum connections reached' };
  const upgradeHeader = req.headers.upgrade;
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') return { valid: false, error: 'Invalid upgrade header' };
  const key = req.headers['sec-websocket-key'];
  if (!key) return { valid: false, error: 'Missing WebSocket key' };
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies['heady_sid'];
  if (!sessionId) return { valid: false, error: 'No session cookie' };
  const origin = req.headers.origin;
  const allowedOrigins = ['https://headyme.com', 'https://headysystems.com', 'https://headybuddy.com', 'https://admin.headysystems.com'];
  if (origin && !allowedOrigins.includes(origin)) return { valid: false, error: 'Origin not allowed' };
  return { valid: true, sessionId, userId: 'pending-validation' };
}

function registerConnection(userId, sessionId, ipAddress) {
  const id = `ws-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const now = Date.now();
  const conn = { id, userId, sessionId, connectedAt: now, lastHeartbeat: now, messageCount: 0, windowStart: now, ipAddress };
  connections.set(id, conn);
  return conn;
}

function checkRateLimit(connectionId) {
  const conn = connections.get(connectionId);
  if (!conn) return { allowed: false, remaining: 0 };
  const now = Date.now();
  if (now - conn.windowStart > 60000) { conn.messageCount = 0; conn.windowStart = now; }
  if (conn.messageCount >= MESSAGE_RATE_LIMIT) return { allowed: false, remaining: 0 };
  conn.messageCount++;
  return { allowed: true, remaining: MESSAGE_RATE_LIMIT - conn.messageCount };
}

function heartbeat(connectionId) {
  const conn = connections.get(connectionId);
  if (!conn) return false;
  conn.lastHeartbeat = Date.now();
  return true;
}

function removeConnection(connectionId) { connections.delete(connectionId); }

function evictStale() {
  const cutoff = Date.now() - CONNECTION_TIMEOUT_MS;
  let evicted = 0;
  for (const [id, conn] of connections) {
    if (conn.lastHeartbeat < cutoff) { connections.delete(id); evicted++; }
  }
  return evicted;
}

function getStats() {
  return { activeConnections: connections.size, maxConnections: MAX_CONNECTIONS, heartbeatInterval: HEARTBEAT_INTERVAL_MS, connectionTimeout: CONNECTION_TIMEOUT_MS, messageRateLimit: MESSAGE_RATE_LIMIT, maxMessageSize: MAX_MESSAGE_SIZE };
}

function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(pair => {
    const [key, ...val] = pair.trim().split('=');
    if (key) cookies[key.trim()] = val.join('=').trim();
  });
  return cookies;
}

setInterval(evictStale, HEARTBEAT_INTERVAL_MS);

module.exports = { validateUpgrade, registerConnection, checkRateLimit, heartbeat, removeConnection, evictStale, getStats, MAX_CONNECTIONS, HEARTBEAT_INTERVAL_MS, CONNECTION_TIMEOUT_MS, MAX_MESSAGE_SIZE, MESSAGE_RATE_LIMIT };
