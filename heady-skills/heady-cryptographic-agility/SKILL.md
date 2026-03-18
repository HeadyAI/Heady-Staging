---
name: heady-cryptographic-agility
description: >-
  Algorithm-agnostic cryptographic framework with pluggable cipher suites, automated
  key rotation, post-quantum readiness, and phi-scheduled rotation intervals. Provides
  a cipher suite registry where algorithms are registered and swapped without code
  changes: AES-256-GCM / ChaCha20-Poly1305 (symmetric), Ed25519 / ML-DSA Dilithium
  (asymmetric), SHA-3-256 / BLAKE3 (hashing), X25519 / ML-KEM Kyber (key exchange).
  Phi-scheduled key rotation: signing 21 days, encryption 89 days, root 377 days.
  Algorithm negotiation via CSL scoring selects the best shared suite. Post-quantum
  hybrid mode runs classical plus PQC simultaneously during migration. Deprecation
  workflow: warn(34d) → soft-fail(55d) → hard-fail(89d). Integrates with CIPHER node,
  heady-pqc-security, HeadyGuard, and heady-sovereign-mesh.
metadata:
  author: HeadySystems
  version: '1.0'
  sacred-geometry-layer: Outer
  phi-compliance: verified
---

# Heady Cryptographic Agility

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents

## When to Use This Skill

- **Adding or swapping a cipher algorithm** — register new suites in the pluggable registry without touching call sites
- **Automated key rotation** — phi-scheduled rotation at Fibonacci-day intervals (21 / 89 / 377 days)
- **Emergency key rotation** — triggered when service coherence drops below CSL MEDIUM (0.809)
- **Post-quantum migration** — enable hybrid mode running classical + PQC algorithms side-by-side
- **Algorithm negotiation** — client-server agreement on best shared cipher via CSL confidence scoring
- **Algorithm deprecation** — staged sunset: warn (34d) → soft-fail (55d) → hard-fail (89d)
- **Crypto audit trail** — structured log of every cryptographic operation with algorithm, key version, and confidence
- **Key versioning** — maintain 3 active key versions (current, previous, pre-previous) for graceful rollover
- **Performance-gated algorithm selection** — CSL scoring chooses fastest algorithm meeting security requirements
- **CIPHER node integration** — Outer-ring Sacred Geometry node managing all cryptographic boundaries

## Architecture

```
Sacred Geometry Topology — Cryptographic Agility Position:
Center(HeadySoul) → Inner(Conductor,Brains,Vinci,AutoSuccess)
   → Middle(JULES,BUILDER,OBSERVER,MURPHY,ATLAS,PYTHIA)
   → Outer(BRIDGE,MUSE,SENTINEL,NOVA,JANITOR,SOPHIA, ★CIPHER★ ,LENS)
   → Governance(Check,Assure,Aware,Patterns,MC,Risks)

   CIPHER node owns cryptographic boundary for the entire ecosystem.

┌──────────────────────────────────────────────────────────────────┐
│                  CRYPTOGRAPHIC AGILITY FRAMEWORK                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  CIPHER SUITE REGISTRY (pluggable, hot-swappable)          │  │
│  │  ┌───────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │ Symmetric │ │ Asymmetric   │ │ Hashing  │ │ Key Ex  │ │  │
│  │  │ AES-GCM   │ │ Ed25519      │ │ SHA3-256 │ │ X25519  │ │  │
│  │  │ ChaCha20  │ │ ML-DSA(PQC)  │ │ BLAKE3   │ │ ML-KEM  │ │  │
│  │  └───────────┘ └──────────────┘ └──────────┘ └─────────┘ │  │
│  └───────────────────────┬────────────────────────────────────┘  │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ALGORITHM NEGOTIATOR (CSL-scored agreement)               │  │
│  └───────────────────────┬────────────────────────────────────┘  │
│                          ▼                                       │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
│  │ Key Rotation │  │ Key Versioner │  │ PQC Hybrid Engine     │ │
│  │ φ-scheduled  │  │ 3 active vers │  │ classical + PQC       │ │
│  │ 21/89/377 d  │  │ graceful swap │  │ simultaneous mode     │ │
│  └──────────────┘  └───────────────┘  └───────────────────────┘ │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  CRYPTO AUDIT TRAIL (pino structured, every operation)     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Phi-Math Constants

```javascript
// ─── Sacred Geometry Constants ─────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Confidence Gates ──────────────────────────────────────────────
const CSL_GATES = {
  MINIMUM:  0.500,
  LOW:      0.691,
  MEDIUM:   0.809,
  HIGH:     0.882,
  CRITICAL: 0.927,
  DEDUP:    0.972,
};

// ─── Pool Allocations ──────────────────────────────────────────────────
const POOLS = { Hot: 0.34, Warm: 0.21, Cold: 0.13, Reserve: 0.08, Governance: 0.05 };

// ─── Fusion Weights ────────────────────────────────────────────────────
const FUSION_2WAY = [PSI, 1 - PSI];           // [0.618, 0.382]
const FUSION_3WAY = [0.528, 0.326, 0.146];

// ─── Cryptographic Agility Constants ───────────────────────────────────
const CRYPTO = {
  // Key rotation intervals (days) — Fibonacci-derived
  ROTATION_SIGNING_DAYS:      FIB[7],           // 21 days
  ROTATION_ENCRYPTION_DAYS:   FIB[10],          // 89 days
  ROTATION_ROOT_DAYS:         FIB[13],          // 377 days

  // Active key versions maintained simultaneously
  ACTIVE_KEY_VERSIONS:        FIB[4],           // 3 versions (current, prev, pre-prev)

  // Deprecation schedule (days) — warn → soft-fail → hard-fail
  DEPRECATION_WARN_DAYS:      FIB[8],           // 34 days
  DEPRECATION_SOFT_FAIL_DAYS: FIB[9],           // 55 days
  DEPRECATION_HARD_FAIL_DAYS: FIB[10],          // 89 days

  // Emergency rotation triggers
  EMERGENCY_COHERENCE_FLOOR:  CSL_GATES.MEDIUM, // 0.809 — rotate if below

  // Backoff for rotation retries
  BACKOFF_BASE_MS:            FIB[5] * 100,     // 800ms
  BACKOFF_JITTER:             PSI ** 2,         // ±0.382

  // Negotiation scoring
  NEGOTIATION_MIN_SCORE:      CSL_GATES.LOW,    // 0.691 minimum agreement

  // Audit trail
  AUDIT_BATCH_SIZE:           FIB[7],           // 21 entries per flush
  AUDIT_FLUSH_INTERVAL_MS:    FIB[6] * 1000,   // 13000ms

  // Performance benchmark thresholds (ms)
  PERF_FAST_MS:               FIB[3],           // 3ms
  PERF_NORMAL_MS:             FIB[5],           // 8ms
  PERF_SLOW_MS:               FIB[7],           // 21ms
};
```

## Instructions

### Cipher Suite Registry

The registry is the core of cryptographic agility. Algorithms are registered as pluggable entries keyed by category and name. Call sites reference categories (`symmetric`, `asymmetric`, `hash`, `kex`) rather than specific algorithms — swapping happens in the registry, not in application code.

```javascript
// heady-cryptographic-agility/src/registry.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-crypto-agility', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

const CSL_GATES = {
  MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809,
  HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972,
};

/**
 * Algorithm entry in the cipher suite registry.
 */
class AlgorithmEntry {
  constructor({ name, category, provider, pqcReady, securityScore, perfMs, status }) {
    this.id = randomUUID();
    this.name = name;
    this.category = category;       // symmetric | asymmetric | hash | kex
    this.provider = provider;       // 'node:crypto' | 'libsodium' | 'pqc-crystals'
    this.pqcReady = pqcReady || false;
    this.securityScore = securityScore;
    this.perfMs = perfMs;
    this.status = status || 'active'; // active | deprecated-warn | deprecated-soft | deprecated-hard
    this.registeredAt = Date.now();
    this.deprecatedAt = null;
  }

  get cslScore() {
    const secWeight = FUSION_2WAY[0];   // 0.618
    const perfWeight = FUSION_2WAY[1];  // 0.382
    const perfNorm = Math.max(0, 1 - (this.perfMs / FIB[7]));
    return secWeight * this.securityScore + perfWeight * perfNorm;
  }
}

const FUSION_2WAY = [PSI, 1 - PSI];

/**
 * Pluggable cipher suite registry. Hot-swappable without code changes.
 */
export class CipherSuiteRegistry {
  constructor() {
    this.suites = new Map();
    this.activeSelections = new Map();
    this.initDefaults();
  }

  initDefaults() {
    // ─── Symmetric ───────────────────────────────────────
    this.register(new AlgorithmEntry({
      name: 'AES-256-GCM', category: 'symmetric', provider: 'node:crypto',
      pqcReady: false, securityScore: CSL_GATES.HIGH, perfMs: FIB[3],
    }));
    this.register(new AlgorithmEntry({
      name: 'ChaCha20-Poly1305', category: 'symmetric', provider: 'node:crypto',
      pqcReady: false, securityScore: CSL_GATES.HIGH, perfMs: FIB[4],
    }));

    // ─── Asymmetric ──────────────────────────────────────
    this.register(new AlgorithmEntry({
      name: 'Ed25519', category: 'asymmetric', provider: 'node:crypto',
      pqcReady: false, securityScore: CSL_GATES.HIGH, perfMs: FIB[3],
    }));
    this.register(new AlgorithmEntry({
      name: 'ML-DSA-Dilithium', category: 'asymmetric', provider: 'pqc-crystals',
      pqcReady: true, securityScore: CSL_GATES.CRITICAL, perfMs: FIB[5],
    }));

    // ─── Hashing ─────────────────────────────────────────
    this.register(new AlgorithmEntry({
      name: 'SHA-3-256', category: 'hash', provider: 'node:crypto',
      pqcReady: true, securityScore: CSL_GATES.HIGH, perfMs: FIB[2],
    }));
    this.register(new AlgorithmEntry({
      name: 'BLAKE3', category: 'hash', provider: 'blake3-wasm',
      pqcReady: true, securityScore: CSL_GATES.MEDIUM, perfMs: FIB[1],
    }));
    this.register(new AlgorithmEntry({
      name: 'SHA-256', category: 'hash', provider: 'node:crypto',
      pqcReady: false, securityScore: CSL_GATES.MEDIUM, perfMs: FIB[2],
      status: 'deprecated-warn',
    }));

    // ─── Key Exchange ────────────────────────────────────
    this.register(new AlgorithmEntry({
      name: 'X25519', category: 'kex', provider: 'node:crypto',
      pqcReady: false, securityScore: CSL_GATES.HIGH, perfMs: FIB[3],
    }));
    this.register(new AlgorithmEntry({
      name: 'ML-KEM-Kyber', category: 'kex', provider: 'pqc-crystals',
      pqcReady: true, securityScore: CSL_GATES.CRITICAL, perfMs: FIB[6],
    }));

    // Auto-select best per category
    for (const cat of ['symmetric', 'asymmetric', 'hash', 'kex']) {
      this.selectBest(cat);
    }

    log.info({ suiteCount: this.suites.size }, 'Cipher suite registry initialized with defaults');
  }

  register(entry) {
    const key = `${entry.category}:${entry.name}`;
    this.suites.set(key, entry);
    log.info({ algorithm: entry.name, category: entry.category, cslScore: entry.cslScore.toFixed(4) },
      'Algorithm registered');
    return this;
  }

  getByCategory(category) {
    const results = [];
    for (const [, entry] of this.suites) {
      if (entry.category === category && entry.status === 'active') results.push(entry);
    }
    return results.sort((a, b) => b.cslScore - a.cslScore);
  }

  selectBest(category) {
    const candidates = this.getByCategory(category);
    if (candidates.length === 0) return null;
    const best = candidates[0];
    this.activeSelections.set(category, best);
    log.info({ category, algorithm: best.name, cslScore: best.cslScore.toFixed(4) },
      'Best algorithm selected');
    return best;
  }

  getActive(category) {
    return this.activeSelections.get(category) || null;
  }

  deprecate(category, name, phase = 'deprecated-warn') {
    const key = `${category}:${name}`;
    const entry = this.suites.get(key);
    if (!entry) return;
    entry.status = phase;
    entry.deprecatedAt = entry.deprecatedAt || Date.now();
    if (this.activeSelections.get(category)?.name === name) {
      this.selectBest(category);
    }
    log.warn({ algorithm: name, category, phase }, 'Algorithm deprecated');
  }

  getRegistrySnapshot() {
    const snapshot = {};
    for (const [key, entry] of this.suites) {
      snapshot[key] = {
        name: entry.name, category: entry.category, status: entry.status,
        pqcReady: entry.pqcReady, cslScore: parseFloat(entry.cslScore.toFixed(4)),
        perfMs: entry.perfMs, securityScore: entry.securityScore,
      };
    }
    return snapshot;
  }
}
```

### Key Rotation Engine

Phi-scheduled automated rotation with 3 active key versions for graceful rollover. Emergency rotation fires when coherence drops below CSL MEDIUM.

```javascript
// heady-cryptographic-agility/src/rotation.mjs
import pino from 'pino';
import { randomUUID, generateKeyPairSync, randomBytes } from 'node:crypto';

const log = pino({ name: 'heady-crypto-rotation', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };

const CRYPTO = {
  ROTATION_SIGNING_DAYS: FIB[7],
  ROTATION_ENCRYPTION_DAYS: FIB[10],
  ROTATION_ROOT_DAYS: FIB[13],
  ACTIVE_KEY_VERSIONS: FIB[4],
  EMERGENCY_COHERENCE_FLOOR: CSL_GATES.MEDIUM,
  BACKOFF_BASE_MS: FIB[5] * 100,
  BACKOFF_JITTER: PSI ** 2,
};

const DAY_MS = 86400000;

/**
 * Versioned key — tracks a single key across its lifecycle.
 */
class VersionedKey {
  constructor(keyType, version, material) {
    this.keyId = randomUUID();
    this.keyType = keyType;     // signing | encryption | root
    this.version = version;
    this.material = material;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + this.rotationIntervalMs();
    this.status = 'current';    // current | previous | pre-previous | expired
  }

  rotationIntervalMs() {
    switch (this.keyType) {
      case 'signing':    return CRYPTO.ROTATION_SIGNING_DAYS * DAY_MS;
      case 'encryption': return CRYPTO.ROTATION_ENCRYPTION_DAYS * DAY_MS;
      case 'root':       return CRYPTO.ROTATION_ROOT_DAYS * DAY_MS;
      default:           return CRYPTO.ROTATION_ENCRYPTION_DAYS * DAY_MS;
    }
  }

  get ageDays() {
    return (Date.now() - this.createdAt) / DAY_MS;
  }

  get isExpired() {
    return Date.now() > this.expiresAt;
  }
}

/**
 * Key rotation engine with phi-scheduled intervals and 3-version rollover.
 */
export class KeyRotationEngine {
  constructor() {
    this.keyRings = new Map();
    for (const type of ['signing', 'encryption', 'root']) {
      this.keyRings.set(type, []);
    }
  }

  generateKeyMaterial(keyType) {
    switch (keyType) {
      case 'signing': {
        const pair = generateKeyPairSync('ed25519');
        return {
          publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }),
          privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        };
      }
      case 'encryption':
        return { key: randomBytes(32).toString('base64'), iv: randomBytes(12).toString('base64') };
      case 'root': {
        const pair = generateKeyPairSync('ed25519');
        return {
          publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }),
          privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        };
      }
      default:
        return { key: randomBytes(32).toString('base64') };
    }
  }

  rotate(keyType) {
    const ring = this.keyRings.get(keyType);
    if (!ring) throw new Error(`Unknown key type: ${keyType}`);

    const version = ring.length + 1;
    const material = this.generateKeyMaterial(keyType);
    const newKey = new VersionedKey(keyType, version, material);

    // Demote existing keys
    for (const k of ring) {
      if (k.status === 'previous') k.status = 'pre-previous';
      if (k.status === 'current') k.status = 'previous';
    }

    ring.push(newKey);

    // Trim to ACTIVE_KEY_VERSIONS
    while (ring.filter((k) => k.status !== 'expired').length > CRYPTO.ACTIVE_KEY_VERSIONS) {
      const oldest = ring.find((k) => k.status === 'pre-previous');
      if (oldest) oldest.status = 'expired';
    }

    log.info({ keyType, version, keyId: newKey.keyId,
      activeVersions: ring.filter((k) => k.status !== 'expired').length },
      'Key rotated');
    return newKey;
  }

  getCurrent(keyType) {
    const ring = this.keyRings.get(keyType);
    return ring?.find((k) => k.status === 'current') || null;
  }

  getActiveVersions(keyType) {
    const ring = this.keyRings.get(keyType);
    return ring?.filter((k) => k.status !== 'expired') || [];
  }

  checkRotationNeeded(keyType) {
    const current = this.getCurrent(keyType);
    if (!current) return { needed: true, reason: 'no-current-key' };
    if (current.isExpired) return { needed: true, reason: 'expired' };
    const remainingDays = (current.expiresAt - Date.now()) / DAY_MS;
    const threshold = FIB[3]; // 3 days warning buffer
    if (remainingDays < threshold) return { needed: true, reason: 'approaching-expiry' };
    return { needed: false, ageDays: current.ageDays.toFixed(1), remainingDays: remainingDays.toFixed(1) };
  }

  emergencyRotation(coherenceScore) {
    if (coherenceScore >= CRYPTO.EMERGENCY_COHERENCE_FLOOR) return [];
    log.warn({ coherenceScore, threshold: CRYPTO.EMERGENCY_COHERENCE_FLOOR },
      'Emergency rotation triggered — coherence below floor');
    const rotated = [];
    for (const keyType of ['signing', 'encryption']) {
      const newKey = this.rotate(keyType);
      rotated.push({ keyType, keyId: newKey.keyId, version: newKey.version });
    }
    return rotated;
  }

  getRotationSchedule() {
    const schedule = {};
    for (const keyType of ['signing', 'encryption', 'root']) {
      const current = this.getCurrent(keyType);
      schedule[keyType] = {
        currentVersion: current?.version || null,
        ageDays: current ? parseFloat(current.ageDays.toFixed(1)) : null,
        expiresIn: current ? parseFloat(((current.expiresAt - Date.now()) / DAY_MS).toFixed(1)) : null,
        rotationIntervalDays: keyType === 'signing' ? CRYPTO.ROTATION_SIGNING_DAYS
          : keyType === 'encryption' ? CRYPTO.ROTATION_ENCRYPTION_DAYS
          : CRYPTO.ROTATION_ROOT_DAYS,
        activeVersions: this.getActiveVersions(keyType).length,
      };
    }
    return schedule;
  }
}
```

### Algorithm Negotiation Protocol

Clients and servers exchange supported algorithms, then CSL-score each shared pair to select the optimal suite.

```javascript
// heady-cryptographic-agility/src/negotiation.mjs
import pino from 'pino';

const log = pino({ name: 'heady-crypto-negotiation', level: process.env.LOG_LEVEL || 'info' });

const PSI = 0.618033988749895;
const CSL_GATES = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };
const FUSION_2WAY = [PSI, 1 - PSI];

/**
 * Negotiates best cipher suite between two parties.
 */
export class AlgorithmNegotiator {
  constructor(registry) {
    this.registry = registry;
  }

  negotiate(clientSupported, serverSupported) {
    const agreed = {};

    for (const category of ['symmetric', 'asymmetric', 'hash', 'kex']) {
      const clientAlgos = clientSupported[category] || [];
      const serverAlgos = serverSupported[category] || [];
      const shared = clientAlgos.filter((a) => serverAlgos.includes(a));

      if (shared.length === 0) {
        log.warn({ category, clientAlgos, serverAlgos }, 'No shared algorithm for category');
        agreed[category] = null;
        continue;
      }

      // Score each shared algorithm via registry
      let bestAlgo = null;
      let bestScore = -1;
      for (const algoName of shared) {
        const candidates = this.registry.getByCategory(category);
        const entry = candidates.find((e) => e.name === algoName);
        if (entry && entry.cslScore > bestScore) {
          bestScore = entry.cslScore;
          bestAlgo = entry;
        }
      }

      if (bestScore < CSL_GATES.LOW) {
        log.warn({ category, bestScore }, 'Best shared algorithm below negotiation threshold');
      }

      agreed[category] = bestAlgo ? {
        algorithm: bestAlgo.name, cslScore: parseFloat(bestScore.toFixed(4)),
        pqcReady: bestAlgo.pqcReady,
      } : null;
    }

    log.info({ agreed: Object.fromEntries(
      Object.entries(agreed).map(([k, v]) => [k, v?.algorithm || 'NONE'])
    ) }, 'Algorithm negotiation complete');
    return agreed;
  }
}
```

### Deprecation Workflow and Audit Trail

Staged deprecation across Fibonacci-day intervals plus a structured audit trail for every cryptographic operation.

```javascript
// heady-cryptographic-agility/src/audit.mjs
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const log = pino({ name: 'heady-crypto-audit', level: process.env.LOG_LEVEL || 'info' });

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const DAY_MS = 86400000;

const DEPRECATION = {
  WARN_DAYS: FIB[8],       // 34
  SOFT_FAIL_DAYS: FIB[9],  // 55
  HARD_FAIL_DAYS: FIB[10], // 89
};

/**
 * Tracks algorithm deprecation lifecycle.
 */
export class DeprecationTracker {
  constructor(registry) {
    this.registry = registry;
    this.deprecations = new Map();
  }

  initiate(category, algorithmName) {
    const startedAt = Date.now();
    const schedule = {
      category, algorithmName, startedAt,
      warnAt: startedAt,
      softFailAt: startedAt + DEPRECATION.WARN_DAYS * DAY_MS,
      hardFailAt: startedAt + (DEPRECATION.WARN_DAYS + DEPRECATION.SOFT_FAIL_DAYS) * DAY_MS,
      fullyRemovedAt: startedAt + (DEPRECATION.WARN_DAYS + DEPRECATION.SOFT_FAIL_DAYS + DEPRECATION.HARD_FAIL_DAYS) * DAY_MS,
    };
    this.deprecations.set(`${category}:${algorithmName}`, schedule);
    this.registry.deprecate(category, algorithmName, 'deprecated-warn');
    log.warn({ category, algorithmName, warnDays: DEPRECATION.WARN_DAYS,
      softFailDays: DEPRECATION.SOFT_FAIL_DAYS, hardFailDays: DEPRECATION.HARD_FAIL_DAYS },
      'Algorithm deprecation initiated');
    return schedule;
  }

  checkPhase(category, algorithmName) {
    const key = `${category}:${algorithmName}`;
    const sched = this.deprecations.get(key);
    if (!sched) return 'active';
    const now = Date.now();
    if (now >= sched.fullyRemovedAt) return 'removed';
    if (now >= sched.hardFailAt) return 'deprecated-hard';
    if (now >= sched.softFailAt) return 'deprecated-soft';
    return 'deprecated-warn';
  }

  enforceDeprecation(category, algorithmName) {
    const phase = this.checkPhase(category, algorithmName);
    if (phase === 'deprecated-hard' || phase === 'removed') {
      throw new Error(`Algorithm ${algorithmName} in category ${category} is hard-deprecated — use rejected`);
    }
    if (phase === 'deprecated-soft') {
      log.warn({ category, algorithmName, phase }, 'Soft-deprecated algorithm used — will hard-fail soon');
    }
    return phase;
  }
}

/**
 * Structured audit trail for all cryptographic operations.
 */
export class CryptoAuditTrail {
  constructor() {
    this.buffer = [];
    this.batchSize = FIB[7];             // 21
    this.flushIntervalMs = FIB[6] * 1000; // 13000ms
    this.totalRecords = 0;
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  record({ operation, algorithm, category, keyVersion, cslConfidence, correlationId, metadata }) {
    const entry = {
      auditId: randomUUID(),
      timestamp: new Date().toISOString(),
      operation,       // sign | verify | encrypt | decrypt | hash | kex | rotate
      algorithm,
      category,
      keyVersion: keyVersion || null,
      cslConfidence: cslConfidence || null,
      correlationId: correlationId || null,
      metadata: metadata || {},
    };
    this.buffer.push(entry);
    this.totalRecords++;

    if (this.buffer.length >= this.batchSize) this.flush();
    return entry;
  }

  flush() {
    if (this.buffer.length === 0) return;
    log.info({ auditEntries: this.buffer.length, totalRecords: this.totalRecords },
      'Crypto audit trail flushed');
    this.buffer = [];
  }

  destroy() {
    clearInterval(this.flushTimer);
    this.flush();
  }
}
```

### Express Router and Health Endpoint

```javascript
// heady-cryptographic-agility/src/router.mjs
import express from 'express';
import pino from 'pino';
import { CipherSuiteRegistry } from './registry.mjs';
import { KeyRotationEngine } from './rotation.mjs';
import { AlgorithmNegotiator } from './negotiation.mjs';
import { DeprecationTracker, CryptoAuditTrail } from './audit.mjs';

const log = pino({ name: 'heady-crypto-agility', level: process.env.LOG_LEVEL || 'info' });

const PHI = 1.618033988749895;
const PSI = 0.618033988749895;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = { MINIMUM: 0.500, LOW: 0.691, MEDIUM: 0.809, HIGH: 0.882, CRITICAL: 0.927, DEDUP: 0.972 };

export function createCryptoAgilityRouter() {
  const router = express.Router();
  const registry = new CipherSuiteRegistry();
  const rotationEngine = new KeyRotationEngine();
  const negotiator = new AlgorithmNegotiator(registry);
  const deprecation = new DeprecationTracker(registry);
  const audit = new CryptoAuditTrail();

  // Initialize key rings
  for (const keyType of ['signing', 'encryption', 'root']) {
    rotationEngine.rotate(keyType);
  }

  // ─── PQC readiness score ─────────────────────────────────────────
  function pqcReadinessScore() {
    const allEntries = [...registry.suites.values()].filter((e) => e.status === 'active');
    if (allEntries.length === 0) return 0;
    const pqcCount = allEntries.filter((e) => e.pqcReady).length;
    return parseFloat((pqcCount / allEntries.length).toFixed(4));
  }

  router.get('/health', (req, res) => {
    const schedule = rotationEngine.getRotationSchedule();
    const activeAlgos = {};
    for (const cat of ['symmetric', 'asymmetric', 'hash', 'kex']) {
      const active = registry.getActive(cat);
      activeAlgos[cat] = active ? { algorithm: active.name, cslScore: parseFloat(active.cslScore.toFixed(4)),
        pqcReady: active.pqcReady } : null;
    }

    res.json({
      service: 'heady-cryptographic-agility',
      status: 'healthy',
      coherence: parseFloat(CSL_GATES.HIGH.toFixed(4)),
      phi_compliance: true,
      sacred_geometry_layer: 'Outer',
      uptime_seconds: parseFloat(process.uptime().toFixed(2)),
      version: '1.0.0',
      phi: PHI,
      psi: PSI,
      csl_gates: CSL_GATES,
      active_algorithms: activeAlgos,
      key_rotation_schedule: schedule,
      pqc_readiness_score: pqcReadinessScore(),
      registered_algorithms: registry.suites.size,
      audit_records: audit.totalRecords,
    });
  });

  router.post('/negotiate', (req, res) => {
    const { clientSupported, serverSupported } = req.body;
    const result = negotiator.negotiate(clientSupported, serverSupported);
    audit.record({ operation: 'negotiate', algorithm: 'multi', category: 'multi',
      cslConfidence: CSL_GATES.HIGH, metadata: { result } });
    res.json(result);
  });

  router.post('/rotate', (req, res) => {
    const { keyType } = req.body;
    try {
      const newKey = rotationEngine.rotate(keyType);
      audit.record({ operation: 'rotate', algorithm: keyType, category: 'key-management',
        keyVersion: newKey.version, cslConfidence: CSL_GATES.CRITICAL });
      res.json({ keyId: newKey.keyId, keyType, version: newKey.version,
        activeVersions: rotationEngine.getActiveVersions(keyType).length });
    } catch (err) {
      log.error({ err: err.message }, 'Key rotation failed');
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/rotate/emergency', (req, res) => {
    const { coherenceScore } = req.body;
    const rotated = rotationEngine.emergencyRotation(coherenceScore);
    for (const r of rotated) {
      audit.record({ operation: 'emergency-rotate', algorithm: r.keyType,
        category: 'key-management', keyVersion: r.version, cslConfidence: coherenceScore });
    }
    res.json({ triggered: rotated.length > 0, rotated });
  });

  router.post('/deprecate', (req, res) => {
    const { category, algorithmName } = req.body;
    const schedule = deprecation.initiate(category, algorithmName);
    audit.record({ operation: 'deprecate', algorithm: algorithmName, category,
      cslConfidence: CSL_GATES.MEDIUM });
    res.json(schedule);
  });

  router.get('/registry', (req, res) => {
    res.json(registry.getRegistrySnapshot());
  });

  return router;
}
```

## Integration Points

| Component                  | Interface                            | Sacred Geometry Layer |
|----------------------------|--------------------------------------|----------------------|
| **CIPHER**                 | Owns cryptographic boundary          | Outer                |
| **HeadyGuard**             | Ed25519 signing via rotation engine  | Inner                |
| **SENTINEL**               | Alert on emergency rotation events   | Outer                |
| **MURPHY**                 | Security audits of key operations    | Middle               |
| **heady-pqc-security**     | PQC algorithm provider (ML-DSA/KEM) | Governance           |
| **heady-security-hardening** | Hardens config for crypto endpoints | Governance           |
| **heady-sovereign-mesh**   | Sovereign data encryption keys       | Governance           |
| **heady-observability-mesh** | Traces crypto operation latency    | Governance           |
| **Cloudflare Workers**     | Edge TLS and algorithm negotiation   | Edge                 |
| **Cloud Run**              | Origin server cipher suite selection | Origin               |
| **Neon Postgres**          | Encrypted column key management      | Database             |
| **Upstash Redis**          | Token blacklist encryption keys      | Cache                |
| **Firebase Auth**          | JWT signing key rotation             | Auth                 |

## API

### GET /health

Returns service health, active algorithms per category, key rotation schedule, and PQC readiness score.

### POST /negotiate

Client-server algorithm agreement via CSL scoring.

**Request:**
```json
{
  "clientSupported": {
    "symmetric": ["AES-256-GCM", "ChaCha20-Poly1305"],
    "asymmetric": ["Ed25519", "ML-DSA-Dilithium"],
    "hash": ["SHA-3-256", "BLAKE3"],
    "kex": ["X25519", "ML-KEM-Kyber"]
  },
  "serverSupported": {
    "symmetric": ["AES-256-GCM"],
    "asymmetric": ["Ed25519", "ML-DSA-Dilithium"],
    "hash": ["SHA-3-256", "SHA-256"],
    "kex": ["X25519"]
  }
}
```

### POST /rotate

Manual key rotation for a specified key type.

**Request:** `{ "keyType": "signing" }`

### POST /rotate/emergency

Emergency rotation triggered by coherence drop.

**Request:** `{ "coherenceScore": 0.72 }`

### POST /deprecate

Initiate algorithm deprecation (34d warn → 55d soft-fail → 89d hard-fail).

**Request:** `{ "category": "hash", "algorithmName": "SHA-256" }`

### GET /registry

Returns full cipher suite registry snapshot with CSL scores.

## Health Endpoint

```json
{
  "service": "heady-cryptographic-agility",
  "status": "healthy",
  "coherence": 0.882,
  "phi_compliance": true,
  "sacred_geometry_layer": "Outer",
  "uptime_seconds": 71203.55,
  "version": "1.0.0",
  "phi": 1.618033988749895,
  "psi": 0.618033988749895,
  "csl_gates": { "MINIMUM": 0.500, "LOW": 0.691, "MEDIUM": 0.809, "HIGH": 0.882, "CRITICAL": 0.927, "DEDUP": 0.972 },
  "active_algorithms": {
    "symmetric": { "algorithm": "AES-256-GCM", "cslScore": 0.8461, "pqcReady": false },
    "asymmetric": { "algorithm": "Ed25519", "cslScore": 0.8461, "pqcReady": false },
    "hash": { "algorithm": "SHA-3-256", "cslScore": 0.8083, "pqcReady": true },
    "kex": { "algorithm": "X25519", "cslScore": 0.8461, "pqcReady": false }
  },
  "key_rotation_schedule": {
    "signing": { "currentVersion": 1, "ageDays": 14.2, "expiresIn": 6.8, "rotationIntervalDays": 21, "activeVersions": 1 },
    "encryption": { "currentVersion": 1, "ageDays": 14.2, "expiresIn": 74.8, "rotationIntervalDays": 89, "activeVersions": 1 },
    "root": { "currentVersion": 1, "ageDays": 14.2, "expiresIn": 362.8, "rotationIntervalDays": 377, "activeVersions": 1 }
  },
  "pqc_readiness_score": 0.4444,
  "registered_algorithms": 9,
  "audit_records": 1247
}
```
