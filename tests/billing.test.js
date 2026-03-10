const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyStripeSignature } = require('../services/billing-service/src/server');

test('billing webhook verification uses deterministic HMAC', () => {
  const payload = JSON.stringify({ type: 'invoice.paid' });
  const secret = process.env.HEADY_STRIPE_WEBHOOK_SECRET || 'heady-stripe-webhook-secret';
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(verifyStripeSignature(payload, signature), true);
  assert.equal(verifyStripeSignature(payload, 'bad-signature'), false);
});
