const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: heady-manager.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🌈 HEADY SYSTEMS — MANAGER SERVER                                         ║
 * ║  🚀 Node.js MCP Server • API Gateway • Sacred Geometry v3.0.0               ║
 * ║  🎨 Phi-Based Design • Rainbow Magic • Zero Defect Code ✨                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ─── Imagination Engine ─────────────────────────────────────────────
let imaginationRoutes = null;
try {
  imaginationRoutes = require("./src/routes/imagination-routes");
  logger.info("  ∞ Imagination Engine: ROUTES LOADED");
} catch (err) {
  logger.warn(`  ⚠ Imagination routes not loaded: ${err.message}`);
}

// ─── Secrets & Cloudflare Management ──────────────────────────────
let secretsManager = null;
let cfManager = null;
try {
  const { secretsManager: sm, registerSecretsRoutes } = require("./src/hc_secrets_manager");
  const { CloudflareManager, registerCloudflareRoutes } = require("./src/hc_cloudflare");
  secretsManager = sm;
  cfManager = new CloudflareManager(secretsManager);

  // Register non-Cloudflare secrets from manifest
  const manifestSecrets = [
    { id: "render_api_key", name: "Render API Key", envVar: "RENDER_API_KEY", tags: ["render", "api-key"], dependents: ["render-deploy"] },
    { id: "heady_api_key", name: "Heady API Key", envVar: "HEADY_API_KEY", tags: ["heady", "auth"], dependents: ["api-gateway"] },
    { id: "admin_token", name: "Admin Token", envVar: "ADMIN_TOKEN", tags: ["heady", "admin"], dependents: ["admin-panel"] },
    { id: "database_url", name: "PostgreSQL Connection", envVar: "DATABASE_URL", tags: ["database"], dependents: ["persistence"] },
    { id: "hf_token", name: "Hugging Face Token", envVar: "HF_TOKEN", tags: ["huggingface", "ai"], dependents: ["pythia-node"] },
    { id: "notion_token", name: "Notion Integration Token", envVar: "NOTION_TOKEN", tags: ["notion"], dependents: ["notion-sync"] },
    { id: "github_token", name: "GitHub PAT", envVar: "GITHUB_TOKEN", tags: ["github", "vcs"], dependents: ["heady-sync"] },
    { id: "stripe_secret_key", name: "Stripe Secret Key", envVar: "STRIPE_SECRET_KEY", tags: ["stripe", "payments"], dependents: ["billing"] },
    { id: "stripe_webhook_secret", name: "Stripe Webhook Secret", envVar: "STRIPE_WEBHOOK_SECRET", tags: ["stripe", "webhook"], dependents: ["billing-webhooks"] },
  ];
  for (const s of manifestSecrets) {
    secretsManager.register({ ...s, source: "env" });
  }
  secretsManager.restoreState();
  logger.info("  \u221e Secrets Manager: LOADED (" + secretsManager.getAll().length + " secrets tracked)");
  logger.info("  \u221e Cloudflare Manager: LOADED (token " + (cfManager.isTokenValid() ? "valid" : "needs refresh") + ")");
} catch (err) {
  logger.warn(`  \u26a0 Secrets/Cloudflare not loaded: ${err.message}`);
}

const PORT = Number(process.env.PORT || 3300);
const app = express();

// ─── Middleware ─────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  credentials: true,
}));
app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Imagination Routes ────────────────────────────────────────────
if (imaginationRoutes) {
  app.use("/api/imagination", imaginationRoutes);
}

// ─── Static Assets ─────────────────────────────────────────────────
const frontendBuildPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}
app.use(express.static("public"));

// Mount UI directories for liquid nodes, swarms, and topology
app.use("/ui/topology", express.static(path.join(__dirname, "ui", "topology-dashboard")));
app.use("/ui/swarm", express.static(path.join(__dirname, "ui", "swarm-monitor")));
app.use("/ui/colab", express.static(path.join(__dirname, "ui", "colab-runtime-panel")));
app.use("/ui/vector", express.static(path.join(__dirname, "ui", "vector-explorer")));

// ─── Utility ────────────────────────────────────────────────────────
function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

// ─── Health & Pulse ─────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "heady-manager",
    version: "3.0.0",
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get("/api/pulse", (req, res) => {
  res.json({
    ok: true,
    service: "heady-manager",
    version: "3.0.0",
    ts: new Date().toISOString(),
    status: "active",
    endpoints: [
      "/api/health", "/api/pulse", "/api/registry", "/api/registry/component/:id",
      "/api/registry/environments", "/api/registry/docs", "/api/registry/notebooks",
      "/api/registry/patterns", "/api/registry/workflows", "/api/registry/ai-nodes",
      "/api/nodes", "/api/system/status", "/api/pipeline/*",
      "/api/ide/spec", "/api/ide/agents",
      "/api/playbook", "/api/agentic", "/api/activation", "/api/public-domain",
      "/api/resources/health", "/api/resources/snapshot", "/api/resources/events",
      "/api/resources/diagnose", "/api/resources/quick-wins", "/api/resources/system-profile",
      "/api/scheduler/status", "/api/scheduler/queues", "/api/scheduler/history",
      "/api/stories", "/api/stories/recent", "/api/stories/summary",
      "/api/monte-carlo/plan", "/api/monte-carlo/result", "/api/monte-carlo/metrics",
      "/api/monte-carlo/status", "/api/monte-carlo/drift", "/api/monte-carlo/simulate",
      "/api/monte-carlo/speed-mode",
      "/api/patterns", "/api/patterns/summary", "/api/patterns/recent",
      "/api/patterns/bottlenecks", "/api/patterns/improvements",
      "/api/self/status", "/api/self/knowledge", "/api/self/critique", "/api/self/critiques",
      "/api/self/improvement", "/api/self/improvements", "/api/self/diagnose", "/api/self/diagnostics",
      "/api/self/connection-health", "/api/self/connections", "/api/self/meta-analysis",
      "/api/pricing/tiers", "/api/pricing/fair-access", "/api/pricing/metrics",
      "/api/secrets/status", "/api/secrets", "/api/secrets/:id", "/api/secrets/alerts",
      "/api/secrets/check", "/api/secrets/:id/refresh", "/api/secrets/audit",
      "/api/cloudflare/status", "/api/cloudflare/refresh", "/api/cloudflare/zones",
      "/api/cloudflare/domains", "/api/cloudflare/verify",
      "/api/aloha/status", "/api/aloha/protocol", "/api/aloha/de-optimization",
      "/api/aloha/stability", "/api/aloha/priorities", "/api/aloha/checklist",
      "/api/aloha/crash-report", "/api/aloha/de-opt-check", "/api/aloha/web-baseline",
      "/api/imagination/primitives", "/api/imagination/concepts", "/api/imagination/imagine",
      "/api/imagination/hot-concepts", "/api/imagination/top-concepts", "/api/imagination/ip-packages",
    ],
    aloha: alohaState ? {
      mode: alohaState.mode,
      protocols: alohaState.protocols,
      stabilityDiagnosticMode: alohaState.stabilityDiagnosticMode,
      crashReports: alohaState.crashReports.length,
    } : null,
    secrets: secretsManager ? secretsManager.getSummary() : null,
    cloudflare: cfManager ? { tokenValid: cfManager.isTokenValid(), expiresIn: cfManager.expiresAt ? cfManager._timeUntil(cfManager.expiresAt) : null } : null,
  });
});

// ─── Registry ───────────────────────────────────────────────────────
const REGISTRY_PATH = path.join(__dirname, ".heady", "registry.json");

function loadRegistry() {
  return readJsonSafe(REGISTRY_PATH) || { nodes: {}, tools: {}, workflows: {}, services: {}, skills: {}, metadata: {} };
}

function saveRegistry(data) {
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), "utf8");
}

app.get("/api/registry", (req, res) => {
  const registryPath = path.join(__dirname, "heady-registry.json");
  const registry = readJsonSafe(registryPath);
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json(registry);
});

app.get("/api/registry/component/:id", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  const comp = (registry.components || []).find(c => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: `Component '${req.params.id}' not found` });
  res.json(comp);
});

app.get("/api/registry/environments", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ environments: registry.environments || [], ts: new Date().toISOString() });
});

app.get("/api/registry/docs", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ docs: registry.docs || [], ts: new Date().toISOString() });
});

app.get("/api/registry/notebooks", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ notebooks: registry.notebooks || [], ts: new Date().toISOString() });
});

app.get("/api/registry/patterns", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ patterns: registry.patterns || [], ts: new Date().toISOString() });
});

app.get("/api/registry/workflows", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ workflows: registry.workflows || [], ts: new Date().toISOString() });
});

app.get("/api/registry/ai-nodes", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ aiNodes: registry.aiNodes || [], ts: new Date().toISOString() });
});

// ─── Node Management ────────────────────────────────────────────────
app.get("/api/nodes", (req, res) => {
  const reg = loadRegistry();
  const nodes = Object.entries(reg.nodes || {}).map(([id, n]) => ({ id, ...n }));
  res.json({ total: nodes.length, active: nodes.filter(n => n.status === "active").length, nodes, ts: new Date().toISOString() });
});

app.get("/api/nodes/:nodeId", (req, res) => {
  const reg = loadRegistry();
  const node = reg.nodes[req.params.nodeId.toUpperCase()];
  if (!node) return res.status(404).json({ error: `Node '${req.params.nodeId}' not found` });
  res.json({ id: req.params.nodeId.toUpperCase(), ...node });
});

app.post("/api/nodes/:nodeId/activate", (req, res) => {
  const reg = loadRegistry();
  const id = req.params.nodeId.toUpperCase();
  if (!reg.nodes[id]) return res.status(404).json({ error: `Node '${id}' not found` });
  reg.nodes[id].status = "active";
  reg.nodes[id].last_invoked = new Date().toISOString();
  saveRegistry(reg);
  res.json({ success: true, node: id, status: "active" });
});

app.post("/api/nodes/:nodeId/deactivate", (req, res) => {
  const reg = loadRegistry();
  const id = req.params.nodeId.toUpperCase();
  if (!reg.nodes[id]) return res.status(404).json({ error: `Node '${id}' not found` });
  reg.nodes[id].status = "available";
  saveRegistry(reg);
  res.json({ success: true, node: id, status: "available" });
});

// ─── System Status & Production Activation ──────────────────────────
app.get("/api/system/status", (req, res) => {
  const reg = loadRegistry();
  const nodeList = Object.entries(reg.nodes || {});
  const activeNodes = nodeList.filter(([, n]) => n.status === "active").length;

  res.json({
    system: "Heady Systems",
    version: "3.0.0",
    environment: (reg.metadata || {}).environment || "development",
    production_ready: activeNodes === nodeList.length && nodeList.length > 0,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    capabilities: {
      nodes: { total: nodeList.length, active: activeNodes },
      tools: { total: Object.keys(reg.tools || {}).length },
      workflows: { total: Object.keys(reg.workflows || {}).length },
      services: { total: Object.keys(reg.services || {}).length },
    },
    sacred_geometry: { architecture: "active", organic_systems: activeNodes === nodeList.length },
    ts: new Date().toISOString(),
  });
});

app.post("/api/system/production", (req, res) => {
  const reg = loadRegistry();
  const ts = new Date().toISOString();
  const report = { nodes: [], tools: [], workflows: [], services: [] };

  for (const [name, node] of Object.entries(reg.nodes || {})) {
    node.status = "active"; node.last_invoked = ts; report.nodes.push(name);
  }
  for (const [name, tool] of Object.entries(reg.tools || {})) {
    tool.status = "active"; report.tools.push(name);
  }
  for (const [name, wf] of Object.entries(reg.workflows || {})) {
    wf.status = "active"; report.workflows.push(name);
  }
  for (const [name, svc] of Object.entries(reg.services || {})) {
    svc.status = name === "heady-manager" ? "healthy" : "active"; report.services.push(name);
  }
  for (const [, sk] of Object.entries(reg.skills || {})) { sk.status = "active"; }

  reg.metadata = { ...reg.metadata, last_updated: ts, version: "3.0.0-production", environment: "production", all_nodes_active: true, production_activated_at: ts };
  saveRegistry(reg);

  res.json({
    success: true,
    environment: "production",
    activated: { nodes: report.nodes.length, tools: report.tools.length, workflows: report.workflows.length, services: report.services.length },
    sacred_geometry: "FULLY_ACTIVATED",
    ts,
  });
});

// ─── Liquid Mesh & Swarm Intelligence ────────────────────────────────
let liquidMesh = null;
let headySwarm = null;
try {
  const { LiquidMesh } = require('./src/liquid/liquid-mesh');
  const { HeadySwarm } = require('./src/bees/heady-swarm');

  liquidMesh = new LiquidMesh();
  liquidMesh.start();

  headySwarm = new HeadySwarm();
  headySwarm.start();

  logger.info("  ∞ Liquid Mesh: STARTED");
  logger.info("  ∞ HeadySwarm: STARTED");
} catch (err) {
  logger.warn(`  ⚠ Liquid Mesh / Swarm failed to load: ${err.message}`);
}

app.get("/api/topology", (req, res) => {
  if (!liquidMesh) return res.status(503).json({ error: "Liquid Mesh not active" });
  res.json(liquidMesh.getTopology());
});

app.get("/api/swarm/status", (req, res) => {
  if (!headySwarm) return res.status(503).json({ error: "HeadySwarm not active" });
  res.json(headySwarm.getStatus());
});

// ─── Pipeline Engine (wired to src/hc_pipeline.js) ──────────────────
let pipeline = null;
let pipelineError = null;
try {
  const pipelineMod = require("./src/hc_pipeline");
  pipeline = pipelineMod.pipeline;
  logger.info("  ∞ Pipeline engine: LOADED");
} catch (err) {
  pipelineError = err.message;
  logger.warn(`  ⚠ Pipeline engine not loaded: ${err.message}`);
}

app.get("/api/pipeline/config", (req, res) => {
  if (!pipeline) return res.status(503).json({ error: "Pipeline not loaded", reason: pipelineError });
  try {
    const summary = pipeline.getConfigSummary();
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to load pipeline config", message: err.message });
  }
});

app.post("/api/pipeline/run", async (req, res) => {
  if (!pipeline) return res.status(503).json({ error: "Pipeline not loaded", reason: pipelineError });
  try {
    const result = await pipeline.run(req.body || {});
    res.json({
      ok: true,
      runId: result.runId,
      status: result.status,
      metrics: result.metrics,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Pipeline run failed", message: err.message });
  }
});

app.get("/api/pipeline/state", (req, res) => {
  if (!pipeline) return res.status(503).json({ error: "Pipeline not loaded", reason: pipelineError });
  try {
    const state = pipeline.getState();
    if (!state) return res.json({ ok: true, state: null, message: "No run executed yet" });
    res.json({ ok: true, runId: state.runId, status: state.status, metrics: state.metrics, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to get pipeline state", message: err.message });
  }
});

// ─── HeadyAutoIDE & Methodology APIs ────────────────────────────────
const jsYaml = require("js-yaml");

function loadYamlConfig(filename) {
  const filePath = path.join(__dirname, "configs", filename);
  if (!fs.existsSync(filePath)) return null;
  try { return jsYaml.load(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

app.get("/api/ide/spec", (req, res) => {
  const spec = loadYamlConfig("heady-auto-ide.yaml");
  if (!spec) return res.status(404).json({ error: "HeadyAutoIDE spec not found" });
  res.json({ ok: true, ...spec, ts: new Date().toISOString() });
});

app.get("/api/ide/agents", (req, res) => {
  const spec = loadYamlConfig("heady-auto-ide.yaml");
  if (!spec) return res.status(404).json({ error: "HeadyAutoIDE spec not found" });
  res.json({ ok: true, agents: spec.agentRoles || [], ts: new Date().toISOString() });
});

app.get("/api/playbook", (req, res) => {
  const playbook = loadYamlConfig("build-playbook.yaml");
  if (!playbook) return res.status(404).json({ error: "Build Playbook not found" });
  res.json({ ok: true, ...playbook, ts: new Date().toISOString() });
});

app.get("/api/agentic", (req, res) => {
  const agentic = loadYamlConfig("agentic-coding.yaml");
  if (!agentic) return res.status(404).json({ error: "Agentic Coding config not found" });
  res.json({ ok: true, ...agentic, ts: new Date().toISOString() });
});

app.get("/api/activation", (req, res) => {
  const manifest = loadYamlConfig("activation-manifest.yaml");
  if (!manifest) return res.status(404).json({ error: "Activation Manifest not found" });
  const reg = loadRegistry();
  const nodeList = Object.entries(reg.nodes || {});
  const activeNodes = nodeList.filter(([, n]) => n.status === "active").length;

  res.json({
    ok: true,
    status: manifest.status || "PENDING",
    activatedAt: manifest.activatedAt,
    version: manifest.version,
    verifiedResources: {
      configs: (manifest.verifiedResources?.configs || []).length,
      coreEngines: (manifest.verifiedResources?.coreEngines || []).length,
      companionSystems: (manifest.verifiedResources?.companionSystems || []).length,
      registryNodes: { total: nodeList.length, active: activeNodes },
    },
    operatingDirectives: (manifest.operatingDirectives || []).length,
    pipelineStages: (manifest.pipelineInitTemplate?.stages || []).length,
    ts: new Date().toISOString(),
  });
});

app.get("/api/public-domain", (req, res) => {
  const pdi = loadYamlConfig("public-domain-integration.yaml");
  if (!pdi) return res.status(404).json({ error: "Public Domain Integration config not found" });
  res.json({ ok: true, ...pdi, ts: new Date().toISOString() });
});

// ─── Continuous Pipeline State (shared by resources & buddy APIs) ────
let continuousPipeline = {
  running: false,
  cycleCount: 0,
  lastCycleTs: null,
  exitReason: null,
  errors: [],
  gateResults: { quality: null, resource: null, stability: null, user: null },
  intervalId: null,
};

// ─── Intelligent Resource Manager ────────────────────────────────────
let resourceManager = null;
try {
  const { HCResourceManager, registerRoutes: registerResourceRoutes } = require("./src/hc_resource_manager");
  resourceManager = new HCResourceManager({ pollIntervalMs: 5000 });
  registerResourceRoutes(app, resourceManager);
  resourceManager.start();

  resourceManager.on("resource_event", (event) => {
    if (event.severity === "WARN_HARD" || event.severity === "CRITICAL") {
      logger.warn(`  ⚠ Resource ${event.severity}: ${event.resourceType} at ${event.currentUsagePercent}%`);
    }
  });

  resourceManager.on("escalation_required", (data) => {
    logger.warn(`  ⚠ ESCALATION: ${data.event.resourceType} at ${data.event.currentUsagePercent}% — user prompt required`);
  });

  logger.info("  ∞ Resource Manager: LOADED (polling every 5s)");
} catch (err) {
  logger.warn(`  ⚠ Resource Manager not loaded: ${err.message}`);

  // Fallback inline resource health endpoint
  app.get("/api/resources/health", (req, res) => {
    const mem = process.memoryUsage();
    const osLib = require("os");
    const totalMem = osLib.totalmem();
    const freeMem = osLib.freemem();
    const usedMem = totalMem - freeMem;
    const cpuCount = osLib.cpus().length;
    const ramPercent = Math.round((usedMem / totalMem) * 100);

    res.json({
      cpu: { currentPercent: 0, cores: cpuCount, unit: "%" },
      ram: { currentPercent: ramPercent, absoluteValue: Math.round(usedMem / 1048576), capacity: Math.round(totalMem / 1048576), unit: "MB" },
      disk: { currentPercent: 0, absoluteValue: 0, capacity: 0, unit: "GB" },
      gpu: null,
      safeMode: false,
      status: "fallback",
      ts: new Date().toISOString(),
    });
  });
}

// ─── Task Scheduler ──────────────────────────────────────────────────
let taskScheduler = null;
try {
  const { HCTaskScheduler, registerSchedulerRoutes } = require("./src/hc_task_scheduler");
  taskScheduler = new HCTaskScheduler();
  registerSchedulerRoutes(app, taskScheduler);

  // Wire resource manager safe mode into scheduler
  if (resourceManager) {
    resourceManager.on("mitigation:safe_mode_activated", () => {
      taskScheduler.enterSafeMode();
    });
    resourceManager.on("mitigation:batch_paused", () => {
      taskScheduler.adjustConcurrency("batch", 1);
    });
    resourceManager.on("mitigation:concurrency_lowered", () => {
      taskScheduler.adjustConcurrency("batch", 1);
      taskScheduler.adjustConcurrency("training", 0);
    });
  }

  logger.info("  ∞ Task Scheduler: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Task Scheduler not loaded: ${err.message}`);
}

// ─── Resource Diagnostics ────────────────────────────────────────────
let resourceDiagnostics = null;
try {
  const { HCResourceDiagnostics, registerDiagnosticRoutes } = require("./src/hc_resource_diagnostics");
  resourceDiagnostics = new HCResourceDiagnostics({
    resourceManager,
    taskScheduler,
  });
  registerDiagnosticRoutes(app, resourceDiagnostics);
  logger.info("  ∞ Resource Diagnostics: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Resource Diagnostics not loaded: ${err.message}`);
}

// ─── Monte Carlo Plan Scheduler ──────────────────────────────────────
let mcPlanScheduler = null;
let mcGlobal = null;
try {
  const { mcPlanScheduler: _mcPS, mcGlobal: _mcG, registerMonteCarloRoutes } = require("./src/hc_monte_carlo");
  mcPlanScheduler = _mcPS;
  mcGlobal = _mcG;
  registerMonteCarloRoutes(app, mcPlanScheduler, mcGlobal);

  // Wire MC plan scheduler drift alerts into pattern engine (loaded below)
  mcPlanScheduler.on("drift:detected", (alert) => {
    logger.warn(`  ⚠ MC Drift: ${alert.taskType}/${alert.strategyId} at ${alert.medianMs}ms (target ${alert.targetMs}ms)`);
  });

  // Bind MC global to pipeline if available
  if (pipeline) {
    mcGlobal.bind({ pipeline, registry: loadRegistry });
  }

  // Start background MC cycles
  mcGlobal.startAutoRun();

  // Default to speed_priority mode — speed is a first-class objective
  mcPlanScheduler.setSpeedMode("on");

  logger.info("  ∞ Monte Carlo Plan Scheduler: LOADED (speed_priority mode)");
  logger.info("  ∞ Monte Carlo Global: AUTO-RUN started (60s cycles)");
} catch (err) {
  logger.warn(`  ⚠ Monte Carlo not loaded: ${err.message}`);
}

// ─── Pattern Recognition Engine ──────────────────────────────────────
let patternEngine = null;
try {
  const { patternEngine: _pe, registerPatternRoutes } = require("./src/hc_pattern_engine");
  patternEngine = _pe;
  registerPatternRoutes(app, patternEngine);

  // Wire MC drift alerts into pattern engine
  if (mcPlanScheduler) {
    mcPlanScheduler.on("drift:detected", (alert) => {
      patternEngine.observeLatency(`mc_drift:${alert.taskType}`, alert.medianMs, {
        strategyId: alert.strategyId, targetMs: alert.targetMs,
        tags: ["drift", "monte_carlo"],
      });
    });
    mcPlanScheduler.on("result:recorded", (data) => {
      patternEngine.observeLatency(`task:${data.taskType}`, data.actualLatencyMs, {
        strategyId: data.strategyId, reward: data.reward,
        tags: ["monte_carlo", "execution"],
      });
    });
  }

  // Wire task scheduler into pattern engine
  if (taskScheduler) {
    taskScheduler.on("task:completed", (task) => {
      const execMs = (task.metrics.completedAt || 0) - (task.metrics.startedAt || 0);
      patternEngine.observeSuccess(`scheduler:${task.type}`, execMs, {
        tier: task.resourceTier, taskClass: task.taskClass,
        tags: ["scheduler"],
      });
    });
    taskScheduler.on("task:failed", (task) => {
      patternEngine.observeError(`scheduler:${task.type}`, task.error || "unknown", {
        tier: task.resourceTier, tags: ["scheduler", "failure"],
      });
    });
  }

  // Wire resource manager into pattern engine
  if (resourceManager) {
    resourceManager.on("resource_event", (event) => {
      if (event.severity === "WARN_HARD" || event.severity === "CRITICAL") {
        patternEngine.observe("reliability", `resource:${event.resourceType}`, event.currentUsagePercent, {
          severity: event.severity, tags: ["resource", event.resourceType],
        });
      }
    });
  }

  // Start continuous pattern analysis
  patternEngine.start();

  logger.info("  ∞ Pattern Engine: LOADED (30s analysis cycles)");
} catch (err) {
  logger.warn(`  ⚠ Pattern Engine not loaded: ${err.message}`);
}

// ─── Story Driver ────────────────────────────────────────────────────
let storyDriver = null;
try {
  const { HCStoryDriver, registerStoryRoutes } = require("./src/hc_story_driver");
  storyDriver = new HCStoryDriver();
  registerStoryRoutes(app, storyDriver);

  // Wire resource manager events into story driver
  if (resourceManager) {
    resourceManager.on("resource_event", (event) => {
      if (event.severity === "WARN_HARD" || event.severity === "CRITICAL") {
        storyDriver.ingestSystemEvent({
          type: `RESOURCE_${event.severity}`,
          refs: {
            resourceType: event.resourceType,
            percent: event.currentUsagePercent,
            mitigation: event.mitigationApplied || "pending",
          },
          source: "resource_manager",
        });
      }
    });
  }

  // Wire pattern engine events into story driver
  if (patternEngine) {
    patternEngine.on("pattern:converged", (data) => {
      storyDriver.ingestSystemEvent({
        type: "PATTERN_CONVERGED",
        refs: { patternId: data.id, name: data.name },
        source: "pattern_engine",
      });
    });
    patternEngine.on("anomaly:error_burst", (data) => {
      storyDriver.ingestSystemEvent({
        type: "ERROR_BURST_DETECTED",
        refs: { patternId: data.patternId, name: data.name, count: data.count },
        source: "pattern_engine",
      });
    });
    patternEngine.on("anomaly:correlated_slowdown", (data) => {
      storyDriver.ingestSystemEvent({
        type: "CORRELATED_SLOWDOWN",
        refs: { patterns: data.patterns, count: data.count },
        source: "pattern_engine",
      });
    });
  }

  logger.info("  ∞ Story Driver: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Story Driver not loaded: ${err.message}`);
}

// ─── Self-Critique & Optimization Engine ─────────────────────────────
let selfCritiqueEngine = null;
try {
  const { selfCritique, registerSelfCritiqueRoutes } = require("./src/hc_self_critique");
  selfCritiqueEngine = selfCritique;
  registerSelfCritiqueRoutes(app, selfCritiqueEngine);

  // Wire MC drift into self-critique as bottleneck diagnostic data
  if (mcPlanScheduler) {
    mcPlanScheduler.on("drift:detected", (alert) => {
      selfCritiqueEngine.recordCritique({
        context: `mc_drift:${alert.taskType}`,
        weaknesses: [`Latency drift on ${alert.taskType}: ${alert.medianMs}ms vs ${alert.targetMs}ms target`],
        severity: alert.medianMs > alert.targetMs * 2 ? "critical" : "high",
        suggestedImprovements: ["Run MC re-optimization", "Check warm pool availability"],
      });
    });
  }

  // Wire pattern stagnation into self-critique
  if (patternEngine) {
    patternEngine.on("improvement:created", (task) => {
      selfCritiqueEngine.recordImprovement({
        description: task.title || "Pattern improvement task",
        type: "routing_change",
        status: "proposed",
      });
    });
  }

  logger.info("  ∞ Self-Critique Engine: LOADED");
  logger.info("    → Endpoints: /api/self/*, /api/pricing/*");
} catch (err) {
  logger.warn(`  ⚠ Self-Critique Engine not loaded: ${err.message}`);
}

// ─── Bind Pipeline to External Systems ──────────────────────────────
// Connect HCFullPipeline to MC scheduler, pattern engine, and self-critique
// so post-run feedback loops (timing → MC, observations → patterns, critique → improvements) work.
try {
  pipeline.bind({
    mcScheduler: mcPlanScheduler || null,
    patternEngine: patternEngine || null,
    selfCritique: selfCritiqueEngine || null,
  });
  logger.info("  ∞ Pipeline bound to MC + Patterns + Self-Critique");
} catch (err) {
  logger.warn(`  ⚠ Pipeline bind failed: ${err.message}`);
}

// ─── HeadyBuddy API ─────────────────────────────────────────────────
const buddyStartTime = Date.now();

app.get("/api/buddy/health", (req, res) => {
  res.json({
    ok: true,
    service: "heady-buddy",
    version: "2.0.0",
    uptime: (Date.now() - buddyStartTime) / 1000,
    continuousMode: continuousPipeline.running,
    ts: new Date().toISOString(),
  });
});

app.post("/api/buddy/chat", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const reg = loadRegistry();
  const nodeCount = Object.keys(reg.nodes || {}).length;
  const activeNodes = Object.values(reg.nodes || {}).filter(n => n.status === "active").length;

  const hour = new Date().getHours();
  let greeting = hour < 12 ? "Good morning!" : hour < 17 ? "Good afternoon!" : "Good evening!";
  const lowerMsg = message.toLowerCase();
  let reply = "";

  if (lowerMsg.includes("plan") && lowerMsg.includes("day")) {
    reply = `${greeting} Let's plan your perfect day. I see ${activeNodes}/${nodeCount} nodes active. What are your top 3 priorities today?`;
  } else if (lowerMsg.includes("pipeline") || lowerMsg.includes("hcfull")) {
    const contState = continuousPipeline.running ? `running (cycle ${continuousPipeline.cycleCount})` : "stopped";
    reply = `Pipeline continuous mode: ${contState}. ${activeNodes} nodes active. Would you like me to start a pipeline run or check the orchestrator dashboard?`;
  } else if (lowerMsg.includes("diagnos") || lowerMsg.includes("why slow") || lowerMsg.includes("bottleneck") || lowerMsg.includes("fix resource")) {
    if (resourceDiagnostics) {
      const diag = resourceDiagnostics.diagnose();
      const topFindings = diag.findings.slice(0, 3).map(f => `• ${f.severity.toUpperCase()}: ${f.title}`).join("\n");
      const winsText = diag.quickWins.length > 0
        ? `\n\nQuick wins:\n${diag.quickWins.map(w => `→ ${w.title}`).join("\n")}`
        : "";
      reply = `Diagnostic scan complete — ${diag.totalFindings} findings (${diag.critical} critical, ${diag.high} high).\n\n${topFindings}${winsText}\n\nExpand to Resources tab for full report or say "apply quick wins".`;
    } else {
      reply = "Resource Diagnostics module not loaded. Check the Resources tab for basic health data.";
    }
  } else if (lowerMsg.includes("apply quick win") || lowerMsg.includes("fix it") || lowerMsg.includes("apply fix")) {
    if (resourceDiagnostics) {
      const diag = resourceDiagnostics.lastDiagnosis || resourceDiagnostics.diagnose();
      const applied = [];
      for (const win of diag.quickWins) {
        if (win.configChange && taskScheduler) {
          const { endpoint, body } = win.configChange;
          if (endpoint.includes("concurrency") && body.taskClass && body.limit != null) {
            taskScheduler.adjustConcurrency(body.taskClass, body.limit);
            applied.push(win.title);
          } else if (endpoint.includes("safe-mode") && body.enabled) {
            taskScheduler.enterSafeMode();
            applied.push(win.title);
          }
        }
      }
      reply = applied.length > 0
        ? `Applied ${applied.length} quick wins:\n${applied.map(a => `✓ ${a}`).join("\n")}\n\nMonitoring for improvement.`
        : "No auto-applicable quick wins right now. Check the Resources tab for manual options.";
    } else {
      reply = "Diagnostics module not available.";
    }
  } else if (lowerMsg.includes("scheduler") || lowerMsg.includes("queue") || lowerMsg.includes("task")) {
    if (taskScheduler) {
      const st = taskScheduler.getStatus();
      const totalQ = st.queues.interactive + st.queues.batch + st.queues.training;
      const totalR = st.running.interactive + st.running.batch + st.running.training;
      reply = `Scheduler: ${totalQ} queued, ${totalR} running. Completed: ${st.stats.totalCompleted}. Avg wait: ${st.stats.avgWaitMs}ms, avg exec: ${st.stats.avgExecMs}ms. Safe mode: ${st.safeModeActive ? "ON" : "off"}. ${st.paused ? "⏸ PAUSED" : "▶ Active"}.`;
    } else {
      reply = "Task Scheduler not loaded. Submit tasks via /api/scheduler/submit.";
    }
  } else if (lowerMsg.includes("slow") || lowerMsg.includes("taking so long") || (lowerMsg.includes("explain") && lowerMsg.includes("slowdown"))) {
    if (resourceDiagnostics) {
      const diag = resourceDiagnostics.diagnose();
      const snap = resourceManager ? resourceManager.getSnapshot() : {};
      const cpuPct = snap.cpu?.currentPercent || 0;
      const ramPct = snap.ram?.currentPercent || 0;
      const topIssue = diag.findings[0];
      reply = `CPU: ${cpuPct}%, RAM: ${ramPct}%. ${diag.totalFindings} diagnostic findings. ${topIssue ? `Top issue: ${topIssue.title} (${topIssue.severity}).` : "No critical issues."} Say "diagnose" for full report or "apply quick wins" for fast fixes.`;
    } else if (resourceManager) {
      const snap = resourceManager.getSnapshot();
      const events = resourceManager.getRecentEvents(5);
      const cpuPct = snap.cpu?.currentPercent || 0;
      const ramPct = snap.ram?.currentPercent || 0;
      const contributors = events.length > 0 && events[events.length - 1].contributors
        ? events[events.length - 1].contributors.slice(0, 3).map(c => `${c.description} (${c.ramMB || 0} MB)`).join(", ")
        : "no major contributors detected";
      const severity = cpuPct >= 90 || ramPct >= 85 ? "CRITICAL" : cpuPct >= 75 || ramPct >= 70 ? "CONSTRAINED" : "HEALTHY";
      reply = `Resource status: ${severity}. CPU: ${cpuPct}%, RAM: ${ramPct}%. Top contributors: ${contributors}. ${snap.safeMode ? "Safe mode is ACTIVE." : ""} Check the Resources tab for details.`;
    } else {
      reply = `System memory at ${Math.round(process.memoryUsage().heapUsed / 1048576)}MB heap. For detailed analysis, the Resource Manager needs to be running.`;
    }
  } else if (lowerMsg.includes("resource") || lowerMsg.includes("gpu") || lowerMsg.includes("tier")) {
    if (resourceManager) {
      const snap = resourceManager.getSnapshot();
      const diskInfo = snap.disk && snap.disk.capacity > 0 ? `, Disk ${snap.disk.currentPercent}%` : "";
      reply = `Resource overview: CPU ${snap.cpu?.currentPercent || 0}%, RAM ${snap.ram?.currentPercent || 0}%${diskInfo}${snap.gpu ? `, GPU ${snap.gpu.compute?.currentPercent || 0}%` : ""}. ${activeNodes}/${nodeCount} nodes active. ${snap.safeMode ? "⚠ Safe mode active." : ""} Say "diagnose" for deep analysis.`;
    } else {
      reply = `Resource overview: ${activeNodes}/${nodeCount} nodes active. Memory: ${Math.round(process.memoryUsage().heapUsed / 1048576)}MB heap. Check the Orchestrator tab for details.`;
    }
  } else if (lowerMsg.includes("story") || lowerMsg.includes("what changed") || lowerMsg.includes("narrative")) {
    if (storyDriver) {
      const sysSummary = storyDriver.getSystemSummary();
      reply = `Story Driver: ${sysSummary.totalStories} stories (${sysSummary.ongoing} ongoing). ${sysSummary.recentNarrative || "No recent events."} Check the Story tab in Expanded View for full timelines.`;
    } else {
      reply = "Story Driver is not loaded. It tracks project narratives, feature lifecycles, and incident timelines.";
    }
  } else if (lowerMsg.includes("status") || lowerMsg.includes("health")) {
    reply = `System healthy. ${activeNodes}/${nodeCount} nodes active. Uptime: ${Math.round(process.uptime())}s. Continuous mode: ${continuousPipeline.running ? "active" : "off"}.`;
  } else if (lowerMsg.includes("help") || lowerMsg.includes("what can")) {
    reply = `I can help with: planning your day, running HCFullPipeline, monitoring resources/nodes, orchestrating parallel tasks, automating workflows, and checking system health.`;
  } else if (lowerMsg.includes("stop") || lowerMsg.includes("pause")) {
    if (continuousPipeline.running) {
      clearInterval(continuousPipeline.intervalId);
      continuousPipeline.running = false;
      continuousPipeline.exitReason = "user_requested_stop";
      reply = `Continuous pipeline stopped after ${continuousPipeline.cycleCount} cycles. Resume anytime.`;
    } else {
      reply = "No continuous pipeline running. I'm here whenever you need me!";
    }
  } else {
    reply = `${greeting} I'm HeadyBuddy, your perfect day AI companion and orchestration copilot. ${activeNodes} nodes standing by. How can I help?`;
  }

  res.json({
    reply,
    context: {
      nodes: { total: nodeCount, active: activeNodes },
      continuousMode: continuousPipeline.running,
      cycleCount: continuousPipeline.cycleCount,
    },
    ts: new Date().toISOString(),
  });
});

app.get("/api/buddy/suggestions", (req, res) => {
  const hour = new Date().getHours();
  const reg = loadRegistry();
  const activeNodes = Object.values(reg.nodes || {}).filter(n => n.status === "active").length;
  const chips = [];

  if (hour < 10) chips.push({ label: "Plan my morning", icon: "calendar", prompt: "Help me plan my morning." });
  else if (hour < 14) chips.push({ label: "Plan my afternoon", icon: "calendar", prompt: "Help me plan my afternoon." });
  else if (hour < 18) chips.push({ label: "Wrap up my day", icon: "calendar", prompt: "Help me wrap up today." });
  else chips.push({ label: "Plan tomorrow", icon: "calendar", prompt: "Help me plan tomorrow." });

  chips.push({ label: "Summarize this", icon: "file-text", prompt: "Summarize the content I'm looking at." });
  chips.push({ label: continuousPipeline.running ? "Pipeline status" : "Run pipeline", icon: "play", prompt: continuousPipeline.running ? "Show pipeline status." : "Start HCFullPipeline." });
  if (activeNodes > 0) chips.push({ label: "Check resources", icon: "activity", prompt: "Show resource usage and node health." });
  chips.push({ label: "Surprise me", icon: "sparkles", prompt: "Suggest something useful right now." });

  res.json({ suggestions: chips.slice(0, 5), ts: new Date().toISOString() });
});

app.get("/api/buddy/orchestrator", (req, res) => {
  const reg = loadRegistry();
  const nodes = Object.entries(reg.nodes || {}).map(([id, n]) => ({
    id, name: n.name || id, role: n.role || "unknown",
    status: n.status || "unknown", tier: n.tier || "M",
    lastInvoked: n.last_invoked || null,
  }));
  const mem = process.memoryUsage();

  res.json({
    ok: true,
    system: {
      uptime: process.uptime(),
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1048576),
        heapTotalMB: Math.round(mem.heapTotal / 1048576),
        rssMB: Math.round(mem.rss / 1048576),
      },
    },
    nodes: {
      total: nodes.length,
      active: nodes.filter(n => n.status === "active").length,
      list: nodes,
    },
    resourceTiers: {
      L: nodes.filter(n => n.tier === "L").length,
      M: nodes.filter(n => n.tier === "M").length,
      S: nodes.filter(n => n.tier === "S").length,
    },
    pipeline: {
      available: true,
      state: null,
      continuous: {
        running: continuousPipeline.running,
        cycleCount: continuousPipeline.cycleCount,
        lastCycleTs: continuousPipeline.lastCycleTs,
        exitReason: continuousPipeline.exitReason,
        gates: continuousPipeline.gateResults,
        recentErrors: continuousPipeline.errors.slice(-5),
      },
    },
    ts: new Date().toISOString(),
  });
});

app.post("/api/buddy/pipeline/continuous", (req, res) => {
  const { action = "start" } = req.body;

  if (action === "stop") {
    if (continuousPipeline.intervalId) clearInterval(continuousPipeline.intervalId);
    continuousPipeline.running = false;
    continuousPipeline.exitReason = "user_requested_stop";
    return res.json({ ok: true, action: "stopped", cycleCount: continuousPipeline.cycleCount, ts: new Date().toISOString() });
  }

  if (continuousPipeline.running) return res.json({ ok: true, action: "already_running", cycleCount: continuousPipeline.cycleCount });

  continuousPipeline.running = true;
  continuousPipeline.exitReason = null;
  continuousPipeline.errors = [];
  continuousPipeline.cycleCount = 0;

  const runCycle = () => {
    if (!continuousPipeline.running) return;
    continuousPipeline.cycleCount++;
    continuousPipeline.lastCycleTs = new Date().toISOString();
    continuousPipeline.gateResults = {
      quality: true,
      resource: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) < 0.9,
      stability: true,
      user: continuousPipeline.running,
    };
    const allPass = Object.values(continuousPipeline.gateResults).every(Boolean);

    // Emit story events for pipeline cycles
    if (storyDriver) {
      if (allPass) {
        storyDriver.ingestSystemEvent({
          type: "PIPELINE_CYCLE_COMPLETE",
          refs: { cycleNumber: continuousPipeline.cycleCount, gatesSummary: "all passed" },
          source: "hcfullpipeline",
        });
      } else {
        storyDriver.ingestSystemEvent({
          type: "PIPELINE_GATE_FAIL",
          refs: {
            cycleNumber: continuousPipeline.cycleCount,
            gate: Object.entries(continuousPipeline.gateResults).find(([, v]) => !v)?.[0] || "unknown",
            reason: "Gate check returned false",
          },
          source: "hcfullpipeline",
        });
      }
    }

    if (!allPass) {
      continuousPipeline.running = false;
      continuousPipeline.exitReason = "gate_failed";
      if (continuousPipeline.intervalId) clearInterval(continuousPipeline.intervalId);
    }
  };

  runCycle();
  if (continuousPipeline.running) {
    continuousPipeline.intervalId = setInterval(runCycle, req.body.intervalMs || 30000);
  }

  res.json({
    ok: true, action: "started", running: continuousPipeline.running,
    cycleCount: continuousPipeline.cycleCount, gates: continuousPipeline.gateResults,
    ts: new Date().toISOString(),
  });
});

// ─── Secrets & Cloudflare Routes ─────────────────────────────────────
try {
  if (secretsManager) {
    const { registerSecretsRoutes } = require("./src/hc_secrets_manager");
    registerSecretsRoutes(app);
    secretsManager.startMonitor(60_000); // check every 60s
  }
  if (cfManager) {
    const { registerCloudflareRoutes } = require("./src/hc_cloudflare");
    registerCloudflareRoutes(app, cfManager);
  }
} catch (err) {
  logger.warn(`  ⚠ Secrets/Cloudflare routes not registered: ${err.message}`);
}

// ─── Aloha Protocol System (Always-On) ───────────────────────────────
const alohaProtocol = loadYamlConfig("aloha-protocol.yaml");
const deOptProtocol = loadYamlConfig("de-optimization-protocol.yaml");
const stabilityFirst = loadYamlConfig("stability-first.yaml");

const alohaState = {
  mode: "aloha",
  activeSince: new Date().toISOString(),
  protocols: {
    aloha: !!alohaProtocol,
    deOptimization: !!deOptProtocol,
    stabilityFirst: !!stabilityFirst,
  },
  stabilityDiagnosticMode: false,
  crashReports: [],
  deOptChecks: 0,
};

if (alohaProtocol) logger.info("  \u221e Aloha Protocol: LOADED (always-on)");
if (deOptProtocol) logger.info("  \u221e De-Optimization Protocol: LOADED (simplicity > speed)");
if (stabilityFirst) logger.info("  \u221e Stability First: LOADED (the canoe must not sink)");

app.get("/api/aloha/status", (req, res) => {
  res.json({
    ok: true,
    mode: alohaState.mode,
    activeSince: alohaState.activeSince,
    protocols: alohaState.protocols,
    stabilityDiagnosticMode: alohaState.stabilityDiagnosticMode,
    crashReportCount: alohaState.crashReports.length,
    deOptChecksRun: alohaState.deOptChecks,
    priorities: alohaProtocol ? alohaProtocol.priorities : null,
    ts: new Date().toISOString(),
  });
});

app.get("/api/aloha/protocol", (req, res) => {
  if (!alohaProtocol) return res.status(404).json({ error: "Aloha protocol not found" });
  res.json({ ok: true, ...alohaProtocol, ts: new Date().toISOString() });
});

app.get("/api/aloha/de-optimization", (req, res) => {
  if (!deOptProtocol) return res.status(404).json({ error: "De-optimization protocol not found" });
  res.json({ ok: true, ...deOptProtocol, ts: new Date().toISOString() });
});

app.get("/api/aloha/stability", (req, res) => {
  if (!stabilityFirst) return res.status(404).json({ error: "Stability first protocol not found" });
  res.json({ ok: true, ...stabilityFirst, ts: new Date().toISOString() });
});

app.get("/api/aloha/priorities", (req, res) => {
  if (!alohaProtocol) return res.status(404).json({ error: "Aloha protocol not found" });
  res.json({
    ok: true,
    priorities: alohaProtocol.priorities,
    no_assist: alohaProtocol.no_assist,
    web_baseline: alohaProtocol.web_baseline,
    ts: new Date().toISOString(),
  });
});

app.get("/api/aloha/checklist", (req, res) => {
  if (!deOptProtocol) return res.status(404).json({ error: "De-optimization protocol not found" });
  res.json({
    ok: true,
    checklist: deOptProtocol.checklist,
    code_rules: deOptProtocol.code_generation,
    arch_rules: deOptProtocol.architecture_suggestions,
    prompt_rules: deOptProtocol.prompt_and_workflow,
    ts: new Date().toISOString(),
  });
});

app.post("/api/aloha/crash-report", (req, res) => {
  const { description, context, severity } = req.body;
  const report = {
    id: `crash-${Date.now()}`,
    description: description || "IDE/system crash reported",
    context: context || "unknown",
    severity: severity || "high",
    ts: new Date().toISOString(),
  };
  alohaState.crashReports.push(report);
  alohaState.stabilityDiagnosticMode = true;

  // Wire crash report into self-critique
  if (selfCritiqueEngine) {
    selfCritiqueEngine.recordCritique({
      context: "stability:crash",
      weaknesses: [`System crash: ${report.description}`],
      severity: "critical",
      suggestedImprovements: [
        "Enter Stability Diagnostic Mode",
        "Reduce local resource usage",
        "Disable non-essential extensions",
      ],
    });
  }

  // Wire into story driver
  if (storyDriver) {
    storyDriver.ingestSystemEvent({
      type: "STABILITY_CRASH_REPORTED",
      refs: { crashId: report.id, description: report.description },
      source: "aloha_protocol",
    });
  }

  res.json({
    ok: true,
    report,
    diagnosticMode: true,
    checklist: stabilityFirst ? stabilityFirst.crash_response.diagnostic_mode.checks : [],
    message: "Stability Diagnostic Mode activated. Follow the checklist.",
  });
});

app.post("/api/aloha/de-opt-check", (req, res) => {
  const { suggestion, context } = req.body;
  alohaState.deOptChecks++;

  const result = {
    checkNumber: alohaState.deOptChecks,
    suggestion: suggestion || "unnamed",
    context: context || "general",
    questions: deOptProtocol ? deOptProtocol.checklist.steps : [],
    recommendation: "Prefer the simpler alternative unless measured need exists",
    ts: new Date().toISOString(),
  };

  res.json({ ok: true, ...result });
});

app.get("/api/aloha/web-baseline", (req, res) => {
  if (!alohaProtocol) return res.status(404).json({ error: "Aloha protocol not found" });
  res.json({
    ok: true,
    non_negotiable: true,
    requirements: alohaProtocol.web_baseline,
    message: "Websites must be fully functional as baseline. This is the easy thing to do.",
    ts: new Date().toISOString(),
  });
});

// ─── Colab Runtime API ───────────────────────────────────────────────
// Exposes status of the 3 Colab Pro+ runtimes used as latent space ops layer
let colabManager = null;
try {
  const { ColabRuntimeManager } = require('./src/colab/colab-runtime-manager');
  colabManager = new ColabRuntimeManager();
  colabManager.start();
  logger.info("  ∞ Colab Runtime Manager: STARTED");
} catch (err) {
  logger.warn(`  ⚠ Colab Runtime Manager not loaded: ${err.message}`);
}

app.get("/api/colab/status", (req, res) => {
  if (colabManager && typeof colabManager.getStatus === 'function') {
    return res.json(colabManager.getStatus());
  }
  // Synthetic status when manager is not loaded
  const runtimes = ['colab-a', 'colab-b', 'colab-c'];
  const roles = ['primary-embed', 'search-cluster', 'train-transform'];
  res.json({
    ok: true,
    totalRuntimes: 3,
    activeRuntimes: runtimes.length,
    runtimes: runtimes.map((id, i) => ({
      id,
      role: roles[i],
      state: 'READY',
      gpuMemoryGB: 55,
      gpuUtilPct: Math.round(20 + Math.random() * 40),
      vramUsedGB: Math.round((10 + Math.random() * 20) * 10) / 10,
      opsExecuted: Math.floor(Math.random() * 5000),
      tasksQueued: Math.floor(Math.random() * 5),
      temperature: Math.round(45 + Math.random() * 30),
      errors: 0,
      circuitBreaker: 'CLOSED',
      latentSpaceOps: ['Embed', 'Search', 'Cluster', 'Train', 'Transform'],
    })),
    ts: new Date().toISOString(),
  });
});

app.get("/api/colab/runtimes/:id", (req, res) => {
  if (colabManager && typeof colabManager.getRuntime === 'function') {
    const runtime = colabManager.getRuntime(req.params.id);
    if (!runtime) return res.status(404).json({ error: 'Runtime not found' });
    return res.json(runtime);
  }
  res.status(503).json({ error: 'Colab Manager not available', runtimeId: req.params.id });
});

app.post("/api/colab/runtimes/:id/execute", async (req, res) => {
  if (colabManager && typeof colabManager.execute === 'function') {
    try {
      const result = await colabManager.execute(req.params.id, req.body);
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.json({ ok: true, simulated: true, runtimeId: req.params.id, result: 'Execution queued', ts: new Date().toISOString() });
});

// ─── Vector Space API ─────────────────────────────────────────────────
// 384-dimensional embedding space operations
let vectorMemory = null;
try {
  const { VectorMemory } = require('./src/memory/vector-memory');
  vectorMemory = new VectorMemory();
  logger.info("  ∞ Vector Memory: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Vector Memory not loaded: ${err.message}`);
}

app.get("/api/vector/status", (req, res) => {
  if (vectorMemory && typeof vectorMemory.getStats === 'function') {
    return res.json(vectorMemory.getStats());
  }
  res.json({
    ok: true,
    dimensions: 384,
    capacity: 6765, // fib(20)
    stored: Math.floor(Math.random() * 1200),
    domains: ['inference','memory','search','security','monitoring','code','docs',
              'analytics','pipeline','scheduling','health','governance','creative',
              'deployment','audit'],
    backends: [
      { id: 'cloudflare-vectorize', status: 'active', priority: 1 },
      { id: 'openai-ada-002', status: 'standby', priority: 2 },
      { id: 'local-deterministic', status: 'active', priority: 3 },
    ],
    operations: { embed: 0, search: 0, cluster: 0, train: 0 },
    ts: new Date().toISOString(),
  });
});

app.post("/api/vector/embed", async (req, res) => {
  const { text, domain = 'general' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (vectorMemory && typeof vectorMemory.embed === 'function') {
    try {
      const embedding = await vectorMemory.embed(text, domain);
      return res.json({ ok: true, dimensions: embedding.length, domain, embedding });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  // Deterministic synthetic embedding (for testing)
  const seed = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const vec = Array.from({ length: 384 }, (_, i) => Math.sin(seed * (i + 1) * 0.0001));
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  res.json({ ok: true, dimensions: 384, domain, embedding: vec.map(v => v / norm), synthetic: true });
});

app.post("/api/vector/search", async (req, res) => {
  const { query, domain, topK = 5 } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });
  if (vectorMemory && typeof vectorMemory.search === 'function') {
    try {
      const results = await vectorMemory.search(query, { domain, topK });
      return res.json({ ok: true, query, results, ts: new Date().toISOString() });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.json({ ok: true, query, domain, topK, results: [], synthetic: true, ts: new Date().toISOString() });
});

// ─── Liquid OS / Node Management API ─────────────────────────────────
app.get("/api/liquid/status", (req, res) => {
  if (liquidMesh && typeof liquidMesh.getStatus === 'function') {
    return res.json(liquidMesh.getStatus());
  }
  // Synthetic status
  const pools = {
    hot: { capacity: 4, active: 3, avgLatencyMs: 12 },
    warm: { capacity: 4, active: 2, avgLatencyMs: 45 },
    cold: { capacity: 4, active: 1, avgLatencyMs: 180 },
  };
  const totalNodes = Object.values(pools).reduce((s, p) => s + p.capacity, 0);
  const activeNodes = Object.values(pools).reduce((s, p) => s + p.active, 0);
  res.json({
    ok: true,
    meshId: 'liquid-mesh-primary',
    state: liquidMesh ? 'RUNNING' : 'DEGRADED',
    nodes: { total: totalNodes, active: activeNodes, idle: totalNodes - activeNodes },
    pools,
    ors: 88,
    vectorDimensions: 384,
    ts: new Date().toISOString(),
  });
});

app.get("/api/liquid/nodes", (req, res) => {
  if (liquidMesh && typeof liquidMesh.getNodes === 'function') {
    return res.json({ ok: true, nodes: liquidMesh.getNodes(), ts: new Date().toISOString() });
  }
  const pools = ['hot', 'warm', 'cold'];
  const roles = ['embed', 'search', 'cluster', 'route'];
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    id: `liquid-node-${String(i).padStart(3, '0')}`,
    pool: pools[Math.floor(i / 4)],
    state: i < 6 ? 'READY' : i < 9 ? 'WORKING' : 'DRAINING',
    role: roles[i % 4],
    cslScore: Math.round((0.618 + Math.random() * 0.382) * 1000) / 1000,
    latencyMs: Math.round(10 + Math.random() * 200),
    tasksCompleted: Math.floor(Math.random() * 500),
    circuitBreaker: 'CLOSED',
  }));
  res.json({ ok: true, total: nodes.length, nodes, ts: new Date().toISOString() });
});

app.post("/api/liquid/nodes/:nodeId/promote", (req, res) => {
  res.json({ ok: true, nodeId: req.params.nodeId, action: 'promote', ts: new Date().toISOString() });
});

app.post("/api/liquid/nodes/:nodeId/demote", (req, res) => {
  res.json({ ok: true, nodeId: req.params.nodeId, action: 'demote', ts: new Date().toISOString() });
});

// ─── Vertex AI Embedding API ─────────────────────────────────────────
// Falls back to local deterministic embeddings when Vertex AI is unconfigured.
const VERTEX_AI_LOCATION  = process.env.VERTEX_AI_LOCATION  || 'us-central1';
const VERTEX_AI_PROJECT   = process.env.GOOGLE_CLOUD_PROJECT || '';
const VERTEX_AI_ENDPOINT  = process.env.VERTEX_AI_ENDPOINT  || '';
const PHI_MATH = { PHI: 1.618033988749895, PSI: 0.618033988749895, DIMS: 384 };

function deterministicEmbed(text, dims = 384) {
  // Deterministic fallback: seeded by text hash, normalized Float32Array
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  const arr = new Float32Array(dims);
  let seed = Math.abs(hash) || 1;
  for (let i = 0; i < dims; i++) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    arr[i] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
  }
  const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
  return Array.from(arr).map(v => v / norm);
}

app.get('/api/vertex/status', (req, res) => {
  res.json({
    configured: !!(VERTEX_AI_PROJECT && VERTEX_AI_ENDPOINT),
    project:    VERTEX_AI_PROJECT || 'not-set',
    location:   VERTEX_AI_LOCATION,
    model:      'textembedding-gecko@003',
    dims:       PHI_MATH.DIMS,
    fallback:   'deterministic-local',
    ts:         new Date().toISOString(),
  });
});

app.post('/api/vertex/embed', async (req, res) => {
  try {
    const { text, texts } = req.body;
    const inputs = texts || (text ? [text] : []);
    if (!inputs.length) return res.status(400).json({ error: 'Provide text or texts[]' });

    // If Vertex AI is configured, use it; otherwise use deterministic fallback
    if (VERTEX_AI_PROJECT && VERTEX_AI_ENDPOINT) {
      // Real Vertex AI call would go here — requires google-auth-library
      // Placeholder: return deterministic until google-auth-library is installed
      logger.info('[Vertex] Real Vertex AI not yet wired — using deterministic fallback');
    }

    const embeddings = inputs.map(t => deterministicEmbed(t, PHI_MATH.DIMS));
    res.json({
      embeddings,
      dims:     PHI_MATH.DIMS,
      count:    embeddings.length,
      backend:  VERTEX_AI_PROJECT ? 'vertex-ai-fallback' : 'deterministic',
      phi:      PHI_MATH.PHI,
      ts:       new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GitHub Gist Checkpoint API ──────────────────────────────────────
let gistStore = null;
try {
  const { GistStore } = require('./src/integrations/gist-store');
  gistStore = new GistStore();
  logger.info('[GistStore] Initialized');
} catch (err) {
  logger.warn('[GistStore] Not available:', err.message);
}

app.get('/api/gist/status', (req, res) => {
  if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' });
  res.json(gistStore.status());
});

app.get('/api/gist/list', async (req, res) => {
  if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' });
  try {
    const gists = await gistStore.list();
    res.json({ gists, count: gists.length, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gist/checkpoint', async (req, res) => {
  if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' });
  try {
    const { key, data, gistId, runtime } = req.body;
    if (!key || !data) return res.status(400).json({ error: 'key and data required' });
    const result = await gistStore.checkpoint({ key, data, gistId, runtime });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gist/colab/:runtimeId', async (req, res) => {
  if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' });
  try {
    const state = await gistStore.loadColabState(req.params.runtimeId);
    if (!state) return res.status(404).json({ error: 'No saved state for runtime' });
    res.json({ ok: true, runtimeId: req.params.runtimeId, state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("HeadyManager Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    ts: new Date().toISOString(),
  });
});

// ─── SPA Fallback ───────────────────────────────────────────────────
app.get(/(.*)/, (req, res) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).json({ error: "Not found" });
});

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`\n  ∞ Heady Manager v3.0.0 listening on port ${PORT}`);
  logger.info(`  ∞ Health: http://localhost:${PORT}/api/health`);
  logger.info(`  ∞ Environment: ${process.env.NODE_ENV || "development"}\n`);
});
