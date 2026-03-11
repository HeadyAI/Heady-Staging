/* HEADY_BRAND:BEGIN
 * HeadyOS Shell — Global API Client & Shared Utilities
 * Include via: <script src="/heady-shell.js"></script>
 * Exposes: window.HeadyOS  (API client, event bus, utilities)
 * HEADY_BRAND:END */

(function (global) {
  'use strict';

  // ──────────────────────────────────────────────────────────────────
  //  API Resolution — tries multiple endpoints, caches the winner
  // ──────────────────────────────────────────────────────────────────
  const CANDIDATE_URLS = [
    window.location.origin + '/api',
    'https://heady-manager-headyme.headysystems.com/api',
    'https://heady-manager-headysystems.headysystems.com/api',
    'https://heady-manager-headyconnection.headysystems.com/api',
  ];

  let _resolvedBase = null;
  let _resolvePromise = null;

  async function resolveApi() {
    if (_resolvedBase) return _resolvedBase;
    if (_resolvePromise) return _resolvePromise;

    _resolvePromise = (async () => {
      for (const url of CANDIDATE_URLS) {
        try {
          const r = await fetch(url + '/health', {
            signal: AbortSignal.timeout(3000),
            headers: { Accept: 'application/json' },
          });
          if (r.ok) {
            _resolvedBase = url;
            console.info('[HeadyOS] API →', url);
            return url;
          }
        } catch (_) { /* try next */ }
      }
      _resolvedBase = CANDIDATE_URLS[0]; // fallback
      console.warn('[HeadyOS] API fallback →', _resolvedBase);
      return _resolvedBase;
    })();

    return _resolvePromise;
  }

  // ──────────────────────────────────────────────────────────────────
  //  HTTP helpers
  // ──────────────────────────────────────────────────────────────────
  async function apiFetch(path, options = {}) {
    const base = await resolveApi();
    const url = base + path;
    const defaults = {
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      signal: options.signal || AbortSignal.timeout(8000),
    };
    return fetch(url, { ...options, ...defaults });
  }

  async function apiGet(path) {
    try {
      const r = await apiFetch(path);
      if (!r.ok) return null;
      return r.json();
    } catch (_) { return null; }
  }

  async function apiPost(path, body) {
    try {
      const r = await apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      return r.json();
    } catch (_) { return null; }
  }

  // ──────────────────────────────────────────────────────────────────
  //  Simple Event Bus
  // ──────────────────────────────────────────────────────────────────
  const _listeners = {};

  function on(event, fn) {
    (_listeners[event] = _listeners[event] || []).push(fn);
  }

  function off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(f => f !== fn);
  }

  function emit(event, data) {
    (_listeners[event] || []).forEach(fn => fn(data));
  }

  // ──────────────────────────────────────────────────────────────────
  //  Live Status Polling
  // ──────────────────────────────────────────────────────────────────
  let _statusInterval = null;
  let _lastStatus = null;

  async function fetchStatus() {
    const [health, stats] = await Promise.all([
      apiGet('/health'),
      apiGet('/system/status'),
    ]);

    const status = {
      online: !!health,
      status: health?.status || 'offline',
      uptime: health?.uptime || 0,
      nodes: stats?.nodes || { active: 0, total: 0 },
      pipeline: stats?.pipeline || { state: 'unknown', runs: 0 },
      ors: stats?.ors || null,
      timestamp: Date.now(),
    };

    _lastStatus = status;
    emit('status:update', status);
    return status;
  }

  function startPolling(intervalMs = 30000) {
    fetchStatus(); // immediate
    _statusInterval = setInterval(fetchStatus, intervalMs);

    // Slow down when tab hidden
    document.addEventListener('visibilitychange', () => {
      clearInterval(_statusInterval);
      if (!document.hidden) {
        fetchStatus();
        _statusInterval = setInterval(fetchStatus, intervalMs);
      } else {
        _statusInterval = setInterval(fetchStatus, intervalMs * 3);
      }
    });
  }

  function stopPolling() {
    clearInterval(_statusInterval);
  }

  function getLastStatus() {
    return _lastStatus;
  }

  // ──────────────────────────────────────────────────────────────────
  //  DOM Utilities
  // ──────────────────────────────────────────────────────────────────
  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function setTextSafe(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatUptime(seconds) {
    if (!seconds) return '--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // ──────────────────────────────────────────────────────────────────
  //  Standard status auto-bind
  //  Looks for elements with data-heady="field-name" and populates them
  //  Supported fields: status, nodes-active, nodes-total, pipeline-state,
  //                    pipeline-runs, ors, uptime
  // ──────────────────────────────────────────────────────────────────
  function autoBind() {
    on('status:update', (s) => {
      const map = {
        'status':         s.online ? s.status : 'Offline',
        'nodes-active':   String(s.nodes.active),
        'nodes-total':    String(s.nodes.total),
        'pipeline-state': s.pipeline.state,
        'pipeline-runs':  String(s.pipeline.runs),
        'ors':            s.ors != null ? String(s.ors) : '--',
        'uptime':         formatUptime(s.uptime),
      };

      $$('[data-heady]').forEach(el => {
        const key = el.getAttribute('data-heady');
        if (key in map) el.textContent = map[key];
      });

      // Connection indicator
      $$('[data-heady-online]').forEach(el => {
        el.classList.toggle('offline', !s.online);
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────────────────────────
  const HeadyOS = {
    // API
    resolveApi,
    fetch: apiFetch,
    get: apiGet,
    post: apiPost,

    // Events
    on,
    off,
    emit,

    // Status
    fetchStatus,
    startPolling,
    stopPolling,
    getLastStatus,

    // DOM
    $,
    $$,
    setTextSafe,
    formatUptime,
    autoBind,

    // Version
    version: '2.0.0',
  };

  global.HeadyOS = HeadyOS;

  // Auto-initialize: bind data-heady elements on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBind);
  } else {
    autoBind();
  }

})(window);
