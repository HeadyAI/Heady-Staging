'use strict';

const { WebSocketServer } = require('ws');

// PHI-scaled constants
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;

// FIB[7] = 13 → 13000ms heartbeat interval
const HEARTBEAT_INTERVAL_MS = 13000;

// Phi-backoff parameters for reconnection guidance
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 60000;

/**
 * Compute phi-backoff delay for a given attempt.
 * @param {number} attempt
 * @returns {number} delay in ms
 */
function phiBackoffDelay(attempt) {
  const raw = BACKOFF_BASE_MS * Math.pow(PHI, attempt);
  const jitter = (1 - PSI2) + Math.random() * (2 * PSI2);
  return Math.min(Math.round(raw * jitter), BACKOFF_MAX_MS);
}

/**
 * Create and configure the WebSocket server.
 *
 * @param {object} params
 * @param {import('http').Server} params.server — HTTP server to attach to
 * @param {Function} params.validateToken — async (token) => { uid, ... } or throws
 * @param {import('./channels').ChannelManager} params.channelManager
 * @param {object} params.log — structured logger
 * @returns {WebSocketServer}
 */
function createWebSocketServer({ server, validateToken, channelManager, log }) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat tracking
  const heartbeatTimer = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws._isAlive === false) {
        log.warn('WebSocket: client failed heartbeat, terminating', { userId: ws._userId });
        ws.terminate();
        continue;
      }
      ws._isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatTimer);
  });

  wss.on('connection', async (ws, req) => {
    ws._isAlive = true;
    ws._userId = null;
    ws._tagged = null;

    ws.on('pong', () => {
      ws._isAlive = true;
    });

    // Extract token from query string for initial auth
    const url = new URL(req.url, `http://${req.headers.host}`);
    const initialToken = url.searchParams.get('token');

    if (!initialToken) {
      ws.send(JSON.stringify({
        type: 'error',
        code: 'AUTH_REQUIRED',
        message: 'Token required as ?token= query parameter',
      }));
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const user = await validateToken(initialToken);
      ws._userId = user.uid;
      ws._tagged = channelManager.registerConnection(user.uid, ws);

      log.info('WebSocket: client connected', { userId: user.uid });

      ws.send(JSON.stringify({
        type: 'connected',
        userId: user.uid,
        heartbeatInterval: HEARTBEAT_INTERVAL_MS,
      }));
    } catch (err) {
      log.warn('WebSocket: auth failed', { error: err.message });
      ws.send(JSON.stringify({
        type: 'error',
        code: 'AUTH_FAILED',
        message: 'Token validation failed',
      }));
      ws.close(4001, 'Authentication failed');
      return;
    }

    ws.on('message', async (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', code: 'INVALID_JSON', message: 'Invalid JSON' }));
        return;
      }

      // Re-validate token on every message frame
      if (!msg.token) {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'TOKEN_REQUIRED',
          message: 'Token required in every message',
          reconnectDelay: phiBackoffDelay(0),
        }));
        ws.close(4001, 'Token required');
        return;
      }

      try {
        const user = await validateToken(msg.token);
        if (user.uid !== ws._userId) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'USER_MISMATCH',
            message: 'Token user does not match connection',
          }));
          ws.close(4003, 'User mismatch');
          return;
        }
      } catch (err) {
        log.warn('WebSocket: message re-auth failed', { userId: ws._userId, error: err.message });
        ws.send(JSON.stringify({
          type: 'error',
          code: 'AUTH_EXPIRED',
          message: 'Token expired or revoked',
          reconnectDelay: phiBackoffDelay(0),
        }));
        ws.close(4001, 'Re-authentication failed');
        return;
      }

      // Handle message actions
      switch (msg.action) {
        case 'subscribe': {
          const ok = channelManager.subscribe(ws._userId, msg.channel);
          ws.send(JSON.stringify({
            type: 'subscribed',
            channel: msg.channel,
            success: ok,
          }));
          break;
        }
        case 'unsubscribe': {
          const ok = channelManager.unsubscribe(ws._userId, msg.channel);
          ws.send(JSON.stringify({
            type: 'unsubscribed',
            channel: msg.channel,
            success: ok,
          }));
          break;
        }
        case 'ping': {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        }
        default: {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${msg.action}`,
          }));
        }
      }
    });

    ws.on('close', () => {
      if (ws._userId && ws._tagged) {
        channelManager.removeConnection(ws._userId, ws._tagged);
        log.info('WebSocket: client disconnected', { userId: ws._userId });
      }
    });

    ws.on('error', (err) => {
      log.error('WebSocket: error', { userId: ws._userId, error: err.message });
    });
  });

  return wss;
}

module.exports = {
  createWebSocketServer,
  phiBackoffDelay,
  HEARTBEAT_INTERVAL_MS,
};
