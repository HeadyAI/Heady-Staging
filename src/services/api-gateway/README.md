# Heady™ API Gateway

Liquid routing gateway with CSL-gated circuit breakers.
Port: 3370

## Routes

| Prefix | Upstream |
|--------|----------|
| /api/v1/auth | auth-session:3360 |
| /api/v1/notify | notification:3361 |
| /api/v1/analytics | analytics:3362 |
| /api/v1/schedule | scheduler:3363 |
| /api/v1/search | search:3364 |
| /api/v1/onboarding | onboarding:3365 |
| /api/v1/colab | colab-gateway:3366 |

## Health Check

GET /health → circuit breaker states for all upstreams
