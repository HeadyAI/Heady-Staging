/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  HEADY_BRAND: HeadySystems Inc.                                   ║
 * ║  Module: drupal-cms-sync.js                                       ║
 * ║  Node: ATLAS (Auto-Archivist) + EMISSARY (Docs/SDK)               ║
 * ║  Layer: L2 (Cloud Runtime) → L3 (Vector Memory)                   ║
 * ║  Law 3: Zero localhost — cms.headysystems.com only                ║
 * ║  Law 4: Zero placeholders — all queries functional                ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 */

import { Pool } from '@neondatabase/serverless';
import { createLogger } from '@heady-ai/structured-logger';
import { PHI, PSI, FIB } from '@heady-ai/phi-math';

const log = createLogger('drupal-cms-sync', 'content');

// ── Drupal JSON:API Config ──
const CMS = Object.freeze({
  BASE_URL:        'https://cms.headysystems.com',
  JSON_API:        'https://cms.headysystems.com/jsonapi',
  WEBHOOK_SECRET:  process.env.DRUPAL_WEBHOOK_SECRET,
  SYNC_BATCH_SIZE: FIB[7],              // 21 items per batch
  TIMEOUT_MS:      Math.round(PHI ** 3 * 1000), // 4236ms
  VECTOR_DIM:      384,
  EMBEDDING_MODEL: 'sentence-transformers/all-MiniLM-L6-v2',
});

// ── Site → Content Type Mapping ──
const SITE_CONTENT_MAP = {
  headysystems:    ['page', 'article', 'case_study'],
  headyme:         ['page', 'profile'],
  headybuddy:      ['page', 'documentation'],
  headymcp:        ['page', 'documentation', 'api_ref'],
  headyio:         ['page', 'article'],
  headybot:        ['page', 'agent_listing'],
  headyapi:        ['page', 'documentation', 'api_ref'],
  headylens:       ['page', 'article'],
  headyai:         ['page', 'research_paper', 'benchmark'],
  headyfinance:    ['page', 'article', 'tool'],
  headyconnection: ['page', 'program', 'event', 'impact_report'],
};

let pgPool, hfTokens;

export function initCMSSync({ pgUrl, huggingfaceTokens }) {
  pgPool = new Pool({ connectionString: pgUrl });
  hfTokens = huggingfaceTokens;
  log.info('CMS sync initialized', { node: 'ATLAS', sites: Object.keys(SITE_CONTENT_MAP).length });
}

// ═══════════════════════════════════════════════════
// DRUPAL JSON:API — Content Operations
// ═══════════════════════════════════════════════════

/**
 * Fetch content from Drupal JSON:API
 * Supports filtering by site, content type, status
 */
export async function fetchContent(site, contentType, filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('filter[status]', filters.status === 'published' ? '1' : '0');
  if (filters.limit) params.set('page[limit]', String(filters.limit));
  if (filters.sort) params.set('sort', filters.sort);

  const url = `${CMS.JSON_API}/node/${contentType}?${params.toString()}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'X-Heady-Site': site,
        'X-Heady-Node': 'ATLAS',
      },
      signal: AbortSignal.timeout(CMS.TIMEOUT_MS),
    });

    if (!resp.ok) {
      log.warn('Drupal fetch failed', { node: 'ATLAS', site, contentType, status: resp.status });
      return [];
    }

    const data = await resp.json();
    return data.data || [];
  } catch (err) {
    log.error('Drupal fetch error', { node: 'ATLAS', site, error: err.message });
    return [];
  }
}

/**
 * Create content via JSON:API
 */
export async function createContent(site, contentType, attributes) {
  try {
    const resp = await fetch(`${CMS.JSON_API}/node/${contentType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'X-Heady-Site': site,
        'X-Heady-Node': 'ATLAS',
      },
      body: JSON.stringify({
        data: {
          type: `node--${contentType}`,
          attributes: {
            title: attributes.title,
            body: { value: attributes.body, format: 'full_html' },
            status: attributes.status === 'published',
            field_site: site,
            field_tags: attributes.tags || [],
            ...attributes.fields,
          },
        },
      }),
      signal: AbortSignal.timeout(CMS.TIMEOUT_MS),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      log.error('Content creation failed', { node: 'ATLAS', site, contentType, errors: err.errors });
      return null;
    }

    const data = await resp.json();
    log.info('Content created', {
      node: 'ATLAS',
      site,
      contentType,
      id: data.data?.id,
      title: attributes.title,
    });

    // Sync to vector memory
    if (data.data?.id) {
      await syncContentToVectors(site, data.data.id, attributes.title, attributes.body);
    }

    return data.data;
  } catch (err) {
    log.error('Content creation error', { node: 'ATLAS', error: err.message });
    return null;
  }
}

/**
 * Update content via JSON:API PATCH
 */
export async function updateContent(site, contentId, attributes) {
  try {
    const contentType = attributes.type || 'page';
    const resp = await fetch(`${CMS.JSON_API}/node/${contentType}/${contentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'X-Heady-Site': site,
        'X-Heady-Node': 'ATLAS',
      },
      body: JSON.stringify({
        data: {
          type: `node--${contentType}`,
          id: contentId,
          attributes,
        },
      }),
      signal: AbortSignal.timeout(CMS.TIMEOUT_MS),
    });

    if (!resp.ok) {
      log.warn('Content update failed', { node: 'ATLAS', site, contentId, status: resp.status });
      return false;
    }

    log.info('Content updated', { node: 'ATLAS', site, contentId });
    return true;
  } catch (err) {
    log.error('Content update error', { node: 'ATLAS', error: err.message });
    return false;
  }
}


// ═══════════════════════════════════════════════════
// VECTOR SYNC — Content → pgvector Embeddings
// ═══════════════════════════════════════════════════

/**
 * Sync a content node to pgvector for semantic search
 * Generates 384D embedding and upserts to cms_content_vectors table
 */
async function syncContentToVectors(site, contentId, title, body) {
  const text = `${title}. ${stripHTML(body || '').slice(0, 1024)}`;
  const embedding = await getEmbedding(text);
  if (!embedding) return;

  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_content_vectors (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id  TEXT NOT NULL,
        site        TEXT NOT NULL,
        title       TEXT NOT NULL,
        excerpt     TEXT,
        embedding   vector(${CMS.VECTOR_DIM}),
        csl_score   REAL DEFAULT 0.618,
        synced_at   TIMESTAMPTZ DEFAULT now(),
        UNIQUE (content_id, site)
      );

      CREATE INDEX IF NOT EXISTS idx_cms_cv_site ON cms_content_vectors (site);
      CREATE INDEX IF NOT EXISTS idx_cms_cv_embed
        ON cms_content_vectors USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    `);

    await client.query(`
      INSERT INTO cms_content_vectors (content_id, site, title, excerpt, embedding)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (content_id, site) DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        embedding = EXCLUDED.embedding,
        synced_at = now()
    `, [contentId, site, title, text.slice(0, 500), `[${embedding.join(',')}]`]);

    log.info('Content synced to vectors', { node: 'TOPOLOGY', site, contentId, title });
  } finally {
    client.release();
  }
}

/**
 * Semantic search across all CMS content
 * Cross-site search with CSL threshold filtering
 */
export async function searchContent(query, site = null, topK = FIB[7]) {
  const queryEmbedding = await getEmbedding(query);
  if (!queryEmbedding) return [];

  const client = await pgPool.connect();
  try {
    const siteFilter = site ? 'AND site = $4' : '';
    const params = [
      `[${queryEmbedding.join(',')}]`,
      PSI * PSI, // CSL_RECALL = 0.382
      topK,
    ];
    if (site) params.push(site);

    const { rows } = await client.query(`
      SELECT content_id, site, title, excerpt,
             1 - (embedding <=> $1::vector) as similarity,
             csl_score
      FROM cms_content_vectors
      WHERE 1 - (embedding <=> $1::vector) >= $2
        ${siteFilter}
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `, params);

    return rows;
  } finally {
    client.release();
  }
}


// ═══════════════════════════════════════════════════
// WEBHOOK — Drupal Publish/Update Events
// ═══════════════════════════════════════════════════

/**
 * Handle Drupal webhook for content publish/update
 * Validates HMAC signature, then syncs to vector memory
 */
export async function handleWebhook(req, res) {
  // Validate webhook signature
  const signature = req.headers['x-drupal-signature'];
  if (!signature || !CMS.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const { createHmac } = await import('node:crypto');
  const expected = createHmac('sha256', CMS.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expBuffer.length) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { timingSafeEqual } = await import('node:crypto');
  if (!timingSafeEqual(sigBuffer, expBuffer)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook payload
  const { event, site, content_id, title, body } = req.body;

  if (event === 'node.publish' || event === 'node.update') {
    await syncContentToVectors(site, content_id, title, body);
    log.info('Webhook processed', { node: 'ATLAS', event, site, content_id });
    return res.json({ synced: true });
  }

  if (event === 'node.delete') {
    const client = await pgPool.connect();
    try {
      await client.query(
        'DELETE FROM cms_content_vectors WHERE content_id = $1 AND site = $2',
        [content_id, site]
      );
      log.info('Content vector deleted', { node: 'ATLAS', site, content_id });
    } finally {
      client.release();
    }
    return res.json({ deleted: true });
  }

  res.json({ ignored: true, event });
}


// ═══════════════════════════════════════════════════
// TASK MANAGEMENT — Drupal-backed Kanban
// ═══════════════════════════════════════════════════

/**
 * Create a task in Drupal CMS (headless Kanban backing store)
 */
export async function createTask(task) {
  return createContent('admin', 'task', {
    title: task.title,
    body: task.description || '',
    fields: {
      field_status:   task.status || 'backlog',
      field_type:     task.type || 'feature',
      field_priority: task.priority || 'medium',
      field_site:     task.site || 'headysystems.com',
      field_node:     task.node || 'CONDUCTOR',
      field_csl:      task.cslScore || PSI,
    },
  });
}

/**
 * Update task status (drag-and-drop Kanban)
 */
export async function updateTaskStatus(taskId, newStatus) {
  return updateContent('admin', taskId, {
    field_status: newStatus,
  });
}

/**
 * List tasks with optional filters
 */
export async function listTasks(filters = {}) {
  return fetchContent('admin', 'task', {
    status: 'published',
    sort: '-field_priority',
    ...filters,
  });
}


// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function stripHTML(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

let hfTokenIndex = 0;
async function getEmbedding(text) {
  if (!text || !hfTokens?.length) return null;
  const token = hfTokens[hfTokenIndex % hfTokens.length];
  hfTokenIndex++;

  try {
    const resp = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${CMS.EMBEDDING_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text.slice(0, 512), options: { wait_for_model: true } }),
        signal: AbortSignal.timeout(CMS.TIMEOUT_MS),
      }
    );

    if (!resp.ok) return null;
    const result = await resp.json();
    return Array.isArray(result[0]) ? result[0] : result;
  } catch {
    return null;
  }
}


// ═══════════════════════════════════════════════════
// EXPRESS ROUTE HANDLERS
// ═══════════════════════════════════════════════════

export function cmsRoutes() {
  return {
    /** POST /api/cms/content — CRUD operations */
    async content(req, res) {
      const { action, site, content_type, data, content_id, filters } = req.body;

      switch (action) {
        case 'create':
          const created = await createContent(site, content_type, data);
          return res.json({ created: !!created, data: created });
        case 'update':
          const updated = await updateContent(site, content_id, data);
          return res.json({ updated });
        case 'list':
          const items = await fetchContent(site, content_type, filters);
          return res.json({ items, count: items.length });
        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    },

    /** POST /api/cms/search — Semantic search across all sites */
    async search(req, res) {
      const { query, site, limit } = req.body;
      const results = await searchContent(query, site, limit);
      res.json({ results, count: results.length });
    },

    /** POST /api/cms/webhook — Drupal webhook receiver */
    webhook: handleWebhook,

    /** POST /api/cms/tasks — Task CRUD */
    async tasks(req, res) {
      const { action, task, taskId, status, filters } = req.body;
      switch (action) {
        case 'create':
          const t = await createTask(task);
          return res.json({ created: !!t, task: t });
        case 'update_status':
          const ok = await updateTaskStatus(taskId, status);
          return res.json({ updated: ok });
        case 'list':
          const list = await listTasks(filters);
          return res.json({ tasks: list, count: list.length });
        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    },
  };
}
