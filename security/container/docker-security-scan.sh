#!/usr/bin/env bash
# Heady Docker Security Scan — Sacred Genesis v4.0.0
set -euo pipefail
SEVERITY_THRESHOLD="HIGH,CRITICAL"
SCAN_TIMEOUT=233
echo '{"level":"info","service":"security-scan","message":"Starting container security scan"}'
SERVICES_DIR="./services"
FAILURES=0
SCANNED=0
for service_dir in "${SERVICES_DIR}"/*/; do
  service_name=$(basename "${service_dir}")
  [ ! -f "${service_dir}/Dockerfile" ] && continue
  SCANNED=$((SCANNED + 1))
  IMAGE_TAG="heady/${service_name}:scan"
  echo '{"level":"info","service":"security-scan","message":"Scanning","target":"'"${service_name}"'"}'
  docker build -t "${IMAGE_TAG}" -f "${service_dir}/Dockerfile" . --quiet 2>/dev/null || { FAILURES=$((FAILURES + 1)); continue; }
  trivy image --severity "${SEVERITY_THRESHOLD}" --exit-code 1 --timeout "${SCAN_TIMEOUT}s" --format json --output "/tmp/scan-${service_name}.json" "${IMAGE_TAG}" 2>/dev/null || FAILURES=$((FAILURES + 1))
  docker rmi "${IMAGE_TAG}" --force 2>/dev/null || true
done
echo '{"level":"info","service":"security-scan","message":"Scan complete","scanned":'"${SCANNED}"',"failures":'"${FAILURES}"'"}'
exit ${FAILURES}
