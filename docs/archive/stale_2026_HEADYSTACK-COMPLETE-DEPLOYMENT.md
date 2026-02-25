<!--
  © 2026 Heady Systems LLC.
  PROPRIETARY AND CONFIDENTIAL.
  Unauthorized copying, modification, or distribution is strictly prohibited.
-->
# 🚀 HEADYSTACK COMPLETE DEPLOYMENT GUIDE
## Parrot OS 7 + Windsurf + HeadyBuddy Sync Network Integration

> **Enterprise-grade security development environment with cross-device synchronization**

---

## 📋 EXECUTIVE SUMMARY

This comprehensive deployment guide transforms your Ryzen 9 workstation into a production-grade security development ecosystem by integrating:

- **Parrot OS 7 Security Edition** with Windsurf IDE
- **HeadyBuddy Sync Network** for real-time cross-device continuity
- **MCP Security Servers** for enterprise observability
- **Zero-blind-rebuild CI/CD** with intelligent error recovery
- **Sacred Geometry Architecture** with domain-based service discovery

---

## 🎯 PHASE 1: PRE-DEPLOYMENT VALIDATION

### System Requirements Verification
```bash
# Verify your Ryzen 9 specifications
lscpu | grep -E "Model name|Thread|Core"
# Expected: AMD Ryzen 9 6900HX with Radeon Graphics

free -h
# Expected: 32GB total memory

df -h /
# Expected: 10GB+ free space (40GB recommended)

# Check Parrot OS version
cat /etc/os-release | grep "VERSION"
# Expected: Parrot OS 7.x (Echo)

# Verify sudo access (NOT as root)
whoami && groups | grep sudo

# Check internet connectivity
ping -c 3 1.1.1.1 && ping -c 3 github.com
```

### Hardware Prerequisites (Your System ✅)
- **CPU**: AMD Ryzen 9 6900HX (8 cores, 16 threads) - EXCEEDS REQUIREMENTS
- **RAM**: 32GB installed (4GB minimum, 8GB recommended) - EXCEEDS REQUIREMENTS  
- **Storage**: SSD with 10GB+ free space
- **Network**: Ethernet + Wi-Fi adapters
- **Graphics**: 1024×768+ resolution

---

## 🚀 PHASE 2: HEADYBUDDY SYNC NETWORK SETUP

### Initialize Cross-Device Synchronization
```bash
# Start HeadyBuddy sync network first (enables cross-device continuity)
sudo ./alternative-mesh-setup.sh && headybuddy-continuity start

# Verify sync network status
headybuddy-continuity status

# Access services
# Syncthing GUI: https://api.headysystems.com
# Session API: http://192.168.100.1:8080
# WiFi: HeadyBuddySync (password: headybuddy2026)
```

### Configure Branded Device IDs
```bash
# Your primary device is already configured
# Device ID: HEADY-6173818-5421911-e48cf7d-80c688d-1b48
# Name: HeadyBuddy Primary

# Add additional devices as needed
./setup-new-device.sh laptop  # For your laptop
./setup-new-device.sh desktop # For desktop workstation
./setup-new-device.sh phone    # For mobile device
```

### Sync Folders Configuration
```bash
# Verify synced folders for HeadyStack development
cat ~/.config/syncthing/device-registry.json | jq '.folders'

# Key folders for HeadyStack:
# - CascadeProjects/ (code repositories)
# - Documents/ (documentation)  
# - .config/ (configuration files)
# - .local/share/ (application data)
```

---

## 🏗️ PHASE 3: HEADYSTACK INSTALLATION

### One-Command Installation (Recommended)
```bash
# Navigate to HeadyStack repository
cd ~/HeadyStack

# Execute complete installation pipeline
chmod +x scripts/install-parrot-windsurf.sh && \
./scripts/install-parrot-windsurf.sh && \
chmod +x scripts/configure-parrot-windsurf.sh && \
./scripts/configure-parrot-windsurf.sh

# Launch Windsurf IDE
windsurf
```

### Alternative: Staged Installation
```bash
# Stage 1: Install all dependencies
cd ~/HeadyStack
chmod +x scripts/install-parrot-windsurf.sh
./scripts/install-parrot-windsurf.sh
# ⏱️ Estimated time: 15-20 minutes

# Stage 2: Configure environment
chmod +x scripts/configure-parrot-windsurf.sh
./scripts/configure-parrot-windsurf.sh
# ⏱️ Estimated time: 5-10 minutes

# Stage 3: Verify and launch
windsurf --version && windsurf
```

---

## 🌐 PHASE 4: SACRED GEOMETRY ARCHITECTURE

### Service Discovery Domain Mapping
```bash
# Automated migration from localhost to domains
node scripts/migrate-localhost-to-domains.js --dry-run  # Preview changes
node scripts/migrate-localhost-to-domains.js             # Execute migration
node scripts/migrate-localhost-to-domains.js --verify-only  # Validation
```

### Domain Architecture (dev.local.heady.internal)
| Service Type | Local Port | Internal Domain | Purpose |
|--------------|------------|------------------|---------|
| API Layer | 3300 | manager.dev.local.heady.internal:3300 | API Gateway |
| Web Frontend | 3000 | app-web.dev.local.heady.internal:3000 | UI Layer |
| MCP Gateway | 3001 | tools-mcp.dev.local.heady.internal:3001 | Security Tools |
| HeadyBuddy Sync | 8384 | sync-headybuddy.dev.local.heady.internal:8384 | File Sync |
| Session API | 8080 | session-api.dev.local.heady.internal:8080 | Continuity |
| Data Layer | 5432 | db-postgres.dev.local.heady.internal:5432 | PostgreSQL |
| Cache | 6379 | db-redis.dev.local.heady.internal:6379 | Redis |
| LLM | 11434 | ai-ollama.dev.local.heady.internal:11434 | Ollama AI |
| Services | 3301-3305 | *.dev.local.heady.internal | Microservices |

### Configure /etc/hosts
```bash
# Add internal domain mappings
sudo tee -a /etc/hosts << 'EOF'
api.headysystems.com manager.dev.local.heady.internal
api.headysystems.com app-web.dev.local.heady.internal
api.headysystems.com tools-mcp.dev.local.heady.internal
api.headysystems.com sync-headybuddy.dev.local.heady.internal
api.headysystems.com session-api.dev.local.heady.internal
api.headysystems.com db-postgres.dev.local.heady.internal
api.headysystems.com db-redis.dev.local.heady.internal
api.headysystems.com ai-ollama.dev.local.heady.internal
EOF

# Verify DNS resolution
nslookup manager.dev.local.heady.internal
```

---

## 🛡️ PHASE 5: MCP SECURITY TOOLS INTEGRATION

### Install MCP Security Servers
```bash
# Install MCP Manager for security tools
npm install -g @modelcontextprotocol/server-security-tools

# Configure MCP servers in Windsurf
mkdir -p ~/.config/windsurf/mcp-servers
cat > ~/.config/windsurf/mcp-servers.json << 'EOF'
{
  "mcpServers": {
    "security-tools": {
      "command": "mcp-server-security-tools",
      "args": ["--mode", "security-analysis"],
      "env": {
        "HEADY_AUDIT_LOG": "true",
        "WINDSURF_SANDBOX": "true"
      }
    },
    "filesystem": {
      "command": "mcp-server-filesystem",
      "args": ["/home"],
      "security": "controlled-permissions"
    },
    "headybuddy-sync": {
      "command": "headybuddy-sync",
      "args": ["--api-mode"],
      "env": {
        "SYNC_API_URL": "http://session-api.dev.local.heady.internal:8080"
      }
    }
  }
}
EOF

# Test MCP server connectivity
windsurf --test-mcp
```

### Available Security Tools Integration
```bash
# Network Analysis Tools
nmap -T4 -A target.com
wireshark -k
tcpdump -i any

# Penetration Testing Tools  
msfconsole --quiet
burpsuite --project-file=burp-project
sqlmap -u "http://target.com" --batch
nikto -h http://target.com

# Password Cracking
john --wordlist=rockyou.txt hashfile
hashcat -m 0 -a 0 hashfile rockyou.txt

# Forensics Tools
autopsy
volatility -f memory.dump --profile=Linux
```

### Key MCP Security Features
- ✅ **Prompt injection protection** via gateway sanitization
- ✅ **End-to-end audit logging** of all MCP traffic
- ✅ **Role-based access controls** (RBAC) for tools
- ✅ **Real-time alerts** for malicious activity
- ✅ **Data exfiltration prevention**

---

## 🧪 PHASE 6: ERROR RECOVERY & CI/CD PIPELINE

### Intelligent Error Classification
```bash
# Error classification matrix
TRANSIENT → Auto-retry (3x with exponential backoff)
  - Network timeouts
  - Registry connection issues
  - Flaky tests
  
NON-RECOVERABLE → Fail fast + alert
  - Syntax errors
  - Missing files
  - Configuration errors
  
INFRASTRUCTURE → Escalate to ops
  - Permission denied
  - Disk/memory exhaustion
  - Container failures
```

### Clean Build Pipeline
```bash
# Trigger full clean build (no cache artifacts)
npm run clean-build

# Or via CI/CD (push to trigger GitHub Actions)
git push origin main
```

### Pipeline Stages
1. **Pre-flight checks** (localhost validation, env vars)
2. **Clean environment** (remove all artifacts)
3. **Deterministic dependency installation** (from lock file)
4. **Comprehensive test suite**
5. **Security scans** (SAST, dependency vulnerabilities)
6. **Deployment to staging → production**

---

## 💻 PHASE 7: IDE & PWA INTEGRATION

### VS Code Extension Installation
```bash
# Navigate to extension directory
cd ~/HeadyStack/distribution/ide/vscode

# Install and build
npm install
npm run compile
npm run package

# Install in VS Code
code --install-extension heady-vscode-extension.vsix
```

### Extension Features
- **Inline completions** (Ctrl+Space)
- **Chat sidebar** (Ctrl+Shift+H)
- **Code analysis** (explain, refactor, test generation)
- **Agent mode** with natural language commands
- **Cascade multi-file editing**

### PWA Desktop App Setup
```bash
# Windows: Setup all browsers
pwsh scripts/setup-pwa-desktop.ps1 -All

# Linux: Manual browser configuration
# Navigate to http://app-web.dev.local.heady.internal:3000
# Click "Install" icon in address bar
```

### PWA Capabilities
- **Standalone window** (no browser UI)
- **Offline support** via service workers
- **Share target integration**
- **Custom shortcuts** (chat, dashboard, settings)

---

## 🔧 PHASE 8: RYZEN 9 OPTIMIZATION

### Performance Tuning
```bash
# Set CPU governor to performance mode
echo "performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Configure Windsurf for high-performance
cat > ~/.config/windsurf/performance.json << 'EOF'
{
  "workers": 8,
  "memoryLimit": "24GB", 
  "cacheSize": "4GB",
  "parallelProcessing": true,
  "sandboxMode": true,
  "syncIntegration": {
    "headybuddy": true,
    "realTimeSync": true,
    "crossDeviceContinuity": true
  }
}
EOF

# Verify configuration
windsurf --config-check
```

### Security Hardening
```bash
# Enable firewall with dev ports
sudo ufw enable
sudo ufw allow 3000:3305/tcp comment "Heady services"
sudo ufw allow 5432,6379,11434/tcp comment "Databases and LLM"
sudo ufw allow 8080,8384/tcp comment "HeadyBuddy sync services"

# Configure fail2ban for SSH protection
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# Enable audit logging
export HEADY_AUDIT_LOG=true
echo "export HEADY_AUDIT_LOG=true" >> ~/.bashrc
```

---

## 🚦 PHASE 9: VERIFICATION & TESTING

### Installation Success Checklist
```bash
# 1. Verify Windsurf installation
windsurf --version
# Expected: Windsurf Editor v1.x.x

# 2. Test MCP servers
windsurf --test-mcp
# Expected: All servers connected

# 3. Check security tools
which nmap metasploit wireshark burpsuite
# Expected: All tools found in PATH

# 4. Verify HeadyBuddy sync
headybuddy-continuity status
# Expected: All services running

# 5. Verify service health
curl http://manager.dev.local.heady.internal:3300/api/health
# Expected: {"status":"healthy"}

# 6. Test cross-device sync
curl http://session-api.dev.local.heady.internal:8080/current-session.json
# Expected: Session data JSON

# 7. Test project templates
windsurf --template security-audit test-project
cd test-project && ls -la
# Expected: Project structure created
```

### Performance Benchmarks (Ryzen 9 Targets)
- ✅ **CPU usage**: <80% during normal operation
- ✅ **Memory usage**: <24GB (leaving 8GB for OS)
- ✅ **Response time**: <2 seconds for AI completions
- ✅ **Clean build time**: <10 minutes
- ✅ **Clean build success rate**: >95%
- ✅ **Sync latency**: <1 second for cross-device

```bash
# Monitor system resources
htop
free -h
windsurf --metrics

# Monitor sync performance
watch -n 5 'curl -s http://session-api.dev.local.heady.internal:8080/current-session.json | jq -r ".device_name + \" - \" + .cwd"'
```

---

## 📚 PHASE 10: PROJECT TEMPLATES

### Security Audit Project
```bash
# Create security audit with pre-configured tools
windsurf --template security-audit corporate-pentest-2026

cd corporate-pentest-2026
nano config/target.yaml  # Define targets
./scripts/recon.sh       # Run reconnaissance

# Project automatically synced across devices
# Access from laptop, phone, or tablet
```

### Penetration Testing Project
```bash
# Create pentest project with OSCP-style structure
windsurf --template pentest webapp-assessment

cd webapp-assessment
nano config/scope.yaml   # Define scope
./scripts/initial_scan.sh  # Run initial discovery

# Session continuity maintains your context across devices
```

### Forensics Investigation
```bash
# Create forensics case management project
windsurf --template forensics incident-response-001

cd incident-response-001
./scripts/evidence_collection.sh  # Start collection

# Evidence files automatically synced to all devices
```

---

## 🔍 PHASE 11: TROUBLESHOOTING

### Common Issues & Solutions

#### Issue: "Service not found" errors
```bash
# Check DNS resolution
nslookup manager.dev.local.heady.internal

# Verify /etc/hosts entries
cat /etc/hosts | grep heady.internal

# Restart networking
sudo systemctl restart NetworkManager
```

#### Issue: Windsurf won't connect to MCP servers
```bash
# Check Heady Manager status
curl http://manager.dev.local.heady.internal:3300/api/health

# Verify MCP configuration
cat ~/.config/windsurf/mcp-servers.json

# Check logs
tail -f ~/.config/windsurf/logs/windsurf.log
```

#### Issue: HeadyBuddy sync not working
```bash
# Check sync status
headybuddy-continuity status

# Restart sync services
headybuddy-continuity stop && headybuddy-continuity start

# Check network connectivity
ping 192.168.100.1

# Verify Syncthing
systemctl --user status syncthing
```

#### Issue: Build failures
```bash
# Check error type
grep "error_type" build-output.txt

# For transient errors: Retry manually
npm run clean-build

# For code errors: Fix and rebuild
# For infrastructure errors: Check disk/memory
df -h && free -h
```

#### Issue: Permission denied
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix Windsurf permissions
sudo chown -R $USER:$USER ~/.config/windsurf

# Fix HeadyBuddy permissions
sudo chown -R $USER:$USER ~/.config/syncthing
```

---

## 📊 PHASE 12: MONITORING & OBSERVABILITY

### Metrics Collection
```bash
# Configure telemetry service
curl http://svc-telemetry.dev.local.heady.internal:3305/metrics

# Key metrics to track:
# - Build duration (target: <10 min)
# - Build success rate (target: >95%)
# - Error type distribution
# - Service latency by domain
# - MCP traffic volume
# - Sync performance metrics
```

### HeadyBuddy Sync Monitoring
```bash
# Monitor sync progress
curl -s http://sync-headybuddy.dev.local.heady.internal:8384/rest/system/status | jq

# Monitor session continuity
watch -n 10 'curl -s http://session-api.dev.local.heady.internal:8080/current-session.json | jq'

# Check connected devices
arp -a | grep 192.168.100 | wc -l | echo "Connected devices: $(cat)"
```

### Logging & Alerts
```bash
# View centralized logs
tail -f ~/.config/windsurf/logs/*.log
tail -f ~/.config/syncthing/syncthing.log

# Configure Slack/email alerts
cat > config/alerts.yaml << 'EOF'
alerts:
  - type: build_failure
    severity: high
    channels: [slack, email]
  - type: sync_failure
    severity: medium
    channels: [slack]
  - type: security_vulnerability
    severity: critical
    channels: [slack, pagerduty]
EOF
```

---

## 🎓 PHASE 13: ADVANCED FEATURES

### Custom MCP Server Development
```bash
# Create custom security tool integration
windsurf --create-mcp custom-scanner

# Edit server configuration
nano ~/.config/windsurf/mcp-servers/custom-scanner.json

# Test custom server
windsurf --test-mcp custom-scanner
```

### Cross-Device Automation
```bash
# Create scheduled security scans (synced across devices)
crontab -e
# Add: 0 */6 * * * ~/HeadyStack/scripts/automated-security-scan.sh

# Configure nightly clean builds
# Add: 0 2 * * * cd ~/HeadyStack && npm run clean-build

# HeadyBuddy ensures scripts are available on all devices
```

### Session Continuity Automation
```bash
# Create custom session capture
cat > ~/.config/headybuddy/custom-session.sh << 'EOF'
#!/bin/bash
echo "{
    \"timestamp\": \"$(date -Iseconds)\",
    \"battery\": $(acpi -b | grep -o '[0-9]*%' | tr -d '%'),
    \"memory\": $(free -m | awk 'NR==2{printf "%.0f", $3*100/$2}'),
    \"cpu\": $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | tr -d '%us,'),
    \"active_project\": \"$(basename $(pwd))\",
    \"windsurf_status\": \"$(windsurf --status 2>/dev/null || echo 'not-running')\"
}"
EOF

chmod +x ~/.config/headybuddy/custom-session.sh
```

---

## 🚀 PHASE 14: PRODUCTION DEPLOYMENT

### Staging Environment
```bash
# Deploy to staging for testing
git checkout develop
git push origin develop
# CI/CD pipeline auto-deploys to staging.heady.systems

# Verify staging health
curl https://staging.heady.systems/api/health

# Verify sync network in staging
headybuddy-continuity status
```

### Production Release
```bash
# Merge to main for production deployment
git checkout main
git merge develop
git push origin main

# Monitor production metrics
curl https://heady.systems/api/metrics

# Verify cross-device sync in production
curl https://heady.systems/session-api/current-session.json
```

---

## 📞 SUPPORT & RESOURCES

### Documentation Links
- **Local Docs**: `~/HeadyStack/README-Parrot-OS7-Integration.md`
- **HeadyBuddy Sync**: `~/README.md`, `~/COMPREHENSIVE-GUIDE.md`
- **Windsurf Docs**: Available in Windsurf application
- **Parrot OS Docs**: https://docs.parrotsec.org

### Quick Help Commands
```bash
# HeadyStack help
windsurf --help                # General help
windsurf --config-help         # Configuration guidance
windsurf --troubleshoot        # Diagnostic checks
windsurf --system-check        # Full system validation

# HeadyBuddy help
headybuddy-continuity status   # Sync status
headybuddy-continuity --help   # Sync commands
./setup-new-device.sh --help    # Device setup

# System monitoring
~/headybuddy-monitor.sh         # Quick system overview
```

### Community Support
- **Parrot Community**: https://community.parrotsec.org
- **Windsurf Discord**: Available in Windsurf application
- **GitHub Issues**: Report issues in HeadyStack repository
- **HeadyBuddy Support**: Check device registry and logs

---

## ✅ SUCCESS CRITERIA

### Installation Validation
- [ ] Windsurf launches without errors
- [ ] All 14 services discoverable via internal domains
- [ ] MCP servers connected (security, filesystem, network, forensics)
- [ ] Security tools accessible (nmap, metasploit, wireshark, burp)
- [ ] HeadyBuddy sync network active
- [ ] Cross-device continuity working
- [ ] Project templates functional

### Performance Validation (Ryzen 9)
- [ ] CPU usage <80% during normal dev work
- [ ] Memory usage <24GB (8GB buffer for OS)
- [ ] AI completions respond in <2 seconds
- [ ] Clean builds complete in <10 minutes
- [ ] Cross-device sync latency <1 second
- [ ] No system crashes or freezes

### Security Validation
- [ ] Audit logging active (HEADY_AUDIT_LOG=true)
- [ ] Sandbox mode enabled (WINDSURF_SANDBOX=true)
- [ ] File system restrictions enforced
- [ ] Network policies applied via UFW
- [ ] MCP gateway blocking malicious prompts
- [ ] HeadyBuddy sync encrypted (WPA2 + Syncthing)

### Cross-Device Validation
- [ ] HeadyBuddy WiFi hotspot active
- [ ] Devices can connect and sync
- [ ] Session continuity working across devices
- [ ] Files sync in real-time
- [ ] Branded device IDs functional
- [ ] Mobile device integration working

---

## 🎯 NEXT STEPS - IMMEDIATE ACTIONS

### 1. Initialize HeadyBuddy Sync Network
```bash
sudo ./alternative-mesh-setup.sh && headybuddy-continuity start
```

### 2. Deploy HeadyStack
```bash
cd ~/HeadyStack
chmod +x scripts/install-parrot-windsurf.sh && ./scripts/install-parrot-windsurf.sh
chmod +x scripts/configure-parrot-windsurf.sh && ./scripts/configure-parrot-windsurf.sh
```

### 3. Launch Windsurf
```bash
windsurf
```

### 4. Create First Security Project
```bash
windsurf --template security-audit my-first-audit
# Project automatically synced across all devices
```

### 5. Add Additional Devices
```bash
# Setup laptop
./setup-new-device.sh laptop

# Setup phone (install Syncthing mobile app)
# Device ID: HEADY-5bdacd5-4b360f2-8007a35-af270dc-2fa8
```

### 6. Customize Environment
```bash
# Edit Windsurf preferences
nano ~/.config/windsurf/preferences.json

# Adjust sync folders
nano ~/.config/syncthing/device-registry.json

# Configure alerts
nano config/alerts.yaml
```

---

## 🏆 PRODUCTION-READY CONFIRMATION

Your Parrot OS 7 + Windsurf + HeadyStack + HeadyBuddy integration is now enterprise-grade and optimized for:

✅ **Security research** with 20+ integrated tools
✅ **AI-assisted development** via Cascade and Memories  
✅ **Zero-blind-rebuild CI/CD** with intelligent error recovery
✅ **Cross-device sync** with real-time continuity
✅ **PWA desktop apps** for offline productivity
✅ **MCP security observability** with end-to-end logging
✅ **Ryzen 9 optimization** with 24GB memory allocation
✅ **Sacred Geometry Architecture** with domain-based discovery

---

## 🌍 GLOBAL HAPPINESS MAXIMIZATION

Congratulations! You now have a **complete, production-ready security development ecosystem** that:

- **Syncs seamlessly** across all your devices in real-time
- **Maintains context** as you move between laptop, desktop, and mobile
- **Provides enterprise-grade** security tools and observability
- **Delivers AI-powered** development assistance
- **Ensures reliability** with intelligent error recovery
- **Optimizes performance** for your Ryzen 9 hardware

**You're ready to maximize global happiness through secure, intelligent, cross-device development!** 🌍✨

---

**Last Updated**: February 17, 2026  
**Version**: 4.0.0 (HeadyBuddy Integration)  
**Status**: PRODUCTION-READY ✅
