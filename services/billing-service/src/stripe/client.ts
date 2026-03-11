import Stripe from 'stripe';
import { logger } from '../logger';
import { cslGateEngine } from '../csl-gates';

export class StripeClient {
  private stripe: Stripe;
  private lastSuccessTime: number = Date.now();
  private errorCount: number = 0;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable not set');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16'
    });

    logger.info('stripe', 'Stripe client initialized', {
      apiVersion: '2023-10-16'
    });
  }

  async createCustomer(userId: string, email: string): Promise<string> {
    const startTime = Date.now();

    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          userId
        }
      });

      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.info('stripe', 'Customer created', {
        userId,
        customerId: customer.id,
        duration: Date.now() - startTime
      });

      return customer.id;
    } catch (error) {
      this.errorCount += 1;
      logger.error('stripe', 'Error creating customer', error as Error, { userId });
      throw error;
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    userId: string
  ): Promise<Stripe.Subscription> {
    const startTime = Date.now();

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          userId
        }
      });

      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.info('stripe', 'Subscription created', {
        userId,
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status,
        duration: Date.now() - startTime
      });

      return subscription;
    } catch (error) {
      this.errorCount += 1;
      logger.error('stripe', 'Error creating subscription', error as Error, { userId, customerId });
      throw error;
    }
  }

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    const startTime = Date.now();

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.debug('stripe', 'Subscription retrieved', {
        subscriptionId,
        status: subscription.status,
        duration: Date.now() - startTime
      });

      return subscription;
    } catch (error) {
      if ((error as any).code === 'resource_missing') {
        logger.warn('stripe', 'Subscription not found', { subscriptionId });
        return null;
      }

      this.errorCount += 1;
      logger.error('stripe', 'Error retrieving subscription', error as Error, { subscriptionId });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, userId: string): Promise<Stripe.Subscription> {
    const startTime = Date.now();

    try {
      const subscription = await this.stripe.subscriptions.del(subscriptionId);

      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.info('stripe', 'Subscription canceled', {
        subscriptionId,
        userId,
        status: subscription.status,
        duration: Date.now() - startTime
      });

      return subscription;
    } catch (error) {
      this.errorCount += 1;
      logger.error('stripe', 'Error canceling subscription', error as Error, { subscriptionId, userId });
      throw error;
    }
  }

  async listPrices(): Promise<Stripe.Price[]> {
    const startTime = Date.now();

    try {
      const prices = await this.stripe.prices.list({
        limit: 100,
        active: true
      });

      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.debug('stripe', 'Prices retrieved', {
        count: prices.data.length,
        duration: Date.now() - startTime
      });

      return prices.data;
    } catch (error) {
      this.errorCount += 1;
      logger.error('stripe', 'Error listing prices', error as Error);
      throw error;
    }
  }

  async listProducts(): Promise<Stripe.Product[]> {
    const startTime = Date.now();

    try {
      const products = await this.stripe.products.list({
        limit: 100,
        active: true
      });

      this.lastSuccessTime = Date.now();
      this.errorCount = Math.max(0, this.errorCount - 1);

      logger.debug('stripe', 'Products retrieved', {
        count: products.data.length,
        duration: Date.now() - startTime
      });

      return products.data;
    } catch (error) {
      this.errorCount += 1;
      logger.error('stripe', 'Error listing products', error as Error);
      throw error;
    }
  }

  checkConnectivity(): boolean {
    const connectivityGate = cslGateEngine.evaluateStripeConnectivity(
      this.lastSuccessTime,
      this.errorCount,
      this.errorCount < 5
    );

    return connectivityGate.decision;
  }

  getMetrics(): { lastSuccessTime: number; errorCount: number; isHealthy: boolean } {
    return {
      lastSuccessTime: this.lastSuccessTime,
      errorCount: this.errorCount,
      isHealthy: this.checkConnectivity()
    };
  }
}

export const stripeClient = new StripeClient();
