'use strict';

const Stripe = require('stripe');
const { getPlan } = require('./plans');

let _stripe = null;

/**
 * Get or initialize the Stripe client.
 * @returns {Stripe}
 */
function getStripeClient() {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return _stripe;
}

/**
 * Create a Stripe Checkout session for a subscription.
 *
 * @param {object} params
 * @param {string} params.planId — heady plan ID
 * @param {string} params.userId — heady user ID
 * @param {string} params.email — customer email
 * @param {string} [params.successUrl]
 * @param {string} [params.cancelUrl]
 * @returns {Promise<object>} Stripe Checkout Session
 */
async function createCheckoutSession({ planId, userId, email, successUrl, cancelUrl }) {
  const stripe = getStripeClient();
  const plan = getPlan(planId);

  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  if (!plan.priceId) {
    throw new Error(`Plan ${planId} has no Stripe price ID configured`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${process.env.APP_URL || 'https://headyex.com'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.APP_URL || 'https://headyex.com'}/billing/cancel`,
    metadata: {
      heady_user_id: userId,
      heady_plan_id: planId,
    },
    subscription_data: {
      metadata: {
        heady_user_id: userId,
        heady_plan_id: planId,
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Get a customer's active subscription.
 *
 * @param {string} customerId — Stripe customer ID
 * @returns {Promise<object|null>}
 */
async function getSubscription(customerId) {
  const stripe = getStripeClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  if (subscriptions.data.length === 0) return null;

  const sub = subscriptions.data[0];
  return {
    subscriptionId: sub.id,
    status: sub.status,
    planId: sub.metadata?.heady_plan_id || null,
    currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/**
 * Cancel a subscription at period end.
 *
 * @param {string} subscriptionId
 * @returns {Promise<object>}
 */
async function cancelSubscription(subscriptionId) {
  const stripe = getStripeClient();
  const sub = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return {
    subscriptionId: sub.id,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
  };
}

/**
 * Verify and parse a Stripe webhook event.
 *
 * @param {Buffer} rawBody — raw request body
 * @param {string} signature — Stripe-Signature header
 * @returns {object} Stripe event
 */
function verifyWebhookSignature(rawBody, signature) {
  const stripe = getStripeClient();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
  }

  return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
}

/**
 * Handle a verified Stripe webhook event.
 *
 * @param {object} event — Stripe event object
 * @param {object} log — structured logger
 * @returns {Promise<{ handled: boolean, type: string }>}
 */
async function handleWebhookEvent(event, log) {
  const { type } = event;

  switch (type) {
    case 'customer.subscription.created': {
      const sub = event.data.object;
      log.info('Subscription created', {
        subscriptionId: sub.id,
        customerId: sub.customer,
        planId: sub.metadata?.heady_plan_id,
        status: sub.status,
      });
      return { handled: true, type };
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      log.info('Subscription updated', {
        subscriptionId: sub.id,
        customerId: sub.customer,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      });
      return { handled: true, type };
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      log.info('Subscription deleted', {
        subscriptionId: sub.id,
        customerId: sub.customer,
      });
      return { handled: true, type };
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      log.info('Invoice paid', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
      });
      return { handled: true, type };
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      log.warn('Invoice payment failed', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amountDue: invoice.amount_due,
      });
      return { handled: true, type };
    }

    default: {
      log.debug('Unhandled webhook event', { type });
      return { handled: false, type };
    }
  }
}

module.exports = {
  getStripeClient,
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  handleWebhookEvent,
};
