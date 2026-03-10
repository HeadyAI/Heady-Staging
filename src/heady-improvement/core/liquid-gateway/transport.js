/**
 * HeadyLiquidGateway — Streaming Transport Layer
 * 
 * MCP-compatible transport for SSE, WebSocket, and JSON-RPC protocols.
 * Handles partial result frames, reconnection with φ-backoff,
 * and structured error payloads.
 * 
 * @module core/liquid-gateway/transport
 * @author Eric Haywood — HeadySystems Inc.
 * @license PROPRIETARY — 51+ Provisional Patents
 */

import { EventEmitter } from 'events';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const PSI3 = PSI * PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/** JSON-RPC 2.0 error codes */
const RPC_ERRORS = {
  PARSE_ERROR:      { code: -32700, message: 'Parse error' },
  INVALID_REQUEST:  { code: -32600, message: 'Invalid request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS:   { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR:   { code: -32603, message: 'Internal error' },
  PROVIDER_ERROR:   { code: -32001, message: 'Provider error' },
  TIMEOUT_ERROR:    { code: -32002, message: 'Request timeout' },
  RATE_LIMITED:     { code: -32003, message: 'Rate limited' },
  AUTH_ERROR:       { code: -32004, message: 'Authentication error' },
  CANCELLED:        { code: -32005, message: 'Request cancelled' },
};

/**
 * SSE Transport — Server-Sent Events for streaming AI responses
 */
export class SSETransport extends EventEmitter {
  constructor(config = {}) {
    super();
    this.connections = new Map();
    this.maxConnectionsPerUser = FIB[6]; // 8
    this.heartbeatIntervalMs = Math.round(PHI * 1000 * FIB[7]); // ~34s
    this.reconnectBaseMs = Math.round(PHI * 1000); // 1618ms
    this.maxReconnectMs = Math.round(PHI * 1000 * FIB[8]); // ~34s
    this.messageBufferSize = FIB[10]; // 55 messages
    this.heartbeatTimers = new Map();
  }

  /**
   * Initialize SSE connection for a client
   */
  connect(connectionId, res, options = {}) {
    const userId = options.userId || 'anonymous';

    // Check connection limit per user
    const userConnections = [...this.connections.values()]
      .filter(c => c.userId === userId);
    if (userConnections.length >= this.maxConnectionsPerUser) {
      // Close oldest connection
      const oldest = userConnections.sort((a, b) => a.connectedAt - b.connectedAt)[0];
      this.disconnect(oldest.id);
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': options.origin || 'https://heady.ai',
    });

    const connection = {
      id: connectionId,
      userId,
      res,
      connectedAt: Date.now(),
      lastEventAt: Date.now(),
      messageCount: 0,
      messageBuffer: [],
      lastEventId: options.lastEventId || null,
    };

    this.connections.set(connectionId, connection);

    // Start heartbeat
    const timer = setInterval(() => {
      this._sendHeartbeat(connectionId);
    }, this.heartbeatIntervalMs);
    this.heartbeatTimers.set(connectionId, timer);

    // Handle client disconnect
    res.on('close', () => this.disconnect(connectionId));

    // Replay missed events if lastEventId provided
    if (connection.lastEventId) {
      this._replayEvents(connectionId, connection.lastEventId);
    }

    this.emit('sse:connected', { connectionId, userId });
    return connectionId;
  }

  /**
   * Send an SSE event to a specific connection
   */
  sendEvent(connectionId, event) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    const eventId = event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const eventType = event.type || 'message';
    const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);

    let payload = '';
    payload += `id: ${eventId}\n`;
    payload += `event: ${eventType}\n`;

    // Split data by newlines per SSE spec
    for (const line of data.split('\n')) {
      payload += `data: ${line}\n`;
    }

    if (event.retry) {
      payload += `retry: ${event.retry}\n`;
    }

    payload += '\n'; // End of event

    try {
      connection.res.write(payload);
      connection.lastEventAt = Date.now();
      connection.messageCount++;

      // Buffer for replay
      connection.messageBuffer.push({ id: eventId, type: eventType, data, at: Date.now() });
      if (connection.messageBuffer.length > this.messageBufferSize) {
        connection.messageBuffer.shift();
      }

      return true;
    } catch (error) {
      this.disconnect(connectionId);
      return false;
    }
  }

  /**
   * Send a streaming AI chunk as partial result frame
   */
  sendChunk(connectionId, chunk) {
    return this.sendEvent(connectionId, {
      type: 'chunk',
      data: {
        jsonrpc: '2.0',
        method: 'ai.chunk',
        params: {
          content: chunk.content,
          role: chunk.role || 'assistant',
          finishReason: chunk.finishReason || null,
          provider: chunk.provider,
          usage: chunk.usage || null,
          timestamp: Date.now(),
        },
      },
    });
  }

  /**
   * Send stream completion event
   */
  sendComplete(connectionId, result) {
    return this.sendEvent(connectionId, {
      type: 'complete',
      data: {
        jsonrpc: '2.0',
        method: 'ai.complete',
        params: {
          content: result.content,
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          latency: result.latency,
          raceId: result.raceId || null,
          timestamp: Date.now(),
        },
      },
    });
  }

  /**
   * Send error event
   */
  sendError(connectionId, errorCode, details = {}) {
    const errorDef = RPC_ERRORS[errorCode] || RPC_ERRORS.INTERNAL_ERROR;
    return this.sendEvent(connectionId, {
      type: 'error',
      data: {
        jsonrpc: '2.0',
        error: {
          code: errorDef.code,
          message: errorDef.message,
          data: details,
        },
      },
    });
  }

  /**
   * Broadcast event to all connections for a user
   */
  broadcastToUser(userId, event) {
    let sent = 0;
    for (const [id, conn] of this.connections) {
      if (conn.userId === userId) {
        if (this.sendEvent(id, event)) sent++;
      }
    }
    return sent;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear heartbeat
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) clearInterval(timer);
    this.heartbeatTimers.delete(connectionId);

    try {
      connection.res.end();
    } catch (_) { /* already closed */ }

    this.connections.delete(connectionId);
    this.emit('sse:disconnected', { connectionId, userId: connection.userId });
  }

  /**
   * Get connection stats
   */
  getStats() {
    const userCounts = {};
    for (const [, conn] of this.connections) {
      userCounts[conn.userId] = (userCounts[conn.userId] || 0) + 1;
    }
    return {
      totalConnections: this.connections.size,
      userCounts,
      oldestConnection: Math.min(...[...this.connections.values()].map(c => c.connectedAt)) || null,
    };
  }

  _sendHeartbeat(connectionId) {
    this.sendEvent(connectionId, {
      type: 'heartbeat',
      data: { timestamp: Date.now() },
    });
  }

  _replayEvents(connectionId, lastEventId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const idx = connection.messageBuffer.findIndex(m => m.id === lastEventId);
    if (idx === -1) return;

    const missed = connection.messageBuffer.slice(idx + 1);
    for (const event of missed) {
      this.sendEvent(connectionId, { id: event.id, type: event.type, data: event.data });
    }
  }
}

/**
 * WebSocket Transport — for bidirectional AI streaming
 */
export class WebSocketTransport extends EventEmitter {
  constructor(config = {}) {
    super();
    this.sessions = new Map();
    this.maxSessionsPerUser = FIB[6]; // 8
    this.pingIntervalMs = Math.round(PHI * 1000 * FIB[8]); // ~34s
    this.pongTimeoutMs = Math.round(PHI * 1000 * FIB[5]); // ~8s
    this.maxMessageSize = FIB[12] * 1024; // 144KB
    this.pingTimers = new Map();
    this.pongTimers = new Map();
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, sessionId, options = {}) {
    const userId = options.userId || 'anonymous';

    const session = {
      id: sessionId,
      userId,
      ws,
      connectedAt: Date.now(),
      lastMessageAt: Date.now(),
      messageCount: 0,
      state: 'active',
      pendingRequests: new Map(),
    };

    this.sessions.set(sessionId, session);

    // Start ping/pong keepalive
    this._startPing(sessionId);

    // Wire handlers
    ws.on('message', (data) => this._handleMessage(sessionId, data));
    ws.on('close', (code, reason) => this._handleClose(sessionId, code, reason));
    ws.on('pong', () => this._handlePong(sessionId));
    ws.on('error', (error) => this._handleError(sessionId, error));

    this.emit('ws:connected', { sessionId, userId });
    return sessionId;
  }

  /**
   * Send JSON-RPC response over WebSocket
   */
  send(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'active') return false;

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    if (payload.length > this.maxMessageSize) {
      this.sendError(sessionId, null, 'INVALID_REQUEST', { reason: 'Message too large' });
      return false;
    }

    try {
      session.ws.send(payload);
      session.lastMessageAt = Date.now();
      session.messageCount++;
      return true;
    } catch (error) {
      this._handleClose(sessionId, 1011, 'Send failed');
      return false;
    }
  }

  /**
   * Send JSON-RPC error
   */
  sendError(sessionId, requestId, errorCode, details = {}) {
    const errorDef = RPC_ERRORS[errorCode] || RPC_ERRORS.INTERNAL_ERROR;
    return this.send(sessionId, {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: errorDef.code,
        message: errorDef.message,
        data: details,
      },
    });
  }

  /**
   * Send streaming chunk notification
   */
  sendChunk(sessionId, requestId, chunk) {
    return this.send(sessionId, {
      jsonrpc: '2.0',
      method: 'ai.chunk',
      params: {
        requestId,
        content: chunk.content,
        role: chunk.role || 'assistant',
        finishReason: chunk.finishReason || null,
        provider: chunk.provider,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Close session
   */
  closeSession(sessionId, code = 1000, reason = 'Normal closure') {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = 'closing';
    try {
      session.ws.close(code, reason);
    } catch (_) { /* already closed */ }

    this._cleanup(sessionId);
  }

  /**
   * Get WebSocket stats
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: [...this.sessions.values()].filter(s => s.state === 'active').length,
    };
  }

  // === INTERNAL ===

  _handleMessage(sessionId, rawData) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.lastMessageAt = Date.now();

    let message;
    try {
      message = JSON.parse(rawData.toString());
    } catch (_) {
      this.sendError(sessionId, null, 'PARSE_ERROR');
      return;
    }

    // Validate JSON-RPC 2.0
    if (message.jsonrpc !== '2.0') {
      this.sendError(sessionId, message.id, 'INVALID_REQUEST', { reason: 'Must be JSON-RPC 2.0' });
      return;
    }

    if (!message.method) {
      this.sendError(sessionId, message.id, 'METHOD_NOT_FOUND');
      return;
    }

    this.emit('ws:message', {
      sessionId,
      userId: session.userId,
      method: message.method,
      params: message.params,
      id: message.id,
    });
  }

  _handleClose(sessionId, code, reason) {
    this._cleanup(sessionId);
    this.emit('ws:disconnected', { sessionId, code, reason: reason?.toString() });
  }

  _handlePong(sessionId) {
    const timer = this.pongTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.pongTimers.delete(sessionId);
  }

  _handleError(sessionId, error) {
    this.emit('ws:error', { sessionId, error: error.message });
    this._cleanup(sessionId);
  }

  _startPing(sessionId) {
    const timer = setInterval(() => {
      const session = this.sessions.get(sessionId);
      if (!session || session.state !== 'active') {
        clearInterval(timer);
        return;
      }

      try {
        session.ws.ping();
        // Set pong timeout
        const pongTimer = setTimeout(() => {
          this.closeSession(sessionId, 1001, 'Pong timeout');
        }, this.pongTimeoutMs);
        this.pongTimers.set(sessionId, pongTimer);
      } catch (_) {
        this._cleanup(sessionId);
      }
    }, this.pingIntervalMs);

    this.pingTimers.set(sessionId, timer);
  }

  _cleanup(sessionId) {
    const pingTimer = this.pingTimers.get(sessionId);
    if (pingTimer) clearInterval(pingTimer);
    this.pingTimers.delete(sessionId);

    const pongTimer = this.pongTimers.get(sessionId);
    if (pongTimer) clearTimeout(pongTimer);
    this.pongTimers.delete(sessionId);

    this.sessions.delete(sessionId);
  }
}

/**
 * JSON-RPC Request/Response builders for MCP-compatible interfaces
 */
export const JSONRPC = {
  /** Build a JSON-RPC 2.0 request */
  request(method, params, id) {
    return { jsonrpc: '2.0', method, params, id: id || `req_${Date.now()}` };
  },

  /** Build a JSON-RPC 2.0 success response */
  success(id, result) {
    return { jsonrpc: '2.0', id, result };
  },

  /** Build a JSON-RPC 2.0 error response */
  error(id, code, message, data) {
    return { jsonrpc: '2.0', id, error: { code, message, data } };
  },

  /** Build a JSON-RPC 2.0 notification (no id) */
  notification(method, params) {
    return { jsonrpc: '2.0', method, params };
  },

  /** Get standard error definition */
  getError(name) {
    return RPC_ERRORS[name] || RPC_ERRORS.INTERNAL_ERROR;
  },
};
