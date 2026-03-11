import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { NotificationPayload, ChannelMessage, AuthToken } from '../types';
import { logger } from '../logger';
import { cslGateEngine } from '../csl-gates';
import { SSE_RECONNECT_DELAY_MS, MAX_MESSAGE_QUEUE_SIZE } from '../constants';

interface SSEConnection {
  userId: string;
  sessionId: string;
  response: Response;
  lastHeartbeat: number;
  messageCount: number;
  startTime: number;
  queue: ChannelMessage[];
  isActive: boolean;
}

export class SSEChannelHandler {
  private connections: Map<string, SSEConnection> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  public addConnection(connectionId: string, user: AuthToken, res: Response): void {
    const nowMs = Date.now();

    const connection: SSEConnection = {
      userId: user.userId,
      sessionId: user.sessionId,
      response: res,
      lastHeartbeat: nowMs,
      messageCount: 0,
      startTime: nowMs,
      queue: [],
      isActive: true
    };

    this.connections.set(connectionId, connection);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'X-Accel-Buffering': 'no'
    });

    res.write(this.formatSSEMessage('connected', {
      message: 'Connected to notification stream',
      connectionId,
      userId: user.userId,
      timestamp: nowMs
    }));

    logger.info('sse', 'SSE client connected', {
      connectionId,
      userId: user.userId,
      sessionId: user.sessionId
    });

    res.on('close', () => this.removeConnection(connectionId));
    res.on('error', (error: Error) => this.handleError(connectionId, error));

    this.startHeartbeat(connectionId);
  }

  private startHeartbeat(connectionId: string): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(connectionId);

      if (!connection) {
        clearInterval(interval);
        return;
      }

      if (!connection.isActive) {
        clearInterval(interval);
        this.removeConnection(connectionId);
        return;
      }

      const healthGate = cslGateEngine.evaluateConnectionHealth(
        Date.now() - connection.startTime,
        connection.messageCount,
        Date.now() - connection.lastHeartbeat
      );

      if (!healthGate.decision) {
        logger.warn('sse', 'Connection health check failed', {
          connectionId,
          userId: connection.userId,
          reason: healthGate.reason
        });
        connection.isActive = false;
        connection.response.end();
        clearInterval(interval);
        this.removeConnection(connectionId);
        return;
      }

      this.sendHeartbeat(connectionId);
    }, Math.round(55 * 1000));

    this.heartbeatIntervals.set(connectionId, interval);
  }

  private sendHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection || !connection.isActive) {
      return;
    }

    try {
      connection.response.write(this.formatSSEMessage('heartbeat', {
        timestamp: Date.now()
      }));
      connection.lastHeartbeat = Date.now();
    } catch (error) {
      logger.error('sse', 'Error sending heartbeat', error as Error, { connectionId });
      connection.isActive = false;
    }
  }

  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (connection) {
      logger.info('sse', 'SSE client disconnected', {
        connectionId,
        userId: connection.userId,
        messageCount: connection.messageCount,
        uptime: Date.now() - connection.startTime
      });
    }

    const heartbeatInterval = this.heartbeatIntervals.get(connectionId);

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      this.heartbeatIntervals.delete(connectionId);
    }

    this.connections.delete(connectionId);
  }

  private handleError(connectionId: string, error: Error): void {
    const connection = this.connections.get(connectionId);

    logger.error('sse', 'SSE connection error', error, {
      connectionId,
      userId: connection?.userId
    });

    const heartbeatInterval = this.heartbeatIntervals.get(connectionId);

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    this.connections.delete(connectionId);
  }

  private formatSSEMessage(type: string, data: Record<string, unknown>): string {
    return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
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
      if (connection.userId === userId && connection.isActive) {
        if (connection.queue.length >= MAX_MESSAGE_QUEUE_SIZE) {
          connection.queue.shift();
        }

        connection.queue.push(message);

        try {
          connection.response.write(this.formatSSEMessage('notification', message));
          connection.messageCount += 1;
          broadcastCount += 1;
        } catch (error) {
          logger.error('sse', 'Error broadcasting notification', error as Error, {
            connectionId,
            notificationId: notification.id
          });
          connection.isActive = false;
        }
      }
    });

    logger.info('sse', 'Notification broadcasted', {
      userId,
      notificationId: notification.id,
      connectionCount: broadcastCount
    });
  }

  public getConnectionStats(): { totalConnections: number; userConnections: Map<string, number> } {
    const userConnections = new Map<string, number>();

    this.connections.forEach((connection) => {
      if (connection.isActive) {
        const count = userConnections.get(connection.userId) || 0;
        userConnections.set(connection.userId, count + 1);
      }
    });

    return {
      totalConnections: Array.from(this.connections.values()).filter(c => c.isActive).length,
      userConnections
    };
  }
}
