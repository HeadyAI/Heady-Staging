/**
 * Heady™ Feature Flags — φ-Scaled Rollout
 * Rollout stages: 6.18% → 38.2% → 61.8% → 100%
 * Stored in Cloudflare KV for edge-fast reads
 * © 2026 HeadySystems Inc.
 */

const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;

// φ-scaled rollout stages
const ROLLOUT_STAGES = [
    PSI2 * PSI * 100,   // ≈ 6.18% (ψ³ × 100 — Fibonacci-level cautious)
    PSI2 * 100,          // ≈ 38.2% (ψ² × 100)
    PSI * 100,           // ≈ 61.8% (ψ × 100)
    100,                 // 100% — full rollout
];

// In-memory flag store (production: Cloudflare KV or Redis)
const flags = new Map();

class FeatureFlags {
    constructor(store = null) {
        this.store = store || flags; // Pluggable: KV, Redis, or Map
    }

    /**
     * Register a feature flag
     */
    register(name, config = {}) {
        this.store.set(name, {
            name,
            enabled: config.enabled ?? false,
            rolloutPercent: config.rolloutPercent ?? 0,
            cslGate: config.cslGate ?? PSI2, // Default CSL confidence threshold
            killSwitch: config.killSwitch ?? false,
            createdAt: new Date().toISOString(),
            ...config,
        });
    }

    /**
     * Check if flag is enabled for a user
     * Uses deterministic hash of userId for consistent rollout
     */
    isEnabled(name, userId = '') {
        const flag = this.store.get(name);
        if (!flag || !flag.enabled || flag.killSwitch) return false;

        // 100% rollout — everyone gets it
        if (flag.rolloutPercent >= 100) return true;

        // Deterministic hash for consistent user experience
        const hash = this._hashUserId(userId, name);
        const bucket = hash % 10000; // 0–9999 for 0.01% precision
        const threshold = flag.rolloutPercent * 100; // Convert to same scale

        return bucket < threshold;
    }

    /**
     * Advance rollout to next φ-scaled stage
     */
    advanceRollout(name) {
        const flag = this.store.get(name);
        if (!flag) return null;

        const currentStageIdx = ROLLOUT_STAGES.findIndex(s => s >= flag.rolloutPercent);
        const nextStageIdx = Math.min(currentStageIdx + 1, ROLLOUT_STAGES.length - 1);

        flag.rolloutPercent = ROLLOUT_STAGES[nextStageIdx];
        flag.lastAdvanced = new Date().toISOString();
        this.store.set(name, flag);

        return flag;
    }

    /**
     * Kill switch — instantly disable a flag
     */
    kill(name) {
        const flag = this.store.get(name);
        if (flag) {
            flag.killSwitch = true;
            flag.killedAt = new Date().toISOString();
            this.store.set(name, flag);
        }
    }

    /**
     * Get all flags status
     */
    getAll() {
        return Object.fromEntries(this.store);
    }

    /**
     * Deterministic hash for consistent rollout
     */
    _hashUserId(userId, flagName) {
        const str = `${userId}:${flagName}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}

// Express middleware
function featureFlagMiddleware(flagService) {
    return (req, res, next) => {
        req.flags = {
            isEnabled: (name) => flagService.isEnabled(name, req.user?.uid || req.ip),
        };
        next();
    };
}

module.exports = { FeatureFlags, featureFlagMiddleware, ROLLOUT_STAGES };
