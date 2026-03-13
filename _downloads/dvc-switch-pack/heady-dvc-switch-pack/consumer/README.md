# Heady Consumer Repo DVC Pack

Apply this pack inside a consumer repo such as `HeadyMe/Heady`.

## Setup

```bash
cp .env.dvc.example .env.dvc    # fill in keys
bash scripts/bootstrap-consumer.sh
bash scripts/import-assets.sh datasets/core/heedy-os-v1
source scripts/dvc-env.sh && dvc pull
```

## Update imports to latest registry revision

```bash
bash scripts/update-imports.sh
```

## Migrate an old local or LFS path

```bash
export HEADY_DATA_REGISTRY_CLONE="../heady-data-registry"
bash scripts/migrate-lfs-path.sh data/legacy-model models/legacy/legacy-model
```
