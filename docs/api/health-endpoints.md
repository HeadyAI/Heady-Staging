# Health Check Endpoints

| Endpoint | Purpose | K8s Probe |
|---|---|---|
| `GET /health` | Basic liveness | Liveness |
| `GET /health/deep` | All service statuses | — |
| `GET /health/ready` | Ready to accept traffic | Readiness |
| `GET /health/startup` | Initial setup complete | Startup |
