# Backup and restore

## Coverage
- PostgreSQL and pgvector content
- generated assets and manifests
- schema registry files
- deployment and environment manifests

## Restore shape
1. Restore database snapshots.
2. Rehydrate vector indexes.
3. Restore asset manifests before publishing CDN pointers.
4. Verify session, auth, and gateway connectivity after state restoration.
