# Service Debug Guide

## auth-session-server (Port 3380)

**Health:** GET http://localhost:3380/health  
**Logs:** Structured JSON to stdout, filter by `"service":"auth-session-server"`  
**Debug:** `NODE_DEBUG=heady:auth node --inspect=9380 src/index.js`  
**Failure Modes:**
- Firebase Admin SDK init fails → check FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS
- Cookie not setting → verify HTTPS, check SameSite=None, check domain match
- Session validation fails → check IP+UA hash, verify cookie not expired
**Known Issues:** SameSite=None requires Secure flag; some older browsers don't support __Host- prefix

## notification-service (Port 3381)

**Health:** GET http://localhost:3381/health  
**Logs:** `"service":"notification-service"`  
**Debug:** `NODE_DEBUG=heady:notif node --inspect=9381 src/index.js`  
**Failure Modes:**
- WebSocket won't connect → check auth token in upgrade request, verify port not blocked
- SSE events not received → check keep-alive interval (FIB[8]=21s), verify Content-Type: text/event-stream
- High memory → check channel subscription cleanup on disconnect
**Known Issues:** WebSocket re-validates auth on every frame — ensure tokens don't expire mid-connection

## analytics-service (Port 3382)

**Health:** GET http://localhost:3382/health  
**Logs:** `"service":"analytics-service"`  
**Debug:** `NODE_DEBUG=heady:analytics node --inspect=9382 src/index.js`  
**Failure Modes:**
- Events not recording → check collector endpoint, verify event schema
- Aggregation slow → check LRU cache size (max FIB[16]=987), check flush interval
- PostgreSQL flush fails → check connection string, verify table exists
**Known Issues:** IP hashing is one-way — cannot reconstruct original IPs (by design)

## billing-service (Port 3383)

**Health:** GET http://localhost:3383/health  
**Logs:** `"service":"billing-service"`  
**Debug:** `NODE_DEBUG=heady:billing node --inspect=9383 src/index.js`  
**Failure Modes:**
- Webhook fails → check STRIPE_WEBHOOK_SECRET, verify endpoint URL in Stripe dashboard
- Subscription not created → check STRIPE_SECRET_KEY, verify customer exists
- Metering inaccurate → check in-memory counters, verify window reset timing
**Known Issues:** Stripe webhook requires raw body — do NOT parse JSON before signature verification

## scheduler-service (Port 3384)

**Health:** GET http://localhost:3384/health  
**Logs:** `"service":"scheduler-service"`  
**Debug:** `NODE_DEBUG=heady:scheduler node --inspect=9384 src/index.js`  
**Failure Modes:**
- Jobs not running → check scheduler state, verify job is registered and active
- Circuit breaker stuck open → wait φ×10s for half-open probe, or reset manually
- Job timeout → check handler execution time against φ³×1000ms (4236ms) limit
**Known Issues:** Persistent job state is file-based — ensure write permissions on data directory
