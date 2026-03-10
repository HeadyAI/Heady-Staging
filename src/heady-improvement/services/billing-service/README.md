# @heady/billing-service

Stripe billing integration for HeadyEX marketplace subscriptions with φ-scaled rate limiting and metering.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /plans | List all subscription plans |
| GET | /plans/:planId | Get plan details |
| POST | /checkout | Create Stripe Checkout session |
| GET | /subscription/:customerId | Get active subscription |
| POST | /subscription/:id/cancel | Cancel subscription |
| GET | /usage/:userId | Get usage stats |
| POST | /usage/:userId/plan | Set user plan (internal) |
| POST | /webhooks/stripe | Stripe webhook handler |
| GET | /health | Health check |

## Plans

| Plan | API Calls/Day | API Calls/Min | Price |
|------|--------------|---------------|-------|
| Explorer | 34 (FIB[9]) | 34 | Free |
| Builder | 89 (FIB[11]) | 89 | $29/mo |
| Enterprise | 233 (FIB[13]) | 233 | Custom |

## Webhook Events Handled

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Rate Limiting

φ-scaled per-minute limits: anonymous=34, builder=89, enterprise=233.

Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## Docker

```bash
docker build -t heady/billing-service .
docker run -p 3383:3383 --env-file .env heady/billing-service
```
