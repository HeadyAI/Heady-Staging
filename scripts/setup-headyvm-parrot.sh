#!/usr/bin/env bash
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
# ║  FILE: scripts/setup-headyvm-parrot.sh                                                    ║
# ║  LAYER: automation                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END
# ╔══════════════════════════════════════════════════════════════════╗
# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
# ║                                                                  ║
# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
# ║  FILE: scripts/setup-headyvm-parrot.sh                          ║
# ║  LAYER: infrastructure                                          ║
# ║  TARGET: Parrot OS 7 (Security/Home) on HeadyVM                ║
# ╚══════════════════════════════════════════════════════════════════╝
#
# HeadyVM Comprehensive Setup — Parrot OS 7 + Windsurf
# Run as your regular user (script uses sudo where needed).
#   chmod +x setup-headyvm-parrot.sh && ./setup-headyvm-parrot.sh
#
# Phases:
#   0  Pre-flight checks
#   1  System update & core packages
#   2  Node.js 20 LTS (via nvm)
#   3  Python 3.12 + venv
#   4  Docker Engine + Compose v2
#   5  Git, Git LFS, SSH keys
#   6  Windsurf IDE
#   7  Cloudflared tunnel agent
#   8  Heady project clone & bootstrap
#   9  Firewall & security hardening
#  10  Systemd services (heady-manager, cloudflared)
#  11  VM-specific optimizations
#  12  Verification & summary
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# Configuration — override with env vars before running
# ──────────────────────────────────────────────────────────────────
HEADY_USER="${HEADY_USER:-$(whoami)}"
HEADY_HOME="${HEADY_HOME:-/home/${HEADY_USER}/Heady}"
HEADY_REPO="${HEADY_REPO:-git@github.com:HeadySystems/Heady.git}"
HEADY_REPO_HEADYME="${HEADY_REPO_HEADYME:-git@github.com:HeadyMe/Heady.git}"
NODE_VERSION="${NODE_VERSION:-20}"
PYTHON_VERSION="${PYTHON_VERSION:-3.12}"
HEADY_MANAGER_PORT="${HEADY_MANAGER_PORT:-3300}"
HEADY_BUDDY_PORT="${HEADY_BUDDY_PORT:-3301}"
HEADY_WEB_PORT="${HEADY_WEB_PORT:-3000}"
CLOUDFLARED_TUNNEL_NAME="${CLOUDFLARED_TUNNEL_NAME:-heady-vm-tunnel}"
LOG_FILE="/tmp/heady-vm-setup-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; NC='\033[0m'

log()  { echo -e "${CYAN}[HEADY]${NC} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}  [OK]${NC} $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}  [WARN]${NC} $*" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}  [FAIL]${NC} $*" | tee -a "$LOG_FILE"; }
phase(){ echo -e "\n${MAGENTA}═══════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
         echo -e "${MAGENTA}  Phase $1: $2${NC}" | tee -a "$LOG_FILE"
         echo -e "${MAGENTA}═══════════════════════════════════════${NC}" | tee -a "$LOG_FILE"; }

# ──────────────────────────────────────────────────────────────────
# Phase 0 — Pre-flight
# ──────────────────────────────────────────────────────────────────
phase 0 "Pre-flight Checks"

if [[ $EUID -eq 0 ]]; then
  fail "Do not run as root. Run as your regular user; sudo is used internally."
  exit 1
fi

if ! grep -qiE 'parrot|debian' /etc/os-release 2>/dev/null; then
  warn "This script targets Parrot OS 7 (Debian-based). Detected different OS."
  read -rp "Continue anyway? [y/N] " ans
  [[ "$ans" =~ ^[Yy] ]] || exit 1
fi

DISTRO=$(grep ^PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"')
log "Detected: $DISTRO"
log "User: $HEADY_USER"
log "Heady home: $HEADY_HOME"
log "Log: $LOG_FILE"

# ──────────────────────────────────────────────────────────────────
# Phase 1 — System Update & Core Packages
# ──────────────────────────────────────────────────────────────────
phase 1 "System Update & Core Packages"

sudo apt-get update -qq
sudo apt-get upgrade -y -qq

CORE_PACKAGES=(
  # Build essentials
  build-essential gcc g++ make cmake pkg-config autoconf automake libtool
  # Libraries
  libssl-dev libffi-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev liblzma-dev
  # Tools
  curl wget gnupg2 apt-transport-https ca-certificates lsb-release
  software-properties-common unzip zip jq yq tree htop btop tmux screen
  # Network
  net-tools dnsutils nmap traceroute iptables ufw wireguard-tools
  # Version control
  git git-lfs
  # Container runtime deps
  uidmap dbus-user-session fuse-overlayfs slirp4netns
  # Virtualization guest tools (VM optimizations)
  open-vm-tools open-vm-tools-desktop qemu-guest-agent spice-vdagent
  # Filesystem & disk
  btrfs-progs lvm2 parted
  # Clipboard & display (for Windsurf GUI)
  xclip xsel xdg-utils libx11-xcb1 libxkbcommon0 libdrm2 libgbm1
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libgtk-3-0
  libpango-1.0-0 libcairo2 libxcomposite1 libxdamage1 libxrandr2
  libnspr4 libnss3 libxshmfence1
  # Editors & utilities
  vim neovim nano ripgrep fd-find bat exa fzf
  # Monitoring
  sysstat iotop dstat
  # Python build deps
  python3-dev python3-pip python3-venv python3-full
)

log "Installing ${#CORE_PACKAGES[@]} core packages..."
sudo apt-get install -y -qq "${CORE_PACKAGES[@]}" 2>&1 | tail -5 | tee -a "$LOG_FILE"
ok "Core packages installed"

# ──────────────────────────────────────────────────────────────────
# Phase 2 — Node.js 20 LTS via nvm
# ──────────────────────────────────────────────────────────────────
phase 2 "Node.js ${NODE_VERSION} LTS"

export NVM_DIR="$HOME/.nvm"
if [[ ! -d "$NVM_DIR" ]]; then
  log "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"

nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
nvm use default

log "Node $(node -v) / npm $(npm -v)"
ok "Node.js ready"

# Global npm packages the project uses
npm install -g nodemon concurrently pm2 2>&1 | tail -3 | tee -a "$LOG_FILE"
ok "Global npm packages installed (nodemon, concurrently, pm2)"

# ──────────────────────────────────────────────────────────────────
# Phase 3 — Python 3.12 + Virtual Environment
# ──────────────────────────────────────────────────────────────────
phase 3 "Python ${PYTHON_VERSION}"

# Parrot 7 ships Python 3.12+ by default; confirm or install
if command -v python3 &>/dev/null; then
  PY_VER=$(python3 --version 2>&1 | awk '{print $2}')
  log "System Python: $PY_VER"
else
  warn "Python 3 not found, installing..."
  sudo apt-get install -y python3 python3-pip python3-venv
fi

# Create global Heady virtualenv
VENV_DIR="$HOME/.heady-venv"
if [[ ! -d "$VENV_DIR" ]]; then
  python3 -m venv "$VENV_DIR"
  ok "Created virtualenv at $VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

pip install --upgrade pip setuptools wheel 2>&1 | tail -2 | tee -a "$LOG_FILE"
pip install numpy pandas matplotlib jupyter ipykernel requests pyyaml \
  transformers torch --extra-index-url https://download.pytorch.org/whl/cpu \
  2>&1 | tail -5 | tee -a "$LOG_FILE"
ok "Python packages installed"

# Add venv activation to shell profile
SHELL_RC="$HOME/.bashrc"
[[ -f "$HOME/.zshrc" ]] && SHELL_RC="$HOME/.zshrc"
if ! grep -q 'heady-venv' "$SHELL_RC" 2>/dev/null; then
  cat >> "$SHELL_RC" << 'HEADY_SHELL'

# ── Heady VM Environment ──
export HEADY_HOME="$HOME/Heady"
export HEADY_PYTHON_BIN="$HOME/.heady-venv/bin/python"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
[ -s "$HOME/.heady-venv/bin/activate" ] && source "$HOME/.heady-venv/bin/activate"
export PATH="$HOME/.local/bin:$PATH"
HEADY_SHELL
  ok "Shell profile updated"
fi

# ──────────────────────────────────────────────────────────────────
# Phase 4 — Docker Engine + Compose v2
# ──────────────────────────────────────────────────────────────────
phase 4 "Docker Engine + Compose"

if ! command -v docker &>/dev/null; then
  log "Installing Docker CE..."
  # Parrot is Debian-based; use Debian repos
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  # Parrot 7 maps to Debian bookworm
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/debian bookworm stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin 2>&1 | tail -3 | tee -a "$LOG_FILE"
else
  log "Docker already installed: $(docker --version)"
fi

# Add user to docker group (no sudo for docker commands)
sudo usermod -aG docker "$HEADY_USER"
ok "Docker installed, user added to docker group"

# Create the Heady Docker network
sudo docker network create heady_heady-main-network 2>/dev/null || true
ok "Docker network heady_heady-main-network ready"

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker
ok "Docker daemon running"

# ──────────────────────────────────────────────────────────────────
# Phase 5 — Git, Git LFS, SSH Keys
# ──────────────────────────────────────────────────────────────────
phase 5 "Git & SSH Configuration"

git lfs install --skip-repo 2>&1 | tee -a "$LOG_FILE"

# Git global config
git config --global user.name "Eric (HeadyVM)"
git config --global user.email "dev@heady.io"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global core.autocrlf input
git config --global push.autoSetupRemote true
git config --global lfs.activitytimeout 60
ok "Git configured"

# SSH key generation (if missing)
SSH_KEY="$HOME/.ssh/id_ed25519"
if [[ ! -f "$SSH_KEY" ]]; then
  log "Generating SSH key..."
  mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -C "heady-vm@headysystems.com" -f "$SSH_KEY" -N ""
  ok "SSH key generated at $SSH_KEY"
  echo ""
  echo -e "${YELLOW}────────────────────────────────────────────${NC}"
  echo -e "${YELLOW}  ACTION REQUIRED: Add this public key to GitHub${NC}"
  echo -e "${YELLOW}────────────────────────────────────────────${NC}"
  cat "${SSH_KEY}.pub"
  echo ""
  echo "  https://github.com/settings/ssh/new"
  echo ""
  read -rp "Press Enter after adding the key to GitHub..."
else
  ok "SSH key exists at $SSH_KEY"
fi

# SSH config for GitHub
SSH_CONFIG="$HOME/.ssh/config"
if ! grep -q 'github.com' "$SSH_CONFIG" 2>/dev/null; then
  cat >> "$SSH_CONFIG" << 'SSHCFG'

Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  AddKeysToAgent yes

Host heady-desktop
  HostName heady-desktop
  User erich
  Port 22
  IdentityFile ~/.ssh/id_ed25519
SSHCFG
  chmod 600 "$SSH_CONFIG"
  ok "SSH config written"
fi

# Start ssh-agent
eval "$(ssh-agent -s)" 2>/dev/null
ssh-add "$SSH_KEY" 2>/dev/null || true

# ──────────────────────────────────────────────────────────────────
# Phase 6 — Windsurf IDE
# ──────────────────────────────────────────────────────────────────
phase 6 "Windsurf IDE"

if ! command -v windsurf &>/dev/null; then
  log "Installing Windsurf IDE..."

  # Download latest Windsurf .deb
  WINDSURF_DEB="/tmp/windsurf-latest.deb"
  WINDSURF_URL="https://windsurf-stable.codeiumdata.com/linux-x64/stable/latest/Windsurf-linux-x64.deb"

  curl -fSL -o "$WINDSURF_DEB" "$WINDSURF_URL" 2>&1 | tail -3 | tee -a "$LOG_FILE"

  if [[ -f "$WINDSURF_DEB" ]]; then
    sudo dpkg -i "$WINDSURF_DEB" 2>&1 | tee -a "$LOG_FILE" || true
    sudo apt-get install -f -y -qq  # Fix any dependency issues
    ok "Windsurf IDE installed"
  else
    warn "Windsurf download failed. Install manually from https://codeium.com/windsurf"
  fi
else
  log "Windsurf already installed: $(windsurf --version 2>/dev/null || echo 'found')"
fi

# Windsurf settings directory
WINDSURF_DIR="$HOME/.windsurf"
mkdir -p "$WINDSURF_DIR/workflows"

# Copy Heady workflows if project is already cloned
if [[ -d "$HEADY_HOME/.windsurf/workflows" ]]; then
  cp -r "$HEADY_HOME/.windsurf/workflows/"* "$WINDSURF_DIR/workflows/" 2>/dev/null || true
  ok "Heady workflows synced to Windsurf"
fi

# Windsurf model config
if [[ ! -f "$WINDSURF_DIR/model_config.yaml" ]]; then
  cat > "$WINDSURF_DIR/model_config.yaml" << 'WSCONF'
# Heady VM — Windsurf Model Configuration
default_model: claude-sonnet-4-20250514
auto_context: true
memory_enabled: true
workspace_indexing: true
WSCONF
  ok "Windsurf model config created"
fi

ok "Windsurf IDE ready"

# ──────────────────────────────────────────────────────────────────
# Phase 7 — Cloudflared Tunnel Agent
# ──────────────────────────────────────────────────────────────────
phase 7 "Cloudflared Tunnel Agent"

if ! command -v cloudflared &>/dev/null; then
  log "Installing cloudflared..."
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | \
    sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
    https://pkg.cloudflare.com/cloudflared $(lsb_release -cs 2>/dev/null || echo bookworm) main" | \
    sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y cloudflared 2>&1 | tail -2 | tee -a "$LOG_FILE"
else
  log "cloudflared already installed: $(cloudflared --version)"
fi

# Create cloudflared config directory
sudo mkdir -p /etc/cloudflared
CFLARED_CONFIG="/etc/cloudflared/config.yml"
if [[ ! -f "$CFLARED_CONFIG" ]]; then
  sudo tee "$CFLARED_CONFIG" > /dev/null << CFDCFG
tunnel: ${CLOUDFLARED_TUNNEL_NAME}
credentials-file: /etc/cloudflared/${CLOUDFLARED_TUNNEL_NAME}.json

ingress:
  - hostname: vm.headysystems.com
    service: http://localhost:${HEADY_MANAGER_PORT}
  - hostname: vm-buddy.headysystems.com
    service: http://localhost:${HEADY_BUDDY_PORT}
  - hostname: vm-web.headysystems.com
    service: http://localhost:${HEADY_WEB_PORT}
  - service: http_status:404

originRequest:
  connectTimeout: 30s
  noTLSVerify: false
CFDCFG
  ok "Cloudflared config written to $CFLARED_CONFIG"
  warn "Run 'cloudflared tunnel login' and 'cloudflared tunnel create ${CLOUDFLARED_TUNNEL_NAME}' to activate"
fi

ok "Cloudflared ready"

# ──────────────────────────────────────────────────────────────────
# Phase 8 — Heady Project Clone & Bootstrap
# ──────────────────────────────────────────────────────────────────
phase 8 "Heady Project Clone & Bootstrap"

if [[ ! -d "$HEADY_HOME/.git" ]]; then
  log "Cloning Heady repository..."
  git clone "$HEADY_REPO" "$HEADY_HOME" 2>&1 | tail -5 | tee -a "$LOG_FILE"
  cd "$HEADY_HOME"

  # Add remotes
  git remote add heady-me "$HEADY_REPO_HEADYME" 2>/dev/null || \
    git remote set-url heady-me "$HEADY_REPO_HEADYME"
  git remote add heady-sys "$HEADY_REPO" 2>/dev/null || true

  ok "Repository cloned with remotes configured"
else
  log "Heady repo already exists at $HEADY_HOME"
  cd "$HEADY_HOME"
  git pull origin main 2>&1 | tail -3 | tee -a "$LOG_FILE" || true
fi

# Create .env from example
if [[ ! -f "$HEADY_HOME/.env" ]]; then
  cp "$HEADY_HOME/.env.example" "$HEADY_HOME/.env"
  # Patch for Linux VM context
  sed -i "s|HEADY_PYTHON_BIN=python|HEADY_PYTHON_BIN=$HOME/.heady-venv/bin/python|" "$HEADY_HOME/.env"
  ok ".env created from example (fill in secrets)"
  warn "Edit $HEADY_HOME/.env and set HEADY_API_KEY, ADMIN_TOKEN, etc."
fi

# Install Node dependencies
log "Installing Node.js dependencies..."
cd "$HEADY_HOME"
npm ci 2>&1 | tail -5 | tee -a "$LOG_FILE" || npm install 2>&1 | tail -5 | tee -a "$LOG_FILE"
ok "Node.js dependencies installed"

# Install frontend dependencies
if [[ -f "$HEADY_HOME/frontend/package.json" ]]; then
  log "Installing frontend dependencies..."
  cd "$HEADY_HOME/frontend"
  npm ci 2>&1 | tail -3 | tee -a "$LOG_FILE" || npm install 2>&1 | tail -3 | tee -a "$LOG_FILE"
  ok "Frontend dependencies installed"
fi

# Install HeadyBuddy dependencies
if [[ -f "$HEADY_HOME/headybuddy/package.json" ]]; then
  log "Installing HeadyBuddy dependencies..."
  cd "$HEADY_HOME/headybuddy"
  npm ci 2>&1 | tail -3 | tee -a "$LOG_FILE" || npm install 2>&1 | tail -3 | tee -a "$LOG_FILE"
  ok "HeadyBuddy dependencies installed"
fi

# Install Python requirements
cd "$HEADY_HOME"
if [[ -f "requirements.txt" ]]; then
  pip install -r requirements.txt 2>&1 | tail -3 | tee -a "$LOG_FILE" || true
  ok "Python requirements installed"
fi

# Sync Windsurf workflows from repo
if [[ -d "$HEADY_HOME/.windsurf/workflows" ]]; then
  cp -r "$HEADY_HOME/.windsurf/workflows/"* "$WINDSURF_DIR/workflows/" 2>/dev/null || true
  ok "Windsurf workflows synced"
fi

ok "Heady project bootstrapped"

# ──────────────────────────────────────────────────────────────────
# Phase 9 — Firewall & Security Hardening
# ──────────────────────────────────────────────────────────────────
phase 9 "Firewall & Security Hardening"

# UFW firewall
sudo ufw --force reset 2>/dev/null || true
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp comment 'SSH'

# Heady services (local access only by default)
sudo ufw allow from 127.0.0.0/8 to any port "$HEADY_MANAGER_PORT" proto tcp comment 'Heady Manager'
sudo ufw allow from 127.0.0.0/8 to any port "$HEADY_BUDDY_PORT" proto tcp comment 'Heady Buddy'
sudo ufw allow from 127.0.0.0/8 to any port "$HEADY_WEB_PORT" proto tcp comment 'Heady Web'
sudo ufw allow from 127.0.0.0/8 to any port 8080 proto tcp comment 'RAG Service'
sudo ufw allow from 127.0.0.0/8 to any port 11434 proto tcp comment 'Ollama'

# Docker internal
sudo ufw allow from 172.16.0.0/12 to any comment 'Docker networks'

sudo ufw --force enable
ok "UFW firewall configured"

# Fail2ban (if available on Parrot)
if command -v fail2ban-server &>/dev/null; then
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ok "fail2ban active"
else
  sudo apt-get install -y fail2ban 2>/dev/null || true
  if command -v fail2ban-server &>/dev/null; then
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    ok "fail2ban installed and active"
  fi
fi

# Harden SSH
SSHD_CONFIG="/etc/ssh/sshd_config"
if [[ -f "$SSHD_CONFIG" ]]; then
  sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
  sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
  sudo sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/' "$SSHD_CONFIG"
  sudo sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' "$SSHD_CONFIG"
  sudo systemctl reload sshd 2>/dev/null || sudo systemctl reload ssh 2>/dev/null || true
  ok "SSH hardened (root login disabled, key-only auth)"
fi

# Kernel hardening via sysctl
sudo tee /etc/sysctl.d/99-heady-hardening.conf > /dev/null << 'SYSCTL'
# HeadyVM Security Hardening
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.tcp_syncookies = 1
kernel.randomize_va_space = 2
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
SYSCTL
sudo sysctl --system 2>&1 | tail -2 | tee -a "$LOG_FILE"
ok "Kernel hardened"

# ──────────────────────────────────────────────────────────────────
# Phase 10 — Systemd Services
# ──────────────────────────────────────────────────────────────────
phase 10 "Systemd Services"

# heady-manager systemd unit
sudo tee /etc/systemd/system/heady-manager.service > /dev/null << HMUNIT
[Unit]
Description=Heady Manager (Node.js MCP Server)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=${HEADY_USER}
Group=${HEADY_USER}
WorkingDirectory=${HEADY_HOME}
Environment=NODE_ENV=production
Environment=PORT=${HEADY_MANAGER_PORT}
ExecStart=$HOME/.nvm/versions/node/v${NODE_VERSION}.*/bin/node heady-manager.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=heady-manager

# Security sandbox
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${HEADY_HOME}/data ${HEADY_HOME}/logs ${HEADY_HOME}/.cache
PrivateTmp=true

[Install]
WantedBy=multi-user.target
HMUNIT
ok "heady-manager.service created"

# cloudflared systemd unit
sudo tee /etc/systemd/system/heady-cloudflared.service > /dev/null << CFUNIT
[Unit]
Description=Heady Cloudflared Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=heady-cloudflared

[Install]
WantedBy=multi-user.target
CFUNIT
ok "heady-cloudflared.service created"

# Docker compose service for full stack
sudo tee /etc/systemd/system/heady-docker.service > /dev/null << DKUNIT
[Unit]
Description=Heady Docker Stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=${HEADY_USER}
Group=docker
WorkingDirectory=${HEADY_HOME}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
DKUNIT
ok "heady-docker.service created"

sudo systemctl daemon-reload
ok "Systemd units registered (enable them after configuring .env and tunnel)"

# ──────────────────────────────────────────────────────────────────
# Phase 11 — VM-Specific Optimizations
# ──────────────────────────────────────────────────────────────────
phase 11 "VM Optimizations"

# I/O scheduler for virtual disks
for DISK in /sys/block/sd*/queue/scheduler /sys/block/vd*/queue/scheduler; do
  [[ -f "$DISK" ]] && echo none | sudo tee "$DISK" > /dev/null 2>&1 || true
done
ok "I/O scheduler set to none (optimal for VMs)"

# Swappiness tuning
sudo sysctl -w vm.swappiness=10 2>/dev/null
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.d/99-heady-vm.conf > /dev/null
ok "Swappiness reduced to 10"

# Disable unnecessary services in VM
DISABLE_SERVICES=(bluetooth cups avahi-daemon ModemManager)
for svc in "${DISABLE_SERVICES[@]}"; do
  if systemctl is-enabled "$svc" 2>/dev/null | grep -q enabled; then
    sudo systemctl disable "$svc" 2>/dev/null || true
    sudo systemctl stop "$svc" 2>/dev/null || true
    ok "Disabled $svc"
  fi
done

# Transparent hugepages (auto for VMs)
if [[ -f /sys/kernel/mm/transparent_hugepage/enabled ]]; then
  echo madvise | sudo tee /sys/kernel/mm/transparent_hugepage/enabled > /dev/null 2>&1 || true
  ok "Transparent hugepages set to madvise"
fi

# File descriptor limits for Node.js
sudo tee /etc/security/limits.d/99-heady.conf > /dev/null << 'LIMITS'
# HeadyVM — raised limits for Node.js and Docker
*       soft    nofile      65536
*       hard    nofile      131072
*       soft    nproc       65536
*       hard    nproc       131072
LIMITS
ok "File descriptor limits raised"

# Journal size limit
sudo mkdir -p /etc/systemd/journald.conf.d
sudo tee /etc/systemd/journald.conf.d/heady.conf > /dev/null << 'JRNL'
[Journal]
SystemMaxUse=500M
MaxRetentionSec=7day
Compress=yes
JRNL
sudo systemctl restart systemd-journald 2>/dev/null || true
ok "Journal rotation configured (500MB, 7 days)"

# MOTD / Login Banner
sudo tee /etc/motd > /dev/null << 'MOTD'

  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗  ██╗   ██╗███╗   ███╗
  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝  ██║   ██║████╗ ████║
  ███████║█████╗  ███████║██║  ██║ ╚████╔╝   ██║   ██║██╔████╔██║
  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝    ╚██╗ ██╔╝██║╚██╔╝██║
  ██║  ██║███████╗██║  ██║██████╔╝   ██║      ╚████╔╝ ██║ ╚═╝ ██║
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝       ╚═══╝  ╚═╝     ╚═╝

  ∞ Sacred Geometry :: Organic Systems :: Breathing Interfaces
  Parrot OS 7 | HeadyVM Development Node
  ─────────────────────────────────────────────────
  Manager:  http://localhost:3300
  Buddy:    http://localhost:3301
  Web:      http://localhost:3000
  Docs:     ~/Heady/docs/

MOTD
ok "Login banner set"

# ──────────────────────────────────────────────────────────────────
# Phase 12 — Verification & Summary
# ──────────────────────────────────────────────────────────────────
phase 12 "Verification & Summary"

echo ""
log "Component Versions:"
echo "  Node.js:      $(node -v 2>/dev/null || echo 'NOT FOUND')"
echo "  npm:          $(npm -v 2>/dev/null || echo 'NOT FOUND')"
echo "  Python:       $(python3 --version 2>&1 || echo 'NOT FOUND')"
echo "  Docker:       $(docker --version 2>/dev/null || echo 'NOT FOUND')"
echo "  Docker Compose: $(docker compose version 2>/dev/null || echo 'NOT FOUND')"
echo "  Git:          $(git --version 2>/dev/null || echo 'NOT FOUND')"
echo "  Git LFS:      $(git lfs version 2>/dev/null || echo 'NOT FOUND')"
echo "  cloudflared:  $(cloudflared --version 2>/dev/null || echo 'NOT FOUND')"
echo "  Windsurf:     $(windsurf --version 2>/dev/null || echo 'check manually')"
echo "  pm2:          $(pm2 --version 2>/dev/null || echo 'NOT FOUND')"
echo "  UFW:          $(sudo ufw status 2>/dev/null | head -1 || echo 'NOT FOUND')"
echo ""

CHECKS_PASSED=0
CHECKS_TOTAL=0

check() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if $1 &>/dev/null; then
    ok "$2"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    fail "$2"
  fi
}

check "command -v node"           "Node.js installed"
check "command -v npm"            "npm installed"
check "command -v python3"        "Python 3 installed"
check "command -v docker"         "Docker installed"
check "command -v git"            "Git installed"
check "command -v cloudflared"    "Cloudflared installed"
check "test -d $HEADY_HOME/.git"  "Heady repo cloned"
check "test -f $HEADY_HOME/.env"  "Environment file exists"
check "test -d $HEADY_HOME/node_modules" "Node modules installed"
check "test -d $HOME/.heady-venv" "Python venv exists"
check "test -f $SSH_KEY"          "SSH key exists"

echo ""
echo -e "${MAGENTA}══════════════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}  HeadyVM Setup Complete: ${CHECKS_PASSED}/${CHECKS_TOTAL} checks passed${NC}"
echo -e "${MAGENTA}══════════════════════════════════════════════════════${NC}"
echo ""
echo "  Next steps:"
echo "  1. Log out and back in (for docker group and shell profile)"
echo "  2. Edit ~/Heady/.env with your API keys"
echo "  3. Run: cloudflared tunnel login"
echo "  4. Run: cloudflared tunnel create ${CLOUDFLARED_TUNNEL_NAME}"
echo "  5. Enable services:"
echo "     sudo systemctl enable --now heady-manager"
echo "     sudo systemctl enable --now heady-cloudflared"
echo "     sudo systemctl enable --now heady-docker"
echo "  6. Open Windsurf and open ~/Heady workspace"
echo "  7. Verify: curl http://localhost:${HEADY_MANAGER_PORT}/api/health"
echo ""
echo "  Full log: $LOG_FILE"
echo ""
