import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { cookieAuthMiddleware, webhookAuthMiddleware, AuthToken } from './middleware/auth';
import { logger } from './logger';
import { Subscription, UsageMetrics, HealthStatus, WebhookEvent, StripeWebhookPayload } from './types';
import { stripeClient } from './stripe/client';
import { pricingTierManager } from './plans/tiers';
import { cslGateEngine } from './csl-gates';
import { PORT } from './constants';

const app = express();
let startTime = Date.now();
let requestCount = 0;
let webhooksProcessed = 0;

const subscriptions: Map<string, Subscription> = new Map();
const usageMetrics: Map<string, UsageMetrics> = new Map();
const webhookLog: WebhookEvent[] = [];
const maxWebhookLogSize = 144;

app.use(express.json({ limit: '1mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.headers['x-correlation-id'] = correlationId;
  logger.setContext({ correlationId });
  requestCount += 1;
  next();
});

app.get('/health', (req: Request, res: Response) => {
  const stripeMetrics = stripeClient.getMetrics();
  const uptime = Date.now() - startTime;

  const isHealthy = stripeMetrics.isHealthy;
  const status: HealthStatus = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: Date.now(),
    uptime,
    checks: {
      stripe: stripeMetrics.isHealthy,
      database: true,
      webhook: webhookLog.length > 0
    },
    metrics: {
      activeSubscriptions: Array.from(subscriptions.values()).filter(s => s.status === 'active').length,
      totalRevenueMTD: calculateMonthlyRevenue(),
      webhooksProcessed
    }
  };

  res.status(isHealthy ? 200 : 503).json(status);
  logger.debug('health', 'Health check performed', { status: status.status });
});

app.post('/api/billing/subscribe', cookieAuthMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;
  const startTime = Date.now();

  try {
    const { tier, email } = req.body;

    if (!tier) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'tier is required',
        code: 'MISSING_TIER'
      });
      return;
    }

    const pricingTier = pricingTierManager.getTier(tier);

    if (!pricingTier) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Invalid tier: ${tier}`,
        code: 'INVALID_TIER'
      });
      return;
    }

    let existingSubscription = Array.from(subscriptions.values()).find(s => s.userId === user.userId);

    if (existingSubscription) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User already has an active subscription',
        code: 'SUBSCRIPTION_EXISTS',
        subscriptionId: existingSubscription.id
      });
      return;
    }

    try {
      const customerId = await stripeClient.createCustomer(user.userId, email || `user-${user.userId}@heady.local`);
      const stripeSubscription = await stripeClient.createSubscription(customerId, `price_${tier.toLowerCase()}`, user.userId);

      const nowMs = Date.now();
      const subscription: Subscription = {
        id: uuidv4(),
        userId: user.userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        tier: tier as any,
        status: stripeSubscription.status as any,
        currentPeriodStart: Math.round(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: Math.round(stripeSubscription.current_period_end * 1000),
        createdAt: nowMs,
        updatedAt: nowMs
      };

      subscriptions.set(subscription.id, subscription);

      const usageMetric: UsageMetrics = {
        userId: user.userId,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        requestCount: 0,
        estimatedCost: pricingTier.monthlyPriceUSD,
        overageCount: 0,
        overageCost: 0,
        lastUpdated: nowMs
      };

      usageMetrics.set(user.userId, usageMetric);

      logger.info('billing', 'Subscription created', {
        userId: user.userId,
        subscriptionId: subscription.id,
        tier,
        duration: Date.now() - startTime
      });

      res.status(201).json({
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd
      });
    } catch (stripeError) {
      logger.error('billing', 'Error creating Stripe subscription', stripeError as Error, { userId: user.userId });

      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Failed to create subscription with payment provider',
        code: 'STRIPE_ERROR'
      });
    }
  } catch (error) {
    logger.error('billing', 'Error subscribing', error as Error, {
      userId: user.userId,
      duration: Date.now() - startTime
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'SUBSCRIBE_ERROR'
    });
  }
});

app.post('/api/billing/webhook', webhookAuthMiddleware, (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const event: StripeWebhookPayload = JSON.parse(req.body);
    const webhookEvent: WebhookEvent = {
      id: event.id,
      type: event.type,
      timestamp: event.created * 1000,
      data: event.data.object,
      processed: false
    };

    if (webhookLog.length >= maxWebhookLogSize) {
      webhookLog.shift();
    }

    switch (event.type) {
      case 'customer.subscription.updated': {
        const subscriptionData = event.data.object as any;
        const foundSubscription = Array.from(subscriptions.values()).find(
          s => s.stripeSubscriptionId === subscriptionData.id
        );

        if (foundSubscription) {
          foundSubscription.status = subscriptionData.status;
          foundSubscription.currentPeriodStart = subscriptionData.current_period_start * 1000;
          foundSubscription.currentPeriodEnd = subscriptionData.current_period_end * 1000;
          foundSubscription.updatedAt = Date.now();

          logger.info('billing', 'Subscription updated via webhook', {
            subscriptionId: foundSubscription.id,
            userId: foundSubscription.userId,
            status: subscriptionData.status
          });
        }

        webhookEvent.processed = true;
        break;
      }

      case 'customer.subscription.deleted': {
        const subscriptionData = event.data.object as any;
        const foundSubscription = Array.from(subscriptions.values()).find(
          s => s.stripeSubscriptionId === subscriptionData.id
        );

        if (foundSubscription) {
          foundSubscription.status = 'canceled';
          foundSubscription.canceledAt = Date.now();
          foundSubscription.updatedAt = Date.now();

          logger.info('billing', 'Subscription canceled via webhook', {
            subscriptionId: foundSubscription.id,
            userId: foundSubscription.userId
          });
        }

        webhookEvent.processed = true;
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoiceData = event.data.object as any;
        logger.debug('billing', 'Payment succeeded', {
          invoiceId: invoiceData.id,
          amount: invoiceData.amount_paid
        });

        webhookEvent.processed = true;
        break;
      }

      case 'invoice.payment_failed': {
        const invoiceData = event.data.object as any;
        logger.warn('billing', 'Payment failed', {
          invoiceId: invoiceData.id,
          amount: invoiceData.amount_due
        });

        webhookEvent.processed = true;
        break;
      }

      default: {
        logger.debug('billing', 'Unhandled webhook event', { eventType: event.type });
        webhookEvent.processed = true;
      }
    }

    webhookLog.push(webhookEvent);
    webhooksProcessed += 1;

    logger.info('billing', 'Webhook processed', {
      eventType: event.type,
      eventId: event.id,
      processed: webhookEvent.processed,
      duration: Date.now() - startTime
    });

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('billing', 'Error processing webhook', error as Error, {
      duration: Date.now() - startTime
    });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'WEBHOOK_ERROR'
    });
  }
});

app.get('/api/billing/plans', cookieAuthMiddleware, (req: Request, res: Response) => {
  try {
    const plans = pricingTierManager.getAllPlans();

    logger.info('billing', 'Plans listed', { count: plans.length });

    res.status(200).json({
      plans: plans.map(p => ({
        id: p.id,
        tier: p.tier,
        name: p.name,
        monthlyPriceUSD: p.monthlyPriceUSD,
        requestsIncluded: p.requestsIncluded,
        overageRatePerThousand: p.overageRatePerThousand,
        features: p.features
      }))
    });
  } catch (error) {
    logger.error('billing', 'Error listing plans', error as Error);

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'LIST_PLANS_ERROR'
    });
  }
});

app.get('/api/billing/usage', cookieAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as AuthToken;

  try {
    const metrics = usageMetrics.get(user.userId);

    if (!metrics) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No usage metrics found',
        code: 'METRICS_NOT_FOUND'
      });
      return;
    }

    const subscription = Array.from(subscriptions.values()).find(s => s.userId === user.userId && s.status === 'active');

    if (!subscription) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No active subscription found',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
      return;
    }

    const validityGate = cslGateEngine.evaluateSubscriptionValidity(subscription, Date.now());
    const usageGate = cslGateEngine.evaluateUsageCompliance(
      metrics,
      pricingTierManager.getTier(subscription.tier)?.requests || 0
    );

    logger.info('billing', 'Usage retrieved', {
      userId: user.userId,
      subscriptionId: subscription.id,
      requestCount: metrics.requestCount,
      validityConfidence: validityGate.confidence.toFixed(3)
    });

    res.status(200).json({
      periodStart: metrics.periodStart,
      periodEnd: metrics.periodEnd,
      requestCount: metrics.requestCount,
      estimatedCost: metrics.estimatedCost,
      overageCount: metrics.overageCount,
      overageCost: metrics.overageCost,
      lastUpdated: metrics.lastUpdated,
      validityConfidence: validityGate.confidence,
      complianceConfidence: usageGate.confidence
    });
  } catch (error) {
    logger.error('billing', 'Error retrieving usage', error as Error, { userId: user.userId });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'USAGE_ERROR'
    });
  }
});

function calculateMonthlyRevenue(): number {
  let total = 0;

  subscriptions.forEach((subscription) => {
    const tier = pricingTierManager.getTier(subscription.tier);

    if (tier && subscription.status === 'active') {
      const metrics = usageMetrics.get(subscription.userId);

      if (metrics) {
        const charges = pricingTierManager.calculateMonthlyCharge(subscription.tier, metrics.requestCount);
        total += charges.totalCharge;
      }
    }
  });

  return Math.round(total * 100) / 100;
}

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
  logger.info('app', 'Billing service started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

process.on('SIGTERM', () => {
  logger.info('app', 'SIGTERM received, graceful shutdown initiated', { requestCount });

  setTimeout(() => {
    logger.fatal('app', 'Graceful shutdown timeout exceeded');
  }, 30000);
});

process.on('SIGINT', () => {
  logger.info('app', 'SIGINT received, graceful shutdown initiated', { requestCount });

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
