export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventName: string;
  eventCategory: string;
  timestamp: number;
  properties?: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  pageUrl?: string;
}

export interface EventBatch {
  id: string;
  events: AnalyticsEvent[];
  createdAt: number;
  flushedAt?: number;
  processed: boolean;
}

export interface FunnelStep {
  name: string;
  count: number;
  percentage: number;
  avgTimeToNext?: number;
}

export interface FunnelAnalysis {
  funnelName: string;
  steps: FunnelStep[];
  startCount: number;
  completionRate: number;
  totalConversions: number;
  timeWindow: {
    start: number;
    end: number;
  };
  generatedAt: number;
}

export interface MetricSummary {
  metric: string;
  value: number;
  unit: string;
  timestamp: number;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export interface DashboardMetrics {
  totalEvents: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  topEvents: Array<{ name: string; count: number }>;
  topPages: Array<{ url: string; count: number }>;
  metrics: MetricSummary[];
  generatedAt: number;
}

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesMetric {
  name: string;
  unit: string;
  dataPoints: TimeSeriesDataPoint[];
}

export interface CSLGate {
  confidence: number;
  decision: boolean;
  reason?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  checks: {
    eventCollection: boolean;
    eventFlushing: boolean;
    storage: boolean;
  };
  metrics: {
    eventQueueSize: number;
    eventsProcessed: number;
    batchesProcessed: number;
    averageLatency: number;
  };
}

export interface AuthToken {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}
