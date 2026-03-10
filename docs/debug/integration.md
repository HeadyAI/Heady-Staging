# DEBUG Guide: Integration Domain

## Services

- `api-gateway (3390)`
- `domain-router (3391)`
- `mcp-server (3392)`
- `google-mcp (3393)`
- `memory-mcp (3394)`
- `perplexity-mcp (3395)`
- `discord-bot (3396)`

## Health Check

```bash
curl -s http://localhost:3390/health | jq .
```

## Common Failure Modes

### API gateway returns 502 Bad Gateway

**Diagnosis:** Upstream service unreachable or circuit breaker open.

**Fix:** Check domain-router target health. Verify service discovery in Consul. Circuit breaker resets after fib(7)=13 second half-open period.

### MCP tool execution timeout

**Diagnosis:** MCP server tool handler exceeded φ³≈4.236 second timeout.

**Fix:** Check MCP server logs for slow tool. Increase timeout if tool legitimately needs more time, or optimize tool handler.

### Rate limiter blocking legitimate requests

**Diagnosis:** User hit Fibonacci rate limit: fib(9)=34/min (anon), fib(11)=89/min (auth), fib(13)=233/min (enterprise).

**Fix:** Check rate-limiter sliding window state. Upgrade user tier if appropriate. Verify API key is being sent in requests.

## Environment Variables

- `CONSUL_HTTP_ADDR`
- `NATS_URL`
- `DISCORD_BOT_TOKEN`

## Debug Commands

```bash
curl -s http://localhost:3390/health | jq .
curl -s http://localhost:3390/api/routes | jq .  # Active routes
curl -s http://localhost:3392/api/mcp/tools | jq .  # MCP tools list
```

## Log Locations

- Cloud Run: gcloud run services logs read api-gateway --region=us-east1

---
*Eric Haywood | HeadySystems Inc. | Sacred Geometry v4.0*
