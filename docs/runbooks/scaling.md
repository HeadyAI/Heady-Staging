# Runbook: Scaling

## Cloud Run Auto-scaling
Configured via `gcloud run services update`:
```bash
gcloud run services update heady-<service> \
  --min-instances=1 \
  --max-instances=100 \
  --concurrency=80 \
  --cpu=2 \
  --memory=2Gi
```

## Database Scaling
- **PgBouncer:** Transaction pooling (max 200 client connections → 50 DB connections)
- **Read replicas:** Add via Cloud SQL for read-heavy workloads
- **pgvector index:** Rebuild with increased lists for large datasets: `REINDEX INDEX idx_memories_embedding;`

## Model Scaling
- **Vertex AI:** Auto-scales, no config needed
- **AI Studio:** Rate limits apply (free tier: 15 RPM)
- **Fallback chain:** gemini-3.1-pro → gpt-5.4 → opus-4.6 → local ollama
