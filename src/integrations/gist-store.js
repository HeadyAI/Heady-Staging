/* HEADY_BRAND:BEGIN
 * HeadyOS · GitHub Gist Store
 * Persistent checkpoint layer for Colab sessions, model state, and vector snapshots.
 * Uses GitHub Gists API as durable storage that survives Colab runtime restarts.
 * HEADY_BRAND:END */

'use strict';

const https = require('https');

// ── Phi-Math Constants ──────────────────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// Max gist files per checkpoint (Fibonacci-bounded)
const MAX_FILES_PER_GIST = FIB[6]; // 13
const RETRY_DELAYS_MS    = [FIB[8], FIB[9], FIB[10], FIB[11]].map(f => f * 100); // [2100,3400,5500,8900]ms
const MAX_DESCRIPTION_LEN = FIB[12]; // 233 chars

/**
 * GistStore — GitHub Gists as a persistent KV checkpoint layer.
 *
 * Use cases:
 *  - Save Colab runtime state before session expiry
 *  - Checkpoint vector memory snapshots
 *  - Store model training progress metadata
 *  - Share HeadyOS configs between environments
 *
 * @param {object} opts
 * @param {string} opts.token  — GitHub Personal Access Token (scope: gist)
 * @param {string} [opts.owner] — GitHub username (for listing owned gists)
 */
class GistStore {
  constructor(opts = {}) {
    this.token = opts.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    this.owner = opts.owner || process.env.GITHUB_ACTOR || 'heady-systems';
    if (!this.token) {
      console.warn('[GistStore] No GITHUB_TOKEN — writes will fail, reads of public gists still work');
    }
    // In-memory index: gistId → { description, files[], updatedAt }
    this._index = new Map();
  }

  // ── Low-Level HTTP ─────────────────────────────────────────────────────────

  _request(method, path, body) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const options = {
        hostname: 'api.github.com',
        path,
        method,
        headers: {
          'User-Agent':    'HeadyOS/3.0 GistStore',
          'Accept':        'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      };
      const req = https.request(options, res => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`GitHub API ${res.statusCode}: ${raw.slice(0, 200)}`));
          }
          try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  async _withRetry(fn, label) {
    let lastErr;
    for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[i];
          console.warn(`[GistStore] ${label} attempt ${i + 1} failed, retry in ${delay}ms — ${err.message}`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastErr;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Save a checkpoint to a new or updated gist.
   *
   * @param {object} params
   * @param {string}   params.key         — Logical key (e.g. 'colab-alpha-state')
   * @param {object}   params.data        — JSON-serializable payload
   * @param {string}   [params.gistId]    — Update existing gist if provided
   * @param {boolean}  [params.public]    — Make gist public (default false)
   * @param {string}   [params.runtime]   — Colab runtime label for description
   * @returns {Promise<{gistId, url, key}>}
   */
  async checkpoint({ key, data, gistId, public: isPublic = false, runtime = '' }) {
    const ts        = new Date().toISOString();
    const filename  = `${key}.json`;
    const meta      = `heady-checkpoint-${key}.meta.json`;
    const description = [
      `HeadyOS checkpoint: ${key}`,
      runtime ? `runtime=${runtime}` : '',
      `ts=${ts}`,
    ].filter(Boolean).join(' · ').slice(0, MAX_DESCRIPTION_LEN);

    const files = {
      [filename]: { content: JSON.stringify(data, null, 2) },
      [meta]: {
        content: JSON.stringify({
          key, runtime, ts,
          headyVersion: process.env.HEADY_VERSION || '3.0.0',
          phi: PHI,
        }, null, 2),
      },
    };

    const body = { description, public: isPublic, files };
    let result;

    if (gistId) {
      result = await this._withRetry(
        () => this._request('PATCH', `/gists/${gistId}`, body),
        `update-gist-${key}`,
      );
    } else {
      result = await this._withRetry(
        () => this._request('POST', '/gists', body),
        `create-gist-${key}`,
      );
    }

    this._index.set(key, { gistId: result.id, url: result.html_url, updatedAt: ts });
    console.log(`[GistStore] ✓ checkpoint saved: ${key} → ${result.html_url}`);
    return { gistId: result.id, url: result.html_url, key };
  }

  /**
   * Load the latest checkpoint for a key.
   *
   * @param {string} gistId — Gist ID (from previous checkpoint() call)
   * @param {string} key    — Logical key (to find correct file)
   * @returns {Promise<object>} — Parsed data
   */
  async load(gistId, key) {
    const result = await this._withRetry(
      () => this._request('GET', `/gists/${gistId}`),
      `load-gist-${key}`,
    );
    const filename = `${key}.json`;
    const file = result.files && result.files[filename];
    if (!file) throw new Error(`[GistStore] File ${filename} not found in gist ${gistId}`);
    const content = file.content || file.truncated
      ? await this._withRetry(() => fetch(file.raw_url).then(r => r.text()), `fetch-raw-${key}`)
      : file.content;
    return JSON.parse(content);
  }

  /**
   * List all HeadyOS gists for the configured owner.
   * @returns {Promise<Array<{id, description, url, updatedAt}>>}
   */
  async list() {
    const gists = await this._withRetry(
      () => this._request('GET', `/users/${this.owner}/gists?per_page=100`),
      'list-gists',
    );
    return gists
      .filter(g => g.description && g.description.startsWith('HeadyOS checkpoint:'))
      .map(g => ({
        id:          g.id,
        description: g.description,
        url:         g.html_url,
        updatedAt:   g.updated_at,
        files:       Object.keys(g.files),
      }));
  }

  /**
   * Delete a gist by ID.
   * @param {string} gistId
   */
  async delete(gistId) {
    await this._withRetry(
      () => this._request('DELETE', `/gists/${gistId}`),
      `delete-gist-${gistId}`,
    );
    // Remove from index
    for (const [key, val] of this._index.entries()) {
      if (val.gistId === gistId) this._index.delete(key);
    }
    console.log(`[GistStore] ✓ deleted gist ${gistId}`);
  }

  // ── Colab-Specific Helpers ─────────────────────────────────────────────────

  /**
   * Save full Colab runtime state before session expiry.
   * Called by colab-runtime-manager.js on shutdown signal.
   */
  async saveColabState(runtimeId, state) {
    const indexed = this._index.get(`colab-${runtimeId}`);
    return this.checkpoint({
      key:     `colab-${runtimeId}`,
      data:    state,
      gistId:  indexed ? indexed.gistId : undefined,
      runtime: runtimeId,
    });
  }

  /**
   * Restore Colab runtime state on startup.
   * @returns {object|null}
   */
  async loadColabState(runtimeId) {
    const indexed = this._index.get(`colab-${runtimeId}`);
    if (!indexed) {
      // Try fetching from GitHub by listing
      const all = await this.list().catch(() => []);
      const match = all.find(g => g.description.includes(`colab-${runtimeId}`));
      if (!match) return null;
      this._index.set(`colab-${runtimeId}`, { gistId: match.id, url: match.url, updatedAt: match.updatedAt });
      return this.load(match.id, `colab-${runtimeId}`);
    }
    return this.load(indexed.gistId, `colab-${runtimeId}`);
  }

  /**
   * Save vector memory snapshot (top-N by importance score).
   * @param {Array} entries — Array of {key, vector, metadata, score}
   * @param {number} [topN=FIB[7]] — Number of top entries to persist (default 21)
   */
  async saveVectorSnapshot(entries, topN = FIB[7]) {
    const sorted  = [...entries].sort((a, b) => (b.score || 0) - (a.score || 0));
    const topEntries = sorted.slice(0, topN);
    const indexed = this._index.get('vector-snapshot');
    return this.checkpoint({
      key:    'vector-snapshot',
      data:   { entries: topEntries, savedAt: Date.now(), topN, totalEntries: entries.length },
      gistId: indexed ? indexed.gistId : undefined,
    });
  }

  /**
   * Save model training progress (loss, step, hyperparams).
   */
  async saveTrainingProgress(progress) {
    const key     = `training-${progress.modelId || 'default'}`;
    const indexed = this._index.get(key);
    return this.checkpoint({
      key,
      data:    { ...progress, savedAt: Date.now(), phi: PHI },
      gistId:  indexed ? indexed.gistId : undefined,
      runtime: progress.runtimeId || 'colab-gamma',
    });
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  status() {
    return {
      token:   this.token ? '***configured***' : 'missing',
      owner:   this.owner,
      indexed: this._index.size,
      keys:    [...this._index.keys()],
    };
  }
}

module.exports = { GistStore };
