import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { cookieAuthMiddleware, AuthToken } from './middleware/auth';
import { logger } from './logger';
import { AnalyticsEvent, HealthStatus } from './types';
import { eventCollector } from './collectors/event-collector';
import { funnelAnalyzer } from './aggregators/funnel';
import { timeSeriesStorage } from './storage/timeseries';
import { PORT, EVENT_RETENTION_HOURS } from './constants';

const app = express();
let startTime = Date.now();
let requestCount = 0;

app.use(express.json({ limit: '5mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  logger.setContext({ correlationId });
  requestCount += 1;
  next();
});

app.get('/health', (req: Request, res: Response) => {
  const collectorStats = eventCollector.getCollectorStats();
  const storageStats = timeSeriesStorage.getStorageStats();
  const uptime = Date.now() - startTime;

  const isHealthy = collectorStats.invalidEvents < collectorStats.eventsProcessed * 0.1 && storageStats.isHealthy;
  const status: HealthStatus = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: Date.now(),
    uptime,
    checks: {
      eventCollection: collectorStats.queueSize < 1000,
      eventFlushing: collectorStats.batchesProcessed > 0,
      storage: storageStats.isHealthy
    },
    metrics: {
      eventQueueSize: collectorStats.queueSize,
      eventsProcessed: collectorStats.eventsProcessed,
      batchesProcessed: collectorStats.batchesProcessed,
      averageLatency: uptime > 0 ? Math.round(uptime / requestCount) : 0
    }
  };

  res.status(isHealthy ? 200 : 503).json(status);
  logger.debug('health', 'Health check performed', { status: status.status });
});

app.post('/api/analytics/event', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const startTime = Date.now();

  try {
    const { eventName, eventCategory, properties, sessionId, userAgent, ipAddress, referrer, pageUrl } = req.body;

    if (!eventName || !eventCategory) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'eventName and eventCategory are required',
        code: 'INVALID_EVENT'
      });
      return;
    }

    const event: Omit<AnalyticsEvent, 'id'> = {
      userId: user.userId,
      eventName,
      eventCategory,
      timestamp: Date.now(),
      properties: properties || {},
      sessionId: sessionId || `session-${Date.now()}`,
      userAgent,
      ipAddress: ipAddress ? eventCollector.anonymizeIpAddress(ipAddress) : undefined,
      referrer,
      pageUrl
    };

    const eventId = eventCollector.addEvent(event);

    if (!eventId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Event validation failed',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    timeSeriesStorage.storeEvent({
      ...event,
      id: eventId
    });

    logger.info('analytics', 'Event tracked', {
      eventId,
      userId: user.userId,
      eventName,
      eventCategory,
      duration: Date.now() - startTime
    });

    res.status(202).json({
      id: eventId,
      timestamp: event.timestamp,
      status: 'accepted'
    });
  } catch (error) {
    logger.error('analytics', 'Error tracking event', error as Error, {
      userId: user.userId,
      duration: Date.now() - startTime
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'TRACK_ERROR'
    });
  }
});

app.get('/api/analytics/funnel', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const startTime = Date.now();

  try {
    const { funnelName, hours } = req.query;

    if (!funnelName) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'funnelName is required',
        code: 'MISSING_FUNNEL'
      });
      return;
    }

    const hoursBack = Math.min(parseInt(hours as string) || 24, EVENT_RETENTION_HOURS);
    const now = Date.now();
    const startTimeMs = now - (hoursBack * 60 * 60 * 1000);

    const events = timeSeriesStorage.getEventsByDateRange(startTimeMs, now);
    const userEvents = events.filter(e => e.userId === user.userId);

    const analysis = funnelAnalyzer.analyzeFunnel(
      funnelName as string,
      userEvents,
      startTimeMs,
      now
    );

    if (!analysis) {
      res.status(404).json({
        error: 'Not Found',
        message: `Funnel not found: ${funnelName}`,
        code: 'FUNNEL_NOT_FOUND'
      });
      return;
    }

    logger.info('analytics', 'Funnel analyzed', {
      userId: user.userId,
      funnelName,
      completionRate: analysis.completionRate,
      duration: Date.now() - startTime
    });

    res.status(200).json(analysis);
  } catch (error) {
    logger.error('analytics', 'Error analyzing funnel', error as Error, {
      userId: user.userId,
      duration: Date.now() - startTime
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'FUNNEL_ERROR'
    });
  }
});

app.get('/api/analytics/metrics', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const startTime = Date.now();

  try {
    const dashboardMetrics = timeSeriesStorage.generateDashboardMetrics();

    logger.info('analytics', 'Dashboard metrics retrieved', {
      userId: user.userId,
      totalEvents: dashboardMetrics.totalEvents,
      uniqueUsers: dashboardMetrics.uniqueUsers,
      duration: Date.now() - startTime
    });

    res.status(200).json(dashboardMetrics);
  } catch (error) {
    logger.error('analytics', 'Error retrieving metrics', error as Error, {
      userId: user.userId,
      duration: Date.now() - startTime
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'METRICS_ERROR'
    });
  }
});

app.get('/api/analytics/funnels', cookieAuthMiddleware, (req: Request, res: Response) => {
  try {
    const funnels = funnelAnalyzer.getDefinedFunnels();

    logger.info('analytics', 'Funnels listed', { count: funnels.length });

    res.status(200).json({
      funnels: funnels.map(f => ({
        name: f.name,
        stepCount: f.steps.length,
        steps: f.steps
      }))
    });
  } catch (error) {
    logger.error('analytics', 'Error listing funnels', error as Error);

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'LIST_FUNNELS_ERROR'
    });
  }
});

app.post('/api/analytics/funnel/:funnelName', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const { funnelName } = req.params;
  const { steps } = req.body;

  try {
    if (!steps || !Array.isArray(steps) || steps.length < 2) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'steps must be an array with at least 2 elements',
        code: 'INVALID_STEPS'
      });
      return;
    }

    funnelAnalyzer.defineFunnel(funnelName, steps);

    logger.info('analytics', 'Custom funnel defined', {
      userId: user.userId,
      funnelName,
      stepCount: steps.length
    });

    res.status(201).json({
      funnelName,
      stepCount: steps.length,
      steps
    });
  } catch (error) {
    logger.error('analytics', 'Error defining funnel', error as Error, {
      userId: user.userId,
      funnelName
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'DEFINE_FUNNEL_ERROR'
    });
  }
});

const cleanupInterval = setInterval(() => {
  const deletedCount = eventCollector.cleanupOldBatches(EVENT_RETENTION_HOURS);

  if (deletedCount > 0) {
    logger.info('app', 'Old events cleaned up', { deletedCount });
  }
}, 60 * 60 * 1000);

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

app.listen(PORT, () => {
  startTime = Date.now();
  logger.info('app', 'Analytics service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

process.on('SIGTERM', () => {
  logger.info('app', 'SIGTERM received, graceful shutdown initiated', { requestCount });

  clearInterval(cleanupInterval);
  eventCollector.shutdown();
  timeSeriesStorage.shutdown();

  setTimeout(() => {
    logger.fatal('app', 'Graceful shutdown timeout exceeded');
  }, 30000);
});

process.on('SIGINT', () => {
  logger.info('app', 'SIGINT received, graceful shutdown initiated', { requestCount });

  clearInterval(cleanupInterval);
  eventCollector.shutdown();
  timeSeriesStorage.shutdown();

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
