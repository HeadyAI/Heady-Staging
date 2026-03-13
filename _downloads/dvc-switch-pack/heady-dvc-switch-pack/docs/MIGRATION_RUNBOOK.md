# Migration Runbook

## A) Create B2 Bucket + Key

1. Log in to Backblaze B2.
2. Create a private bucket in region `us-west-002`.
3. Create an application key scoped to the bucket.

Store credentials as:
- Local dev: `.env.dvc` (gitignored)
- CI: GitHub secrets `HEADY_B2_KEY_ID`, `HEADY_B2_APPLICATION_KEY`

Environment:

```bash
export HEADY_B2_BUCKET="your-real-bucket-name"
export HEADY_B2_PREFIX="dvcstore"
export HEADY_B2_ENDPOINT_URL="https://s3.us-west-002.backblazeb2.com"
```

## B) Create Registry Repo

1. Create `HeadyMe/heady-data-registry` on GitHub.
2. Clone it locally.
3. Copy everything from `registry/` into it.
4. Run `bash scripts/bootstrap-registry.sh`.
5. Commit and push.

## C) Seed Data into Registry

```bash
bash scripts/add-asset.sh /abs/path/to/src datasets/core/heedy-os-v1
bash scripts/add-asset.sh /abs/path/to/src models/base/base-embedder
bash scripts/add-asset.sh /abs/path/to/src embeddings/text/text-v1
```

## D) Convert a Consumer Repo

```bash
cd ../Heady
cp .env.dvc.example .env.dvc    # fill in keys
bash scripts/bootstrap-consumer.sh
bash scripts/import-assets.sh datasets/core/heedy-os-v1 models/base/base-embedder
source scripts/dvc-env.sh
dvc pull
```

## E) Migrate Existing Large/LFS Paths

```bash
export HEADY_DATA_REGISTRY_CLONE="../heady-data-registry"
bash scripts/migrate-lfs-path.sh data/checkpoints/current models/finetuned/current
bash scripts/migrate-lfs-path.sh assets/renders/base-pack artifacts/renders/base-pack
```

## F) CI Setup

Add the included workflow files:
- consumer repo: `.github/workflows/dvc-hydrate.yml`
- registry repo: `.github/workflows/validate-registry.yml`

Set GitHub repository secrets (or org-level):
- `HEADY_B2_KEY_ID`
- `HEADY_B2_APPLICATION_KEY`

```bash
gh secret set HEADY_B2_KEY_ID --org HeadyMe --visibility all
gh secret set HEADY_B2_APPLICATION_KEY --org HeadyMe --visibility all
```

## G) Rollout Order

1. `HeadyMe/Heady`
2. `HeadyMe/Heady-pre-production-9f2f0642`
3. Shared service repos that depend on common models/data
4. Satellite repos

## H) Decommission LFS

1. Confirm no `.gitattributes` contains `filter=lfs`.
2. Run `git lfs uninstall` in each repo.
3. Check LFS usage under GitHub Billing.
4. Lower or remove LFS budget.

## I) Rollback

If a migration breaks a repo:
1. Revert the consumer repo commit that introduced the import.
2. Restore the previous local path from Git history.
3. Keep the registry asset intact.
4. Retry after fixing path assumptions.
