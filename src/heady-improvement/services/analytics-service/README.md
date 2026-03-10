# @heady/analytics-service

Privacy-first, self-hosted analytics for the Heady platform. No PII stored, IP addresses hashed with daily rotation.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /collect/pageview | Record a page view |
| POST | /collect/event | Record a custom event |
| GET | /metrics | Current real-time metrics |
| GET | /metrics/rollups | Historical rollup data |
| GET | /health | Health check |

## Privacy

- IP addresses are SHA-256 hashed with a daily salt (rotates every day)
- Session IDs are hashed before storage
- User-Agent is reduced to family only (Chrome, Firefox, etc.)
- No PII fields are stored

## φ-Scaled Intervals

- Real-time aggregation: every 21s (FIB[8])
- Rollup aggregation: every 144 min (FIB[12])
- LRU cache: 987 max entries (FIB[16])
- Flush to PostgreSQL: every 21s (FIB[8])

## Metrics Computed

- Unique visitors (hashed IP count)
- Page views
- Top paths (top 20)
- API call counts
- Error rates
- Latency percentiles: p50, p95, p99

## Usage

```bash
# Record a page view
curl -X POST http://localhost:3382/collect/pageview \
  -H "Content-Type: application/json" \
  -d '{"path": "/dashboard", "referrer": "https://google.com"}'

# Record a custom event
curl -X POST http://localhost:3382/collect/event \
  -H "Content-Type: application/json" \
  -d '{"eventName": "button_click", "properties": {"button": "signup"}}'

# Get real-time metrics
curl http://localhost:3382/metrics
```

## Docker

```bash
docker build -t heady/analytics-service .
docker run -p 3382:3382 --env-file .env heady/analytics-service
```
