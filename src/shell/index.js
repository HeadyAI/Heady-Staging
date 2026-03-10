const logger = require('../shared/logger')('index');
/*
 * © 2026 Heady™Systems Inc..
 * PROPRIETARY AND CONFIDENTIAL.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * HeadyWeb Universal Shell — Entry Point
 * ═══════════════════════════════════════════════════════════════
 *
 * The single entry point for ALL Heady™ web products.
 * DNS for every Heady™ domain routes to this shell, which:
 *   1. Reads the domain via domain-router.js
 *   2. Resolves the target UI from ui-registry.js
 *   3. Loads the micro-frontend via loadDynamicRemote()
 *   4. Mounts it into the shell container
 *
 * This is what webpack.config.js builds when isRemote=false.
 */

const { loadDynamicRemote, mountRemote, preloadRemote } = require('./load-dynamic-remote');

// ── Shell Configuration ─────────────────────────────────────────
const SHELL_VERSION = '3.0.1';

const REMOTE_REGISTRY = {
    'antigravity': {
        url: '/remotes/antigravity/remoteEntry.js',
        scope: 'antigravity',
        module: './App',
    },
    'landing': {
        url: '/remotes/landing/remoteEntry.js',
        scope: 'headyLanding',
        module: './App',
    },
    'heady-ide': {
        url: '/remotes/heady-ide/remoteEntry.js',
        scope: 'headyIDE',
        module: './App',
    },
    'swarm-dashboard': {
        url: '/remotes/swarm-dashboard/remoteEntry.js',
        scope: 'swarmDashboard',
        module: './App',
    },
    'governance-panel': {
        url: '/remotes/governance/remoteEntry.js',
        scope: 'governancePanel',
        module: './App',
    },
    'projection-monitor': {
        url: '/remotes/projections/remoteEntry.js',
        scope: 'projectionMonitor',
        module: './App',
    },
    'vector-explorer': {
        url: '/remotes/vectors/remoteEntry.js',
        scope: 'vectorExplorer',
        module: './App',
    },
};

// ── Shell Boot ──────────────────────────────────────────────────

/**
 * Boot the Heady™Web shell:
 *   • Resolve which UI to show based on hostname
 *   • Load the corresponding micro-frontend
 *   • Mount into #heady-root
 */
async function bootShell() {
    const container = document.getElementById('heady-root');
    if (!container) {
        logger.error('[HeadyShell] #heady-root not found');
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div class="heady-shell-loading">
            <div class="heady-shell-spinner"></div>
            <p>Loading Heady…</p>
        </div>
    `;

    try {
        // Step 1: Ask the API which UI to project
        const response = await fetch('/api/domains/current');
        const projection = await response.json();

        logger.info(`[HeadyShell] Domain resolved → ${projection.uiId} (${projection.category})`);

        // Step 2: Look up the remote config
        const remote = REMOTE_REGISTRY[projection.uiId];

        if (!remote) {
            // Fallback: render the landing page
            logger.warn(`[HeadyShell] No remote registered for "${projection.uiId}", falling back to landing`);
            container.innerHTML = renderFallbackUI(projection);
            return;
        }

        // Step 3: Mount the micro-frontend
        await mountRemote({
            url: remote.url,
            scope: remote.scope,
            module: remote.module,
            container,
            props: {
                shellVersion: SHELL_VERSION,
                projection,
            },
        });

        logger.info(`[HeadyShell] Mounted ${projection.uiId} successfully`);

    } catch (error) {
        logger.error('[HeadyShell] Boot error:', error);
        container.innerHTML = renderErrorUI(error);
    }
}

// ── Preload Strategy ────────────────────────────────────────────
function preloadFrequentRemotes() {
    // Preload the most commonly visited UIs
    const preloadTargets = ['antigravity', 'landing'];
    for (const target of preloadTargets) {
        const remote = REMOTE_REGISTRY[target];
        if (remote) {
            preloadRemote(remote.url, remote.scope);
        }
    }
}

// ── Fallback UIs ────────────────────────────────────────────────
function renderFallbackUI(projection) {
    return `
        <div class="heady-shell-fallback">
            <h1>🐝 Heady™</h1>
            <p>Welcome to <strong>${projection.hostname || 'Heady'}</strong></p>
            <p class="heady-shell-meta">
                UI: ${projection.uiId} · Category: ${projection.category}
            </p>
            <p>This experience is coming soon.</p>
            <a href="https://headyme.com" class="heady-shell-link">← Back to HeadyMe</a>
        </div>
    `;
}

function renderErrorUI(error) {
    return `
        <div class="heady-shell-error">
            <h2>⚠️ Shell Error</h2>
            <p>${error.message}</p>
            <button onclick="location.reload()">Retry</button>
        </div>
    `;
}

// ── Boot ────────────────────────────────────────────────────────
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        preloadFrequentRemotes();
        bootShell();
    });
}

// Node.js export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { bootShell, REMOTE_REGISTRY, SHELL_VERSION };
}
