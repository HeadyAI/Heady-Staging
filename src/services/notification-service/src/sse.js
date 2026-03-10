'use strict';

// FIB[8] = 21 → 21000ms keep-alive interval
const SSE_KEEPALIVE_MS = 21000;

/**
 * Create an SSE endpoint handler for real-time notifications.
 *
 * @param {object} params
 * @param {Function} params.validateToken — async (token) => { uid, ... } or throws
 * @param {import('./channels').ChannelManager} params.channelManager
 * @param {object} params.log — structured logger
 * @returns {Function} Express route handler
 */
function createSSEHandler({ validateToken, channelManager, log }) {
  return async function sseHandler(req, res) {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        code: 'HEADY-NOTIF-001',
        message: 'Token required as ?token= query parameter or Authorization header',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let user;
    try {
      user = await validateToken(token);
    } catch (err) {
      log.warn('SSE: auth failed', { error: err.message });
      res.status(401).json({
        code: 'HEADY-NOTIF-002',
        message: 'Invalid token',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write('retry: 5000\n\n');

    // Create a send adapter that writes SSE format
    const sseConnection = {
      send(data) {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        res.write(`data: ${payload}\n\n`);
      },
    };

    const tagged = channelManager.registerConnection(user.uid, sseConnection);
    log.info('SSE: client connected', { userId: user.uid });

    // Subscribe to channels from query parameter
    const channels = req.query.channels ? req.query.channels.split(',') : ['system'];
    for (const ch of channels) {
      channelManager.subscribe(user.uid, ch.trim());
    }

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({
      userId: user.uid,
      channels,
      keepAliveInterval: SSE_KEEPALIVE_MS,
    })}\n\n`);

    // Keep-alive at FIB[8] = 21s intervals
    const keepAlive = setInterval(() => {
      try {
        res.write(`:keepalive ${new Date().toISOString()}\n\n`);
      } catch {
        clearInterval(keepAlive);
      }
    }, SSE_KEEPALIVE_MS);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      channelManager.removeConnection(user.uid, tagged);
      log.info('SSE: client disconnected', { userId: user.uid });
    });
  };
}

module.exports = {
  createSSEHandler,
  SSE_KEEPALIVE_MS,
};
