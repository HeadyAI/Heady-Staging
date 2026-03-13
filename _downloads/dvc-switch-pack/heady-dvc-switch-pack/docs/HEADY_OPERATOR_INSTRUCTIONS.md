# Heady Operator Instructions (Execute Exactly)

## Objective

Migrate all HeadyMe repos off Git LFS for large assets and onto a
shared DVC data registry backed by Backblaze B2 S3 (us-west-002).

## Canonical Components

- Registry repo (new): `HeadyMe/heady-data-registry`
- Consumer repos: `HeadyMe/Heady` + other HeadyMe repos
- Object store: Backblaze B2 S3 endpoint `https://s3.us-west-002.backblazeb2.com`

## Golden Rules

1. Code stays in GitHub.
2. Large assets never go into Git history.
3. Shared large assets must enter the registry first (DVC tracked).
4. Consumer repos only reference shared assets via `dvc import` / `dvc update`.
5. Secrets never committed; env vars + GitHub secrets only.
6. Reject future PRs that add large binaries directly to Git.

## Execution Phases

### Phase 1: Create the Registry

1. Create GitHub repo `HeadyMe/heady-data-registry` (private).
2. Copy everything from `registry/` into that repo.
3. Set environment:
   - `HEADY_B2_BUCKET`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
4. Run `bash scripts/bootstrap-registry.sh`.
5. Commit and push.

### Phase 2: Seed the Registry

For each existing large asset:

```bash
bash scripts/add-asset.sh /source/path datasets/core/<name>
bash scripts/add-asset.sh /source/path models/base/<name>
bash scripts/add-asset.sh /source/path embeddings/text/<name>
```

After each: verify `.dvc` file exists, `dvc push` succeeds, push Git.

### Phase 3: Convert HeadyMe/Heady

1. Copy `consumer/` files into repo root.
2. `cp .env.dvc.example .env.dvc` and fill keys.
3. `bash scripts/bootstrap-consumer.sh`
4. `bash scripts/import-assets.sh datasets/core/<name> models/base/<name>`
5. `source scripts/dvc-env.sh && dvc pull`
6. Verify repo boots with imported data.

### Phase 4: Migrate Existing LFS Paths

For each large path currently in a consumer repo:

```bash
export HEADY_DATA_REGISTRY_CLONE="../heady-data-registry"
bash scripts/migrate-lfs-path.sh <local_path> <registry_rel_path>
```

### Phase 5: Repeat for Other HeadyMe Repos

Apply the `consumer/` bundle to each repo that needs shared assets.

### Phase 6: Enforce Policy

Reject future PRs that:
- Add large binaries directly to Git
- Add new Git LFS rules for shared project assets
- Bypass the registry for reusable datasets/models

## Success Criteria

- [ ] Repo clone remains small and fast
- [ ] `dvc pull` hydrates all required assets
- [ ] CI can pull assets using secrets
- [ ] No required Heady runtime asset depends on Git LFS
- [ ] Shared datasets/models exist exactly once in the registry
- [ ] GitHub LFS billing shows near-zero usage
