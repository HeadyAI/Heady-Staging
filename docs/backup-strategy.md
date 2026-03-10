# Heady Platform — Backup & Disaster Recovery Strategy

**Author:** Eric Haywood — HeadySystems  
**License:** PROPRIETARY  
**Last Updated:** 2026-03-10

---

## Overview

All backup schedules, retention periods, and sizing use **φ-derived constants** and **Fibonacci numbers**. No magic numbers.

| Constant | Value | Usage |
|----------|-------|-------|
| φ (PHI) | 1.6180339887 | Scaling ratios |
| ψ (PSI) | 0.6180339887 | Decay/retention factor |
| Fibonacci | 1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597 | Scheduling & sizing |

---

## Backup Tiers

### Tier 1 — Critical Data (Hot)
**What:** PostgreSQL + pgvector (3D vector memory), auth tokens, session state  
**Schedule:** Every **8 hours** (fib(6))  
**Retention:** **89 days** (fib(11))  
**Method:** pg_dump with WAL archiving, encrypted at rest (AES-256)  
**Storage:** GCS bucket `heady-backups-critical`, region us-east1  
**RPO:** 8 hours  
**RTO:** 34 minutes (fib(9))

### Tier 2 — Important Data (Warm)
**What:** Application configs, deployment manifests, CI/CD state, monitoring data  
**Schedule:** Every **13 hours** (fib(7))  
**Retention:** **55 days** (fib(10))  
**Method:** Tarball snapshots, compressed with zstd  
**Storage:** GCS bucket `heady-backups-warm`, region us-east1  
**RPO:** 13 hours  
**RTO:** 55 minutes (fib(10))

### Tier 3 — Archival Data (Cold)
**What:** Logs, audit trails, historical metrics, experiment data  
**Schedule:** Every **34 hours** (fib(9))  
**Retention:** **233 days** (fib(13))  
**Method:** Incremental snapshots, Coldline storage class  
**Storage:** GCS bucket `heady-backups-archive`, region us-east1  
**RPO:** 34 hours  
**RTO:** 144 minutes (fib(12))

---

## Backup Components

### PostgreSQL + pgvector
```bash
# Full backup with custom format for parallel restore
pg_dump -Fc -Z 5 -j 8 -f /backups/heady-pg-$(date +%Y%m%d-%H%M).dump heady_production

# WAL archiving for point-in-time recovery
archive_command = 'gcloud storage cp %p gs://heady-backups-critical/wal/%f'
```

### Vector Memory (384D Embeddings)
```bash
# Export vector data with metadata
psql -c "COPY (SELECT id, embedding::text, metadata, created_at FROM vector_memory) TO STDOUT WITH CSV HEADER" > /backups/vectors-$(date +%Y%m%d).csv

# Binary export for faster restore (pgvector native format)
pg_dump -t vector_memory --data-only -Fc -f /backups/vectors-native-$(date +%Y%m%d).dump heady_production
```

### Configuration & Secrets
- **1Password**: Source of truth for all secrets (API keys, certificates)
- **Config backup**: `tar czf /backups/config-$(date +%Y%m%d).tar.gz /app/config/ /app/.env.vault`
- **Kubernetes secrets**: Backed up via Velero with encryption

### GitHub Repository (Genetic Code)
- **HeadyMe/Heady-pre-production**: GitHub's own redundancy + mirror to GCS
- **Schedule**: Real-time (push-based mirroring)
- **Retention:** Infinite (Git history is append-only)
- **Method:** `git clone --mirror` to GCS every fib(6)=8 hours

---

## Disaster Recovery Procedures

### Scenario 1: Database Corruption
1. Stop application services (graceful shutdown via lifecycle-bee.js)
2. Restore from latest pg_dump: `pg_restore -j 8 -d heady_production /backups/latest.dump`
3. Apply WAL logs for point-in-time recovery
4. Verify vector memory integrity: run coherence check across all embeddings
5. Restart services in dependency order (shared → core → services → agents)
6. Run self-healing cycle to detect any drift
7. **Target RTO:** 34 minutes (fib(9))

### Scenario 2: Full Region Failure (us-east1)
1. DNS failover to us-west1 standby (Cloudflare)
2. Promote read replica to primary
3. Restore application from latest container images (Cloud Run)
4. Verify all 50 services on ports 3310-3396
5. Run HCFullPipeline health gate
6. **Target RTO:** 89 minutes (fib(11))

### Scenario 3: Ransomware / Security Breach
1. **Isolate:** Network quarantine all compromised services
2. **Assess:** Run security-bee.js full audit
3. **Rotate:** All credentials via 1Password + HeadySecretService
4. **Restore:** From last known-clean backup (verify SHA-256 checksums)
5. **Harden:** Apply ip-anomaly-detector.js blocks, review WAF rules
6. **Report:** Generate incident report via documentation-bee.js
7. **Target RTO:** 144 minutes (fib(12))

---

## Verification & Testing

### Backup Verification Schedule
| Test | Frequency | Description |
|------|-----------|-------------|
| Backup integrity | Every **8 hours** (fib(6)) | SHA-256 checksum verification |
| Restore test (sample) | Every **13 days** (fib(7)) | Restore to staging environment |
| Full DR drill | Every **89 days** (fib(11)) | Complete disaster recovery simulation |
| Chaos experiment | Every **34 days** (fib(9)) | chaos-engineering.js dependency failure test |

### Automated Monitoring
- **Alert threshold:** Backup age > fib(n+1) × schedule interval → WARNING
- **Critical alert:** Backup age > fib(n+2) × schedule interval → PAGE
- **Health probe:** `/api/monitoring/backup-health` returns last backup timestamps

---

## Cost Estimation (φ-scaled)

| Tier | Monthly Storage | Monthly Transfer | Total |
|------|----------------|-----------------|-------|
| Critical (Hot) | ~$13/mo (fib(7)) | ~$5/mo (fib(5)) | ~$18/mo |
| Important (Warm) | ~$8/mo (fib(6)) | ~$3/mo (fib(4)) | ~$11/mo |
| Archival (Cold) | ~$5/mo (fib(5)) | ~$1/mo (fib(1)) | ~$6/mo |
| **Total** | | | **~$35/mo** |

---

## Compliance

- All backups encrypted at rest (AES-256) and in transit (TLS 1.3)
- Access logged to immutable audit trail
- Retention policies enforced automatically (GCS lifecycle rules)
- Deletion requires dual approval (HeadySoul governance gate)
- SOC 2 Type II aligned backup procedures
