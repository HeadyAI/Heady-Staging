# Heady Data Registry (DVC)

Single source of truth for shared HeadyMe data assets.

- Git stores metadata (`*.dvc`, `dvc.yaml`, etc.)
- Backblaze B2 stores bytes (S3-compatible)

## Directory Structure

```
datasets/          Versioned datasets (core, experiments, synthetic)
models/            Model weights and checkpoints (base, finetuned, legacy)
embeddings/        Vector embeddings (text, vision)
artifacts/         Renders, logs, pipeline outputs
scripts/           Setup and maintenance scripts
```

## Bootstrap

```bash
export HEADY_B2_BUCKET="your-bucket"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
bash scripts/bootstrap-registry.sh
```

## Add an Asset

```bash
bash scripts/add-asset.sh /abs/path/to/dataset datasets/core/heedy-os-v1
```

## Verify

```bash
bash scripts/doctor.sh
```
