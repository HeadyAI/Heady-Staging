/**
 * Registry Loader
 * Loads Heady™ node/service registry data from config files.
 * © 2026 Heady™Systems Inc.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const REGISTRY_PATHS = [
    path.join(ROOT, 'configs', 'heady-registry.json'),
    path.join(ROOT, 'configs', 'registry.json'),
    path.join(ROOT, 'data', 'registry.json'),
];

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Load the registry from disk.
 * Returns a structured { nodes, services, version } object.
 * @returns {{ nodes: Object, services: Object, version: string, loaded: boolean }}
 */
function loadRegistry() {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL_MS) {
        return _cache;
    }

    for (const registryPath of REGISTRY_PATHS) {
        try {
            if (fs.existsSync(registryPath)) {
                const raw = fs.readFileSync(registryPath, 'utf8');
                const data = JSON.parse(raw);
                _cache = {
                    nodes: data.nodes || {},
                    services: data.services || {},
                    version: data.version || '1.0.0',
                    loaded: true,
                    source: registryPath.replace(ROOT + '/', ''),
                };
                _cacheTime = now;
                return _cache;
            }
        } catch (_e) {
            // try next
        }
    }

    // Return empty registry if no file found
    const empty = { nodes: {}, services: {}, version: '0.0.0', loaded: false, source: null };
    _cache = empty;
    _cacheTime = now;
    return empty;
}

/**
 * Reload the registry, bypassing cache.
 */
function reloadRegistry() {
    _cache = null;
    _cacheTime = 0;
    return loadRegistry();
}

/**
 * Get a single node by ID.
 * @param {string} id
 */
function getNode(id) {
    const reg = loadRegistry();
    return reg.nodes[id] || null;
}

/**
 * Get all active nodes.
 */
function getActiveNodes() {
    const reg = loadRegistry();
    return Object.entries(reg.nodes || {})
        .filter(([, n]) => n.status === 'active')
        .map(([id, n]) => ({ id, ...n }));
}

/**
 * Get all services.
 */
function getServices() {
    const reg = loadRegistry();
    return reg.services || {};
}

module.exports = { loadRegistry, reloadRegistry, getNode, getActiveNodes, getServices };
