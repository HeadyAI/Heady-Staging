import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { WSConnection, ChannelMessage, NotificationPayload, AuthToken } from '../types';
import { logger } from '../logger';
import { wsTokenAuthMiddleware } from '../middleware/auth';
import { cslGateEngine } from '../csl-gates';
import {
  TOKEN_REVALIDATION_INTERVAL_MS,
  WS_HEARTBEAT_INTERVAL_MS,
  CONNECTION_TIMEOUT_MS,
  MAX_MESSAGE_QUEUE_SIZE
} from '../constants';

export class WebSocketChannelHandler {
  private wss: WebSocketServer;
  private connections: Map<string, WSConnection & { ws: WebSocket; queue: ChannelMessage[] }> = new Map();
  private tokenRevalidationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', this.handleConnection.bind(this));
    logger.info('websocket', 'WebSocket server initialized', { path: '/ws' });
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const connectionId = uuidv4();
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('websocket', 'Connection rejected: missing token', { connectionId });
      ws.close(4001, 'Missing authentication token');
      return;
    }

    const authToken = wsTokenAuthMiddleware(token);

    if (!authToken) {
      logger.warn('websocket', 'Connection rejected: invalid token', { connectionId, userId: 'unknown' });
      ws.close(4002, 'Invalid authentication token');
      return;
    }

    const nowMs = Date.now();
    const connection: WSConnection & { ws: WebSocket; queue: ChannelMessage[] } = {
      userId: authToken.userId,
      sessionId: authToken.sessionId,
      tokenValidatedAt: nowMs,
      connectionStartTime: nowMs,
      messageCount: 0,
      lastHeartbeat: nowMs,
      ws,
      queue: []
    };

    this.connections.set(connectionId, connection);
    logger.info('websocket', 'Client connected', {
      userId: authToken.userId,
      sessionId: authToken.sessionId,
      connectionId
    });

    ws.on('message', (data: Buffer) => this.handleMessage(connectionId, data));
    ws.on('close', () => this.handleClose(connectionId));
    ws.on('error', (error: Error) => this.handleError(connectionId, error));

    this.startTokenRevalidation(connectionId, authToken);
    this.startHeartbeat(connectionId);

    this.sendWelcomeMessage(connectionId);
  }

  private handleMessage(connectionId: string, data: Buffer): void {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    try {
      const message = JSON.parse(data.toString());

      const healthGate = cslGateEngine.evaluateConnectionHealth(
        Date.now() - connection.connectionStartTime,
        connection.messageCount,
        Date.now() - connection.lastHeartbeat
      );

      if (!healthGate.decision) {
        logger.warn('websocket', 'Connection health check failed', {
          connectionId,
          userId: connection.userId,
          reason: healthGate.reason
        });
        connection.ws.close(4003, 'Connection unhealthy');
        return;
      }

      connection.messageCount += 1;

      logger.debug('websocket', 'Message received', {
        connectionId,
        userId: connection.userId,
        messageType: message.type
      });

      if (message.type === 'ping') {
        this.sendPong(connectionId);
      }
    } catch (error) {
      logger.error('websocket', 'Error parsing WebSocket message', error as Error, { connectionId });
    }
  }

  private handleClose(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (connection) {
      logger.info('websocket', 'Client disconnected', {
        connectionId,
        userId: connection.userId,
        messageCount: connection.messageCount,
        uptime: Date.now() - connection.connectionStartTime
      });
    }

    this.cleanupConnection(connectionId);
  }

  private handleError(connectionId: string, error: Error): void {
    const connection = this.connections.get(connectionId);

    logger.error('websocket', 'WebSocket error', error, {
      connectionId,
      userId: connection?.userId
    });
  }

  private startTokenRevalidation(connectionId: string, authToken: AuthToken): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(connectionId);

      if (!connection) {
        clearInterval(interval);
        return;
      }

      const tokenGate = cslGateEngine.evaluateTokenValidity(authToken, Math.floor(Date.now() / 1000));

      if (!tokenGate.decision) {
        logger.warn('websocket', 'Token revalidation failed', {
          connectionId,
          userId: connection.userId,
          reason: tokenGate.reason
        });
        connection.ws.close(4004, 'Token revalidation failed');
        clearInterval(interval);
        return;
      }

      connection.tokenValidatedAt = Date.now();
      logger.debug('websocket', 'Token revalidated', {
        connectionId,
        userId: connection.userId,
        confidence: tokenGate.confidence.toFixed(3)
      });
    }, TOKEN_REVALIDATION_INTERVAL_MS);

    this.tokenRevalidationIntervals.set(connectionId, interval);
  }

  private startHeartbeat(connectionId: string): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(connectionId);

      if (!connection) {
        clearInterval(interval);
        return;
      }

      if (connection.ws.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }

      this.sendHeartbeat(connectionId);
    }, WS_HEARTBEAT_INTERVAL_MS);

    this.heartbeatIntervals.set(connectionId, interval);
  }

  private sendWelcomeMessage(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ChannelMessage = {
      id: uuidv4(),
      type: 'system',
      payload: {
        message: 'Connected to notification service',
        connectionId,
        userId: connection.userId
      },
      timestamp: Date.now()
    };

    connection.ws.send(JSON.stringify(message));
    logger.debug('websocket', 'Welcome message sent', { connectionId });
  }

  private sendHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ChannelMessage = {
      id: uuidv4(),
      type: 'heartbeat',
      payload: { timestamp: Date.now() },
      timestamp: Date.now()
    };

    connection.ws.send(JSON.stringify(message));
    connection.lastHeartbeat = Date.now();
  }

  private sendPong(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'pong',
      timestamp: Date.now()
    };

    connection.ws.send(JSON.stringify(message));
  }

  private cleanupConnection(connectionId: string): void {
    const revalidationInterval = this.tokenRevalidationIntervals.get(connectionId);
    const heartbeatInterval = this.heartbeatIntervals.get(connectionId);

    if (revalidationInterval) {
      clearInterval(revalidationInterval);
      this.tokenRevalidationIntervals.delete(connectionId);
    }

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(connectionId);
    }

    this.connections.delete(connectionId);
  }

  public broadcastToUser(userId: string, notification: NotificationPayload): void {
    const message: ChannelMessage = {
      id: notification.id,
      type: 'notification',
      payload: notification,
      timestamp: Date.now()
    };

    let broadcastCount = 0;

    this.connections.forEach((connection, connectionId) => {
      if (connection.userId === userId && connection.ws.readyState === WebSocket.OPEN) {
        if (connection.queue.length >= MAX_MESSAGE_QUEUE_SIZE) {
          connection.queue.shift();
        }

        connection.queue.push(message);
        connection.ws.send(JSON.stringify(message));
        broadcastCount += 1;
      }
    });

    logger.info('websocket', 'Notification broadcasted', {
      userId,
      notificationId: notification.id,
      connectionCount: broadcastCount
    });
  }

  public getConnectionStats(): { totalConnections: number; userConnections: Map<string, number> } {
    const userConnections = new Map<string, number>();

    this.connections.forEach((connection) => {
      const count = userConnections.get(connection.userId) || 0;
      userConnections.set(connection.userId, count + 1);
    });

    return {
      totalConnections: this.connections.size,
      userConnections
    };
  }
}
