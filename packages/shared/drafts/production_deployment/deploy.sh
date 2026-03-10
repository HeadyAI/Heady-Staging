#!/bin/bash
# AI Workflow Engine Deployment Script

set -e

echo "Deploying AI Workflow Engine..."

# Environment variables
export RENDER_API_TOKEN="${RENDER_API_TOKEN}"
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}"
export GITHUB_TOKEN="${GITHUB_TOKEN}"

# Deploy to Render
echo "Deploying to Render..."
curl -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @render-service-config.json

# Deploy Cloudflare Worker
echo "Deploying Cloudflare Worker..."
npm run deploy:worker

# Setup GitHub Actions
echo "Setting up GitHub Actions..."
mkdir -p .github/workflows
cp github-workflow.yml .github/workflows/ai-workflow.yml

echo "Deployment complete!"
