/**
 * Heady™ Notification Service
 * Real-time notifications via WebSocket + SSE + optional push
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder
 */

'use strict';

const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { createLogger, requestLogger } = require('../../shared/logger');
const { securityHeaders, gracefulShutdown } = require('../../shared/security-headers');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.SERVICE_PORT || 3395;
const PHI = 1.618033988749895;
const FIB_13 = 13;
const FIB_89 = 89;

const logger = createLogger({ service: 'notification-service', domain: 'web' });

app.use(express.json({ limit: '256kb' }));
app.use(securityHeaders());
app.use(requestLogger(logger));

// Connected clients by userId
const clients = new Map();

// Health check
app.get('/health', (_, res) => res.json({
    status: 'healthy',
    service: 'notification-service',
    connections: clients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
}));

// SSE endpoint for clients that don't support WebSocket
app.get('/api/v1/notifications/stream', (req, res) => {
    const userId = req.query.userId;
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId (string) required' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    const sseClient = { type: 'sse', res, userId };
    if (!clients.has(userId)) clients.set(userId, []);
    clients.get(userId).push(sseClient);

    logger.info({ userId, type: 'sse' }, 'SSE client connected');

    // Heartbeat on Fibonacci interval (13s)
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), FIB_13 * 1000);

    req.on('close', () => {
        clearInterval(heartbeat);
        const userClients = clients.get(userId) || [];
        clients.set(userId, userClients.filter(c => c !== sseClient));
        if (clients.get(userId)?.length === 0) clients.delete(userId);
        logger.info({ userId, type: 'sse' }, 'SSE client disconnected');
    });
});

// Send notification to specific user
app.post('/api/v1/notifications/send', (req, res) => {
    const { userId, type, title, message, data } = req.body;
    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId (string) required' });
    }
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'type (string) required' });
    }

    const notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: String(type).slice(0, 50),
        title: title ? String(title).slice(0, 200) : undefined,
        message: message ? String(message).slice(0, 2000) : undefined,
        data,
        timestamp: new Date().toISOString(),
    };

    const delivered = deliverToUser(userId, notification);
    logger.info({ userId, type, delivered }, 'Notification sent');
    res.json({ delivered, notification });
});

// Broadcast to all connected users
app.post('/api/v1/notifications/broadcast', (req, res) => {
    const { type, title, message, data } = req.body;
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'type (string) required' });
    }

    const notification = {
        id: `broadcast-${Date.now()}`,
        type: String(type).slice(0, 50),
        title: title ? String(title).slice(0, 200) : undefined,
        message: message ? String(message).slice(0, 2000) : undefined,
        data,
        timestamp: new Date().toISOString(),
    };

    let totalDelivered = 0;
    for (const [userId] of clients) {
        totalDelivered += deliverToUser(userId, notification);
    }
    logger.info({ type, totalDelivered, connectedUsers: clients.size }, 'Broadcast sent');
    res.json({ totalDelivered, notification });
});

function deliverToUser(userId, notification) {
    const userClients = clients.get(userId) || [];
    let delivered = 0;

    for (const client of userClients) {
        try {
            if (client.type === 'ws' && client.ws.readyState === 1) {
                client.ws.send(JSON.stringify(notification));
                delivered++;
            } else if (client.type === 'sse') {
                client.res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
                delivered++;
            }
        } catch (err) {
            logger.warn({ err, userId, clientType: client.type }, 'Failed to deliver notification');
        }
    }
    return delivered;
}

// WebSocket connections with reconnection support
wss.on('connection', (ws, req) => {
    const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
    if (!userId) {
        ws.close(4400, 'userId required');
        return;
    }

    const wsClient = { type: 'ws', ws, userId };
    if (!clients.has(userId)) clients.set(userId, []);
    clients.get(userId).push(wsClient);

    logger.info({ userId, type: 'ws' }, 'WebSocket client connected');

    // Heartbeat ping on Fibonacci interval (13s)
    const pingInterval = setInterval(() => {
        if (ws.readyState === 1) ws.ping();
    }, FIB_13 * 1000);

    ws.on('pong', () => {
        wsClient.lastPong = Date.now();
    });

    ws.on('close', () => {
        clearInterval(pingInterval);
        const userClients = clients.get(userId) || [];
        clients.set(userId, userClients.filter(c => c !== wsClient));
        if (clients.get(userId)?.length === 0) clients.delete(userId);
        logger.info({ userId, type: 'ws' }, 'WebSocket client disconnected');
    });

    ws.on('error', (err) => {
        logger.error({ err, userId }, 'WebSocket error');
    });

    ws.send(JSON.stringify({ type: 'connected', userId }));
});

server.listen(PORT, () => {
    logger.info({ port: PORT }, 'notification-service listening');
});

gracefulShutdown(server, logger, {});

module.exports = app;
