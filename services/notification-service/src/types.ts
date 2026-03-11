export interface NotificationPayload {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: number;
  icon?: string;
  badge?: string;
  tag?: string;
  requiresInteraction?: boolean;
}

export interface ChannelMessage {
  id: string;
  type: 'notification' | 'system' | 'heartbeat';
  payload: NotificationPayload | Record<string, unknown>;
  timestamp: number;
  retry?: number;
}

export interface WSConnection {
  userId: string;
  sessionId: string;
  tokenValidatedAt: number;
  connectionStartTime: number;
  messageCount: number;
  lastHeartbeat: number;
}

export interface CSLGate {
  confidence: number;
  decision: boolean;
  reason?: string;
}

export interface AuthToken {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  connections: number;
  memoryUsage: NodeJS.MemoryUsage;
  checks: {
    websocket: boolean;
    sse: boolean;
    push: boolean;
  };
}
