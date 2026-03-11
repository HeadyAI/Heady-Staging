import NodeCache from 'node-cache';
import { AnalyticsEvent, TimeSeriesMetric, TimeSeriesDataPoint, DashboardMetrics, MetricSummary } from '../types';
import { logger } from '../logger';
import { cslGateEngine } from '../csl-gates';
import { METRICS_AGGREGATION_INTERVAL_MS } from '../constants';

export class TimeSeriesStorage {
  private cache: NodeCache;
  private eventStore: Map<string, AnalyticsEvent[]> = new Map();
  private lastSuccessTime: number = Date.now();
  private errorCount: number = 0;
  private aggregationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 60 * 60 });
    this.startAggregationTimer();
    logger.info('timeseries_storage', 'Time-series storage initialized');
  }

  private startAggregationTimer(): void {
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
    }, METRICS_AGGREGATION_INTERVAL_MS);

    logger.debug('timeseries_storage', 'Aggregation timer started', {
      interval: METRICS_AGGREGATION_INTERVAL_MS
    });
  }

  storeEvent(event: AnalyticsEvent): void {
    try {
      const key = `events:${event.userId}`;
      let userEvents = this.eventStore.get(key) || [];
      userEvents.push(event);

      if (userEvents.length > 10000) {
        userEvents = userEvents.slice(-10000);
      }

      this.eventStore.set(key, userEvents);
      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.trace('timeseries_storage', 'Event stored', {
        userId: event.userId,
        eventName: event.eventName
      });
    } catch (error) {
      this.errorCount += 1;
      logger.error('timeseries_storage', 'Error storing event', error as Error, {
        eventId: event.id
      });
    }
  }

  storeTimeSeriesMetric(metric: TimeSeriesMetric): void {
    try {
      const key = `timeseries:${metric.name}`;
      this.cache.set(key, metric);
      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.trace('timeseries_storage', 'Metric stored', {
        metricName: metric.name,
        dataPointCount: metric.dataPoints.length
      });
    } catch (error) {
      this.errorCount += 1;
      logger.error('timeseries_storage', 'Error storing metric', error as Error, {
        metricName: metric.name
      });
    }
  }

  getTimeSeriesMetric(name: string): TimeSeriesMetric | null {
    try {
      const metric = this.cache.get(`timeseries:${name}`) as TimeSeriesMetric | undefined;
      return metric || null;
    } catch (error) {
      logger.error('timeseries_storage', 'Error retrieving metric', error as Error, {
        metricName: name
      });
      return null;
    }
  }

  getUserEvents(userId: string): AnalyticsEvent[] {
    try {
      const key = `events:${userId}`;
      return this.eventStore.get(key) || [];
    } catch (error) {
      logger.error('timeseries_storage', 'Error retrieving user events', error as Error, { userId });
      return [];
    }
  }

  getEventsByDateRange(startTime: number, endTime: number): AnalyticsEvent[] {
    const allEvents: AnalyticsEvent[] = [];

    this.eventStore.forEach((events) => {
      events.forEach((event) => {
        if (event.timestamp >= startTime && event.timestamp <= endTime) {
          allEvents.push(event);
        }
      });
    });

    return allEvents;
  }

  private aggregateMetrics(): void {
    const startTime = Date.now();
    const allEvents: AnalyticsEvent[] = [];

    this.eventStore.forEach((events) => {
      allEvents.push(...events);
    });

    if (allEvents.length === 0) {
      return;
    }

    const dataQualityGate = cslGateEngine.evaluateDataQuality(
      allEvents.length,
      0,
      0
    );

    if (!dataQualityGate.decision) {
      logger.warn('timeseries_storage', 'Data quality check failed', {
        reason: dataQualityGate.reason
      });
    }

    const topEvents = this.calculateTopEvents(allEvents, 10);
    const topPages = this.calculateTopPages(allEvents, 10);
    const avgSessionDuration = this.calculateAvgSessionDuration(allEvents);
    const uniqueUsers = new Set(allEvents.map(e => e.userId)).size;

    logger.debug('timeseries_storage', 'Metrics aggregated', {
      totalEvents: allEvents.length,
      uniqueUsers,
      topEventsCount: topEvents.length,
      duration: Date.now() - startTime
    });
  }

  private calculateTopEvents(events: AnalyticsEvent[], limit: number): Array<{ name: string; count: number }> {
    const eventCounts = new Map<string, number>();

    events.forEach((event) => {
      const count = eventCounts.get(event.eventName) || 0;
      eventCounts.set(event.eventName, count + 1);
    });

    return Array.from(eventCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private calculateTopPages(events: AnalyticsEvent[], limit: number): Array<{ url: string; count: number }> {
    const pageCounts = new Map<string, number>();

    events.forEach((event) => {
      if (event.pageUrl) {
        const count = pageCounts.get(event.pageUrl) || 0;
        pageCounts.set(event.pageUrl, count + 1);
      }
    });

    return Array.from(pageCounts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private calculateAvgSessionDuration(events: AnalyticsEvent[]): number {
    const sessionDurations = new Map<string, { start: number; end: number }>();

    events.forEach((event) => {
      if (event.sessionId) {
        const current = sessionDurations.get(event.sessionId) || {
          start: event.timestamp,
          end: event.timestamp
        };

        sessionDurations.set(event.sessionId, {
          start: Math.min(current.start, event.timestamp),
          end: Math.max(current.end, event.timestamp)
        });
      }
    });

    if (sessionDurations.size === 0) {
      return 0;
    }

    let totalDuration = 0;

    sessionDurations.forEach(({ start, end }) => {
      totalDuration += (end - start);
    });

    return Math.round(totalDuration / sessionDurations.size);
  }

  generateDashboardMetrics(): DashboardMetrics {
    const allEvents: AnalyticsEvent[] = [];

    this.eventStore.forEach((events) => {
      allEvents.push(...events);
    });

    const topEvents = this.calculateTopEvents(allEvents, 5);
    const topPages = this.calculateTopPages(allEvents, 5);
    const avgSessionDuration = this.calculateAvgSessionDuration(allEvents);
    const uniqueUsers = new Set(allEvents.map(e => e.userId)).size;

    const metrics: MetricSummary[] = [
      {
        metric: 'total_events',
        value: allEvents.length,
        unit: 'count',
        timestamp: Date.now()
      },
      {
        metric: 'unique_users',
        value: uniqueUsers,
        unit: 'count',
        timestamp: Date.now()
      },
      {
        metric: 'avg_session_duration',
        value: avgSessionDuration,
        unit: 'ms',
        timestamp: Date.now()
      }
    ];

    logger.info('timeseries_storage', 'Dashboard metrics generated', {
      totalEvents: allEvents.length,
      uniqueUsers,
      metricsCount: metrics.length
    });

    return {
      totalEvents: allEvents.length,
      uniqueUsers,
      averageSessionDuration: avgSessionDuration,
      topEvents,
      topPages,
      metrics,
      generatedAt: Date.now()
    };
  }

  getStorageStats(): {
    totalEvents: number;
    userCount: number;
    cacheSize: number;
    lastSuccessTime: number;
    errorCount: number;
    isHealthy: boolean;
  } {
    let totalEvents = 0;

    this.eventStore.forEach((events) => {
      totalEvents += events.length;
    });

    const healthGate = cslGateEngine.evaluateStorageHeartbeat(
      this.lastSuccessTime,
      this.errorCount,
      this.errorCount < 5
    );

    return {
      totalEvents,
      userCount: this.eventStore.size,
      cacheSize: Object.keys(this.cache.getStats()).length,
      lastSuccessTime: this.lastSuccessTime,
      errorCount: this.errorCount,
      isHealthy: healthGate.decision
    };
  }

  shutdown(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }

    this.cache.flushAll();
    logger.info('timeseries_storage', 'Time-series storage shut down', {
      eventStoreSize: this.eventStore.size
    });
  }
}

export const timeSeriesStorage = new TimeSeriesStorage();
