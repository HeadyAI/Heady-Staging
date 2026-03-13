/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyKnowledge — RAG Knowledge Base ═══
 * Wave 2 Core Intelligence Service
 *
 * Agentic RAG over the entire Heady ecosystem.
 * Indexes repos, configs, skills, conversations, and DVC metadata.
 * Sub-agents per domain: code, infra, data, conversation.
 */

"use strict";

const crypto = require("crypto");

const PHI = 1.618033988749895;
const MAX_DOCS = Math.round(PHI * 10000); // 16180

class HeadyKnowledge {
  constructor() {
    this.documents = new Map();  // docId → { content, metadata, embedding, domain }
    this.domains = {
      code:         { label: "Code & Skills",      docCount: 0 },
      infra:        { label: "Infrastructure",      docCount: 0 },
      data:         { label: "Data & Models",        docCount: 0 },
      conversation: { label: "Conversations",       docCount: 0 },
      docs:         { label: "Documentation",       docCount: 0 },
      config:       { label: "Configuration",       docCount: 0 },
    };
    this.queries = [];
    this.metrics = { indexed: 0, queries: 0, hits: 0, misses: 0 };
  }

  // ── Indexing ─────────────────────────────────────────────────
  index(doc) {
    const id = doc.id || `doc-${crypto.randomUUID()}`;
    const domain = doc.domain || "docs";
    const entry = {
      id,
      content: doc.content,
      metadata: doc.metadata || {},
      domain,
      source: doc.source || null,
      indexedAt: Date.now(),
      // Simple TF vector (in production, use real embeddings)
      terms: this._tokenize(doc.content),
    };

    this.documents.set(id, entry);
    if (this.domains[domain]) this.domains[domain].docCount++;
    this.metrics.indexed++;

    // Evict oldest if over limit
    if (this.documents.size > MAX_DOCS) {
      const oldest = this.documents.keys().next().value;
      this.documents.delete(oldest);
    }
    return id;
  }

  indexBatch(docs) {
    return docs.map(d => this.index(d));
  }

  // ── Query (BM25-style keyword matching) ──────────────────────
  query(queryText, opts = {}) {
    const { domain, limit = 10, minScore = 0.1 } = opts;
    const queryTerms = this._tokenize(queryText);
    this.metrics.queries++;

    const scored = [];
    for (const [id, doc] of this.documents) {
      if (domain && doc.domain !== domain) continue;
      const score = this._score(queryTerms, doc.terms);
      if (score >= minScore) scored.push({ id, score, domain: doc.domain, source: doc.source, snippet: doc.content.slice(0, 200) });
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit);

    if (results.length > 0) this.metrics.hits++;
    else this.metrics.misses++;

    this.queries.push({ query: queryText, domain, resultCount: results.length, ts: Date.now() });
    if (this.queries.length > 1000) this.queries = this.queries.slice(-500);

    return results;
  }

  // ── Retrieve full document ───────────────────────────────────
  get(docId) {
    return this.documents.get(docId) || null;
  }

  // ── Tokenization ─────────────────────────────────────────────
  _tokenize(text) {
    if (!text) return {};
    const terms = {};
    const words = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(w => w.length > 2);
    for (const w of words) terms[w] = (terms[w] || 0) + 1;
    return terms;
  }

  _score(queryTerms, docTerms) {
    let score = 0, matches = 0;
    for (const [term, qFreq] of Object.entries(queryTerms)) {
      if (docTerms[term]) { score += Math.min(qFreq, docTerms[term]); matches++; }
    }
    const queryLen = Object.keys(queryTerms).length;
    return queryLen > 0 ? (score / queryLen) * (matches / queryLen) : 0;
  }

  // ── Health ───────────────────────────────────────────────────
  getHealth() {
    return {
      status: this.documents.size > 0 ? "healthy" : "empty",
      totalDocuments: this.documents.size,
      domains: this.domains,
      metrics: this.metrics,
      recentQueries: this.queries.slice(-10).map(q => ({ query: q.query, results: q.resultCount })),
      ts: new Date().toISOString(),
    };
  }
}

const knowledge = new HeadyKnowledge();

function registerKnowledgeRoutes(app) {
  app.post("/api/knowledge/index", (req, res) => {
    const id = knowledge.index(req.body);
    res.json({ ok: true, id });
  });

  app.post("/api/knowledge/index-batch", (req, res) => {
    const ids = knowledge.indexBatch(req.body.documents || []);
    res.json({ ok: true, indexed: ids.length, ids });
  });

  app.post("/api/knowledge/query", (req, res) => {
    const { query, domain, limit } = req.body;
    if (!query) return res.status(400).json({ ok: false, error: "query required" });
    const results = knowledge.query(query, { domain, limit });
    res.json({ ok: true, results });
  });

  app.get("/api/knowledge/doc/:id", (req, res) => {
    const doc = knowledge.get(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, doc });
  });

  app.get("/api/knowledge/health", (req, res) => res.json({ ok: true, ...knowledge.getHealth() }));
}

module.exports = { HeadyKnowledge, knowledge, registerKnowledgeRoutes };
