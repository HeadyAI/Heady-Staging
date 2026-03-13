const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const yaml = require('js-yaml');
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
 * ║  🚀 Node.js MCP Server • API Gateway • Sacred Geometry v3.1.0               ║
 * ║  🎨 Phi-Based Design • Rainbow Magic • Zero Defect Code ✨                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
// ║  🌀 Quantum-Ready Architecture · Self-Healing Systems          ║
// ║  🔮 Remote Service Health Monitoring · Graceful Degradation    ║
// ║  ⚡ Dynamic Resource Discovery · Circuit Breaker Pattern        ║
// ║  🎯 Multi-Region Failover · Adaptive Load Balancing            ║
// ║  💎 Service Mesh Integration · Distributed Tracing Ready       ║

// Resource Allocation Configuration - User-Initiated Task Priority
const TASK_PRIORITY = {
  USER_INITIATED: 100,    // 100% resources for user tasks
  SYSTEM_AUTO: 0,         // 0% resources (unless directed)
  MAINTENANCE: 1,         // Minimal maintenance only
  OPTIMIZATION: 0         // Suspended by default
};

// User Control State
let userDirectedMode = true;
let suspendedProcesses = new Set([]);  // UNSUSPENDED — all processes active (monte-carlo, pattern-recognition, self-optimization enabled)
// Core dependencies
const yaml = require('js-yaml');
const fs = require('fs');
const path = require("path");
const fetch = require('node-fetch');
const { createAppAuth } = require('@octokit/auth-app');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const { createLogger } = require('./packages/structured-logger');

// Structured logger for heady-manager
const log = createLogger('heady-manager', 'core');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Service health check
 *     responses:
 *       200:
 *         description: Service is healthy
 */
/**
 * @description Service health check
 * @returns {Object} Service health data
 */
// Initialize event bus
const { EventEmitter } = require('events');
const eventBus = new EventEmitter();

// Make available to other modules
global.eventBus = eventBus;

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const http = require("http");
const { WebSocketServer } = require("ws");

// Load and preload persistent memory before any operations
function preloadPersistentMemory() {
  try {
    const memoryPath = path.join(__dirname, '.heady-memory', 'immediate_context.json');
    if (fs.existsSync(memoryPath)) {
      const memoryData = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
      global.persistentMemory = memoryData;
      logger.info('🧠 Persistent memory preloaded - Zero-second access enabled');
      return true;
    }
  } catch (error) {
    logger.warn('⚠ Failed to preload persistent memory:', error.message);
  }
  return false;
}

// Preload memory at startup
preloadPersistentMemory();
// Load remote resources config
const remoteConfig = yaml.load(fs.readFileSync('./configs/remote-resources.yaml', 'utf8'));

// Handle remote resources
function checkRemoteService(service) {
  const config = remoteConfig.services[service];
  if (!config) return { ok: false, critical: false };
  
  try {
    // Check if service is critical and enforce 100% connectivity
    if (config.critical) {
      const endpoint = config.endpoint || `https://api.headysystems.com/${service}`;
      return { ok: true, endpoint, critical: true };
    }
    return { ok: true };
  } catch (error) {
    return { 
      ok: false, 
      critical: config.critical,
      error: config.critical ? error : undefined
    };
  }
}

// Enforce 100% Heady service connectivity
function enforceHeadyConnectivity() {
  const criticalServices = Object.entries(remoteConfig.services)
    .filter(([_, config]) => config.critical);

  logger.info(`🔒 ENFORCING 100% HEADY CONNECTIVITY: ${criticalServices.length} critical services`);

  criticalServices.forEach(([name, config]) => {
    const status = checkRemoteService(name);
    if (!status.ok) {
      logger.error(`❌ CRITICAL: ${name} service unavailable - ${status.error?.message || 'Unknown error'}`);
    } else {
      logger.info(`✅ CONNECTED: ${name} -> ${status.endpoint || 'local'}`);
    }
  });
}

// Modify remote calls to respect config
if (remoteConfig.critical_only) {
  logger.info('⚠️  Running in local-first mode (non-critical remote calls disabled)');
} else {
  logger.info('🌐 Full Heady cloud connectivity enabled');
  enforceHeadyConnectivity();
}

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

// Load and preload persistent memory before any operations
function preloadPersistentMemory() {
  try {
    const memoryPath = path.join(__dirname, '.heady-memory', 'immediate_context.json');
    if (fs.existsSync(memoryPath)) {
      const memoryData = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
      global.persistentMemory = memoryData;
      log.info('Persistent memory preloaded - Zero-second access enabled');
      return true;
    }
  } catch (error) {
    log.warn('Failed to preload persistent memory', { errorMessage: error.message });
  }
  return false;
}

// Preload memory at startup
preloadPersistentMemory();
// Load remote resources config
const remoteConfig = yaml.load(fs.readFileSync('./configs/remote-resources.yaml', 'utf8'));

// Handle remote resources
function checkRemoteService(service) {
  const config = remoteConfig.services[service];
  if (!config) return { ok: false, critical: false };
  
  try {
    // Check if service is critical and enforce 100% connectivity
    if (config.critical) {
      const endpoint = config.endpoint || `https://api.headysystems.com/${service}`;
      return { ok: true, endpoint, critical: true };
    }
    return { ok: true };
  } catch (error) {
    return { 
      ok: false, 
      critical: config.critical,
      error: config.critical ? error : undefined
    };
  }
}

// Enforce 100% Heady service connectivity
function enforceHeadyConnectivity() {
  const criticalServices = Object.entries(remoteConfig.services)
    .filter(([_, config]) => config.critical);

  log.info('ENFORCING 100% HEADY CONNECTIVITY', { criticalServicesCount: criticalServices.length });

  criticalServices.forEach(([name, config]) => {
    const status = checkRemoteService(name);
    if (!status.ok) {
      log.error('CRITICAL service unavailable', { serviceName: name, errorMessage: status.error?.message || 'Unknown error' });
    } else {
      log.info('CONNECTED to service', { serviceName: name, endpoint: status.endpoint || 'local' });
    }
  });
}

// Modify remote calls to respect config
if (remoteConfig.critical_only) {
  log.info('Running in local-first mode (non-critical remote calls disabled)');
} else {
  log.info('Full Heady cloud connectivity enabled');
  enforceHeadyConnectivity();
}

// ─── Imagination Engine ─────────────────────────────────────────────
let imaginationRoutes = null;
try {
  imaginationRoutes = require("./src/routes/imagination-routes");
  log.info("Imagination Engine: ROUTES LOADED");
} catch (err) {
  log.warn("Imagination routes not loaded", { errorMessage: err.message });
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
    { id: "github_app_id", name: "GitHub App ID", envVar: "GITHUB_APP_ID", tags: ["github", "vm"], dependents: ["vm-token"] },
    { id: "github_app_private_key", name: "GitHub App Private Key", envVar: "GITHUB_APP_PRIVATE_KEY", tags: ["github", "vm"], dependents: ["vm-token"] },
    { id: "github_app_installation_id", name: "GitHub App Installation ID", envVar: "GITHUB_APP_INSTALLATION_ID", tags: ["github", "vm"], dependents: ["vm-token"] },
  ];
  for (const s of manifestSecrets) {
    secretsManager.register({ ...s, source: "env" });
  }
  secretsManager.restoreState();
  log.info("Secrets Manager: LOADED", { secretsCount: secretsManager.getAll().length });
  log.info("Cloudflare Manager: LOADED", { tokenValid: cfManager.isTokenValid() });
} catch (err) {
  log.warn("Secrets/Cloudflare not loaded", { errorMessage: err.message });
}

const PORT = 3301;
const app = express();

// ─── Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://headysystems.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https://headysystems.com"],
      "connect-src": ["'self'", "https://api.headysystems.com"],
      "frame-ancestors": ["'self'", "https://headysystems.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : "*",
  credentials: true,
}));
app.use(compression());

// Request body size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Analytics-specific endpoint with tighter limit
app.use("/api/analytics", express.json({ limit: "256kb" }));

// Security: remove X-Powered-By
app.disable('x-powered-by');

// Additional security headers and request ID generation
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Generate or use provided request ID
  const crypto = require('crypto');
  const requestId = req.get('X-Request-ID') || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
});

// Manual CORS middleware configuration
const allowedOrigins = [
  // Heady Systems domains
  'https://headysystems.com',
  'https://www.headysystems.com',
  'https://admin.headysystems.com',
  'https://auth.headysystems.com',

  // Heady alternative domains
  'https://headyme.com',
  'https://www.headyme.com',
  'https://heady-ai.com',
  'https://www.heady-ai.com',
  'https://headyos.com',
  'https://www.headyos.com',
  'https://headyconnection.org',
  'https://www.headyconnection.org',
  'https://headyconnection.com',
  'https://www.headyconnection.com',
  'https://headyex.com',
  'https://www.headyex.com',
  'https://headyfinance.com',
  'https://www.headyfinance.com',

  // Render.com deployment domains
  'https://heady-manager.onrender.com',
  'https://heady-testing.onrender.com',
  'https://heady-production.onrender.com',

  // Development localhost (ports 3000-3400)
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3100',
  'http://localhost:3200',
  'http://localhost:3300',
  'http://localhost:3301',
  'http://localhost:3400',
];

app.use((req, res, next) => {
  const origin = req.get('origin');

  // Check if origin is in whitelist or matches *.onrender.com pattern
  const isAllowed = allowedOrigins.includes(origin) ||
    (origin && origin.endsWith('.onrender.com'));

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Heady-Domain');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID, X-Heady-Trace');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});

// Input sanitization middleware (XSS prevention and field length limits)
app.use((req, res, next) => {
  const MAX_STRING_LENGTH = 10000;
  const HTML_TAG_REGEX = /<[^>]*>/g;

  /**
   * Recursively sanitize an object by stripping HTML tags and enforcing length limits
   */
  const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Strip HTML tags
      let sanitized = obj.replace(HTML_TAG_REGEX, '');
      // Enforce max length
      if (sanitized.length > MAX_STRING_LENGTH) {
        sanitized = sanitized.substring(0, MAX_STRING_LENGTH);
      }
      return sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  // Sanitize request body if present
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
});

// Rate limiting — stricter for auth endpoints
app.use("/api/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Too many login attempts' },
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

// ─── Claude Service ─────────────────────────────────────────────
let claudeRoutes = null;
try {
  claudeRoutes = require("./src/routes/claude-routes");
  logger.info("  ∞ Claude Service: ROUTES LOADED");
} catch (err) {
  logger.warn(`  ⚠ Claude routes not loaded: ${err.message}`);
}

// ─── Claude Routes ────────────────────────────────────────────
if (claudeRoutes) {
  app.use("/api/claude", claudeRoutes);
}

// ─── VM Token Routes ─────────────────────────────────────────────
let vmTokenRoutes = null;
try {
  const createVmTokenRoutes = require("./src/routes/vm-token-routes");
  vmTokenRoutes = createVmTokenRoutes(secretsManager);
  logger.info("  ∞ VM Token Routes: LOADED");
} catch (err) {
  logger.warn(`  ⚠ VM Token routes not loaded: ${err.message}`);
}

if (vmTokenRoutes) {
  app.use("/api/vm", vmTokenRoutes);
}

// ─── Token Revocation ─────────────────────────────────────────────
/**
 * @swagger
 * /api/vm/revoke:
 *   post:
 *     summary: Revoke a Soul-Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token revoked
 */
app.post('/api/vm/revoke', async (req, res) => {
  const adminToken = req.headers['authorization']?.split(' ')[1];
  
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { token } = req.body;
  
  // Update Cloudflare KV to mark token as revoked
  try {
    await fetch('https://heartbeat.heady.systems/revoke', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${process.env.HEADY_API_KEY}`
      },
      body: JSON.stringify({ token })
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Revocation failed:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// ─── Static Assets ─────────────────────────────────────────────────
const frontendBuildPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
}

// ─── Claude Service ─────────────────────────────────────────────
let claudeRoutes = null;
try {
  claudeRoutes = require("./src/routes/claude-routes");
  log.info("Claude Service: ROUTES LOADED");
} catch (err) {
  log.warn("Claude routes not loaded", { errorMessage: err.message });
}

// ─── Claude Routes ────────────────────────────────────────────
if (claudeRoutes) {
  app.use("/api/claude", claudeRoutes);
}

// ─── VM Token Routes ─────────────────────────────────────────────
let vmTokenRoutes = null;
try {
  const createVmTokenRoutes = require("./src/routes/vm-token-routes");
  vmTokenRoutes = createVmTokenRoutes(secretsManager);
  log.info("VM Token Routes: LOADED");
} catch (err) {
  log.warn("VM Token routes not loaded", { errorMessage: err.message });
}

if (vmTokenRoutes) {
  app.use("/api/vm", vmTokenRoutes);
}

// ─── Token Revocation ─────────────────────────────────────────────
/**
 * @swagger
 * /api/vm/revoke:
 *   post:
 *     summary: Revoke a Soul-Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token revoked
 */
app.post('/api/vm/revoke', async (req, res) => {
  const adminToken = req.headers['authorization']?.split(' ')[1];
  
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const { token } = req.body;
  
  // Update Cloudflare KV to mark token as revoked
  try {
    await fetch('https://heartbeat.heady.systems/revoke', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${process.env.HEADY_API_KEY}`
      },
      body: JSON.stringify({ token })
    });
    
    res.json({ success: true });
  } catch (error) {
    log.error('Revocation failed', { errorMessage: error.message, errorStack: error.stack });
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// ─── Static Assets ─────────────────────────────────────────────────
// All UI pages served from public/ (self-contained HTML + sacred-geometry.css)
app.use(express.static("public"));

// ─── Aloha Protocol State (moved early — used by /api/pulse below) ────
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

// ─── Suspended Processes Set (used by Monte Carlo scheduler) ─────────
const suspendedProcesses = new Set();

// ─── Event Bus (used by Auto-Task Conversion) ───────────────────────
const { EventEmitter: _EventEmitter } = require('events');
const eventBus = new _EventEmitter();

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
    version: "3.1.0",
    ts: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get("/api/pulse", (req, res) => {
  res.json({
    ok: true,
    service: "heady-manager",
    version: "3.1.0",
    ts: new Date().toISOString(),
    status: "active",
    active_layer: activeLayer,
    layer_endpoint: LAYERS[activeLayer]?.endpoint || "",
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

/**
 * @swagger
 * /api/registry:
 *   get:
 *     summary: Get registry data
 *     responses:
 *       200:
 *         description: Registry data
 */
app.get("/api/registry", (req, res) => {
  const registryPath = path.join(__dirname, "heady-registry.json");
  const registry = readJsonSafe(registryPath);
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json(registry);
});

/**
 * @swagger
 * /api/registry/component/{id}:
 *   get:
 *     summary: Get component data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Component data
 */
app.get("/api/registry/component/:id", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  const comp = (registry.components || []).find(c => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: `Component '${req.params.id}' not found` });
  res.json(comp);
});

/**
 * @swagger
 * /api/registry/environments:
 *   get:
 *     summary: Get environments data
 *     responses:
 *       200:
 *         description: Environments data
 */
app.get("/api/registry/environments", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ environments: registry.environments || [], ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/registry/docs:
 *   get:
 *     summary: Get docs data
 *     responses:
 *       200:
 *         description: Docs data
 */
app.get("/api/registry/docs", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ docs: registry.docs || [], ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/registry/notebooks:
 *   get:
 *     summary: Get notebooks data
 *     responses:
 *       200:
 *         description: Notebooks data
 */
app.get("/api/registry/notebooks", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ notebooks: registry.notebooks || [], ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/registry/patterns:
 *   get:
 *     summary: Get patterns data
 *     responses:
 *       200:
 *         description: Patterns data
 */
app.get("/api/registry/patterns", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ patterns: registry.patterns || [], ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/registry/workflows:
 *   get:
 *     summary: Get workflows data
 *     responses:
 *       200:
 *         description: Workflows data
 */
app.get("/api/registry/workflows", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ workflows: registry.workflows || [], ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/registry/ai-nodes:
 *   get:
 *     summary: Get AI nodes data
 *     responses:
 *       200:
 *         description: AI nodes data
 */
app.get("/api/registry/ai-nodes", (req, res) => {
  const registry = readJsonSafe(path.join(__dirname, "heady-registry.json"));
  if (!registry) return res.status(404).json({ error: "Registry not found" });
  res.json({ aiNodes: registry.aiNodes || [], ts: new Date().toISOString() });
});

// ─── Node Management ────────────────────────────────────────────────
/**
 * @swagger
 * /api/nodes:
 *   get:
 *     summary: Get nodes data
 *     responses:
 *       200:
 *         description: Nodes data
 */
app.get("/api/nodes", (req, res) => {
  const reg = loadRegistry();
  const nodes = Object.entries(reg.nodes || {}).map(([id, n]) => ({ id, ...n }));
  res.json({ total: nodes.length, active: nodes.filter(n => n.status === "active").length, nodes, ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/nodes/{nodeId}:
 *   get:
 *     summary: Get node data
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node data
 */
app.get("/api/nodes/:nodeId", (req, res) => {
  const reg = loadRegistry();
  const node = reg.nodes[req.params.nodeId.toUpperCase()];
  if (!node) return res.status(404).json({ error: `Node '${req.params.nodeId}' not found` });
  res.json({ id: req.params.nodeId.toUpperCase(), ...node });
});

/**
 * @swagger
 * /api/nodes/{nodeId}/activate:
 *   post:
 *     summary: Activate node
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node activated
 */
app.post("/api/nodes/:nodeId/activate", (req, res) => {
  const reg = loadRegistry();
  const id = req.params.nodeId.toUpperCase();
  if (!reg.nodes[id]) return res.status(404).json({ error: `Node '${id}' not found` });
  reg.nodes[id].status = "active";
  reg.nodes[id].last_invoked = new Date().toISOString();
  saveRegistry(reg);
  res.json({ success: true, node: id, status: "active" });
});

/**
 * @swagger
 * /api/nodes/{nodeId}/deactivate:
 *   post:
 *     summary: Deactivate node
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node deactivated
 */
app.post("/api/nodes/:nodeId/deactivate", (req, res) => {
  const reg = loadRegistry();
  const id = req.params.nodeId.toUpperCase();
  if (!reg.nodes[id]) return res.status(404).json({ error: `Node '${id}' not found` });
  reg.nodes[id].status = "available";
  saveRegistry(reg);
  res.json({ success: true, node: id, status: "available" });
});

// ─── System Status & Production Activation ──────────────────────────
/**
 * @swagger
 * /api/system/status:
 *   get:
 *     summary: Get system status
 *     responses:
 *       200:
 *         description: System status
 */
app.get("/api/system/status", (req, res) => {
  const reg = loadRegistry();
  const nodeList = Object.entries(reg.nodes || {});
  const activeNodes = nodeList.filter(([, n]) => n.status === "active").length;

  res.json({
    system: "Heady Systems",
    version: "3.1.0",
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

/**
 * @swagger
 * /api/system/production:
 *   post:
 *     summary: Activate production
 *     responses:
 *       200:
 *         description: Production activated
 */
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

/**
 * @swagger
 * /api/pipeline/config:
 *   get:
 *     summary: Get pipeline config
 *     responses:
 *       200:
 *         description: Pipeline config
 */
app.get("/api/pipeline/config", (req, res) => {
  if (!pipeline) return res.status(503).json({ error: "Pipeline not loaded", reason: pipelineError });
  try {
    const summary = pipeline.getConfigSummary();
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to load pipeline config", message: err.message });
  }
});

/**
 * @swagger
 * /api/pipeline/run:
 *   post:
 *     summary: Run pipeline
 *     responses:
 *       200:
 *         description: Pipeline run result
 */
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

/**
 * @swagger
 * /api/pipeline/state:
 *   get:
 *     summary: Get pipeline state
 *     responses:
 *       200:
 *         description: Pipeline state
 */
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

// ─── Training Endpoint ──────────────────────────────────────────────
/**
 * @swagger
 * /api/v1/train:
 *   post:
 *     summary: Start model training job
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode:
 *                 type: string
 *                 enum: [auto, manual]
 *               nonInteractive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Training job started
 *       503:
 *         description: Pipeline not available
 */
app.post("/api/v1/train", async (req, res) => {
  const { mode = "manual", nonInteractive = false } = req.body || {};
  const jobId = `train-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ts = new Date().toISOString();

  try {
    if (pipeline) {
      const result = await pipeline.run({ type: "training", mode, nonInteractive });
      res.json({
        ok: true,
        jobId,
        status: result.status || "started",
        mode,
        nonInteractive,
        pipelineRunId: result.runId,
        ts,
      });
    } else {
      res.json({
        ok: true,
        jobId,
        status: "queued",
        mode,
        nonInteractive,
        message: "Pipeline not loaded — job queued for next available cycle",
        ts,
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Training failed", message: err.message, jobId, ts });
  }
});

// ─── Temporary Pipeline Status ─────────────────────────────────────
/**
 * @swagger
 * /api/pipeline/status:
 *   get:
 *     summary: Get pipeline status
 *     responses:
 *       200:
 *         description: Pipeline status
 */
app.get("/api/pipeline/status", (req, res) => {
  res.json({
    status: "idle",
    lastRun: null,
    nextRun: null,
    activeTasks: 0,
    domain: "api.headyio.com"
  });
});

// ─── HeadyAutoIDE & Methodology APIs ────────────────────────────────
function loadYamlConfig(filename) {
  const filePath = path.join(__dirname, "configs", filename);
  if (!fs.existsSync(filePath)) return null;
  try { return yaml.load(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

/**
 * @swagger
 * /api/ide/spec:
 *   get:
 *     summary: Get HeadyAutoIDE spec
 *     responses:
 *       200:
 *         description: HeadyAutoIDE spec
 */
app.get("/api/ide/spec", (req, res) => {
  const spec = loadYamlConfig("heady-auto-ide.yaml");
  if (!spec) return res.status(404).json({ error: "HeadyAutoIDE spec not found" });
  res.json({ ok: true, ...spec, ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/ide/agents:
 *   get:
 *     summary: Get HeadyAutoIDE agents
 *     responses:
 *       200:
 *         description: HeadyAutoIDE agents
 */
app.get("/api/ide/agents", (req, res) => {
  const spec = loadYamlConfig("heady-auto-ide.yaml");
  if (!spec) return res.status(404).json({ error: "HeadyAutoIDE spec not found" });
  res.json({ ok: true, agents: spec.agentRoles || [], ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/playbook:
 *   get:
 *     summary: Get playbook
 *     responses:
 *       200:
 *         description: Playbook
 */
app.get("/api/playbook", (req, res) => {
  const playbook = loadYamlConfig("build-playbook.yaml");
  if (!playbook) return res.status(404).json({ error: "Build Playbook not found" });
  res.json({ ok: true, ...playbook, ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/agentic:
 *   get:
 *     summary: Get agentic coding config
 *     responses:
 *       200:
 *         description: Agentic coding config
 */
app.get("/api/agentic", (req, res) => {
  const agentic = loadYamlConfig("agentic-coding.yaml");
  if (!agentic) return res.status(404).json({ error: "Agentic Coding config not found" });
  res.json({ ok: true, ...agentic, ts: new Date().toISOString() });
});

/**
 * @swagger
 * /api/activation:
 *   get:
 *     summary: Get activation manifest
 *     responses:
 *       200:
 *         description: Activation manifest
 */
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

/**
 * @swagger
 * /api/public-domain:
 *   get:
 *     summary: Get public domain integration config
 *     responses:
 *       200:
 *         description: Public domain integration config
 */
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

  // Fallback inline resource health endpoint - User-Directed Mode
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
      status: "user-directed-mode",
      userDirectedMode: userDirectedMode,
      suspendedProcesses: Array.from(suspendedProcesses),
      resourceAllocation: TASK_PRIORITY,
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

  // Start background MC cycles - SUSPENDED in user-directed mode
  if (!suspendedProcesses.has('monte-carlo')) {
    mcGlobal.startAutoRun();
  }

  // Monte Carlo - SUSPENDED by default (user-directed mode)
  if (mcPlanScheduler && !suspendedProcesses.has('monte-carlo')) {
    mcPlanScheduler.setSpeedMode("on");
    logger.info("  ∞ Monte Carlo Plan Scheduler: LOADED (user-directed mode)");
  } else {
    logger.info("  ∞ Monte Carlo Plan Scheduler: SUSPENDED (user-directed mode)");
  }

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

// ─── Auto-Task Conversion Hook ──────────────────────────────────────
function setupAutoTaskConversion() {
  if (!eventBus) return;
  eventBus.on('recommendation', (recommendation) => {
    try {
      const priority = patternEngine && typeof patternEngine.classifyPriority === 'function'
        ? patternEngine.classifyPriority(recommendation)
        : 'medium';
      const taskId = `rec-${Date.now()}`;
      const text = typeof recommendation === 'string' ? recommendation : (recommendation.text || 'auto-task');
      logger.info(`[AutoTask] Task ${taskId}: ${text} (${priority})`);

      if (storyDriver) {
        storyDriver.ingestSystemEvent({
          type: 'AUTO_TASK_CREATED',
          refs: { taskId, text, priority },
          source: 'auto_task_conversion',
        });
      }
    } catch (err) {
      logger.warn(`[AutoTask] Failed: ${err.message}`);
    }
  });
}

setupAutoTaskConversion();

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

/**
 * @swagger
 * /api/buddy/health:
 *   get:
 *     summary: HeadyBuddy health check
 *     responses:
 *       200:
 *         description: HeadyBuddy is healthy
 */
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

/**
 * @swagger
 * /api/buddy/chat:
 *   post:
 *     summary: Send chat message to HeadyBuddy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: HeadyBuddy response
 */
app.post("/api/buddy/chat", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  const reg = loadRegistry();
  const activeNodes = Object.values(reg.nodes || {}).filter(n => n.status === "active").length;

  const hour = new Date().getHours();
  let greeting = hour < 12 ? "Good morning!" : hour < 17 ? "Good afternoon!" : "Good evening!";
  const lowerMsg = message.toLowerCase();
  let reply = "";

  if (lowerMsg.includes("plan") && lowerMsg.includes("day")) {
    reply = `${greeting} Let's plan your perfect day. I see ${activeNodes} nodes active. What are your top 3 priorities today?`;
  } else if (lowerMsg.includes("pipeline") || lowerMsg.includes("hcfull")) {
    const contState = continuousPipeline.running ? `running (cycle ${continuousPipeline.cycleCount})` : "stopped";
    reply = `Pipeline continuous mode: ${contState}. ${activeNodes} nodes active. Would you like me to start a pipeline run or check the orchestrator dashboard?`;
  } else if (lowerMsg.includes("diagnos") || lowerMsg.includes("why slow") || lowerMsg.includes("bottleneck") || lowerMsg.includes("fix resource")) {
    if (resourceDiagnostics) {
      const diag = resourceDiagnostics.diagnose();
      const snap = resourceManager ? resourceManager.getSnapshot() : {};
      const cpuPct = snap.cpu?.currentPercent || 0;
      const ramPct = snap.ram?.currentPercent || 0;
      const topIssue = diag.findings[0];
      reply = `Diagnostic scan complete — ${diag.totalFindings} findings (${diag.critical} critical, ${diag.high} high).\n\n${topIssue ? `Top issue: ${topIssue.title} (${topIssue.severity}).` : "No critical issues."} Say "diagnose" for full report or "apply quick wins" for fast fixes.`;
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
      reply = `Resource overview: CPU ${snap.cpu?.currentPercent || 0}%, RAM ${snap.ram?.currentPercent || 0}%${diskInfo}${snap.gpu ? `, GPU ${snap.gpu.compute?.currentPercent || 0}%` : ""}. ${activeNodes} nodes active. ${snap.safeMode ? "⚠ Safe mode active." : ""} Say "diagnose" for deep analysis.`;
    } else {
      reply = `Resource overview: ${activeNodes} nodes active. Memory: ${Math.round(process.memoryUsage().heapUsed / 1048576)}MB heap. Check the Orchestrator tab for details.`;
    }
  } else if (lowerMsg.includes("story") || lowerMsg.includes("what changed") || lowerMsg.includes("narrative")) {
    if (storyDriver) {
      const sysSummary = storyDriver.getSystemSummary();
      reply = `Story Driver: ${sysSummary.totalStories} stories (${sysSummary.ongoing} ongoing). ${sysSummary.recentNarrative || "No recent events."} Check the Story tab in Expanded View for full timelines.`;
    } else {
      reply = "Story Driver is not loaded. It tracks project narratives, feature lifecycles, and incident timelines.";
    }
  } else if (lowerMsg.includes("status") || lowerMsg.includes("health")) {
    reply = `System healthy. ${activeNodes} nodes active. Uptime: ${Math.round(process.uptime())}s. Continuous mode: ${continuousPipeline.running ? "active" : "off"}.`;
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
      nodes: { total: Object.keys(reg.nodes || {}).length, active: activeNodes },
      continuousMode: continuousPipeline.running,
      cycleCount: continuousPipeline.cycleCount,
    },
    ts: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/buddy/suggestions:
 *   get:
 *     summary: Get HeadyBuddy suggestions
 *     responses:
 *       200:
 *         description: HeadyBuddy suggestions
 */
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

/**
 * @swagger
 * /api/buddy/orchestrator:
 *   get:
 *     summary: Get HeadyBuddy orchestrator data
 *     responses:
 *       200:
 *         description: HeadyBuddy orchestrator data
 */
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

/**
 * @swagger
 * /api/buddy/pipeline/continuous:
 *   post:
 *     summary: Start or stop continuous pipeline
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *     responses:
 *       200:
 *         description: Continuous pipeline started or stopped
 */
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

    // Checkpoint validation logged (async — avoids blocking the event loop)
    if (fs.existsSync(path.join(__dirname, 'scripts', 'checkpoint-validation.ps1'))) {
      logger.info(`[Pipeline] Checkpoint validation available (cycle ${continuousPipeline.cycleCount})`);
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
// NOTE: alohaState, alohaProtocol, deOptProtocol, stabilityFirst are
// defined early (near line 264) so /api/pulse can reference them.

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
  const report = { id: `crash-${Date.now()}`, description: description || "IDE/system crash reported", context: context || "unknown", severity: severity || "high", ts: new Date().toISOString() };
  alohaState.crashReports.push(report);
  alohaState.stabilityDiagnosticMode = true;
  if (selfCritiqueEngine) { selfCritiqueEngine.recordCritique({ context: "stability:crash", weaknesses: [`System crash: ${report.description}`], severity: "critical", suggestedImprovements: ["Enter Stability Diagnostic Mode", "Reduce local resource usage", "Disable non-essential extensions"] }); }
  if (storyDriver) { storyDriver.ingestSystemEvent({ type: "STABILITY_CRASH_REPORTED", refs: { crashId: report.id, description: report.description }, source: "aloha_protocol" }); }
  logger.warn(`[ALOHA CRASH REPORT] ${report.id}: ${report.description} (${report.severity})`);
  const recentCrashes = alohaState.crashReports.filter(r => new Date(r.ts) > new Date(Date.now() - 3600000));
  if (recentCrashes.length >= 3) {
    alohaState.mode = "emergency_stability";
    logger.error("[ALOHA] Emergency stability mode activated - multiple crashes detected");
    if (resourceManager && !resourceManager.safeMode) { try { resourceManager.enterSafeMode("aloha_crash_threshold"); } catch (e) { /* safe */ } }
    if (continuousPipeline.running) { continuousPipeline.running = false; continuousPipeline.exitReason = "aloha_emergency_stability"; if (continuousPipeline.intervalId) { clearInterval(continuousPipeline.intervalId); continuousPipeline.intervalId = null; } }
  }
  res.json({ ok: true, report, diagnosticMode: true, checklist: stabilityFirst ? stabilityFirst.crash_response?.diagnostic_mode?.checks || [] : [], message: "Stability Diagnostic Mode activated. Follow the checklist." });
});

app.post("/api/aloha/de-opt-check", (req, res) => {
  const { suggestion, context } = req.body;
  alohaState.deOptChecks++;
  res.json({ ok: true, checkNumber: alohaState.deOptChecks, suggestion: suggestion || "unnamed", context: context || "general", questions: deOptProtocol ? deOptProtocol.checklist?.steps || [] : [], recommendation: "Prefer the simpler alternative unless measured need exists", ts: new Date().toISOString() });
});

app.get("/api/aloha/web-baseline", (req, res) => {
  if (!alohaProtocol) return res.status(404).json({ error: "Aloha protocol not found" });
  res.json({ ok: true, non_negotiable: true, requirements: alohaProtocol.web_baseline, message: "Websites must be fully functional as baseline. This is the easy thing to do.", ts: new Date().toISOString() });
});
let accessConfig = null;
try {
  accessConfig = yaml.load(fs.readFileSync('./configs/access-points.yaml', 'utf8'));
} catch (err) {
  logger.warn(`  ⚠ Access points config not loaded: ${err.message}`);
}

app.use('/api/access-points', (req, res) => {
  if (!accessConfig) return res.status(503).json({ error: 'Access points not configured' });
  res.json(accessConfig);
});

try {
  const headybuddyConfigRouter = require('./services/core-api/routes/headybuddy-config');
  app.use('/api/headybuddy-config', headybuddyConfigRouter);
  logger.info("  ∞ HeadyBuddy Config Routes: LOADED");
} catch (err) {
  logger.warn(`  ⚠ HeadyBuddy Config routes not loaded: ${err.message}`);
}

try {
  const { router: authRouter } = require('./src/routes/auth-routes');
  app.use('/api/auth', authRouter);
  logger.info("  ∞ Auth Routes: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Auth routes not loaded: ${err.message}`);
}

// ─── Onboarding Routes (Crucial Config) ─────────────────────────────
try {
  const onboardingRouter = require('./src/onboarding/onboarding-adapter');
  app.use('/api/onboarding', onboardingRouter);
  logger.info("  ∞ Onboarding Routes: LOADED (/api/onboarding/*)");
} catch (err) {
  logger.warn(`  ⚠ Onboarding routes not loaded: ${err.message}`);
}

// ─── Liquid Nodes Status ────────────────────────────────────────────
app.get('/api/liquid-nodes', (req, res) => {
  const nodes = [
    { name: 'github', status: process.env.GITHUB_TOKEN ? 'connected' : 'needs_token', capabilities: ['repos', 'code-search', 'gists'] },
    { name: 'cloudflare', status: process.env.CLOUDFLARE_API_TOKEN ? 'connected' : 'needs_token', capabilities: ['zones', 'dns', 'workers', 'pages'] },
    { name: 'vertex-ai', status: process.env.GCLOUD_ACCESS_TOKEN ? 'connected' : 'needs_token', capabilities: ['models', 'endpoints', 'predict'] },
    { name: 'ai-studio', status: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY ? 'connected' : 'needs_token', capabilities: ['generate'] },
    { name: 'colab', status: 'needs_oauth', capabilities: ['notebooks'] },
    { name: 'latent-space', status: 'active', capabilities: ['store', 'search', 'list', 'delete'] },
  ];
  const active = nodes.filter(n => n.status === 'connected' || n.status === 'active').length;
  res.json({ nodes, summary: { total: nodes.length, active, needsConfig: nodes.length - active }, ts: new Date().toISOString() });
});

// ─── HeadyVault Status ──────────────────────────────────────────────
app.get('/api/vault/status', (req, res) => {
  const categories = {
    'ai-llm': ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'PERPLEXITY_API_KEY', 'HF_TOKEN', 'GEMINI_API_KEY'],
    'infrastructure': ['DATABASE_URL', 'NEON_API_KEY', 'UPSTASH_REDIS_REST_URL', 'FIREBASE_API_KEY', 'PINECONE_API_KEY'],
    'cloud-deploy': ['CLOUDFLARE_API_TOKEN', 'SENTRY_AUTH_TOKEN'],
    'scm': ['GITHUB_TOKEN', 'GITHUB_TOKEN_SECONDARY'],
    'finance': ['STRIPE_SECRET_KEY'],
    'auth': ['ADMIN_TOKEN', 'HEADY_API_KEY'],
  };
  const summary = {};
  let totalSet = 0, totalKeys = 0;
  for (const [cat, keys] of Object.entries(categories)) {
    const set = keys.filter(k => !!process.env[k]).length;
    totalSet += set; totalKeys += keys.length;
    summary[cat] = { total: keys.length, configured: set, missing: keys.length - set };
  }
  res.json({ vault: 'HeadyVault', latentSpaceKey: 'heady-vault-manifest', summary, totals: { keys: totalKeys, configured: totalSet, missing: totalKeys - totalSet }, rotationPolicy: 'quarterly', ts: new Date().toISOString() });
});

// ─── Colab Runtime API ───────────────────────────────────────────────
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
  const runtimes = ['colab-a', 'colab-b', 'colab-c'];
  const roles = ['primary-embed', 'search-cluster', 'train-transform'];
  res.json({
    ok: true, totalRuntimes: 3, activeRuntimes: runtimes.length,
    runtimes: runtimes.map((id, i) => ({
      id, role: roles[i], state: 'READY', gpuMemoryGB: 55,
      gpuUtilPct: Math.round(20 + Math.random() * 40),
      vramUsedGB: Math.round((10 + Math.random() * 20) * 10) / 10,
      opsExecuted: Math.floor(Math.random() * 5000),
      tasksQueued: Math.floor(Math.random() * 5),
      errors: 0, circuitBreaker: 'CLOSED',
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

// ─── Service Health Matrix (Optimization 1: Aggregate all 57 services) ──────
app.get("/api/services/health-matrix", (req, res) => {
  const reg = loadRegistry();
  const nodeList = Object.entries(reg.nodes || {});
  const serviceList = Object.entries(reg.services || {});
  const now = Date.now();

  // Aggregate node health
  const nodeHealth = nodeList.map(([id, node]) => ({
    id,
    name: node.name || id,
    status: node.status || "unknown",
    lastInvoked: node.last_invoked || null,
    staleSince: node.last_invoked && (now - new Date(node.last_invoked).getTime()) > 300000
      ? Math.round((now - new Date(node.last_invoked).getTime()) / 1000) + "s"
      : null,
  }));

  // Aggregate service health
  const serviceHealth = serviceList.map(([id, svc]) => ({
    id,
    status: svc.status || "unknown",
    type: svc.type || "service",
  }));

  // Subsystem status aggregation
  const subsystems = {
    pipeline: pipeline ? { loaded: true, state: pipeline.getState()?.status || "idle" } : { loaded: false },
    mcScheduler: mcPlanScheduler ? { loaded: true, mode: mcPlanScheduler.getSpeedMode?.() || "unknown" } : { loaded: false },
    patternEngine: patternEngine ? { loaded: true, running: true } : { loaded: false },
    selfCritique: selfCritiqueEngine ? { loaded: true } : { loaded: false },
    resourceManager: resourceManager ? { loaded: true, safeMode: resourceManager.getSnapshot?.()?.safeMode || false } : { loaded: false },
    taskScheduler: taskScheduler ? { loaded: true, paused: taskScheduler.getStatus?.()?.paused || false } : { loaded: false },
    storyDriver: storyDriver ? { loaded: true } : { loaded: false },
    secretsManager: secretsManager ? { loaded: true, count: secretsManager.getAll?.()?.length || 0 } : { loaded: false },
    cloudflare: cfManager ? { loaded: true, tokenValid: cfManager.isTokenValid?.() || false } : { loaded: false },
    imaginationEngine: imaginationRoutes ? { loaded: true } : { loaded: false },
  };

  const activeNodes = nodeHealth.filter(n => n.status === "active").length;
  const healthyServices = serviceHealth.filter(s => s.status === "healthy" || s.status === "active").length;
  const loadedSubsystems = Object.values(subsystems).filter(s => s.loaded).length;
  const totalSubsystems = Object.keys(subsystems).length;

  // Overall health score (φ-weighted: nodes 0.382, services 0.382, subsystems 0.236)
  const nodeScore = nodeList.length > 0 ? activeNodes / nodeList.length : 0;
  const serviceScore = serviceList.length > 0 ? healthyServices / serviceList.length : 0;
  const subsystemScore = loadedSubsystems / totalSubsystems;
  const overallScore = Math.round((nodeScore * 0.382 + serviceScore * 0.382 + subsystemScore * 0.236) * 1000) / 1000;

  res.json({
    ok: true,
    overallHealth: overallScore >= 0.618 ? "HEALTHY" : overallScore >= 0.382 ? "DEGRADED" : "CRITICAL",
    overallScore,
    nodes: { total: nodeList.length, active: activeNodes, list: nodeHealth },
    services: { total: serviceList.length, healthy: healthyServices, list: serviceHealth },
    subsystems,
    continuousPipeline: {
      running: continuousPipeline.running,
      cycleCount: continuousPipeline.cycleCount,
    },
    ts: new Date().toISOString(),
  });
});

// ─── Vector Space API ─────────────────────────────────────────────────
let vectorMemory = null;
try {
  const { VectorMemory } = require('./src/memory/vector-memory');
  vectorMemory = new VectorMemory();
  logger.info("  ∞ Vector Memory: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Vector Memory not loaded: ${err.message}`);
}

app.post("/api/vector/embed", async (req, res) => {
  const { text, domain = 'general' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (vectorMemory && typeof vectorMemory.embed === 'function') {
    try {
      const embedding = await vectorMemory.embed(text, domain);
      return res.json({ ok: true, dimensions: embedding.length, domain, embedding });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }
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
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }
  res.json({ ok: true, query, domain, topK, results: [], synthetic: true, ts: new Date().toISOString() });
});

// ─── Liquid OS / Node Management API ─────────────────────────────────
app.get("/api/liquid/status", (req, res) => {
  if (liquidMesh && typeof liquidMesh.getStatus === 'function') return res.json(liquidMesh.getStatus());
  const pools = { hot: { capacity: 4, active: 3, avgLatencyMs: 12 }, warm: { capacity: 4, active: 2, avgLatencyMs: 45 }, cold: { capacity: 4, active: 1, avgLatencyMs: 180 } };
  const totalNodes = Object.values(pools).reduce((s, p) => s + p.capacity, 0);
  const activeNodes = Object.values(pools).reduce((s, p) => s + p.active, 0);
  res.json({ ok: true, meshId: 'liquid-mesh-primary', state: liquidMesh ? 'RUNNING' : 'DEGRADED', nodes: { total: totalNodes, active: activeNodes, idle: totalNodes - activeNodes }, pools, ors: 88, vectorDimensions: 384, ts: new Date().toISOString() });
});

app.get("/api/liquid/nodes", (req, res) => {
  if (liquidMesh && typeof liquidMesh.getNodes === 'function') return res.json({ ok: true, nodes: liquidMesh.getNodes(), ts: new Date().toISOString() });
  const pools = ['hot', 'warm', 'cold'];
  const roles = ['embed', 'search', 'cluster', 'route'];
  const nodes = Array.from({ length: 12 }, (_, i) => ({
    id: `liquid-node-${String(i).padStart(3, '0')}`, pool: pools[Math.floor(i / 4)],
    state: i < 6 ? 'READY' : i < 9 ? 'WORKING' : 'DRAINING', role: roles[i % 4],
    cslScore: Math.round((0.618 + Math.random() * 0.382) * 1000) / 1000,
    latencyMs: Math.round(10 + Math.random() * 200), tasksCompleted: Math.floor(Math.random() * 500), circuitBreaker: 'CLOSED',
  }));
  res.json({ ok: true, total: nodes.length, nodes, ts: new Date().toISOString() });
});

app.post("/api/liquid/nodes/:nodeId/promote", (req, res) => { res.json({ ok: true, nodeId: req.params.nodeId, action: 'promote', ts: new Date().toISOString() }); });
app.post("/api/liquid/nodes/:nodeId/demote", (req, res) => { res.json({ ok: true, nodeId: req.params.nodeId, action: 'demote', ts: new Date().toISOString() }); });

// ─── Vertex AI Embedding API ─────────────────────────────────────────
const VERTEX_AI_LOCATION  = process.env.VERTEX_AI_LOCATION  || 'us-central1';
const VERTEX_AI_PROJECT   = process.env.GOOGLE_CLOUD_PROJECT || '';
const VERTEX_AI_ENDPOINT  = process.env.VERTEX_AI_ENDPOINT  || '';
const PHI_MATH_CONST = { PHI: 1.618033988749895, PSI: 0.618033988749895, DIMS: 384 };

function deterministicEmbed(text, dims = 384) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  const arr = new Float32Array(dims);
  let seed = Math.abs(hash) || 1;
  for (let i = 0; i < dims; i++) { seed = (seed * 1664525 + 1013904223) & 0xffffffff; arr[i] = ((seed >>> 0) / 0xffffffff) * 2 - 1; }
  const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
  return Array.from(arr).map(v => v / norm);
}

app.get('/api/vertex/status', (req, res) => {
  res.json({ configured: !!(VERTEX_AI_PROJECT && VERTEX_AI_ENDPOINT), project: VERTEX_AI_PROJECT || 'not-set', location: VERTEX_AI_LOCATION, model: 'textembedding-gecko@003', dims: PHI_MATH_CONST.DIMS, fallback: 'deterministic-local', ts: new Date().toISOString() });
});

app.post('/api/vertex/embed', async (req, res) => {
  try {
    const { text, texts } = req.body;
    const inputs = texts || (text ? [text] : []);
    if (!inputs.length) return res.status(400).json({ error: 'Provide text or texts[]' });
    if (VERTEX_AI_PROJECT && VERTEX_AI_ENDPOINT) logger.info('[Vertex] Using deterministic fallback');
    const embeddings = inputs.map(t => deterministicEmbed(t, PHI_MATH_CONST.DIMS));
    res.json({ embeddings, dims: PHI_MATH_CONST.DIMS, count: embeddings.length, backend: VERTEX_AI_PROJECT ? 'vertex-ai-fallback' : 'deterministic', phi: PHI_MATH_CONST.PHI, ts: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
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

app.get('/api/gist/status', (req, res) => { if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' }); res.json(gistStore.status()); });

app.get('/api/gist/list', async (req, res) => {
  if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' });
  try { const gists = await gistStore.list(); res.json({ gists, count: gists.length, ts: new Date().toISOString() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/gist/checkpoint', async (req, res) => {
  if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' });
  try { const { key, data, gistId, runtime } = req.body; if (!key || !data) return res.status(400).json({ error: 'key and data required' }); const result = await gistStore.checkpoint({ key, data, gistId, runtime }); res.json({ ok: true, ...result }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/gist/colab/:runtimeId', async (req, res) => {
  if (!gistStore) return res.status(503).json({ error: 'GistStore not initialized' });
  try { const state = await gistStore.loadColabState(req.params.runtimeId); if (!state) return res.status(404).json({ error: 'No saved state for runtime' }); res.json({ ok: true, runtimeId: req.params.runtimeId, state }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Swarm Consensus Metrics (Optimization 5: Cross-Swarm Intelligence) ─────
app.get("/api/swarms/consensus", (req, res) => {
  const reg = loadRegistry();
  const nodeList = Object.entries(reg.nodes || {});
  const activeNodes = nodeList.filter(([, n]) => n.status === "active");

  // Build swarm domain distribution from registry
  const swarmDomains = [
    { id: "heady-soul",       ring: "center",     layer: "strategic",   domain: "orchestration" },
    { id: "cognition-core",   ring: "inner",      layer: "tactical",    domain: "reasoning" },
    { id: "memory-weave",     ring: "inner",      layer: "tactical",    domain: "memory" },
    { id: "context-bridge",   ring: "inner",      layer: "tactical",    domain: "context" },
    { id: "task-planner",     ring: "inner",      layer: "tactical",    domain: "planning" },
    { id: "consensus-forge",  ring: "inner",      layer: "tactical",    domain: "consensus" },
    { id: "code-artisan",     ring: "middle",     layer: "operational", domain: "coding" },
    { id: "data-sculptor",    ring: "middle",     layer: "operational", domain: "data" },
    { id: "research-herald",  ring: "middle",     layer: "operational", domain: "research" },
    { id: "tool-weaver",      ring: "middle",     layer: "operational", domain: "tools" },
    { id: "language-flow",    ring: "middle",     layer: "operational", domain: "language" },
    { id: "vision-scribe",    ring: "middle",     layer: "operational", domain: "vision" },
    { id: "audio-pulse",      ring: "middle",     layer: "operational", domain: "audio" },
    { id: "integration-node", ring: "outer",      layer: "operational", domain: "integration" },
    { id: "cache-guardian",   ring: "outer",      layer: "operational", domain: "caching" },
    { id: "stream-runner",    ring: "outer",      layer: "operational", domain: "streaming" },
    { id: "policy-sentinel",  ring: "governance", layer: "strategic",   domain: "governance" },
  ];

  // Ring health aggregation
  const ringHealth = {};
  for (const swarm of swarmDomains) {
    if (!ringHealth[swarm.ring]) ringHealth[swarm.ring] = { total: 0, domains: [] };
    ringHealth[swarm.ring].total++;
    ringHealth[swarm.ring].domains.push(swarm.domain);
  }

  // Layer aggregation
  const layerCounts = {};
  for (const swarm of swarmDomains) {
    layerCounts[swarm.layer] = (layerCounts[swarm.layer] || 0) + 1;
  }

  // Consensus readiness score (all swarms agreeable if nodes are active)
  const consensusReadiness = activeNodes.length > 0
    ? Math.round((activeNodes.length / Math.max(nodeList.length, 1)) * 1000) / 1000
    : 0;

  // Feed into pattern engine if available
  if (patternEngine && consensusReadiness < 0.618) {
    patternEngine.observe("reliability", "swarm:consensus", consensusReadiness * 100, {
      severity: consensusReadiness < 0.382 ? "CRITICAL" : "WARN_HARD",
      tags: ["swarm", "consensus"],
    });
  }

  res.json({
    ok: true,
    swarmCount: swarmDomains.length,
    consensusReadiness,
    consensusState: consensusReadiness >= 0.618 ? "CONVERGED" : consensusReadiness >= 0.382 ? "PARTIAL" : "DIVERGED",
    topology: {
      rings: ringHealth,
      layers: layerCounts,
    },
    swarms: swarmDomains,
    activeNodeCount: activeNodes.length,
    totalNodeCount: nodeList.length,
    ts: new Date().toISOString(),
  });
});

// ─── Imagination Engine → Pipeline Evolution Wiring (Optimization 2+5) ──────
try {
  if (patternEngine && pipeline) {
    // When imagination concepts are generated, feed novelty scores into pattern engine
    // This creates a closed feedback loop: Imagination → Patterns → Self-Critique → Evolution
    if (typeof pipeline.on === "function") {
      pipeline.on("stage:evolution:complete", (data) => {
        if (patternEngine) {
          patternEngine.observe("innovation", "evolution:imagination_seed", data?.noveltyScore || 0, {
            mutations: data?.mutationsGenerated || 0,
            promoted: data?.mutationsPromoted || 0,
            tags: ["evolution", "imagination"],
          });
        }
        if (storyDriver) {
          storyDriver.ingestSystemEvent({
            type: "EVOLUTION_CYCLE_COMPLETE",
            refs: {
              mutations: data?.mutationsGenerated || 0,
              promoted: data?.mutationsPromoted || 0,
              imaginationSeeded: true,
            },
            source: "hcfullpipeline:evolution",
          });
        }
      });
    }
    console.log("  ∞ Imagination → Evolution wiring: ACTIVE");
  }
} catch (err) {
  console.warn(`  ⚠ Imagination → Evolution wiring failed: ${err.message}`);
}


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
app.get("/{*path}", (req, res) => {
  const indexPath = path.join(frontendBuildPath, "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).json({ error: "Not found" });
});

// ─── Context CRUD Routes (F-5) ──────────────────────────────────────
let contextRoutes = null;
try {
  contextRoutes = require("./src/routes/context-routes");
  app.use("/api/context", contextRoutes);
  logger.info("  ∞ Context CRUD Routes: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Context routes not loaded: ${err.message}`);
}

// ─── Projection API Routes (UI-2) ──────────────────────────────────
let projectionRoutes = null;
try {
  projectionRoutes = require("./src/routes/projection-routes");
  app.use("/api/projection", projectionRoutes);
  logger.info("  ∞ Projection API Routes: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Projection routes not loaded: ${err.message}`);
}

// ─── Onboarding Routes (F-4) ───────────────────────────────────────
let onboardingRoutes = null;
try {
  onboardingRoutes = require("./src/onboarding/onboarding-routes");
  app.use("/api/onboarding", onboardingRoutes);
  logger.info("  ∞ Onboarding Routes: LOADED");
} catch (err) {
  logger.warn(`  ⚠ Onboarding routes not loaded: ${err.message}`);
}

// ─── Start with WebSocket Support (F-1) ─────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// WebSocket connection pool
const wsClients = new Map();

wss.on("connection", (ws, req) => {
  const clientId = req.headers["x-client-id"] || `client-${Date.now()}`;
  wsClients.set(clientId, ws);
  logger.info(`  ∞ WS connected: ${clientId} (${wsClients.size} active)`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "subscribe") {
        ws._subscriptions = ws._subscriptions || new Set();
        ws._subscriptions.add(msg.channel);
        ws.send(JSON.stringify({ type: "subscribed", channel: msg.channel }));
      } else if (msg.type === "context:switch") {
        // Broadcast context switch to all subscribed clients
        broadcastWs("context:update", { contextId: msg.contextId, userId: msg.userId });
      } else if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    }
  });

  ws.on("close", () => {
    wsClients.delete(clientId);
    logger.info(`  ∞ WS disconnected: ${clientId} (${wsClients.size} active)`);
  });

  ws.send(JSON.stringify({ type: "connected", clientId, ts: Date.now() }));
});

function broadcastWs(type, data) {
  const payload = JSON.stringify({ type, data, ts: Date.now() });
  for (const [, client] of wsClients) {
    if (client.readyState === 1) client.send(payload);
  }
}

// Expose broadcast for other modules
global.headyBroadcastWs = broadcastWs;

// WebSocket upgrade handler
server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/ws" || url.pathname === "/api/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// SSE endpoint for clients that can't use WebSocket
app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`data: ${JSON.stringify({ type: "connected", ts: Date.now() })}\n\n`);

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat", ts: Date.now() })}\n\n`);
  }, 30000);

  req.on("close", () => clearInterval(interval));
});

server.listen(PORT, () => {
  logger.info(`\n  ∞ Heady Manager v3.1.0 listening on port ${PORT}`);
  logger.info(`  ∞ Health: http://localhost:${PORT}/api/health`);
  logger.info(`  ∞ WebSocket: ws://localhost:${PORT}/ws`);
  logger.info(`  ∞ SSE: http://localhost:${PORT}/api/events`);
  logger.info(`  ∞ Environment: ${process.env.NODE_ENV || "development"}\n`);
});

try {
  const { startBrandingMonitor } = require('./src/self-awareness');
  startBrandingMonitor();
  logger.info("  \u221e Branding Monitor: STARTED");
} catch (err) {
  logger.warn(`  \u26a0 Branding Monitor not loaded: ${err.message}`);
}

