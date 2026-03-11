# Analytics Service

Privacy-first, self-hosted analytics service for the HEADY platform with φ-scaled batch processing and funnel analysis.

## Overview

The analytics service provides:

- **Event Tracking**: Privacy-first event collection with automatic batching
- **Funnel Analysis**: Pre-defined and custom funnel analysis with conversion tracking
- **Time-Series Storage**: Efficient in-memory time-series data storage with pgvector compatibility
- **Dashboard Metrics**: Aggregated metrics for user dashboards
- **φ-Scaled Processing**: Fibonacci-derived batching and aggregation intervals

All data is self-hosted and fully under user control with configurable retention policies.

## Architecture

### Components

- **Event Collector**: Batches events with φ-scaled flush intervals (89 seconds)
- **Funnel Analyzer**: Pre-defined and custom funnel definitions with step tracking
- **Time-Series Storage**: In-memory storage with configurable retention
- **CSL Gates**: Confidence-weighted decisions for event validity and data quality
- **Structured Logger**: JSON logging with correlation IDs

### Privacy-First Design

- **User ID Hashing**: Optional SHA-256 hashing of user IDs
- **IP Anonymization**: Automatic last octet stripping for IPv4 addresses
- **Data Retention**: Configurable retention policies (default: 30 days)
- **No Third-Party Tracking**: Fully self-hosted, zero external calls
- **Zero-Knowledge**: Analytics service stores only what you send

## API Endpoints

### POST /api/analytics/event

Track an analytics event.

```bash
curl -X POST http://localhost:3360/api/analytics/event \
  -H "Content-Type: application/json" \
  -b "__heady_session=<token>" \
  -d '{
    "eventName": "page_view",
    "eventCategory": "navigation",
    "properties": {
      "page_title": "Dashboard",
      "scroll_depth": 0.75
    },
    "sessionId": "session-123",
    "pageUrl": "https://app.example.com/dashboard",
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  }'
```

Response:
```json
{
  "id": "event-uuid",
  "timestamp": 1679460000000,
  "status": "accepted"
}
```

### GET /api/analytics/metrics

Retrieve dashboard metrics aggregated across all users' events.

```bash
curl http://localhost:3360/api/analytics/metrics \
  -b "__heady_session=<token>"
```

Response:
```json
{
  "totalEvents": 42000,
  "uniqueUsers": 1234,
  "averageSessionDuration": 540000,
  "topEvents": [
    { "name": "page_view", "count": 25000 },
    { "name": "button_click", "count": 12000 }
  ],
  "topPages": [
    { "url": "https://app.example.com/", "count": 15000 }
  ],
  "metrics": [
    {
      "metric": "total_events",
      "value": 42000,
      "unit": "count",
      "timestamp": 1679460000000
    }
  ],
  "generatedAt": 1679460000000
}
```

### GET /api/analytics/funnels

List all defined funnels.

```bash
curl http://localhost:3360/api/analytics/funnels \
  -b "__heady_session=<token>"
```

Response:
```json
{
  "funnels": [
    {
      "name": "signup_flow",
      "stepCount": 5,
      "steps": [
        "page_view.signup",
        "form_focus.email",
        "form_submit.signup",
        "email_verify",
        "onboarding_complete"
      ]
    }
  ]
}
```

### GET /api/analytics/funnel

Analyze a specific funnel for the current user.

```bash
curl "http://localhost:3360/api/analytics/funnel?funnelName=signup_flow&hours=24" \
  -b "__heady_session=<token>"
```

Response:
```json
{
  "funnelName": "signup_flow",
  "steps": [
    {
      "name": "page_view.signup",
      "count": 1000,
      "percentage": 100,
      "avgTimeToNext": 15000
    },
    {
      "name": "form_focus.email",
      "count": 890,
      "percentage": 89,
      "avgTimeToNext": 8000
    },
    {
      "name": "form_submit.signup",
      "count": 756,
      "percentage": 75.6,
      "avgTimeToNext": 12000
    },
    {
      "name": "email_verify",
      "count": 698,
      "percentage": 69.8,
      "avgTimeToNext": 3600000
    },
    {
      "name": "onboarding_complete",
      "count": 621,
      "percentage": 62.1
    }
  ],
  "startCount": 1000,
  "completionRate": 0.621,
  "totalConversions": 621,
  "timeWindow": {
    "start": 1679376000000,
    "end": 1679462400000
  },
  "generatedAt": 1679460000000
}
```

### POST /api/analytics/funnel/:funnelName

Define a custom funnel.

```bash
curl -X POST http://localhost:3360/api/analytics/funnel/custom_flow \
  -H "Content-Type: application/json" \
  -b "__heady_session=<token>" \
  -d '{
    "steps": [
      "feature_discovery",
      "feature_enable",
      "feature_usage",
      "feature_retention"
    ]
  }'
```

Response:
```json
{
  "funnelName": "custom_flow",
  "stepCount": 4,
  "steps": [
    "feature_discovery",
    "feature_enable",
    "feature_usage",
    "feature_retention"
  ]
}
```

### GET /health

Health check endpoint with detailed analytics metrics.

```bash
curl http://localhost:3360/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": 1679460000000,
  "uptime": 3600000,
  "checks": {
    "eventCollection": true,
    "eventFlushing": true,
    "storage": true
  },
  "metrics": {
    "eventQueueSize": 42,
    "eventsProcessed": 5000,
    "batchesProcessed": 21,
    "averageLatency": 45
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

## φ-Scaled Constants

All timing and size constants derive from golden ratio (PHI = 1.618) and Fibonacci:

- `EVENT_FLUSH_INTERVAL_MS`: 89 seconds (Fibonacci)
- `BATCH_SIZE`: 233 events (Fibonacci)
- `METRICS_AGGREGATION_INTERVAL_MS`: 144 seconds (Fibonacci)
- `FUNNEL_ANALYSIS_WINDOW_MS`: 233 minutes (Fibonacci-derived)

## Privacy Settings

Configurable via constants:

- `HASH_USER_IDS`: Hash user IDs in storage (default: true)
- `RETENTION_DAYS`: Data retention period (default: 30)
- `MIN_EVENTS_FOR_AGGREGATION`: Minimum events for stats (default: 5)
- `ANONYMIZE_IP`: Strip last IP octet (default: true)

## Pre-Defined Funnels

The service comes with three pre-defined funnels:

### 1. Signup Flow
```
page_view.signup
├─ form_focus.email
├─ form_submit.signup
├─ email_verify
└─ onboarding_complete
```

### 2. Checkout Flow
```
page_view.cart
├─ item_selected
├─ cart_submit
├─ shipping_selected
├─ payment_submitted
└─ order_confirmed
```

### 3. Authentication
```
page_view.login
├─ form_focus.credentials
├─ auth_submit
└─ auth_success
```

## Event Properties

Supported event properties:

```typescript
{
  eventName: string;              // Required: "page_view", "button_click", etc.
  eventCategory: string;          // Required: "navigation", "engagement", etc.
  properties?: Record<string, unknown>;  // Custom properties object
  sessionId?: string;             // Session identifier
  userAgent?: string;             // Browser user agent
  ipAddress?: string;             // User IP address (auto-anonymized)
  referrer?: string;              // Page referrer
  pageUrl?: string;               // Current page URL
}
```

## Logging

Structured JSON logging with correlation IDs:

```json
{
  "timestamp": "2024-03-09T10:30:45.123Z",
  "level": "INFO",
  "service": "analytics-service",
  "action": "event_tracked",
  "message": "Event tracked successfully",
  "correlationId": "req-uuid",
  "userId": "user-123",
  "metadata": {
    "eventId": "event-456",
    "eventName": "page_view",
    "eventCategory": "navigation"
  },
  "duration": 12
}
```

## Environment Variables

- `NODE_ENV`: Set to `production` for distroless container
- `LOG_LEVEL`: Log level (trace, debug, info, warn, error, fatal)
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
docker build -t heady-analytics-service .
docker run -p 3360:3360 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  heady-analytics-service
```

## CSL Gates

All analytics decisions require confidence evaluation:

- **Event Validity**: Required fields, timestamp, category checks
- **Batch Readiness**: Size and age requirements
- **Data Quality**: Invalid events and outlier detection
- **Funnel Consistency**: Monotonic decrease verification
- **Aggregation Validity**: Minimum event counts and time windows
- **Storage Heartbeat**: Connectivity and error rate monitoring

Minimum confidence threshold: 0.618 (PSI value)

## Performance Characteristics

- **Event Batching**: 89-second flush interval or 233 events (Fibonacci)
- **Funnel Analysis**: Real-time calculation with user-specific filtering
- **Memory Usage**: In-memory storage with 30-day configurable retention
- **Aggregation**: 144-second interval for dashboard metrics
- **Cleanup**: Automatic cleanup of old events every hour

## Data Retention and Cleanup

Events older than `EVENT_RETENTION_HOURS` (8 hours default, configurable) are automatically cleaned up:

```typescript
const deletedCount = eventCollector.cleanupOldBatches(8);
```

For longer retention, configure time-series backend or database adapter.

## Security Considerations

- **Zero-Trust**: Event validity checked at acceptance
- **Privacy-First**: User IDs optionally hashed, IPs anonymized
- **CSL Gates**: Data quality validation prevents analytics poisoning
- **Self-Hosted**: Complete control over data and retention
- **No External Calls**: Zero dependency on third-party analytics platforms

## Development Notes

- No magic numbers: All constants derive from PHI/PSI/Fibonacci
- Structured logging only: No console.log statements
- CSL gates required: All decisions must pass confidence evaluation
- Full type safety: Strict TypeScript compilation
- Privacy-first: Data anonymization enabled by default
