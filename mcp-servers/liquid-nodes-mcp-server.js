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
// ║  FILE: mcp-servers/liquid-nodes-mcp-server.js                                                    ║
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * Liquid Nodes MCP Server — Dynamic connectors for cloud & AI services
 * Each "liquid node" is a tool that flows data between Heady and external platforms.
 * Uses @modelcontextprotocol/sdk with stdio transport for Claude Desktop.
 */

const sdkRoot = require('path').join(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { Server } = require(sdkRoot + '/server/index.js');
const { StdioServerTransport } = require(sdkRoot + '/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require(sdkRoot + '/types.js');

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────
const HEADY_ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(HEADY_ROOT, '.env');

// Latent Space — record all liquid node operations
let latent;
try {
  latent = require(path.join(HEADY_ROOT, 'src', 'hc_latent_space'));
} catch (e) {
  latent = { record: () => {}, search: () => ({ results: [] }) };
}

function loadEnv() {
  const env = {};
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        env[key] = val;
      }
    }
  } catch (e) { /* .env not found, use process.env */ }
  return env;
}

const fileEnv = loadEnv();

function loadVault() {
  const env = {};
  const vaultPath = path.join(HEADY_ROOT, '.heady', '.shit');
  try {
    const content = fs.readFileSync(vaultPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (val) env[key] = val;
      }
    }
  } catch (e) { /* vault not found or not readable */ }
  return env;
}

const vaultEnv = loadVault();
function getEnv(key) {
  return process.env[key] || fileEnv[key] || vaultEnv[key] || '';
}

// ─── HTTP Helper ──────────────────────────────────────────────────
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'HeadyLiquidNodes/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = mod.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });

    if (options.body) {
      const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(body));
      req.write(body);
    }
    req.end();
  });
}

// ─── GitHub API ───────────────────────────────────────────────────
class GitHubNode {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  headers() {
    const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async listRepos(org) {
    const url = org
      ? `${this.baseUrl}/orgs/${encodeURIComponent(org)}/repos?per_page=30&sort=updated`
      : `${this.baseUrl}/user/repos?per_page=30&sort=updated`;
    const res = await httpRequest(url, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`GitHub API ${res.status}: ${res.raw.substring(0, 200)}`);
    return res.data.map(r => ({
      name: r.full_name, description: r.description, language: r.language,
      stars: r.stargazers_count, updated: r.updated_at, url: r.html_url, private: r.private
    }));
  }

  async getRepoInfo(owner, repo) {
    const res = await httpRequest(`${this.baseUrl}/repos/${owner}/${repo}`, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`GitHub API ${res.status}: ${res.raw.substring(0, 200)}`);
    const r = res.data;
    return {
      name: r.full_name, description: r.description, language: r.language,
      stars: r.stargazers_count, forks: r.forks_count, open_issues: r.open_issues_count,
      default_branch: r.default_branch, created: r.created_at, updated: r.updated_at,
      topics: r.topics, url: r.html_url, private: r.private
    };
  }

  async searchCode(query, org) {
    const q = org ? `${query}+org:${org}` : query;
    const res = await httpRequest(`${this.baseUrl}/search/code?q=${encodeURIComponent(q)}&per_page=15`, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`GitHub API ${res.status}: ${res.raw.substring(0, 200)}`);
    return {
      total: res.data.total_count,
      items: res.data.items.map(i => ({
        path: i.path, repo: i.repository.full_name, url: i.html_url, score: i.score
      }))
    };
  }
}

// ─── Gists API ────────────────────────────────────────────────────
class GistNode {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
  }

  headers() {
    const h = { 'Accept': 'application/vnd.github+json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async listGists(username) {
    const url = username
      ? `${this.baseUrl}/users/${encodeURIComponent(username)}/gists?per_page=20`
      : `${this.baseUrl}/gists?per_page=20`;
    const res = await httpRequest(url, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`Gists API ${res.status}: ${res.raw.substring(0, 200)}`);
    return res.data.map(g => ({
      id: g.id, description: g.description, public: g.public,
      files: Object.keys(g.files), url: g.html_url,
      created: g.created_at, updated: g.updated_at
    }));
  }

  async getGist(gistId) {
    const res = await httpRequest(`${this.baseUrl}/gists/${gistId}`, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`Gists API ${res.status}: ${res.raw.substring(0, 200)}`);
    const g = res.data;
    const files = {};
    for (const [name, file] of Object.entries(g.files)) {
      files[name] = {
        language: file.language, size: file.size, type: file.type,
        content: file.content ? file.content.substring(0, 5000) : '(truncated — fetch raw_url)',
        raw_url: file.raw_url
      };
    }
    return { id: g.id, description: g.description, files, owner: g.owner?.login, url: g.html_url };
  }

  async createGist(description, files, isPublic) {
    const gistFiles = {};
    for (const [name, content] of Object.entries(files)) {
      gistFiles[name] = { content };
    }
    const res = await httpRequest(`${this.baseUrl}/gists`, {
      method: 'POST', headers: this.headers(),
      body: { description, public: isPublic || false, files: gistFiles }
    });
    if (res.status !== 201) throw new Error(`Create Gist failed ${res.status}: ${res.raw.substring(0, 200)}`);
    return { id: res.data.id, url: res.data.html_url, files: Object.keys(res.data.files) };
  }
}

// ─── Cloudflare API ───────────────────────────────────────────────
class CloudflareNode {
  constructor(apiToken, accountId) {
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }

  headers() {
    return { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' };
  }

  async listZones() {
    const res = await httpRequest(`${this.baseUrl}/zones?per_page=20`, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`Cloudflare API ${res.status}: ${res.raw.substring(0, 200)}`);
    return res.data.result.map(z => ({
      id: z.id, name: z.name, status: z.status, plan: z.plan?.name,
      name_servers: z.name_servers, paused: z.paused
    }));
  }

  async getDnsRecords(zoneId) {
    const res = await httpRequest(`${this.baseUrl}/zones/${zoneId}/dns_records?per_page=50`, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`Cloudflare API ${res.status}: ${res.raw.substring(0, 200)}`);
    return res.data.result.map(r => ({
      id: r.id, type: r.type, name: r.name, content: r.content, proxied: r.proxied, ttl: r.ttl
    }));
  }

  async listWorkers() {
    if (!this.accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID required for Workers API');
    const res = await httpRequest(`${this.baseUrl}/accounts/${this.accountId}/workers/scripts`, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`Cloudflare API ${res.status}: ${res.raw.substring(0, 200)}`);
    return res.data.result.map(w => ({ id: w.id, modified: w.modified_on, created: w.created_on }));
  }

  async listPages() {
    if (!this.accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID required for Pages API');
    const res = await httpRequest(`${this.baseUrl}/accounts/${this.accountId}/pages/projects`, { headers: this.headers() });
    if (res.status !== 200) throw new Error(`Cloudflare API ${res.status}: ${res.raw.substring(0, 200)}`);
    return res.data.result.map(p => ({
      name: p.name, subdomain: p.subdomain, domains: p.domains,
      production_branch: p.production_branch, created: p.created_on
    }));
  }
}

// ─── Google Cloud / Vertex AI / AI Studio ─────────────────────────
class GCloudNode {
  constructor(accessToken, projectId) {
    this.accessToken = accessToken;
    this.projectId = projectId;
  }

  headers() {
    return { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' };
  }

  async vertexPredict(endpoint, instances, location = 'us-central1') {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${location}/endpoints/${endpoint}:predict`;
    const res = await httpRequest(url, {
      method: 'POST', headers: this.headers(),
      body: { instances }
    });
    return { status: res.status, predictions: res.data?.predictions, error: res.data?.error };
  }

  async vertexListModels(location = 'us-central1') {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${location}/models`;
    const res = await httpRequest(url, { headers: this.headers() });
    if (res.status !== 200) return { error: `Vertex AI ${res.status}: ${res.raw.substring(0, 300)}` };
    return (res.data.models || []).map(m => ({
      name: m.displayName, id: m.name, createTime: m.createTime,
      updateTime: m.updateTime, deployedModels: m.deployedModels?.length || 0
    }));
  }

  async vertexListEndpoints(location = 'us-central1') {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${location}/endpoints`;
    const res = await httpRequest(url, { headers: this.headers() });
    if (res.status !== 200) return { error: `Vertex AI ${res.status}: ${res.raw.substring(0, 300)}` };
    return (res.data.endpoints || []).map(e => ({
      name: e.displayName, id: e.name, createTime: e.createTime,
      deployedModels: e.deployedModels?.map(dm => dm.model) || []
    }));
  }

  async aiStudioGenerate(model, prompt, maxTokens = 1024) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.accessToken}`;
    const res = await httpRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens }
      }
    });
    if (res.status !== 200) return { error: `AI Studio ${res.status}: ${res.raw.substring(0, 300)}` };
    const candidate = res.data?.candidates?.[0];
    return {
      text: candidate?.content?.parts?.[0]?.text || '',
      finishReason: candidate?.finishReason,
      usage: res.data?.usageMetadata
    };
  }
}

// ─── Colab / Notebook Resources ───────────────────────────────────
class ColabNode {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
  }

  headers() {
    return { 'Authorization': `Bearer ${this.accessToken}` };
  }

  async listNotebooks() {
    const query = "mimeType='application/vnd.google.colaboratory'";
    const url = `${this.baseUrl}/files?q=${encodeURIComponent(query)}&pageSize=20&fields=files(id,name,modifiedTime,webViewLink,owners)`;
    const res = await httpRequest(url, { headers: this.headers() });
    if (res.status !== 200) return { error: `Drive API ${res.status}: ${res.raw.substring(0, 300)}` };
    return (res.data.files || []).map(f => ({
      id: f.id, name: f.name, modified: f.modifiedTime,
      url: f.webViewLink, owner: f.owners?.[0]?.emailAddress
    }));
  }

  async getNotebookContent(fileId) {
    const url = `${this.baseUrl}/files/${fileId}?alt=media`;
    const res = await httpRequest(url, { headers: this.headers() });
    if (res.status !== 200) return { error: `Drive API ${res.status}: ${res.raw.substring(0, 300)}` };
    // Colab notebooks are .ipynb JSON
    const nb = res.data;
    if (!nb || !nb.cells) return { error: 'Not a valid notebook format' };
    return {
      cells: nb.cells.length,
      metadata: nb.metadata,
      summary: nb.cells.slice(0, 10).map((c, i) => ({
        index: i, type: c.cell_type,
        preview: (c.source || []).join('').substring(0, 200)
      }))
    };
  }
}

// ─── Latent Space (Vector Memory) ─────────────────────────────────
class LatentSpaceNode {
  constructor() {
    this.storePath = path.join(HEADY_ROOT, 'data', 'latent-space');
    this.ensureDir();
  }

  ensureDir() {
    try {
      fs.mkdirSync(this.storePath, { recursive: true });
    } catch (e) { /* exists */ }
  }

  indexPath() {
    return path.join(this.storePath, 'index.json');
  }

  loadIndex() {
    try {
      return JSON.parse(fs.readFileSync(this.indexPath(), 'utf8'));
    } catch (e) {
      return { vectors: [], metadata: { created: new Date().toISOString(), version: '1.0' } };
    }
  }

  saveIndex(index) {
    fs.writeFileSync(this.indexPath(), JSON.stringify(index, null, 2));
  }

  // Simple cosine similarity for demo — production would use FAISS or Pinecone
  cosineSim(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
  }

  // Simple text-to-vector (bag of trigrams hash) — production would use embeddings API
  textToVector(text, dims = 128) {
    const vec = new Array(dims).fill(0);
    const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    for (let i = 0; i < normalized.length - 2; i++) {
      const trigram = normalized.substring(i, i + 3);
      let hash = 0;
      for (let j = 0; j < trigram.length; j++) {
        hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
        hash = hash & hash; // Convert to 32bit
      }
      const idx = Math.abs(hash) % dims;
      vec[idx] += 1;
    }
    // Normalize
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  store(key, text, meta = {}) {
    const index = this.loadIndex();
    const vector = this.textToVector(text);
    const entry = {
      key, text: text.substring(0, 2000), vector, meta,
      timestamp: new Date().toISOString()
    };
    // Upsert
    const existIdx = index.vectors.findIndex(v => v.key === key);
    if (existIdx >= 0) {
      index.vectors[existIdx] = entry;
    } else {
      index.vectors.push(entry);
    }
    this.saveIndex(index);
    return { stored: key, dimensions: vector.length, totalVectors: index.vectors.length };
  }

  search(query, topK = 5) {
    const index = this.loadIndex();
    if (index.vectors.length === 0) return { results: [], total: 0 };
    const queryVec = this.textToVector(query);
    const scored = index.vectors.map(entry => ({
      key: entry.key, text: entry.text.substring(0, 300),
      score: this.cosineSim(queryVec, entry.vector),
      meta: entry.meta, timestamp: entry.timestamp
    }));
    scored.sort((a, b) => b.score - a.score);
    return { results: scored.slice(0, topK), total: index.vectors.length };
  }

  listEntries() {
    const index = this.loadIndex();
    return {
      total: index.vectors.length,
      entries: index.vectors.map(v => ({
        key: v.key, preview: v.text.substring(0, 100),
        meta: v.meta, timestamp: v.timestamp
      }))
    };
  }

  deleteEntry(key) {
    const index = this.loadIndex();
    const before = index.vectors.length;
    index.vectors = index.vectors.filter(v => v.key !== key);
    this.saveIndex(index);
    return { deleted: before > index.vectors.length, remaining: index.vectors.length };
  }
}

// ─── Liquid Nodes MCP Server ──────────────────────────────────────
class LiquidNodesMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'heady-liquid-nodes', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.github = new GitHubNode(getEnv('GITHUB_TOKEN'));
    this.gist = new GistNode(getEnv('GITHUB_TOKEN'));
    this.cloudflare = new CloudflareNode(getEnv('CLOUDFLARE_API_TOKEN'), getEnv('CLOUDFLARE_ACCOUNT_ID'));
    this.gcloud = new GCloudNode(getEnv('GCLOUD_ACCESS_TOKEN'), getEnv('GCLOUD_PROJECT_ID'));
    this.colab = new ColabNode(getEnv('GCLOUD_ACCESS_TOKEN'));
    this.latent = new LatentSpaceNode();

    this.setupToolHandlers();
    this.server.onerror = (error) => console.error('[LiquidNodes Error]', error);
    process.on('SIGINT', async () => { await this.server.close(); process.exit(0); });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ── GitHub ────────────────────────────────
        {
          name: 'github_list_repos',
          description: 'List GitHub repositories for an org or the authenticated user',
          inputSchema: {
            type: 'object',
            properties: {
              org: { type: 'string', description: 'GitHub org name (e.g. "HeadyMe", "HeadySystems"). Omit for user repos.' }
            }
          }
        },
        {
          name: 'github_repo_info',
          description: 'Get detailed info about a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repo owner (user or org)' },
              repo: { type: 'string', description: 'Repository name' }
            },
            required: ['owner', 'repo']
          }
        },
        {
          name: 'github_search_code',
          description: 'Search code across GitHub repositories',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query (code, function names, etc.)' },
              org: { type: 'string', description: 'Limit to org (e.g. "HeadySystems")' }
            },
            required: ['query']
          }
        },

        // ── Gists ─────────────────────────────────
        {
          name: 'gist_list',
          description: 'List GitHub Gists for a user or the authenticated user',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', description: 'GitHub username. Omit for authenticated user.' }
            }
          }
        },
        {
          name: 'gist_get',
          description: 'Get a specific Gist with its file contents',
          inputSchema: {
            type: 'object',
            properties: { gist_id: { type: 'string', description: 'Gist ID' } },
            required: ['gist_id']
          }
        },
        {
          name: 'gist_create',
          description: 'Create a new GitHub Gist with one or more files',
          inputSchema: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Gist description' },
              files: {
                type: 'object',
                description: 'Object of filename: content pairs',
                additionalProperties: { type: 'string' }
              },
              public: { type: 'boolean', description: 'Make gist public (default: false)' }
            },
            required: ['description', 'files']
          }
        },

        // ── Cloudflare ────────────────────────────
        {
          name: 'cloudflare_list_zones',
          description: 'List all Cloudflare DNS zones (domains)',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'cloudflare_dns_records',
          description: 'Get DNS records for a Cloudflare zone',
          inputSchema: {
            type: 'object',
            properties: { zone_id: { type: 'string', description: 'Zone ID from cloudflare_list_zones' } },
            required: ['zone_id']
          }
        },
        {
          name: 'cloudflare_list_workers',
          description: 'List Cloudflare Workers scripts',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'cloudflare_list_pages',
          description: 'List Cloudflare Pages projects',
          inputSchema: { type: 'object', properties: {} }
        },

        // ── Google Cloud / Vertex AI ──────────────
        {
          name: 'vertex_list_models',
          description: 'List deployed models in Vertex AI',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'GCP region (default: us-central1)' }
            }
          }
        },
        {
          name: 'vertex_list_endpoints',
          description: 'List Vertex AI endpoints',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'GCP region (default: us-central1)' }
            }
          }
        },
        {
          name: 'vertex_predict',
          description: 'Run prediction on a Vertex AI endpoint',
          inputSchema: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', description: 'Vertex AI endpoint ID' },
              instances: { type: 'array', description: 'Input instances for prediction', items: { type: 'object' } },
              location: { type: 'string', description: 'GCP region (default: us-central1)' }
            },
            required: ['endpoint', 'instances']
          }
        },

        // ── AI Studio (Gemini) ────────────────────
        {
          name: 'aistudio_generate',
          description: 'Generate text using Google AI Studio (Gemini API)',
          inputSchema: {
            type: 'object',
            properties: {
              model: { type: 'string', description: 'Model name (e.g. "gemini-1.5-pro", "gemini-1.5-flash")' },
              prompt: { type: 'string', description: 'Text prompt' },
              max_tokens: { type: 'number', description: 'Max output tokens (default: 1024)' }
            },
            required: ['model', 'prompt']
          }
        },

        // ── Colab / Notebooks ─────────────────────
        {
          name: 'colab_list_notebooks',
          description: 'List Google Colab notebooks from Google Drive',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'colab_get_notebook',
          description: 'Get content summary of a Colab notebook',
          inputSchema: {
            type: 'object',
            properties: { file_id: { type: 'string', description: 'Google Drive file ID of the notebook' } },
            required: ['file_id']
          }
        },

        // ── Latent Space ──────────────────────────
        {
          name: 'latent_store',
          description: 'Store text in the latent space vector memory with a key',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Unique key for this entry (e.g. "pipeline-config", "architecture-notes")' },
              text: { type: 'string', description: 'Text content to vectorize and store' },
              meta: { type: 'object', description: 'Optional metadata (tags, source, etc.)' }
            },
            required: ['key', 'text']
          }
        },
        {
          name: 'latent_search',
          description: 'Search the latent space vector memory by semantic similarity',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query (natural language)' },
              top_k: { type: 'number', description: 'Number of results (default: 5)' }
            },
            required: ['query']
          }
        },
        {
          name: 'latent_list',
          description: 'List all entries in the latent space memory',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'latent_delete',
          description: 'Delete an entry from the latent space by key',
          inputSchema: {
            type: 'object',
            properties: { key: { type: 'string', description: 'Key of entry to delete' } },
            required: ['key']
          }
        },

        // ── Node Status ───────────────────────────
        {
          name: 'liquid_nodes_status',
          description: 'Get status of all liquid node connections and their configuration',
          inputSchema: { type: 'object', properties: {} }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        let result;
        switch (name) {
          // GitHub
          case 'github_list_repos': result = await this.github.listRepos(args?.org); break;
          case 'github_repo_info': result = await this.github.getRepoInfo(args.owner, args.repo); break;
          case 'github_search_code': result = await this.github.searchCode(args.query, args?.org); break;
          // Gists
          case 'gist_list': result = await this.gist.listGists(args?.username); break;
          case 'gist_get': result = await this.gist.getGist(args.gist_id); break;
          case 'gist_create': result = await this.gist.createGist(args.description, args.files, args?.public); break;
          // Cloudflare
          case 'cloudflare_list_zones': result = await this.cloudflare.listZones(); break;
          case 'cloudflare_dns_records': result = await this.cloudflare.getDnsRecords(args.zone_id); break;
          case 'cloudflare_list_workers': result = await this.cloudflare.listWorkers(); break;
          case 'cloudflare_list_pages': result = await this.cloudflare.listPages(); break;
          // Vertex AI
          case 'vertex_list_models': result = await this.gcloud.vertexListModels(args?.location); break;
          case 'vertex_list_endpoints': result = await this.gcloud.vertexListEndpoints(args?.location); break;
          case 'vertex_predict': result = await this.gcloud.vertexPredict(args.endpoint, args.instances, args?.location); break;
          // AI Studio
          case 'aistudio_generate': result = await this.gcloud.aiStudioGenerate(args.model, args.prompt, args?.max_tokens); break;
          // Colab
          case 'colab_list_notebooks': result = await this.colab.listNotebooks(); break;
          case 'colab_get_notebook': result = await this.colab.getNotebookContent(args.file_id); break;
          // Latent Space
          case 'latent_store': result = this.latent.store(args.key, args.text, args?.meta); break;
          case 'latent_search': result = this.latent.search(args.query, args?.top_k); break;
          case 'latent_list': result = this.latent.listEntries(); break;
          case 'latent_delete': result = this.latent.deleteEntry(args.key); break;
          // Status
          case 'liquid_nodes_status': result = this.getNodesStatus(); break;
          default: throw new Error(`Unknown tool: ${name}`);
        }
        // Record every operation in latent space
        latent.record('liquid-node', `${name} executed`, { tool: name, resultKeys: Object.keys(result || {}) });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        latent.record('error', `${name} failed: ${error.message}`, { tool: name });
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    });
  }

  getNodesStatus() {
    const check = (name, hasToken) => ({ node: name, connected: !!hasToken, status: hasToken ? 'ready' : 'needs_token' });
    const latentIndex = this.latent.loadIndex();
    return {
      title: 'Heady Liquid Nodes Status',
      nodes: [
        check('GitHub', getEnv('GITHUB_TOKEN')),
        check('Gists', getEnv('GITHUB_TOKEN')),
        check('Cloudflare', getEnv('CLOUDFLARE_API_TOKEN')),
        { node: 'Cloudflare Account', connected: !!getEnv('CLOUDFLARE_ACCOUNT_ID'), status: getEnv('CLOUDFLARE_ACCOUNT_ID') ? 'ready' : 'needs_account_id' },
        check('Google Cloud / Vertex AI', getEnv('GCLOUD_ACCESS_TOKEN')),
        { node: 'GCloud Project', connected: !!getEnv('GCLOUD_PROJECT_ID'), status: getEnv('GCLOUD_PROJECT_ID') || 'needs_project_id' },
        check('AI Studio (Gemini)', getEnv('GOOGLE_AI_KEY') || getEnv('GCLOUD_ACCESS_TOKEN')),
        check('Colab (via Drive)', getEnv('GCLOUD_ACCESS_TOKEN')),
        { node: 'Latent Space', connected: true, status: 'active', vectors: latentIndex.vectors.length }
      ],
      env_keys_needed: [
        'GITHUB_TOKEN — GitHub personal access token (repos + gists)',
        'CLOUDFLARE_API_TOKEN — Cloudflare API token',
        'CLOUDFLARE_ACCOUNT_ID — Cloudflare account ID (for Workers/Pages)',
        'GCLOUD_ACCESS_TOKEN — Google Cloud OAuth access token',
        'GCLOUD_PROJECT_ID — GCP project ID (for Vertex AI)',
        'GOOGLE_AI_KEY — Google AI Studio API key (alternative to OAuth)'
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Heady Liquid Nodes MCP Server running on stdio');
  }
}

const server = new LiquidNodesMCPServer();
server.run().catch(console.error);
