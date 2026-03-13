// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY DEPLOY — Self-Sovereign Deployment Engine                ║
// ║  FILE: services/heady-deploy.js                                 ║
// ║  LAYER: infrastructure                                          ║
// ║                                                                 ║
// ║  No gcloud CLI. No OAuth browser flow. No third-party auth.     ║
// ║  Heady deploys itself using its own service account key.         ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * HeadyDeploy — Self-deploy to Google Cloud Run using REST APIs directly.
 *
 * Uses a GCP service account key (JSON) to:
 *   1. Mint short-lived OAuth2 access tokens (JWT → token exchange)
 *   2. Trigger Cloud Build (build + push Docker image)
 *   3. Deploy to Cloud Run (create/update service)
 *   4. Health-check the deployed service
 *
 * Zero external dependencies beyond Node.js built-ins + crypto.
 */

const crypto = require("crypto");
const https = require("https");
const fs = require("fs");
const path = require("path");

// ─── Constants ──────────────────────────────────────────────────────
const TOKEN_URL = "https://oauth2.googleapis.com";
const CLOUD_RUN_API = "run.googleapis.com";
const CLOUD_BUILD_API = "cloudbuild.googleapis.com";
const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/run.admin",
];

class HeadyDeploy {
  constructor(opts = {}) {
    this.projectId = opts.projectId || process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT_ID;
    this.region = opts.region || process.env.GCP_REGION || "us-central1";
    this.serviceName = opts.serviceName || "heady-manager";

    // Load service account key
    const keyPath = opts.keyPath
      || process.env.GOOGLE_APPLICATION_CREDENTIALS
      || path.join(process.cwd(), ".heady", "gcp-heady-deployer.json");

    if (fs.existsSync(keyPath)) {
      this.serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
      this.projectId = this.projectId || this.serviceAccount.project_id;
    } else {
      this.serviceAccount = null;
    }

    // Token cache
    this._cachedToken = null;
    this._tokenExpiresAt = 0;

    // Deploy history
    this.history = [];
    this.status = "idle";
  }

  // ─── JWT → Access Token ─────────────────────────────────────────

  /**
   * Create a signed JWT assertion for Google OAuth2.
   * This replaces the entire gcloud auth / OAuth browser flow.
   */
  _createJWT() {
    if (!this.serviceAccount) {
      throw new Error("No service account key loaded. Cannot authenticate.");
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: this.serviceAccount.client_email,
      scope: SCOPES.join(" "),
      aud: `${TOKEN_URL}/token`,
      iat: now,
      exp: now + 3600, // 1 hour
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const unsigned = `${headerB64}.${payloadB64}`;

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(unsigned);
    const signature = sign.sign(this.serviceAccount.private_key, "base64url");

    return `${unsigned}.${signature}`;
  }

  /**
   * Exchange JWT assertion for a Google OAuth2 access token.
   * This is what gcloud auth does behind the scenes.
   */
  async getAccessToken() {
    // Return cached token if still valid (5 min buffer)
    if (this._cachedToken && Date.now() < this._tokenExpiresAt - 300000) {
      return this._cachedToken;
    }

    const jwt = this._createJWT();
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString();

    const response = await this._httpsPost("oauth2.googleapis.com", "/token", body, {
      "Content-Type": "application/x-www-form-urlencoded",
    });

    if (!response.access_token) {
      throw new Error(`Token exchange failed: ${JSON.stringify(response)}`);
    }

    this._cachedToken = response.access_token;
    this._tokenExpiresAt = Date.now() + (response.expires_in || 3600) * 1000;
    return this._cachedToken;
  }

  // ─── Cloud Run Operations ───────────────────────────────────────

  /**
   * List all Cloud Run services in the project.
   */
  async listServices() {
    const token = await this.getAccessToken();
    const apiPath = `/v2/projects/${this.projectId}/locations/${this.region}/services`;
    return this._httpsGet(CLOUD_RUN_API, apiPath, token);
  }

  /**
   * Get a specific Cloud Run service.
   */
  async getService(serviceName) {
    const token = await this.getAccessToken();
    const name = serviceName || this.serviceName;
    const apiPath = `/v2/projects/${this.projectId}/locations/${this.region}/services/${name}`;
    return this._httpsGet(CLOUD_RUN_API, apiPath, token);
  }

  /**
   * Deploy source code to Cloud Run (source-based deploy).
   * This is equivalent to: gcloud run deploy --source .
   * Uses Cloud Build behind the scenes to build the Docker image.
   */
  async deploySource(opts = {}) {
    const serviceName = opts.serviceName || this.serviceName;
    const token = await this.getAccessToken();
    const ts = new Date().toISOString();

    this.status = "deploying";
    const deployRecord = {
      id: `deploy-${Date.now()}`,
      serviceName,
      startedAt: ts,
      status: "in_progress",
      steps: [],
    };
    this.history.push(deployRecord);

    try {
      // Step 1: Check if service exists
      deployRecord.steps.push({ step: "check_service", ts: new Date().toISOString() });
      let existing = null;
      try {
        existing = await this.getService(serviceName);
      } catch (e) {
        // Service doesn't exist yet — that's fine
      }

      // Step 2: Create or update the Cloud Run service
      deployRecord.steps.push({ step: "deploy_service", ts: new Date().toISOString() });

      const serviceConfig = {
        template: {
          containers: [{
            image: opts.image || `${this.region}-docker.pkg.dev/${this.projectId}/heady-docker-repo/${serviceName}:latest`,
            ports: [{ containerPort: parseInt(process.env.PORT || "3300") }],
            env: [
              { name: "NODE_ENV", value: "production" },
              { name: "HEADY_SERVICE_NAME", value: serviceName },
              { name: "HEADY_VERSION", value: "4.0.0" },
              { name: "PORT", value: process.env.PORT || "3300" },
            ],
            resources: {
              limits: {
                cpu: opts.cpu || "2",
                memory: opts.memory || "1Gi",
              },
            },
            startupProbe: {
              httpGet: { path: "/api/brain/health" },
              initialDelaySeconds: 5,
              periodSeconds: 10,
              failureThreshold: 3,
            },
          }],
          scaling: {
            minInstanceCount: opts.minInstances || 0,
            maxInstanceCount: opts.maxInstances || 10,
          },
          executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
        },
      };

      let result;
      if (existing) {
        // Update existing service
        const apiPath = `/v2/projects/${this.projectId}/locations/${this.region}/services/${serviceName}`;
        result = await this._httpsPatch(CLOUD_RUN_API, apiPath, serviceConfig, token);
      } else {
        // Create new service
        const apiPath = `/v2/projects/${this.projectId}/locations/${this.region}/services?serviceId=${serviceName}`;
        result = await this._httpsPost(CLOUD_RUN_API, apiPath, JSON.stringify(serviceConfig), {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        });
      }

      // Step 3: Set IAM policy (allow unauthenticated)
      deployRecord.steps.push({ step: "set_iam_policy", ts: new Date().toISOString() });
      try {
        await this._setPublicAccess(serviceName, token);
      } catch (e) {
        deployRecord.steps.push({ step: "iam_warning", warning: e.message });
      }

      // Step 4: Health check
      deployRecord.steps.push({ step: "health_check", ts: new Date().toISOString() });
      const serviceUrl = result?.uri || result?.status?.uri || null;
      let healthy = false;
      if (serviceUrl) {
        healthy = await this._healthCheck(serviceUrl);
      }

      deployRecord.status = healthy ? "healthy" : "deployed_unchecked";
      deployRecord.completedAt = new Date().toISOString();
      deployRecord.serviceUrl = serviceUrl;
      deployRecord.result = result;

      this.status = "idle";
      return deployRecord;
    } catch (err) {
      deployRecord.status = "failed";
      deployRecord.error = err.message;
      deployRecord.completedAt = new Date().toISOString();
      this.status = "error";
      throw err;
    }
  }

  /**
   * Trigger a Cloud Build to build and push the Docker image.
   */
  async triggerBuild(opts = {}) {
    const token = await this.getAccessToken();
    const serviceName = opts.serviceName || this.serviceName;
    const repoSource = opts.repoSource || {
      projectId: this.projectId,
      repoName: opts.repoName || "heady-testing",
      branchName: opts.branch || "main",
    };

    const buildConfig = {
      source: { repoSource },
      steps: [
        {
          name: "gcr.io/cloud-builders/docker",
          args: [
            "build", "-t",
            `${this.region}-docker.pkg.dev/${this.projectId}/heady-docker-repo/${serviceName}:latest`,
            ".",
          ],
        },
        {
          name: "gcr.io/cloud-builders/docker",
          args: [
            "push",
            `${this.region}-docker.pkg.dev/${this.projectId}/heady-docker-repo/${serviceName}:latest`,
          ],
        },
      ],
      images: [
        `${this.region}-docker.pkg.dev/${this.projectId}/heady-docker-repo/${serviceName}:latest`,
      ],
      timeout: "1200s",
    };

    const apiPath = `/v1/projects/${this.projectId}/builds`;
    return this._httpsPost(CLOUD_BUILD_API, apiPath, JSON.stringify(buildConfig), {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Full pipeline: Build → Push → Deploy → Health Check.
   * This is the one-command self-deploy.
   */
  async fullDeploy(opts = {}) {
    const serviceName = opts.serviceName || this.serviceName;
    const ts = new Date().toISOString();

    this.status = "full_deploy";
    const record = {
      id: `full-deploy-${Date.now()}`,
      serviceName,
      startedAt: ts,
      status: "building",
      phases: [],
    };
    this.history.push(record);

    try {
      // Phase 1: Trigger Cloud Build
      record.phases.push({ phase: "build", startedAt: new Date().toISOString() });
      const buildResult = await this.triggerBuild({ serviceName, ...opts });
      record.phases[0].buildId = buildResult?.metadata?.build?.id || "submitted";
      record.phases[0].completedAt = new Date().toISOString();

      // Phase 2: Deploy to Cloud Run
      record.status = "deploying";
      record.phases.push({ phase: "deploy", startedAt: new Date().toISOString() });
      const deployResult = await this.deploySource({ serviceName, ...opts });
      record.phases[1].completedAt = new Date().toISOString();
      record.phases[1].serviceUrl = deployResult.serviceUrl;

      // Phase 3: Health check
      record.status = "verifying";
      record.phases.push({ phase: "verify", startedAt: new Date().toISOString() });
      if (deployResult.serviceUrl) {
        const healthy = await this._healthCheck(deployResult.serviceUrl);
        record.phases[2].healthy = healthy;
      }
      record.phases[2].completedAt = new Date().toISOString();

      record.status = "complete";
      record.completedAt = new Date().toISOString();
      this.status = "idle";
      return record;
    } catch (err) {
      record.status = "failed";
      record.error = err.message;
      record.completedAt = new Date().toISOString();
      this.status = "error";
      throw err;
    }
  }

  // ─── IAM ────────────────────────────────────────────────────────

  async _setPublicAccess(serviceName, token) {
    const resourcePath = `projects/${this.projectId}/locations/${this.region}/services/${serviceName}`;
    const apiPath = `/v2/${resourcePath}:setIamPolicy`;
    const policy = {
      policy: {
        bindings: [{
          role: "roles/run.invoker",
          members: ["allUsers"],
        }],
      },
    };
    return this._httpsPost(CLOUD_RUN_API, apiPath, JSON.stringify(policy), {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });
  }

  // ─── Health Check ───────────────────────────────────────────────

  async _healthCheck(serviceUrl, maxRetries = 6, intervalMs = 10000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const url = new URL("/api/brain/health", serviceUrl);
        const result = await this._httpsGetRaw(url.hostname, url.pathname);
        if (result.ok) return true;
      } catch (e) {
        // retry
      }
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }
    return false;
  }

  // ─── HTTP Helpers (zero deps) ───────────────────────────────────

  _httpsGet(host, path, token) {
    return new Promise((resolve, reject) => {
      const opts = {
        hostname: host, path, method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      };
      const req = https.request(opts, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ raw: data, statusCode: res.statusCode }); }
        });
      });
      req.on("error", reject);
      req.end();
    });
  }

  _httpsGetRaw(host, path) {
    return new Promise((resolve, reject) => {
      const req = https.get(`https://${host}${path}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ raw: data, statusCode: res.statusCode }); }
        });
      });
      req.on("error", reject);
    });
  }

  _httpsPost(host, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const opts = {
        hostname: host, path, method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body) },
      };
      const req = https.request(opts, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ raw: data, statusCode: res.statusCode }); }
        });
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  _httpsPatch(host, path, body, token) {
    return new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify(body);
      const opts = {
        hostname: host, path, method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      };
      const req = https.request(opts, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ raw: data, statusCode: res.statusCode }); }
        });
      });
      req.on("error", reject);
      req.write(bodyStr);
      req.end();
    });
  }

  // ─── Status ─────────────────────────────────────────────────────

  getStatus() {
    return {
      status: this.status,
      authenticated: !!this.serviceAccount,
      projectId: this.projectId,
      region: this.region,
      serviceName: this.serviceName,
      serviceAccount: this.serviceAccount ? this.serviceAccount.client_email : null,
      tokenCached: !!this._cachedToken,
      tokenExpiresIn: this._tokenExpiresAt > 0
        ? Math.max(0, Math.round((this._tokenExpiresAt - Date.now()) / 1000)) + "s"
        : null,
      deployHistory: this.history.length,
      lastDeploy: this.history.length > 0 ? this.history[this.history.length - 1] : null,
    };
  }
}

// ─── Express Route Registration ────────────────────────────────────

function registerDeployRoutes(app, deployer) {

  // Status — shows auth, project, history
  app.get("/api/deploy/status", (req, res) => {
    res.json({ ok: true, ...deployer.getStatus(), ts: new Date().toISOString() });
  });

  // Auth check — validates the service account can mint tokens
  app.post("/api/deploy/auth-check", async (req, res) => {
    try {
      const token = await deployer.getAccessToken();
      res.json({
        ok: true,
        authenticated: true,
        tokenPrefix: token.substring(0, 20) + "...",
        serviceAccount: deployer.serviceAccount.client_email,
        projectId: deployer.projectId,
        ts: new Date().toISOString(),
      });
    } catch (err) {
      res.status(401).json({ ok: false, error: err.message });
    }
  });

  // List Cloud Run services
  app.get("/api/deploy/services", async (req, res) => {
    try {
      const result = await deployer.listServices();
      res.json({ ok: true, ...result, ts: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Get specific service info
  app.get("/api/deploy/services/:name", async (req, res) => {
    try {
      const result = await deployer.getService(req.params.name);
      res.json({ ok: true, ...result, ts: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Deploy — the main self-deploy endpoint
  app.post("/api/deploy/cloud-run", async (req, res) => {
    try {
      const opts = req.body || {};
      const result = await deployer.deploySource({
        serviceName: opts.serviceName || deployer.serviceName,
        image: opts.image,
        cpu: opts.cpu,
        memory: opts.memory,
        minInstances: opts.minInstances,
        maxInstances: opts.maxInstances,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Full pipeline: Build → Deploy → Health Check
  app.post("/api/deploy/full", async (req, res) => {
    try {
      const opts = req.body || {};
      const result = await deployer.fullDeploy(opts);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Trigger Cloud Build only
  app.post("/api/deploy/build", async (req, res) => {
    try {
      const opts = req.body || {};
      const result = await deployer.triggerBuild(opts);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Deploy history
  app.get("/api/deploy/history", (req, res) => {
    res.json({
      ok: true,
      total: deployer.history.length,
      deploys: deployer.history.slice(-20).reverse(),
      ts: new Date().toISOString(),
    });
  });
}

module.exports = { HeadyDeploy, registerDeployRoutes };
