#!/bin/bash
find services/ -name Dockerfile -exec sed -i 's/localhost/127.0.0.1/g' {} +
find packages/platform/ -type f \( -name "*.js" -o -name "*.ts" -o -name "*.yaml" -o -name "*.yml" \) -not -path "*/node_modules/*" -exec sed -i 's/localhost/127.0.0.1/g' {} +
