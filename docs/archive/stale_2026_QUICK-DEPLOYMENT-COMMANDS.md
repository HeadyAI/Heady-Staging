<!--
  © 2026 Heady Systems LLC.
  PROPRIETARY AND CONFIDENTIAL.
  Unauthorized copying, modification, or distribution is strictly prohibited.
-->
# ⚡ Heady AI Platform — Quick Deployment Commands

> Last updated: February 2026

## 🚀 ONE-COMMAND FULL DEPLOY

```bash
cd ~/Heady && npm install && node src/heady-conductor.js &
cd sites/headyos-react && npm install && npm run dev &
echo "✅ HeadyConductor + Admin UI deployed"
```

## 📋 STEP-BY-STEP

### Step 1: Install Dependencies

```bash
cd ~/Heady
npm install
```

### Step 2: Start HeadyConductor

```bash
node src/heady-conductor.js
# → 🛡️ PQC Quantum-Resistant Hybrid Signatures ACTIVE
# → 🛡️ Redis Sliding-Window Rate Limiter Armed
# → ∞ HeadyConductor: LOADED (federated liquid routing)
```

### Step 3: Start Admin UI

```bash
cd sites/headyos-react
npm install
npm run dev
# → VITE ready at http://localhost:5001
```

### Step 4: Start Cloudflare Tunnel (Production)

```bash
cloudflared tunnel run heady-main
```

## 🎯 HEALTH VERIFICATION

### All Services Status

```bash
echo "=== HeadyConductor ===" && \
curl -s https://api.headysystems.com/api/conductor/health | jq . && \
echo "=== Primary Websites ===" && \
for domain in headyme.com headysystems.com headyio.com headyapi.com headymcp.com headyconnection.org; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$domain")
  echo "$domain → $STATUS"
done
```

### Quick Pulse Check

```bash
curl -sf https://api.headysystems.com/api/conductor/health && echo "✅ Conductor OK"
curl -sf https://headysystems.com && echo "✅ HeadySystems OK"
curl -sf https://headyme.com && echo "✅ HeadyMe OK"
```

### Conductor Route Map

```bash
curl -s https://api.headysystems.com/api/conductor/route-map | jq '.groups | keys'
```

## 📊 MONITORING

### Real-time System Monitor

```bash
watch -n 5 'curl -s https://api.headysystems.com/api/conductor/status | jq "{totalRoutes, uptime, supervisors}"'
```

### DuckDB Vector Memory Stats

```bash
node -e "const db = require('./src/intelligence/duckdb-memory'); db.init().then(() => db.getStats()).then(s => console.log(s))"
```

### Rate Limiter Activity

```bash
redis-cli keys "rate_limit:*" | wc -l | xargs -I{} echo "Active rate limit keys: {}"
redis-cli keys "banned:*" | wc -l | xargs -I{} echo "Banned IPs: {}"
```

## 🔧 SERVICE MANAGEMENT

### Build Production Bundles

```bash
cd ~/Heady
node scripts/bytenode-compiler.js          # V8 Bytecode compilation
node scripts/apply-global-branding-v2.js   # Proprietary watermarks
```

### Rebuild All Sites

```bash
for site in sites/*/; do
  if [ -f "$site/package.json" ]; then
    echo "Building $site..."
    cd "$site" && npm run build 2>/dev/null && cd ~/Heady
  fi
done
```

### Git Commit All Changes

```bash
cd ~/Heady && git add -A && git commit -m "chore: production update $(date +%Y-%m-%d)"
```

## �️ SECURITY COMMANDS

### PQC Key Status

```bash
node -e "const { headyPQC } = require('./src/security/pqc'); console.log(headyPQC.getStatus())"
```

### Force Secret Rotation

```bash
node -e "const sr = require('./src/security/secret-rotation'); sr.rotateAll()"
```

### Run Branding Enforcement Check

```bash
BANNED="Claude|Gemini|OpenAI|Anthropic|Groq|Vertex AI|HuggingFace"
grep -rniE "$BANNED" sites/ docs/ --include="*.html" --include="*.jsx" --include="*.md" || echo "✅ No competitor names found"
```

### Firewall & Port Check

```bash
sudo ufw status verbose
sudo netstat -tlnp | grep -E "(3000|3301|5001|8080)"
```

## 🚨 EMERGENCY COMMANDS

### Full System Stop

```bash
pkill -f heady-conductor
pkill -f "npx vite"
cloudflared tunnel cleanup heady-main 2>/dev/null
echo "All Heady services stopped."
```

### Emergency Backup

```bash
tar -czf ~/heady-emergency-$(date +%Y%m%d-%H%M%S).tar.gz \
  ~/Heady/src/ \
  ~/Heady/data/ \
  ~/Heady/docs/ \
  ~/Heady/.env \
  ~/.headyme/
```

### Service Recovery

```bash
cd ~/Heady && \
npm install && \
node src/heady-conductor.js &
cd sites/headyos-react && npm run dev &
cloudflared tunnel run heady-main &
echo "✅ All services recovered."
```

---

## ✅ SYSTEM READY CHECKLIST

```bash
# Verify all critical services
curl -sf https://api.headysystems.com/api/conductor/health > /dev/null && echo "✅ Conductor" || echo "❌ Conductor"
curl -sf https://headysystems.com > /dev/null && echo "✅ HeadySystems" || echo "❌ HeadySystems"
curl -sf https://headyme.com > /dev/null && echo "✅ HeadyMe" || echo "❌ HeadyMe"
curl -sf https://headyio.com > /dev/null && echo "✅ HeadyIO" || echo "❌ HeadyIO"
redis-cli ping > /dev/null 2>&1 && echo "✅ Redis" || echo "❌ Redis"
echo "🚀 Heady AI Platform operational check complete."
```
