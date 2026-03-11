# Billing Service

Subscription and usage-based billing service for the HEADY platform with Stripe integration and φ-scaled pricing tiers.

## Overview

The billing service manages:

- **Subscription Management**: Create, update, and cancel subscriptions with Stripe integration
- **φ-Scaled Pricing**: Four tiers (Free, Starter, Professional, Enterprise) with Fibonacci-derived pricing
- **Usage Tracking**: Per-user usage metrics with overage calculations
- **Webhook Processing**: Real-time subscription updates from Stripe
- **CSL Gates**: Confidence-weighted decisions for billing operations

## Architecture

### Components

- **Stripe Client**: Wrapper around Stripe SDK with error handling and health monitoring
- **Pricing Tier Manager**: φ-scaled pricing calculations and tier recommendations
- **Subscription Manager**: User subscription state and lifecycle management
- **Webhook Handler**: Async processing of Stripe events
- **CSL Gates**: Confidence-weighted security decisions

### φ-Scaled Pricing Tiers

All pricing and limits are derived from the golden ratio (PHI = 1.618) and Fibonacci sequence:

| Tier | Monthly | Requests | Features |
|------|---------|----------|----------|
| Free | $0 | 5,000 | Basic support |
| Starter | $55 | 50,000 | Email support, webhooks |
| Professional | $89 | 500,000 | Priority support, SLA |
| Enterprise | $233 | Unlimited | 24/7 support, custom terms |

**Overage Rate**: $1.62 per 1,000 requests (PHI value)

## API Endpoints

### POST /api/billing/subscribe

Create a new subscription for the current user.

```bash
curl -X POST http://localhost:3355/api/billing/subscribe \
  -H "Content-Type: application/json" \
  -b "__heady_session=<token>" \
  -d '{
    "tier": "PROFESSIONAL",
    "email": "user@example.com"
  }'
```

Response:
```json
{
  "id": "sub-uuid",
  "tier": "PROFESSIONAL",
  "status": "active",
  "currentPeriodStart": 1678876800000,
  "currentPeriodEnd": 1681554000000
}
```

### POST /api/billing/webhook

Stripe webhook endpoint for subscription events. Must be registered with Stripe with header signature verification.

Handles events:
- `customer.subscription.updated`: Sync subscription state
- `customer.subscription.deleted`: Mark subscription as canceled
- `invoice.payment_succeeded`: Log successful payment
- `invoice.payment_failed`: Log failed payment

### GET /api/billing/plans

List all available pricing plans.

```bash
curl http://localhost:3355/api/billing/plans \
  -b "__heady_session=<token>"
```

Response:
```json
{
  "plans": [
    {
      "id": "plan-uuid",
      "tier": "FREE",
      "name": "Free",
      "monthlyPriceUSD": 0,
      "requestsIncluded": 5000,
      "overageRatePerThousand": 1.62,
      "features": ["5,000 requests/month", "Basic support"]
    }
  ]
}
```

### GET /api/billing/usage

Retrieve usage metrics for current user's subscription.

```bash
curl http://localhost:3355/api/billing/usage \
  -b "__heady_session=<token>"
```

Response:
```json
{
  "periodStart": 1678876800000,
  "periodEnd": 1681554000000,
  "requestCount": 42000,
  "estimatedCost": 89.00,
  "overageCount": 0,
  "overageCost": 0,
  "lastUpdated": 1679460000000,
  "validityConfidence": 0.98,
  "complianceConfidence": 0.92
}
```

### GET /health

Health check endpoint with detailed billing metrics.

```bash
curl http://localhost:3355/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": 1679460000000,
  "uptime": 3600000,
  "checks": {
    "stripe": true,
    "database": true,
    "webhook": true
  },
  "metrics": {
    "activeSubscriptions": 42,
    "totalRevenueMTD": 12456.78,
    "webhooksProcessed": 234
  }
}
```

## Authentication

All endpoints require the `__heady_session` cookie containing a valid JWT token with these claims:

```json
{
  "userId": "user-123",
  "sessionId": "session-456",
  "iat": 1234567890,
  "exp": 1234571490
}
```

Webhook endpoints use Stripe signature header validation.

## φ-Scaled Constants

All timing and size constants derive from golden ratio (PHI = 1.618) and Fibonacci:

- `HEALTH_CHECK_INTERVAL_MS`: 55 seconds (Fibonacci)
- `USAGE_AGGREGATION_INTERVAL_MS`: 144 seconds (Fibonacci)
- `WEBHOOK_TIMEOUT_MS`: 34 seconds (Fibonacci)
- `SUBSCRIPTION_SYNC_INTERVAL_MS`: 233 seconds (Fibonacci)
- `OVERAGE_RATE_USD_PER_1K`: 1.62 (PHI value)

## Pricing Calculations

### Monthly Charge

```typescript
const charges = pricingTierManager.calculateMonthlyCharge('PROFESSIONAL', 550000);
// Returns:
// {
//   baseCharge: 89.00,
//   overageCharge: 81.00,      // 50k overage × $1.62 per 1k
//   totalCharge: 170.00
// }
```

### Tier Change Impact

```typescript
const impact = pricingTierManager.getTierChangeImpact(
  'STARTER',
  'PROFESSIONAL',
  80000,
  15                            // days remaining in cycle
);
// Returns pro-rated credit and additional charge
```

### Tier Recommendation

```typescript
const recommended = pricingTierManager.recommendTier(450000);
// Returns 'PROFESSIONAL' (50k < 450k < 500k threshold)
```

## CSL Gates

All billing decisions require confidence evaluation:

- **Subscription Validity**: Status, period, and cancellation checks
- **Usage Compliance**: Request limits and overage calculation
- **Payment Validity**: Payment status and payment recency
- **Webhook Integrity**: Stripe signature verification
- **Stripe Connectivity**: API availability and error rate

Minimum confidence threshold: 0.618 (PSI value)

## Logging

Structured JSON logging with correlation IDs:

```json
{
  "timestamp": "2024-03-09T10:30:45.123Z",
  "level": "INFO",
  "service": "billing-service",
  "action": "subscription_created",
  "message": "Subscription created",
  "correlationId": "req-uuid",
  "userId": "user-123",
  "metadata": {
    "subscriptionId": "sub-456",
    "tier": "PROFESSIONAL",
    "customerId": "cus-789"
  },
  "duration": 456
}
```

## Environment Variables

- `NODE_ENV`: Set to `production` for distroless container
- `LOG_LEVEL`: Log level (trace, debug, info, warn, error, fatal)
- `STRIPE_SECRET_KEY`: Stripe API secret key (required)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `COOKIE_DOMAIN`: Domain for secure cookies

## Building and Running

### Development

```bash
npm install
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker build -t heady-billing-service .
docker run -p 3355:3355 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -e STRIPE_SECRET_KEY=sk_live_... \
  heady-billing-service
```

## Integration with Stripe

### Setup Steps

1. Create Stripe account and API keys
2. Define products and prices matching HEADY tiers:
   - `price_free` (Free tier)
   - `price_starter` ($55/month)
   - `price_professional` ($89/month)
   - `price_enterprise` ($233/month)

3. Configure webhook endpoint:
   - URL: `https://your-domain/api/billing/webhook`
   - Events: `customer.subscription.*`, `invoice.payment_*`

4. Set environment variables with API keys

### Webhook Security

- Stripe signatures validated on every webhook
- Duplicate events handled gracefully
- Failed events logged for manual review
- Webhook log maintains last 144 events (Fibonacci)

## Security Considerations

- **Zero-Trust**: Every subscription state change requires validation
- **CSL Gates**: Confidence-weighted decisions prevent unauthorized state transitions
- **Stripe Integration**: All API calls validated with secret key
- **Webhook Verification**: HMAC-SHA256 signature validation mandatory
- **User Isolation**: Subscriptions linked only to authenticated user

## Performance Characteristics

- **Stripe API**: Cached responses with 144-second timeout
- **Webhook Processing**: Asynchronous with up to 144-event buffer
- **Usage Aggregation**: 144-second batching interval
- **Health Checks**: 55-second interval for detailed metrics
- **Overage Calculation**: Real-time per-request computation

## Development Notes

- No magic numbers: All constants derive from PHI/PSI/Fibonacci
- Structured logging only: No console.log statements
- CSL gates required: All decisions must pass confidence evaluation
- Full type safety: Strict TypeScript compilation
- Stripe SDK wrapped: Custom error handling and metrics
