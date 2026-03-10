# Heady™ Onboarding Service

Progressive onboarding with φ-scaled stage weights. Port: 3365

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /stages | List all onboarding stages |
| POST | /start | Initialize onboarding `{ userId, email, name }` |
| POST | /complete-stage | Complete a stage `{ userId, stageId, data }` |
| GET | /status/:userId | Get onboarding progress |

## Stages

1. Account Creation
2. Profile Setup
3. Workspace Configuration
4. Integration Connect (GitHub, GCP, Cloudflare, Colab Pro+)
5. First Task (HeadyConductor pipeline)
