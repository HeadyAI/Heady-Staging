#!/usr/bin/env bash
set -euo pipefail

if [ -f .env.dvc ]; then
  set -a
  source ./.env.dvc
  set +a
fi

: "${AWS_ACCESS_KEY_ID:?missing AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?missing AWS_SECRET_ACCESS_KEY}"

export AWS_EC2_METADATA_DISABLED=true
export HEADY_B2_ENDPOINT_URL="${HEADY_B2_ENDPOINT_URL:-https://s3.us-west-002.backblazeb2.com}"
export HEADY_DATA_REGISTRY_URL="${HEADY_DATA_REGISTRY_URL:-https://github.com/HeadyMe/heady-data-registry}"
export HEADY_DATA_REGISTRY_CLONE="${HEADY_DATA_REGISTRY_CLONE:-../heady-data-registry}"

echo "DVC environment loaded."
