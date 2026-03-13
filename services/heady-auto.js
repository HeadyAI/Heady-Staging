// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY AUTO — Unified Automation Engine                         ║
// ║  FILE: services/heady-auto.js                                   ║
// ║  LAYER: infrastructure                                          ║
// ║                                                                 ║
// ║  Everything that was manual is now automatic.                    ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = process.cwd();
const PHI = 1.6180339887;

// ═══════════════════════════════════════════════════════════════════
// 1. AutoGit — No more manual token injection or commit flows
// ═══════════════════════════════════════════════════════════════════

class AutoGit {
  constructor(opts = {}) {
    this.root = opts.root || ROOT;
    this.token = opts.token || process.env.GITHUB_TOKEN || this._readTokenFromEnv();
    this.remote = opts.remote || "origin";
    this.branch = opts.branch || "main";
    this.repoUrl = opts.repoUrl || "github.com/HeadyConnection/Heady-Testing.git";
  }

  _readTokenFromEnv() {
    try {
      const envPath = path.join(this.root || ROOT, ".env");
      if (!fs.existsSync(envPath)) return null;
      const lines = fs.readFileSync(envPath, "utf8").split("\n");
      const tokenLine = lines.find(l => l.startsWith("GITHUB_TOKEN="));
      return tokenLine ? tokenLine.split("=")[1].trim() : null;
    } catch { return null; }
  }

  /** Configure git credential helper so push never asks for password */
  setupCredentials() {
    if (!this.token) return { ok: false, error: "No GITHUB_TOKEN found" };
    try {
      // Set credential helper to store
      execSync("git config credential.helper store", { cwd: this.root, stdio: "pipe" });
      // Write credentials file
      const credPath = path.join(process.env.USERPROFILE || process.env.HOME || "~", ".git-credentials");
      const credLine = `https://${this.token}@${this.repoUrl}\n`;
      fs.writeFileSync(credPath, credLine, { mode: 0o600 });
      // Set push defaults
      execSync("git config push.autoSetupRemote true", { cwd: this.root, stdio: "pipe" });
      // Ensure remote URL is clean (no token embedded)
      execSync(`git remote set-url ${this.remote} https://${this.repoUrl}`, { cwd: this.root, stdio: "pipe" });
      return { ok: true, message: "Git credentials configured — push will work without manual token injection" };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** Auto-commit with smart message generation */
  autoCommit(message) {
    try {
      execSync("git add -A", { cwd: this.root, stdio: "pipe", timeout: 60000 });
      const status = execSync("git status --short", { cwd: this.root, encoding: "utf8", timeout: 10000 });
      if (!status.trim()) return { ok: true, message: "Nothing to commit", committed: false };

      const msg = message || this._generateCommitMessage(status);
      execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { cwd: this.root, stdio: "pipe", timeout: 30000 });
      return { ok: true, message: msg, committed: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /** Auto-push (credentials must be setup first) */
  autoPush() {
    try {
      const result = execSync(`git push ${this.remote} ${this.branch}`, {
        cwd: this.root, encoding: "utf8", stdio: "pipe", timeout: 120000,
      });
      return { ok: true, output: result };
    } catch (err) {
      // If push rejected, try pull --rebase first
      try {
        execSync(`git pull --rebase ${this.remote} ${this.branch}`, { cwd: this.root, stdio: "pipe", timeout: 120000 });
        const retry = execSync(`git push ${this.remote} ${this.branch}`, { cwd: this.root, encoding: "utf8", stdio: "pipe", timeout: 120000 });
        return { ok: true, output: retry, rebased: true };
      } catch (e2) {
        return { ok: false, error: e2.message };
      }
    }
  }

  /** Full auto: commit → push */
  commitAndPush(message) {
    const commit = this.autoCommit(message);
    if (!commit.ok) return commit;
    if (!commit.committed) return commit;
    const push = this.autoPush();
    return { ...push, commitMessage: commit.message };
  }

  _generateCommitMessage(status) {
    const lines = status.trim().split("\n");
    const added = lines.filter(l => l.startsWith("A") || l.startsWith("??")).length;
    const modified = lines.filter(l => l.startsWith("M") || l.startsWith(" M")).length;
    const deleted = lines.filter(l => l.startsWith("D")).length;
    const parts = [];
    if (added > 0) parts.push(`${added} added`);
    if (modified > 0) parts.push(`${modified} modified`);
    if (deleted > 0) parts.push(`${deleted} deleted`);
    return `auto: ${parts.join(", ")} (${lines.length} files)`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2. AutoDeploy — Full pipeline: install → check → commit → push → deploy
// ═══════════════════════════════════════════════════════════════════

class AutoDeploy {
  constructor(opts = {}) {
    this.root = opts.root || ROOT;
    this.git = new AutoGit(opts);
    this.history = [];
    this.status = "idle";
  }

  /** Full auto-deploy pipeline */
  async runPipeline(opts = {}) {
    const record = { id: `auto-deploy-${Date.now()}`, startedAt: new Date().toISOString(), steps: [] };
    this.history.push(record);
    this.status = "running";

    try {
      // Step 1: npm install
      record.steps.push({ step: "npm_install", ts: new Date().toISOString() });
      execSync("npm install --prefer-offline", { cwd: this.root, stdio: "pipe", timeout: 120000 });

      // Step 2: Syntax check
      record.steps.push({ step: "syntax_check", ts: new Date().toISOString() });
      execSync("node --check heady-manager.js", { cwd: this.root, stdio: "pipe", timeout: 10000 });

      // Step 3: Auto-commit
      record.steps.push({ step: "git_commit", ts: new Date().toISOString() });
      const commitResult = this.git.autoCommit(opts.message);
      record.steps[2].result = commitResult;

      // Step 4: Auto-push
      if (commitResult.committed) {
        record.steps.push({ step: "git_push", ts: new Date().toISOString() });
        const pushResult = this.git.autoPush();
        record.steps[3].result = pushResult;
      }

      // Step 5: Trigger deploy (if HeadyDeploy is available)
      if (opts.deploy) {
        record.steps.push({ step: "cloud_deploy", ts: new Date().toISOString() });
        try {
          const { HeadyDeploy } = require("./heady-deploy");
          const deployer = new HeadyDeploy();
          const deployResult = await deployer.deploySource();
          record.steps[record.steps.length - 1].result = deployResult;
        } catch (e) {
          record.steps[record.steps.length - 1].result = { skipped: true, reason: e.message };
        }
      }

      record.status = "complete";
      record.completedAt = new Date().toISOString();
      this.status = "idle";
      return record;
    } catch (err) {
      record.status = "failed";
      record.error = err.message;
      record.completedAt = new Date().toISOString();
      this.status = "error";
      return record;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. AutoImport — Watches Dropzone folder, auto-copies new files
// ═══════════════════════════════════════════════════════════════════

class AutoImport {
  constructor(opts = {}) {
    this.root = opts.root || ROOT;
    this.dropzonePath = opts.dropzone || path.resolve(this.root, "..", "Dropzone");
    this.knownFiles = new Set();
    this.importLog = [];
    this.watching = false;
    this._watcher = null;
    this._scanKnownFiles();
  }

  _scanKnownFiles() {
    try {
      if (fs.existsSync(this.dropzonePath)) {
        fs.readdirSync(this.dropzonePath).forEach(f => this.knownFiles.add(f));
      }
    } catch {}
  }

  /** Import a specific file from Dropzone into the correct location */
  importFile(filename) {
    const src = path.join(this.dropzonePath, filename);
    if (!fs.existsSync(src)) return { ok: false, error: `${filename} not found in Dropzone` };

    const ext = path.extname(filename).toLowerCase();
    const base = path.basename(filename, ext);
    let dest;

    // Route by file type
    if (ext === ".js" && (base.includes("bee") || base.includes("swarm") || base.includes("agent"))) {
      dest = path.join(this.root, "agents", filename);
    } else if (ext === ".js" && (base.includes("liquid") || base.includes("hc_") || base.includes("heady-"))) {
      dest = path.join(this.root, "src", filename);
    } else if (ext === ".js" && (base.includes("colab") || base.includes("runtime") || base.includes("deploy") || base.includes("service"))) {
      dest = path.join(this.root, "services", filename);
    } else if (ext === ".py") {
      dest = path.join(this.root, "services", filename);
    } else if (ext === ".md") {
      dest = path.join(this.root, "docs", "strategic", filename);
    } else if (ext === ".html") {
      dest = path.join(this.root, "sites", base, "index.html");
    } else if (ext === ".zip") {
      dest = path.join(this.root, "_downloads", base);
      try {
        // Just copy the zip — extraction happens separately
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest + ext);
        this.importLog.push({ file: filename, dest: dest + ext, ts: new Date().toISOString() });
        return { ok: true, dest: dest + ext, action: "copied_zip" };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    } else {
      dest = path.join(this.root, "docs", filename);
    }

    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      this.importLog.push({ file: filename, dest, ts: new Date().toISOString() });
      return { ok: true, dest, action: "copied" };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /** Scan Dropzone for new files and import them */
  scanAndImport() {
    if (!fs.existsSync(this.dropzonePath)) return { ok: false, error: "Dropzone not found" };
    const currentFiles = fs.readdirSync(this.dropzonePath);
    const newFiles = currentFiles.filter(f => !this.knownFiles.has(f) && f !== "00-START-HERE.txt");
    const results = [];

    for (const file of newFiles) {
      const stat = fs.statSync(path.join(this.dropzonePath, file));
      if (stat.isFile() && stat.size > 0) {
        const result = this.importFile(file);
        results.push({ file, ...result });
        this.knownFiles.add(file);
      }
    }

    return { ok: true, scanned: currentFiles.length, imported: results.length, results };
  }

  /** Start watching Dropzone for changes */
  startWatcher() {
    if (this.watching || !fs.existsSync(this.dropzonePath)) return { ok: false };
    try {
      this._watcher = fs.watch(this.dropzonePath, (event, filename) => {
        if (event === "rename" && filename && !this.knownFiles.has(filename)) {
          setTimeout(() => this.importFile(filename), 1000); // debounce
          this.knownFiles.add(filename);
        }
      });
      this.watching = true;
      return { ok: true, message: "Watching Dropzone for new files" };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  stopWatcher() {
    if (this._watcher) { this._watcher.close(); this._watcher = null; }
    this.watching = false;
    return { ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4. AutoHealth — Periodic health checks with alerting
// ═══════════════════════════════════════════════════════════════════

class AutoHealth {
  constructor(opts = {}) {
    this.endpoints = opts.endpoints || [
      { name: "heady-manager", url: "http://localhost:3300/api/health" },
      { name: "heady-brain", url: "http://localhost:3300/api/brain/health" },
      { name: "headyme.com", url: "https://headyme.com/health", external: true },
      { name: "headysystems.com", url: "https://headysystems.com/health", external: true },
      { name: "headyconnection.com", url: "https://headyconnection.com/health", external: true },
      { name: "heady-ai.com", url: "https://heady-ai.com/health", external: true },
    ];
    this.results = [];
    this._interval = null;
    this.intervalMs = opts.intervalMs || Math.round(PHI * PHI * PHI * 60000); // ~4.2 min
  }

  /** Check a single endpoint */
  async checkEndpoint(ep) {
    const start = Date.now();
    try {
      const mod = ep.url.startsWith("https") ? https : require("http");
      const result = await new Promise((resolve, reject) => {
        const req = mod.get(ep.url, { timeout: 10000 }, (res) => {
          let data = "";
          res.on("data", c => data += c);
          res.on("end", () => {
            resolve({
              name: ep.name,
              status: res.statusCode,
              healthy: res.statusCode >= 200 && res.statusCode < 300,
              latencyMs: Date.now() - start,
              ts: new Date().toISOString(),
            });
          });
        });
        req.on("error", e => resolve({
          name: ep.name, status: 0, healthy: false, error: e.message,
          latencyMs: Date.now() - start, ts: new Date().toISOString(),
        }));
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
      });
      return result;
    } catch (e) {
      return { name: ep.name, status: 0, healthy: false, error: e.message, latencyMs: Date.now() - start, ts: new Date().toISOString() };
    }
  }

  /** Check all endpoints */
  async checkAll() {
    const checks = await Promise.allSettled(this.endpoints.map(ep => this.checkEndpoint(ep)));
    const results = checks.map(c => c.status === "fulfilled" ? c.value : { error: c.reason?.message, healthy: false });
    const report = {
      ts: new Date().toISOString(),
      total: results.length,
      healthy: results.filter(r => r.healthy).length,
      unhealthy: results.filter(r => !r.healthy).length,
      results,
    };
    this.results.push(report);
    if (this.results.length > 100) this.results.shift(); // keep last 100
    return report;
  }

  /** Start periodic health monitoring */
  startMonitoring() {
    if (this._interval) return { ok: false, message: "Already monitoring" };
    this._interval = setInterval(() => this.checkAll(), this.intervalMs);
    return { ok: true, intervalMs: this.intervalMs };
  }

  stopMonitoring() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    return { ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════════
// 5. AutoDNS — Cloudflare DNS management via API
// ═══════════════════════════════════════════════════════════════════

class AutoDNS {
  constructor(opts = {}) {
    this.apiToken = opts.apiToken || process.env.CLOUDFLARE_API_TOKEN;
    this.accountId = opts.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  }

  async _cfGet(path) {
    if (!this.apiToken) throw new Error("CLOUDFLARE_API_TOKEN not set");
    return new Promise((resolve, reject) => {
      const req = https.get({
        hostname: "api.cloudflare.com", path: `/client/v4${path}`,
        headers: { Authorization: `Bearer ${this.apiToken}`, "Content-Type": "application/json" },
      }, res => {
        let d = ""; res.on("data", c => d += c);
        res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
      });
      req.on("error", reject);
    });
  }

  async _cfPost(path, body) {
    if (!this.apiToken) throw new Error("CLOUDFLARE_API_TOKEN not set");
    const bodyStr = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.cloudflare.com", path: `/client/v4${path}`, method: "POST",
        headers: { Authorization: `Bearer ${this.apiToken}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) },
      }, res => {
        let d = ""; res.on("data", c => d += c);
        res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
      });
      req.on("error", reject);
      req.write(bodyStr);
      req.end();
    });
  }

  async listZones() { return this._cfGet("/zones"); }
  async listRecords(zoneId) { return this._cfGet(`/zones/${zoneId}/dns_records`); }
  async getSSLStatus(zoneId) { return this._cfGet(`/zones/${zoneId}/ssl/verification`); }

  async auditAllDomains() {
    try {
      const zones = await this.listZones();
      if (!zones.result) return { ok: false, error: "Failed to list zones", raw: zones };
      const report = [];
      for (const zone of zones.result) {
        const records = await this.listRecords(zone.id);
        report.push({
          domain: zone.name,
          zoneId: zone.id,
          status: zone.status,
          ssl: zone.ssl?.status || "unknown",
          records: (records.result || []).length,
          nameservers: zone.name_servers,
        });
      }
      return { ok: true, domains: report, total: report.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 6. HeadyAuto — Unified automation orchestrator
// ═══════════════════════════════════════════════════════════════════

class HeadyAuto {
  constructor(opts = {}) {
    this.git = new AutoGit(opts);
    this.deploy = new AutoDeploy(opts);
    this.importer = new AutoImport(opts);
    this.health = new AutoHealth(opts);
    this.dns = new AutoDNS(opts);
    this.initialized = false;
  }

  /** Initialize all automation subsystems */
  init() {
    const results = {};
    results.gitCredentials = this.git.setupCredentials();
    results.dropzoneImport = this.importer.scanAndImport();
    results.dropzoneWatcher = this.importer.startWatcher();
    // Don't start health monitoring by default in dev — only in production
    if (process.env.NODE_ENV === "production") {
      results.healthMonitor = this.health.startMonitoring();
    }
    this.initialized = true;
    return results;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      git: {
        hasToken: !!this.git.token,
        remote: this.git.remote,
        branch: this.git.branch,
      },
      deploy: {
        status: this.deploy.status,
        history: this.deploy.history.length,
        lastDeploy: this.deploy.history.length > 0 ? this.deploy.history[this.deploy.history.length - 1] : null,
      },
      importer: {
        dropzonePath: this.importer.dropzonePath,
        dropzoneExists: fs.existsSync(this.importer.dropzonePath),
        knownFiles: this.importer.knownFiles.size,
        importLog: this.importer.importLog.length,
        watching: this.importer.watching,
      },
      health: {
        endpoints: this.health.endpoints.length,
        monitoring: !!this.health._interval,
        lastCheck: this.health.results.length > 0 ? this.health.results[this.health.results.length - 1] : null,
      },
      dns: {
        hasToken: !!this.dns.apiToken,
        hasAccountId: !!this.dns.accountId,
      },
    };
  }

  shutdown() {
    this.importer.stopWatcher();
    this.health.stopMonitoring();
  }
}

// ═══════════════════════════════════════════════════════════════════
// Express Route Registration
// ═══════════════════════════════════════════════════════════════════

function registerAutoRoutes(app, auto) {

  // Status overview
  app.get("/api/auto/status", (req, res) => {
    res.json({ ok: true, ...auto.getStatus(), ts: new Date().toISOString() });
  });

  // Git operations
  app.post("/api/auto/git/setup", (req, res) => {
    res.json({ ok: true, ...auto.git.setupCredentials() });
  });

  app.post("/api/auto/git/commit", (req, res) => {
    const result = auto.git.autoCommit(req.body?.message);
    res.json({ ok: true, ...result });
  });

  app.post("/api/auto/git/push", (req, res) => {
    const result = auto.git.autoPush();
    res.json({ ok: true, ...result });
  });

  app.post("/api/auto/git/commit-push", (req, res) => {
    const result = auto.git.commitAndPush(req.body?.message);
    res.json({ ok: true, ...result });
  });

  // Deploy pipeline
  app.post("/api/auto/deploy", async (req, res) => {
    try {
      const result = await auto.deploy.runPipeline(req.body || {});
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Dropzone import
  app.post("/api/auto/import", (req, res) => {
    const result = auto.importer.scanAndImport();
    res.json({ ok: true, ...result });
  });

  app.get("/api/auto/import/log", (req, res) => {
    res.json({ ok: true, log: auto.importer.importLog, watching: auto.importer.watching });
  });

  // Health checks
  app.get("/api/auto/health/check", async (req, res) => {
    try {
      const result = await auto.health.checkAll();
      res.json({ ok: true, ...result });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.post("/api/auto/health/monitor/start", (req, res) => {
    res.json({ ok: true, ...auto.health.startMonitoring() });
  });

  app.post("/api/auto/health/monitor/stop", (req, res) => {
    res.json({ ok: true, ...auto.health.stopMonitoring() });
  });

  app.get("/api/auto/health/history", (req, res) => {
    res.json({ ok: true, total: auto.health.results.length, results: auto.health.results.slice(-20) });
  });

  // DNS/SSL audit
  app.get("/api/auto/dns/audit", async (req, res) => {
    try {
      const result = await auto.dns.auditAllDomains();
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Full auto: import → install → check → commit → push
  app.post("/api/auto/full", async (req, res) => {
    try {
      const importResult = auto.importer.scanAndImport();
      const deployResult = await auto.deploy.runPipeline({ message: req.body?.message, deploy: req.body?.deploy });
      res.json({ ok: true, import: importResult, deploy: deployResult });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });
}

module.exports = { HeadyAuto, AutoGit, AutoDeploy, AutoImport, AutoHealth, AutoDNS, registerAutoRoutes };
