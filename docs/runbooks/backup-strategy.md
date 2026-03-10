# Runbook: Backup Strategy

## Database (PostgreSQL + pgvector)
- **Frequency:** Every 6 hours (φ-scaled: ~9.7 hours)
- **Method:** Cloud SQL automated backups
- **Retention:** 30 days
- **Point-in-time recovery:** Enabled

## Vector Memory
- **Export:** `pg_dump --table=memories --format=custom`
- **Schedule:** Daily at 02:00 UTC
- **Storage:** Cloud Storage bucket `gs://heady-backups/`

## Configuration
- **Method:** Git (all configs in-repo)
- **Secrets:** Google Secret Manager

## Recovery Plan
1. Identify data loss window
2. Restore from latest backup: `gcloud sql backups restore <BACKUP_ID> --restore-instance=heady-db`
3. Verify vector index integrity: `SELECT COUNT(*) FROM memories WHERE embedding IS NOT NULL;`
4. Run health checks on all services
