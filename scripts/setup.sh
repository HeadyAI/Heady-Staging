#!/usr/bin/env bash
set -euo pipefail
bold() { echo -e "\033[1m$1\033[0m"; }
green() { echo -e "\033[0;32m$1\033[0m"; }
red() { echo -e "\033[0;31m$1\033[0m"; }

bold "\n🧠 Heady Setup\n"

# Check Node
bold "Checking Node.js..."
command -v node &>/dev/null || { red "❌ Node.js not found. Install 20+."; exit 1; }
NODE_V=$(node --version | cut -dv -f2 | cut -d. -f1)
[ "$NODE_V" -ge 20 ] || { red "❌ Node $NODE_V found, need 20+."; exit 1; }
green "✅ Node $(node --version)"

# Check npm
command -v npm &>/dev/null && green "✅ npm $(npm --version)" || { red "❌ npm not found."; exit 1; }

# Check Git
command -v git &>/dev/null && green "✅ Git $(git --version | cut -d' ' -f3)" || { red "❌ Git not found."; exit 1; }

# Container runtime
command -v docker &>/dev/null && green "✅ Docker" || command -v podman &>/dev/null && green "✅ Podman" || echo "⚠️  No container runtime found (optional)"

# Install
bold "\nInstalling dependencies..."
npm install
green "✅ Dependencies installed"

# .env
[ -f .env ] && green "✅ .env exists" || { cp .env.example .env; green "✅ .env created — edit with your keys"; }

# Data dirs
mkdir -p data/memory data/logs data/checkpoints
green "✅ Data directories ready"

# Validate
bold "\nValidating environment..."
node scripts/validate-env.js || true

bold "\n🎉 Setup complete!"
echo "  1. Edit .env with your API keys"
echo "  2. node heady-manager.js"
echo "  3. bash scripts/smoke-test.sh"
