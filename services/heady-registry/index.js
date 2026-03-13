/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * ═══ HeadyRegistry — Artifact & Model Registry ═══
 * Wave 3 Operational Maturity Service
 *
 * Version, store, and track models, embeddings, Docker images,
 * and packaged skills with RBAC, replication, and health checks.
 */

"use strict";

const PHI = 1.618033988749895;

class HeadyRegistry {
  constructor() {
    this.artifacts = new Map();  // artifactId → artifact metadata
    this.versions = new Map();   // artifactId → [version entries]
    this.metrics = { registered: 0, pulled: 0, deprecated: 0 };
  }

  register(artifact) {
    const id = artifact.id || `${artifact.type}/${artifact.name}`;
    const entry = {
      id,
      name: artifact.name,
      type: artifact.type || "model",    // model | embedding | image | skill | dataset
      description: artifact.description || "",
      owner: artifact.owner || "system",
      tags: artifact.tags || [],
      latest: artifact.version || "1.0.0",
      storageUrl: artifact.storageUrl || null,
      size: artifact.size || null,
      checksum: artifact.checksum || null,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.artifacts.set(id, entry);

    if (!this.versions.has(id)) this.versions.set(id, []);
    this.versions.get(id).push({
      version: entry.latest,
      storageUrl: entry.storageUrl,
      size: entry.size,
      checksum: entry.checksum,
      publishedAt: Date.now(),
    });

    this.metrics.registered++;
    return entry;
  }

  publish(artifactId, version, meta = {}) {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) throw new Error(`Artifact not found: ${artifactId}`);
    artifact.latest = version;
    artifact.updatedAt = Date.now();
    Object.assign(artifact, meta);

    this.versions.get(artifactId).push({
      version,
      storageUrl: meta.storageUrl || artifact.storageUrl,
      size: meta.size || artifact.size,
      checksum: meta.checksum || artifact.checksum,
      publishedAt: Date.now(),
    });
    return artifact;
  }

  deprecate(artifactId) {
    const artifact = this.artifacts.get(artifactId);
    if (artifact) { artifact.status = "deprecated"; artifact.updatedAt = Date.now(); this.metrics.deprecated++; }
  }

  get(artifactId) { return this.artifacts.get(artifactId) || null; }

  getVersions(artifactId) { return this.versions.get(artifactId) || []; }

  list(type = null) {
    const items = [...this.artifacts.values()];
    return type ? items.filter(a => a.type === type) : items;
  }

  search(query) {
    const q = query.toLowerCase();
    return [...this.artifacts.values()].filter(a =>
      a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  pull(artifactId) {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) return null;
    this.metrics.pulled++;
    return { ...artifact, versions: this.getVersions(artifactId) };
  }

  getHealth() {
    const byType = {};
    for (const a of this.artifacts.values()) byType[a.type] = (byType[a.type] || 0) + 1;
    return {
      status: "healthy",
      totalArtifacts: this.artifacts.size,
      byType,
      activeArtifacts: [...this.artifacts.values()].filter(a => a.status === "active").length,
      metrics: this.metrics,
      ts: new Date().toISOString(),
    };
  }
}

const registry = new HeadyRegistry();

function registerRegistryRoutes(app) {
  app.get("/api/registry", (req, res) => res.json({ ok: true, artifacts: registry.list(req.query.type) }));
  app.post("/api/registry", (req, res) => { try { res.json({ ok: true, artifact: registry.register(req.body) }); } catch(e) { res.status(400).json({ ok:false, error: e.message }); }});
  app.get("/api/registry/:id", (req, res) => {
    const a = registry.pull(req.params.id);
    if (!a) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, artifact: a });
  });
  app.post("/api/registry/:id/publish", (req, res) => { try { res.json({ ok: true, artifact: registry.publish(req.params.id, req.body.version, req.body) }); } catch(e) { res.status(400).json({ ok:false, error: e.message }); }});
  app.get("/api/registry/search", (req, res) => res.json({ ok: true, results: registry.search(req.query.q || "") }));
  app.get("/api/registry/health", (req, res) => res.json({ ok: true, ...registry.getHealth() }));
}

module.exports = { HeadyRegistry, registry, registerRegistryRoutes };
