#!/bin/bash
# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
# ║                                                                  ║
# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
# ║  FILE: scripts/heady-vm-migrate.sh                                                    ║
# ║  LAYER: automation                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END
# HeadyVM Migration Script
# Migrates all Heady services to HeadyVM with 100% cloud integration

set -e

echo "🚀 Starting HeadyVM Migration..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing services
echo "🛑 Stopping existing Heady services..."
docker-compose down --remove-orphans 2>/dev/null || true

# Pull latest HeadyVM images
echo "📦 Pulling latest HeadyVM images..."
docker pull headysystems/heady-vm-core:latest
docker pull headysystems/heady-vm-mesh:latest
docker pull headysystems/heady-vm-storage:latest

# Start HeadyVM services
echo "🔄 Starting HeadyVM services..."
docker-compose -f configs/heady-vm-migration.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for HeadyVM services to be ready..."
sleep 30

# Verify cloud connectivity
echo "🔍 Verifying cloud connectivity..."
if curl -f -s https://headysystems.com/api/health > /dev/null; then
    echo "✅ Cloud API connectivity verified"
else
    echo "❌ Cloud API connectivity failed"
    exit 1
fi

if curl -f -s https://headysystems.com/manager > /dev/null; then
    echo "✅ Manager service connectivity verified"
else
    echo "❌ Manager service connectivity failed"
    exit 1
fi

if curl -f -s https://headysystems.com/registry > /dev/null; then
    echo "✅ Registry service connectivity verified"
else
    echo "❌ Registry service connectivity failed"
    exit 1
fi

# Show running services
echo "📊 HeadyVM Services Status:"
docker-compose -f configs/heady-vm-migration.yml ps

echo "🎉 HeadyVM Migration Complete!"
echo "🌐 All services now running at 100% cloud capacity:"
echo "   - API: https://headysystems.com/api"
echo "   - Manager: https://headysystems.com/manager"
echo "   - Registry: https://headysystems.com/registry"
echo "   - HeadyVM Core: localhost:3400"
