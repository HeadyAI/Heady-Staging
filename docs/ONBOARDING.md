# HEADY Platform Developer Onboarding Guide

Welcome to HEADY, a sovereign AI operating system with 50+ microservices, ~60 custom domains, and a φ-scaled vector memory architecture. This guide will get you up and running in under 2 hours.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 20.0+** (verify: `node --version`)
- **Docker & Docker Compose 2.0+** (verify: `docker --version`)
- **gcloud CLI** (installed and authenticated to GCP project)
- **kubectl 1.28+** (verify: `kubectl version --client`)
- **Helm 3.0+** (for Kubernetes deployments)
- **Git** (configured with your GitHub account)
- **PostgreSQL client** (`psql` command-line tool)
- **Python 3.10+** (for utility scripts)
- **Postman or curl** (for API testing)

### macOS Setup

```bash
# Install Homebrew prerequisites
brew install node@20 docker kubectl helm postgresql
brew tap gcloud && brew install --cask google-cloud-sdk

# Verify installations
node --version  # v20.x.x
docker --version  # Docker 27.0+
gcloud --version  # Latest
```

### Linux Setup (Ubuntu/Debian)

```bash
# Install prerequisites
sudo apt-get update && sudo apt-get install -y \
  nodejs npm postgresql-client docker.io kubectl helm

# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
source ~/.bashrc
gcloud init
```

### GCP Authentication

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set default project
gcloud config set project heady-ai-platform

# Create local Kubernetes credentials
gcloud container clusters get-credentials heady-prod --zone us-central1-a

# Verify cluster access
kubectl get nodes
```

---

## Quick Start (5 Minutes)

### 1. Clone Repository

```bash
git clone https://github.com/heady-ai/platform.git
cd platform
```

### 2. Install Dependencies

```bash
# Install root-level dependencies
npm install

# Install service dependencies
npm run install:all  # Installs node_modules for all 50 services
```

### 3. Setup Environment

```bash
# Copy .env template
cp .env.example .env.local

# Edit configuration (set your domain, API keys)
nano .env.local

# Required variables:
# FIREBASE_PROJECT_ID=heady-ai-platform
# GCLOUD_PROJECT_ID=heady-ai-platform
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# NATS_URL=nats://localhost:4222
# REDIS_URL=redis://localhost:6379
```

### 4. Start Local Services

```bash
# Start Docker containers (Postgres, Redis, NATS, Jaeger)
docker-compose -f docker-compose.dev.yml up -d

# Verify services are healthy
docker-compose ps
# Should show postgres, redis, nats, jaeger as 'Up'

# Wait for PostgreSQL to initialize (~10 seconds)
sleep 10
```

### 5. Run Migrations

```bash
# Initialize database schema
npm run db:migrate

# Seed test data
npm run db:seed
```

### 6. Start Development Services

```bash
# Terminal 1: Start core services
npm run dev:core
# Starts: api-gateway, auth-session-server, permission-guard

# Terminal 2: Start inference services
npm run dev:inference
# Starts: heady-brain, heady-embed, heady-memory

# Terminal 3: Start content service
npm run dev:content
# Starts: drupal-headless-cms

# Terminal 4: Start observability
npm run dev:observability
# Starts: prometheus, grafana, jaeger
```

### 7. Verify Installation

```bash
# Test API Gateway
curl -H "Authorization: Bearer test-token" \
  http://localhost:8000/health

# Response should be:
# { "status": "healthy", "version": "1.0.0" }

# View service dashboard
open http://localhost:3000  # Grafana
open http://localhost:16686  # Jaeger
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│        (Web, Mobile, Third-party integrations)              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              API Gateway (Envoy)                            │
│    Rate limiting, TLS termination, request routing          │
└────────┬────────────────┬────────────────────┬──────────────┘
         │                │                    │
    ┌────▼──────┐    ┌───▼────────┐    ┌──────▼──────┐
    │   Auth    │    │   Brain    │    │   Memory    │
    │  Session  │    │ (Inference)│    │  (Vectors)  │
    │  Server   │    └────────────┘    └─────────────┘
    └───────────┘         │
         │               ┌──────┬──────────┬──────────┐
         │               │      │          │          │
    ┌────▼──────┐    ┌───▼──┐ ┌▼──┐ ┌────▼────┐ ┌──▼────┐
    │ Firebase  │    │Embed │ │CMS│ │Conductor │ │Webhook│
    │  (OIDC)   │    │(emb) │ └───┘ │(Workflow)│ │Disp.  │
    └───────────┘    └──────┘       └──────────┘ └───────┘

                    NATS JetStream
            (Async event bus connecting all services)

         PostgreSQL + pgvector | Redis | Elasticsearch
            (Data persistence and caching)
```

### Service Categories

**Core Intelligence (Real-time)**
- `heady-brain` - LLM inference (Go, GPU-optimized)
- `heady-embed` - Text embeddings (Node.js)
- `heady-memory` - Vector search (Node.js, pgvector)
- `heady-conductor` - Workflow orchestration (Node.js)

**API & Access (Authentication)**
- `api-gateway` - Request routing and rate limiting
- `auth-session-server` - JWT issuance and management
- `permission-guard` - RBAC enforcement
- `relay-iframe` - Cross-domain SSO

**Content Management**
- `drupal-headless-cms` - Content management and delivery

**Integrations**
- `webhook-dispatcher` - Outbound event delivery
- `integration-hub` - Third-party API orchestration
- `skill-executor` - Custom skills/plugins

**Observability**
- `prometheus` - Metrics collection
- `grafana` - Dashboards and alerting
- `jaeger` - Distributed tracing
- `loki` - Log aggregation

---

## Key Concepts

### 1. CSL (Confidence Signal Logic)

Instead of boolean gates, HEADY uses confidence scores (0-1) for decisions:

```typescript
// Traditional: block if any condition false
if (userPermission && systemHealthy && rateLimitOk) {
  execute();
}

// CSL: aggregate confidence signals
const signals = [
  { name: 'permission', value: 0.95, weight: 0.3 },
  { name: 'health', value: 0.92, weight: 0.3 },
  { name: 'rate_limit', value: 0.88, weight: 0.4 }
];

const confidence = weightedMean(signals); // 0.91

if (confidence > 0.85) {
  execute(); // Proceed with high confidence
} else if (confidence > 0.75) {
  executeWithSafeguards(); // Monitored path
} else {
  queue(); // Queue for review
}
```

**Why?** Allows graceful degradation and captures reasoning for compliance.

### 2. φ-Scaling (Golden Ratio)

All constants derived from φ (≈1.618) for mathematical coherence:

```typescript
// Cache TTL hierarchy
const CACHE_TTL = {
  HOT: 13,      // F(7) seconds
  WARM: 34,     // F(9) seconds (2.6x HOT)
  COLD: 89,     // F(11) seconds (2.6x WARM)
};

// Retry backoff: each retry waits φ times longer
const delays = [100, 162, 262, 424, 687]; // ms, multiplied by 1.618x

// Signal weights use φ^(-n)
const weights = [1.0, 0.618, 0.382, 0.236]; // φ^0, φ^(-1), φ^(-2), φ^(-3)
```

**Why?** Creates mathematical coherence; φ-scaling proven optimal in nature.

### 3. Concurrent-Equals

No request priorities. Fair queuing using time-based fairness:

```typescript
// All requests treated equally (FIFO)
// Prevent starvation via SLA: any request waiting >30s gets temporary priority

// Example:
// Request A in queue for 15s → processed normally
// Request B in queue for 35s → promoted (SLA exceeded)
// Both get equal treatment within SLA tier
```

**Why?** Prevents priority inversion, starvation, and simplifies reasoning.

### 4. Domain Isolation

60+ domains operate independently with shared infrastructure:

```typescript
// Every request includes domain_id
const request = {
  domain_id: 'customer-a',
  user_id: '123',
  action: 'get_articles'
};

// Permission checks verify domain match
if (request.domain_id !== session.domain_id) {
  throw new Error('Domain mismatch');
}

// Data queries include domain filter
const articles = db.articles.find({
  domain_id: 'customer-a' // Always include domain filter
});
```

---

## Service Map

### Core Service Dependencies

```
heady-brain
├── heady-embed (get embeddings for context)
├── heady-memory (retrieve relevant context vectors)
├── heady-conductor (execute complex workflows)
├── api-gateway (receive requests)
├── auth-session-server (validate user)
└── NATS (publish inference.complete events)

heady-memory
├── pgvector (vector search)
├── redis (cache results)
└── NATS (subscribe to embedding.generated)

heady-embed
├── OpenAI API or Cohere API
├── redis (cache embeddings)
└── NATS (publish embedding.generated)

auth-session-server
├── Firebase (verify ID tokens)
├── postgres (store sessions)
├── redis (cache session data)
├── permission-guard (validate permissions)
└── NATS (publish auth.session.created)

drupal-headless-cms
├── postgres (store content)
├── elasticsearch (full-text search)
├── heady-embed (auto-generate embeddings)
└── NATS (publish node.published events)
```

---

## How to Add a New Service

### 1. Create Service Skeleton

```bash
# Generate new service from template
npm run scaffold:service my-service

# Creates directory structure:
# services/my-service/
# ├── src/
# │   ├── index.ts
# │   ├── routes/
# │   ├── models/
# │   └── utils/
# ├── tests/
# ├── Dockerfile
# ├── package.json
# └── README.md
```

### 2. Define Service Interface

```typescript
// services/my-service/src/index.ts
import express from 'express';
import { cslGate } from '@heady/confidence-logic';

const app = express();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: Date.now()
  });
});

app.post('/api/my-endpoint', async (req, res) => {
  const { domain_id, user_id, data } = req.body;

  // Validate domain
  if (!domain_id) {
    return res.status(400).json({ error: 'domain_id required' });
  }

  // Apply CSL gate
  const gate = new cslGate([
    { name: 'permission', value: 0.95, weight: 0.5 },
    { name: 'system_health', value: 0.88, weight: 0.5 }
  ]);
  const { pass, confidence } = gate.decide(0.80);

  if (!pass) {
    return res.status(503).json({
      error: 'Service unavailable',
      confidence
    });
  }

  // Process request
  try {
    const result = await processData(domain_id, data);
    res.json({ success: true, result, confidence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 8000);
```

### 3. Add OpenAPI Specification

```yaml
# services/my-service/openapi.yaml
openapi: 3.0.0
info:
  title: My Service API
  version: 1.0.0
paths:
  /api/my-endpoint:
    post:
      summary: Process data
      parameters:
        - in: header
          name: Authorization
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                domain_id:
                  type: string
                user_id:
                  type: string
                data:
                  type: object
      responses:
        '200':
          description: Success
```

### 4. Add NATS Event Subscriptions

```typescript
// services/my-service/src/events.ts
import { JetStreamClient } from '@nats-io/jetstream';

export async function setupEventListeners(js: JetStreamClient) {
  // Subscribe to relevant domain events
  await js.subscribe('heady.*.drupal.node.published', {
    durable: 'my-service-node-published',
    flow_control: { idle_heartbeat: 5000, max_bytes: 1024 * 1024 }
  }, async (msg) => {
    try {
      const event = JSON.parse(new TextDecoder().decode(msg.data));
      console.log('Node published:', event.nodeId);
      // Process event
      msg.ack();
    } catch (err) {
      console.error('Error processing event:', err);
      msg.nak(); // Retry on error
    }
  });

  // Publish custom events
  await js.publish('heady.system.my-service.ready', JSON.stringify({
    timestamp: Date.now(),
    version: '1.0.0'
  }));
}
```

### 5. Add Tests

```typescript
// services/my-service/tests/api.test.ts
import request from 'supertest';
import app from '../src/index';

describe('My Service API', () => {
  it('should return 400 without domain_id', async () => {
    const res = await request(app)
      .post('/api/my-endpoint')
      .send({ user_id: '123', data: {} });

    expect(res.status).toBe(400);
  });

  it('should process request with valid domain_id', async () => {
    const res = await request(app)
      .post('/api/my-endpoint')
      .send({
        domain_id: 'test-domain',
        user_id: '123',
        data: { test: true }
      });

    expect(res.status).toBe(200);
  });
});
```

### 6. Build and Deploy

```bash
# Build Docker image
npm run build:service my-service

# Push to container registry
docker tag heady-my-service:latest gcr.io/heady-ai/my-service:1.0.0
docker push gcr.io/heady-ai/my-service:1.0.0

# Deploy to Kubernetes
kubectl apply -f k8s/my-service-deployment.yaml

# Verify deployment
kubectl get pods | grep my-service
```

---

## Testing Strategy

### Unit Tests

```bash
# Test individual service
npm run test:unit services/my-service

# Run with coverage
npm run test:unit services/my-service --coverage
```

### Integration Tests

```bash
# Test service-to-service communication
npm run test:integration services/my-service
# Starts dependent services automatically
```

### E2E Tests

```bash
# Test full flow from client to multiple services
npm run test:e2e

# Test specific domain scenario
npm run test:e2e --domain=customer-a
```

### Load Testing

```bash
# Run k6 load tests
npm run test:load services/my-service --rps=100

# Profile endpoint at 100 requests/sec
# Results in reports/load-test-results.html
```

---

## Deployment Process

### Staging Deployment

```bash
# Create pull request with your changes
git push origin feature/my-feature
# Create PR on GitHub

# Run automated tests (CI/CD)
# Tests must pass before merge

# Merge PR
# Staging deployment triggers automatically

# Verify in staging
curl -H "Authorization: Bearer staging-token" \
  https://staging.heady.ai/api/health
```

### Production Deployment

```bash
# Tag release
git tag v1.0.0
git push origin v1.0.0

# Production deployment triggers
# Blue-green deployment:
# 1. New pods start with v1.0.0
# 2. Health checks pass
# 3. Traffic switches from v0.9.0 to v1.0.0
# 4. Old pods gracefully shut down

# Verify production
curl -H "Authorization: Bearer prod-token" \
  https://api.heady.ai/health

# Canary rollout (if needed)
# Deploy to 10% of instances
# Monitor error rate
# Gradually increase to 100%
```

### Rollback Procedure

```bash
# If issues detected
git revert v1.0.0

# Push rollback
git tag v1.0.0-rollback
git push origin v1.0.0-rollback

# Traffic automatically switches back to v0.9.0
```

---

## Common Development Tasks

### Debug a Service

```bash
# View logs
kubectl logs -f deployment/heady-brain

# View recent logs (last 100 lines)
kubectl logs --tail=100 deployment/heady-brain

# View logs with timestamps
kubectl logs -f --timestamps deployment/heady-brain

# Follow logs from multiple services
kubectl logs -f -l app=heady-brain,app=heady-memory --max-log-requests=5
```

### Connect to Database

```bash
# Port-forward PostgreSQL
kubectl port-forward svc/postgres 5432:5432

# Connect with psql
psql -h localhost -U heady_user -d heady_db
# Password: (stored in Secret Manager)

# List tables
\dt

# Query vector embeddings
SELECT document_id, embedding <-> ARRAY[0.1, 0.2, ...] as distance
FROM embeddings
WHERE domain_id = 'customer-a'
ORDER BY distance
LIMIT 10;
```

### Inspect NATS Events

```bash
# Port-forward NATS
kubectl port-forward svc/nats 4222:4222

# Connect to NATS
nats --server=nats://localhost:4222

# List streams
nats stream list

# View stream info
nats stream info DOMAIN_A_EVENTS

# View consumer info
nats consumer info DOMAIN_A_EVENTS my-service

# View messages (with offset)
nats stream view DOMAIN_A_EVENTS
```

### View Metrics in Grafana

```bash
# Access Grafana
open http://localhost:3000
# Username: admin
# Password: (from Secret Manager)

# Relevant dashboards:
# - Service Overview (all 50 services)
# - API Gateway Metrics
# - Inference Latency
# - Vector Search Performance
# - Error Rates by Service
# - Domain-specific metrics
```

### Trace Request with Jaeger

```bash
# View Jaeger UI
open http://localhost:16686

# Search for trace:
# 1. Service: heady-brain
# 2. Operation: inference
# 3. Time range: Last hour
# 4. View timeline of all service calls

# Identify bottlenecks from trace visualization
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
kubectl logs deployment/my-service

# Common issues:
# 1. Database not initialized: npm run db:migrate
# 2. Missing env vars: check .env.local
# 3. Port in use: lsof -i :8000
# 4. Health check failing: check probe config
```

### High Latency

```bash
# Check distributed trace in Jaeger
# Identify slow service in call chain

# Common fixes:
# 1. Cache hit rate too low: increase TTL or warmup data
# 2. Database slow: add index, analyze query plan
# 3. External API slow: implement timeout and fallback
# 4. Resource constrained: scale replicas or add CPU/memory
```

### Connection Pool Exhaustion

```bash
# Check active connections
psql -h localhost -U heady_user -d heady_db

# Query:
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

# If heady_db connection count near max (100):
# 1. Check for leaks (processes not closing connections)
# 2. Increase pool size in PgBouncer config
# 3. Implement connection timeouts

# Restart PgBouncer
kubectl rollout restart deployment/pgbouncer
```

### NATS Consumer Lag

```bash
# Check lag in all consumers
nats consumer list

# If lag > 10,000 messages:
# 1. Check if consumer service is running
# 2. Increase concurrent message processing
# 3. Check service logs for processing errors

# View pending messages
nats consumer info STREAM_NAME consumer_name | grep pending
```

---

## Next Steps

1. **Read Architecture Docs:** Review ADR files (adr/ directory) for design decisions
2. **Explore Codebase:** Start with api-gateway; trace calls to heady-brain
3. **Run Tests:** `npm run test` to understand current behavior
4. **Make Small Change:** Update endpoint description or add log message
5. **Deploy to Staging:** Follow deployment process above
6. **Review with Team:** Code review on GitHub PR

---

## Resources

- **API Documentation:** https://docs.heady.ai
- **OpenAPI Specs:** Each service has `openapi.yaml` in root
- **Architecture Decisions:** `docs/adr/` directory
- **Error Reference:** `docs/ERROR_CODES.md`
- **Service Runbooks:** `docs/runbooks/` directory
- **Incident Playbooks:** `docs/playbooks/` directory

---

## Getting Help

- **Slack:** #heady-dev-team
- **Office Hours:** Mondays 2pm PT via Zoom
- **Emergency:** Page on-call via PagerDuty
- **Documentation:** https://heady.notion.so/

Welcome to the team! You're now ready to contribute to the HEADY platform.

