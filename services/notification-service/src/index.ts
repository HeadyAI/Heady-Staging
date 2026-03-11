import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { cookieAuthMiddleware } from './middleware/auth';
import { WebSocketChannelHandler } from './channels/websocket';
import { SSEChannelHandler } from './channels/sse';
import { PushChannelHandler } from './channels/push';
import { logger } from './logger';
import { NotificationPayload, HealthStatus, AuthToken } from './types';
import { PORT, HEALTH_CHECK_INTERVAL_MS } from './constants';

const app = express();
const server = http.createServer(app);

const wsHandler = new WebSocketChannelHandler(server);
const sseHandler = new SSEChannelHandler();
const pushHandler = new PushChannelHandler();

let startTime = Date.now();
let requestCount = 0;

app.use(express.json({ limit: '1mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  logger.setContext({ correlationId });
  requestCount += 1;
  next();
});

app.get('/health', (req: Request, res: Response) => {
  const wsStats = wsHandler.getConnectionStats();
  const sseStats = sseHandler.getConnectionStats();
  const pushStats = pushHandler.getSubscriptionStats();
  const pushDelivery = pushHandler.getRecentDeliveryStats();

  const uptime = Date.now() - startTime;
  const memUsage = process.memoryUsage();

  const isHealthy = wsStats.totalConnections >= 0 && sseStats.totalConnections >= 0;
  const status: HealthStatus = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: Date.now(),
    uptime,
    connections: wsStats.totalConnections + sseStats.totalConnections,
    memoryUsage: memUsage,
    checks: {
      websocket: true,
      sse: true,
      push: true
    }
  };

  res.status(isHealthy ? 200 : 503).json(status);
  logger.debug('health', 'Health check performed', { status: status.status });
});

app.post('/api/notifications/send', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const startTime = Date.now();

  try {
    const { title, body, data, icon, badge, tag, requiresInteraction, targetUserId } = req.body;

    if (!title || !body) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'title and body are required',
        code: 'INVALID_PAYLOAD'
      });
      return;
    }

    if (!targetUserId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'targetUserId is required',
        code: 'MISSING_TARGET'
      });
      return;
    }

    const notification: NotificationPayload = {
      id: uuidv4(),
      userId: targetUserId,
      title,
      body,
      data: data || {},
      timestamp: Date.now(),
      icon,
      badge,
      tag,
      requiresInteraction: requiresInteraction || false
    };

    wsHandler.broadcastToUser(targetUserId, notification);
    sseHandler.broadcastToUser(targetUserId, notification);
    pushHandler.sendPushNotification(targetUserId, notification).catch((error) => {
      logger.error('notifications', 'Error sending push notifications', error as Error, {
        notificationId: notification.id,
        userId: targetUserId
      });
    });

    logger.info('notifications', 'Notification sent', {
      notificationId: notification.id,
      targetUserId,
      sender: user.userId,
      duration: Date.now() - startTime
    });

    res.status(201).json({
      id: notification.id,
      timestamp: notification.timestamp,
      channels: ['websocket', 'sse', 'push']
    });
  } catch (error) {
    logger.error('notifications', 'Error sending notification', error as Error, {
      userId: user.userId,
      duration: Date.now() - startTime
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'SEND_ERROR'
    });
  }
});

app.get('/api/notifications/stream', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const connectionId = uuidv4();

  logger.info('notifications', 'SSE stream requested', {
    connectionId,
    userId: user.userId,
    sessionId: user.sessionId
  });

  sseHandler.addConnection(connectionId, user, res);
});

app.post('/api/push/subscribe', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;

  try {
    const { endpoint, p256dh, auth } = req.body;

    if (!endpoint || !p256dh || !auth) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'endpoint, p256dh, and auth are required',
        code: 'INVALID_SUBSCRIPTION'
      });
      return;
    }

    const subscriptionId = pushHandler.registerSubscription(user.userId, {
      endpoint,
      p256dh,
      auth
    });

    res.status(201).json({
      subscriptionId,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('notifications', 'Error registering push subscription', error as Error, {
      userId: user.userId
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'SUBSCRIPTION_ERROR'
    });
  }
});

app.delete('/api/push/subscribe/:subscriptionId', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const { subscriptionId } = req.params;

  try {
    pushHandler.unregisterSubscription(subscriptionId);

    logger.info('notifications', 'Push subscription unregistered', {
      subscriptionId,
      userId: user.userId
    });

    res.status(204).send();
  } catch (error) {
    logger.error('notifications', 'Error unregistering push subscription', error as Error, {
      userId: user.userId,
      subscriptionId
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'UNSUBSCRIPTION_ERROR'
    });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('app', 'Unhandled error', err, {
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal Server Error',
    code: 'UNHANDLED_ERROR'
  });
});

server.listen(PORT, () => {
  startTime = Date.now();
  logger.info('app', 'Notification service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

process.on('SIGTERM', () => {
  logger.info('app', 'SIGTERM received, graceful shutdown initiated', { requestCount });

  server.close(() => {
    logger.info('app', 'Server closed', { uptime: Date.now() - startTime });
    process.exit(0);
  });

  setTimeout(() => {
    logger.fatal('app', 'Graceful shutdown timeout exceeded');
  }, 30000);
});

process.on('SIGINT', () => {
  logger.info('app', 'SIGINT received, graceful shutdown initiated', { requestCount });

  server.close(() => {
    logger.info('app', 'Server closed', { uptime: Date.now() - startTime });
    process.exit(0);
  });

  setTimeout(() => {
    logger.fatal('app', 'Graceful shutdown timeout exceeded');
  }, 30000);
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal('app', 'Uncaught exception', error);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal('app', 'Unhandled rejection', new Error(String(reason)));
});

export default app;
