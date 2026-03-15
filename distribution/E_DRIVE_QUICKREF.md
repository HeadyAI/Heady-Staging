<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: distribution/E_DRIVE_QUICKREF.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# ╔══════════════════════════════════════════════════════════╗
# ║  E:/Heady Distribution — Quick Reference                  ║
# ║  Everything you need to install, deploy, and sell Heady   ║
# ╚══════════════════════════════════════════════════════════╝

# 📁 Directory Structure
E:/
├── distribution/          # Mirror of repo distribution/ folder
│   ├── headyos/          # All HeadyOS forms
│   │   ├── desktop/      # Installers for mac/win/linux
│   │   ├── browser-shell/# Browser with HeadyOS baked in
│   │   │   ├── local/    # Offline-only mode
│   │   │   ├── hybrid/   # Local + cloud fallback
│   │   │   └── cloud/    # Cloud-only thin client
│   │   ├── web-shell/    # Web-based OS deployment
│   │   └── mobile-shell/ # Android APKs + iOS profiles
│   ├── browser/          # Browser extensions
│   │   ├── extensions/   # Chrome, Firefox, Edge, Safari
│   │   └── heady-browser/# Standalone Heady Browser
│   ├── mobile/           # Mobile app distribution
│   │   └── android/
│   │       └── apks/     # heady-chat.apk, heady-dev.apk, etc.
│   ├── ide/              # IDE extensions
│   │   ├── vscode/       # .vsix files
│   │   ├── jetbrains/    # .zip plugins
│   │   └── neovim/       # Lua configs
│   ├── mcp/              # MCP server configs
│   ├── docker/           # Docker Compose profiles
│   ├── bundles/          # App bundle definitions
│   ├── billing-config/   # Pricing & payment configs
│   └── docs/             # Installation guides
├── install/              # Quick install scripts
├── config/               # Your local Heady configs
├── logs/                 # Installation & runtime logs
└── notes/                # Your personal notes

# 🚀 Quick Start Commands

## Install HeadyOS Desktop
cd E:/distribution/headyos/desktop/windows
./headyos-desktop-setup.exe

## Run Local Stack
cd E:/distribution/docker
docker compose -f base.yml -f profiles/local-offline.yml up

## Install Android Apps
bash E:/distribution/mobile/android/install-all-android.sh

## Load Browser Extension (Chrome)
1. Open chrome://extensions
2. Enable Developer Mode
3. Load unpacked: E:/distribution/browser/extensions/chrome/

## Install VS Code Extension
code --install-extension E:/distribution/ide/vscode/heady-dev-companion.vsix

# 💰 Billing Configuration

Edit E:/distribution/billing-config/plans.yaml to customize:
- Pricing tiers
- Usage limits
- Payment gateways (Stripe, PayPal, etc.)
- Fair access programs (students, nonprofits)

# 📦 Bundle Configuration

Bundles define what apps are included in each package:
- personal-suite.yaml    → $5/mo (browser + mobile)
- pro-suite.yaml       → $12/mo (everything for individuals)
- dev-pack.yaml        → $12/mo (browser + IDE exts + dev tools)
- creator-pack.yaml    → $15/mo (browser + voice + automations)
- enterprise-suite.yaml → Custom pricing

# 🔧 MCP Servers

Available integrations:
- GitHub (repo search, PR review, code search)
- Slack (messaging, channel management)
- Notion (workspace, pages, databases)
- Google Drive (file management)
- Docker (container management)
- Calendar (events, scheduling)

Configure in: E:/distribution/mcp/configs/

# 🐳 Docker Profiles

- local-offline.yml  → Everything on-device, no cloud
- local-dev.yml      → Local with hot-reload
- hybrid.yml         → Local + cloud fallback
- cloud-saas.yml     → Full cloud deployment
- api-only.yml       → Headless API only
- full-suite.yml     → Everything enabled
- voice-enabled.yml  → With voice IO service
- dev-tools.yml      → Includes code-server IDE

# 📱 APK Files (Android)

Available in: E:/distribution/mobile/android/apks/
- heady-chat.apk
- heady-dev.apk
- heady-voice.apk
- heady-automations.apk
- headyos-mobile.apk

Install with: bash install-all-android.sh

# 🔗 API Endpoints (Local)

- Health:      http://manager.dev.local.heady.internal:3300/api/health
- API:         http://manager.dev.local.heady.internal:3300/api/
- Web App:     http://app-web.dev.local.heady.internal:3000
- IDE:         http://localhost:8443 (code-server)
- MCP Gateway: http://localhost:4000

# 📝 Documentation

- Install guides:     E:/distribution/docs/install/
- Admin docs:         E:/distribution/docs/admin/
- Connector docs:     E:/distribution/docs/connectors/
- Full README:        E:/distribution/README.md

# ⚡ Heady Layer Switcher

Use `hl` command to switch between environments:
- hl status           → Show current layer
- hl list            → List all layers
- hl switch local     → Use manager.dev.local.heady.internal:3300
- hl switch cloud-me  → Use HeadyMe cloud
- hl switch cloud-sys → Use HeadySystems cloud

# 🔄 Sync with Repo

To update from git repo:
cd C:/Users/erich/Heady
./scripts/Heady-Sync.ps1
robocopy distribution/ E:/distribution /MIR

# 🌐 Cloud Layers

- local     → manager.dev.local.heady.internal:3300 [Green]
- cloud-me  → heady-manager-bf4q4zywhq-uc.a.run.app [Cyan]
- cloud-sys → heady-edge-gateway-bf4q4zywhq-uc.a.run.app [Magenta]
- cloud-conn→ heady-onboarding-bf4q4zywhq-ue.a.run.app [Yellow]
- hybrid    → .env.hybrid mode [White]

# 📞 Support

- Issues: https://github.com/HeadySystems/Heady/issues
- Docs:   https://docs.headysystems.com
- Email:  support@headysystems.com
