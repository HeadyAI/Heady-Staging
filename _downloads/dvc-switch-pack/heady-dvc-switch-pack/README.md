# HeadyMe: Git LFS → DVC Data Registry Switch Pack

This pack migrates HeadyMe repos and Heady project data from Git/Git LFS storage to:

- **GitHub**: code + orchestration (unchanged)
- **HeadyMe/heady-data-registry**: shared DVC data registry (metadata only)
- **Backblaze B2** (S3-compatible, us-west-002): stores the bytes

## Contents

| Directory | Purpose |
|---|---|
| `docs/` | Operator instructions, migration runbook, Heady services research |
| `registry/` | Copy into the new `HeadyMe/heady-data-registry` repo |
| `consumer/` | Copy into each code repo (start with `HeadyMe/Heady`) |

## Requirements

- bash, git, python3, zip
- `pip install "dvc[s3]"`
- rsync (recommended)

## Security

- Never commit B2 keys.
- Use GitHub Actions secrets (CI) and `.env.dvc` (local) instead.

## Execution Order

1. Create B2 bucket in us-west-002
2. Create `HeadyMe/heady-data-registry` and apply `registry/`
3. Run `registry/scripts/bootstrap-registry.sh`
4. Seed data with `registry/scripts/add-asset.sh`
5. Apply `consumer/` to `HeadyMe/Heady`
6. Run `consumer/scripts/bootstrap-consumer.sh`
7. Import assets with `consumer/scripts/import-assets.sh`
8. Migrate old LFS paths with `consumer/scripts/migrate-lfs-path.sh`
9. Repeat for remaining HeadyMe repos
10. Decommission LFS

See `docs/MIGRATION_RUNBOOK.md` for full details.
