/**
 * ∞ Patent Concept Registry — Heady™ IP Tracking System
 *
 * Tracks patentable concepts, innovations, and intellectual property
 * developed within the Heady™ ecosystem. Provides registration,
 * lookup, and prior-art analysis capabilities.
 *
 * © 2026 Heady™Systems Inc. All rights reserved.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const REGISTRY_PATH = path.join(__dirname, '..', '..', 'db', 'patent-concepts.json');

// In-memory registry
let _registry = [];
let _initialized = false;

/**
 * Load the registry from disk if available.
 */
function _load() {
    if (_initialized) return;
    _initialized = true;
    try {
        if (fs.existsSync(REGISTRY_PATH)) {
            const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
            _registry = JSON.parse(data);
        }
    } catch (_e) {
        _registry = [];
    }
}

/**
 * Save the registry to disk.
 */
function _save() {
    try {
        const dir = path.dirname(REGISTRY_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(_registry, null, 2), 'utf8');
    } catch (_e) { /* non-critical */ }
}

/**
 * Generate a concept ID.
 * @param {string} name
 * @returns {string}
 */
function _genId(name) {
    return 'PC-' + crypto.createHash('sha256').update(name + Date.now()).digest('hex').slice(0, 8).toUpperCase();
}

/**
 * Register a new patentable concept.
 * @param {Object} concept
 * @param {string} concept.name - Concept name
 * @param {string} concept.description - Full description
 * @param {string} [concept.category] - Category (algorithm, system, method, etc.)
 * @param {string[]} [concept.tags] - Discovery tags
 * @param {string} [concept.inventor] - Inventor name or system
 * @returns {Object} Registered concept with ID
 */
function register(concept) {
    _load();
    const id = _genId(concept.name);
    const entry = {
        id,
        name: concept.name,
        description: concept.description || '',
        category: concept.category || 'general',
        tags: concept.tags || [],
        inventor: concept.inventor || 'HeadySystems AI',
        filedAt: new Date().toISOString(),
        status: 'pending',
        noveltyScore: concept.noveltyScore || null,
        priorArt: [],
    };
    _registry.push(entry);
    _save();
    return entry;
}

/**
 * Look up a concept by ID or name.
 * @param {string} query - ID or name
 * @returns {Object|null}
 */
function lookup(query) {
    _load();
    return _registry.find(c => c.id === query || c.name.toLowerCase() === query.toLowerCase()) || null;
}

/**
 * Search concepts by keyword.
 * @param {string} keyword
 * @returns {Object[]}
 */
function search(keyword) {
    _load();
    const q = keyword.toLowerCase();
    return _registry.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.toLowerCase().includes(q))
    );
}

/**
 * Get all registered concepts.
 * @returns {Object[]}
 */
function getAll() {
    _load();
    return [..._registry];
}

/**
 * Update concept status.
 * @param {string} id
 * @param {string} status - 'pending' | 'filed' | 'granted' | 'rejected'
 * @returns {boolean}
 */
function updateStatus(id, status) {
    _load();
    const entry = _registry.find(c => c.id === id);
    if (!entry) return false;
    entry.status = status;
    entry.updatedAt = new Date().toISOString();
    _save();
    return true;
}

/**
 * Get registry statistics.
 * @returns {Object}
 */
function getStats() {
    _load();
    const byStatus = _registry.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
    }, {});
    const byCategory = _registry.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
    }, {});
    return {
        total: _registry.length,
        byStatus,
        byCategory,
        ts: new Date().toISOString(),
    };
}

module.exports = {
    register,
    lookup,
    search,
    getAll,
    updateStatus,
    getStats,
};
