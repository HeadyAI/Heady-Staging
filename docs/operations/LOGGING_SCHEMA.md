# Structured Logging Schema

This document defines a standard schema for application logs emitted by the Heady platform. By adhering to a consistent, structured log format, logs become machine‑parsable, queryable in observability tools like Elasticsearch and Loki, and more useful for debugging and auditing.

## Schema Overview

Logs should be emitted as JSON objects with the following top‑level keys:

| Field | Type | Description |
|------|------|-------------|
| `timestamp` | string (RFC 3339) | The date and time the event occurred. |
| `level` | string | Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. |
| `message` | string | Human‑readable description of the event. |
| `event_type` | string | Short code identifying the type of event (e.g., `HTTP_REQUEST`, `DB_QUERY`, `AUTH_FAIL`). |
| `request_id` | string | Unique identifier for the request or transaction, propagated via headers or context. |
| `user_id` | string (nullable) | Identifier of the authenticated user (if available). |
| `source` | string | The component or service emitting the log (e.g., `mcp-gateway`, `drupal-site`). |
| `metadata` | object | Additional structured fields relevant to the event. May include HTTP status, method, path, latency, SQL query, etc. |

### Example

```json
{
  "timestamp": "2026-01-23T18:22:10.456Z",
  "level": "info",
  "message": "Handled HTTP request",
  "event_type": "HTTP_REQUEST",
  "request_id": "71c4a6e7-5f30-4f1a-91c2-7627f4e6f613",
  "user_id": "af9be55e-e5bd-4879-9c02-238e90b46eb1",
  "source": "mcp-gateway",
  "metadata": {
    "method": "GET",
    "path": "/api/articles",
    "status": 200,
    "latency_ms": 42
  }
}
```

## Implementation Notes

1. **JSON Logging:** Configure your application frameworks (e.g., Fastify for Node.js, Monolog for PHP) to emit logs in JSON format. Avoid printing plain strings.
2. **Consistent Keys:** Always include the standard keys. Additional metadata may be added but should not conflict with reserved names.
3. **Correlation:** Propagate a unique `request_id` across services via headers (`X‑Request‑ID`) or a tracing system. This enables correlation of logs across components.
4. **User Privacy:** Do not log sensitive personally identifiable information (PII) or secrets. Obfuscate or omit values such as passwords, access tokens, or payment details.
5. **Log Levels:** Use appropriate log levels. Errors should be reserved for unexpected conditions requiring investigation; informational logs should not be excessive.
6. **Integration with Observability Stack:** The builder configures a Loki/Promtail setup. Ensure that the log outputs match the expected format for ingestion. See `ops/compose/observability` for details.

By adopting this structured logging schema, teams can write queries like “show me all AUTH_FAIL events for user X in the past 24 hours” or “plot p95 latency of HTTP requests” with minimal effort.