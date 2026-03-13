'use strict';
/**
 * hcfullpipeline-validator.test.js
 * Comprehensive validation of the HCFullPipeline schema — all 21 stages,
 * phi-compliance, dependency DAGs, YAML↔JSON parity, and config integrity.
 *
 * Part of the Heady™ Auto-Testing Framework
 * © 2026 HeadySystems Inc.
 */

const fs   = require('fs');
const path = require('path');

// ── Constants ──────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const YAML_PATH    = path.join(ROOT, 'configs', 'hcfullpipeline.yaml');
const JSON_PATH    = path.join(ROOT, 'configs', 'hcfullpipeline.json');
const PHI          = 1.618033988749895;
const PHI_INVERSE  = 1 / PHI; // ≈ 0.618
const STAGE_COUNT  = 21;  // fib(8)

// Canonical stage IDs in order (0–20)
const CANONICAL_STAGE_IDS = [
  'channel-entry', 'recon', 'intake', 'classify', 'triage',
  'decompose', 'trial-and-error', 'orchestrate', 'monte-carlo',
  'arena', 'judge', 'approve', 'execute', 'verify',
  'self-awareness', 'self-critique', 'mistake-analysis',
  'optimization-ops', 'continuous-search', 'evolution', 'receipt',
];

const CANONICAL_JSON_NAMES = [
  'CHANNEL_ENTRY', 'RECON', 'INTAKE', 'CLASSIFY', 'TRIAGE',
  'DECOMPOSE', 'TRIAL_AND_ERROR', 'ORCHESTRATE', 'MONTE_CARLO',
  'ARENA', 'JUDGE', 'APPROVE', 'EXECUTE', 'VERIFY',
  'SELF_AWARENESS', 'SELF_CRITIQUE', 'MISTAKE_ANALYSIS',
  'OPTIMIZATION_OPS', 'CONTINUOUS_SEARCH', 'EVOLUTION', 'RECEIPT',
];

const REQUIRED_STAGES = [
  'channel-entry', 'recon', 'intake', 'classify', 'triage',
  'decompose', 'orchestrate', 'execute', 'verify',
  'self-awareness', 'self-critique', 'mistake-analysis',
  'optimization-ops', 'receipt',
];

const VALID_NODE_POOLS = ['hot', 'warm', 'cold'];
const VALID_PIPELINE_PATHS = ['FAST', 'FULL', 'ARENA', 'LEARNING'];

// ── Helpers ──────────────────────────────────────────────────────────────

/** Simple YAML parser for the pipeline config — extracts stages by regex */
function loadYamlConfig() {
  const raw = fs.readFileSync(YAML_PATH, 'utf8');
  return raw;
}

function loadJsonConfig() {
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

/**
 * Extract stage objects from the YAML by parsing id/name/order/required/nodePool fields.
 * This is a lightweight regex-based extraction to avoid needing a YAML dependency.
 */
function extractYamlStages(yamlContent) {
  const stages = [];
  const stageBlocks = yamlContent.split(/^\s{4}- id:\s*/m).slice(1);

  for (const block of stageBlocks) {
    const lines = block.split('\n');
    const stage = {};

    // First line is the id
    stage.id = lines[0].trim();

    // Extract key fields
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('name:')) stage.name = trimmed.replace('name:', '').trim();
      if (trimmed.startsWith('order:')) stage.order = parseInt(trimmed.replace('order:', '').trim(), 10);
      if (trimmed.startsWith('required:')) stage.required = trimmed.replace('required:', '').trim() === 'true';
      if (trimmed.startsWith('nodePool:')) stage.nodePool = trimmed.replace('nodePool:', '').trim();
      if (trimmed.startsWith('checkpoint:')) stage.checkpoint = trimmed.replace('checkpoint:', '').trim() === 'true';
      if (trimmed.startsWith('parallel:')) stage.parallel = trimmed.replace('parallel:', '').trim() === 'true';
    }

    // Extract dependsOn
    const dependsOnMatch = block.match(/dependsOn:\s*\[([^\]]*)\]/);
    if (dependsOnMatch) {
      stage.dependsOn = dependsOnMatch[1].split(',').map(s => s.trim());
    } else {
      stage.dependsOn = [];
    }

    // Extract tasks
    const tasksSection = block.match(/tasks:\n((?:\s+- [^\n]+\n)+)/);
    if (tasksSection) {
      stage.tasks = tasksSection[1]
        .split('\n')
        .map(l => l.trim().replace(/^- /, '').replace(/#.*$/, '').trim())
        .filter(Boolean);
    } else {
      stage.tasks = [];
    }

    stages.push(stage);
  }

  return stages;
}

/**
 * Extract phi-based timing values from YAML content
 */
function extractPhiTimings(yamlContent) {
  const timings = [];
  const timeoutMatches = [...yamlContent.matchAll(/(\w+):\s*(\d+)\s*#\s*(φ[⁰¹²³⁴⁵⁶⁷⁸]\s*×\s*1000|phi)/gi)];
  for (const m of timeoutMatches) {
    timings.push({ key: m[1], value: parseInt(m[2], 10), note: m[3] });
  }
  return timings;
}

/**
 * Check if a value is approximately φ^n × 1000 for some integer n
 */
function isPhiTiming(value) {
  const phiPowers = [];
  for (let n = 1; n <= 10; n++) {
    phiPowers.push(Math.round(Math.pow(PHI, n) * 1000));
  }
  return phiPowers.some(p => Math.abs(p - value) <= 1);
}

/**
 * Validate dependency graph is a DAG (no cycles)
 */
function validateDAG(stages) {
  const graph = {};
  const stageIds = new Set(stages.map(s => s.id));

  for (const stage of stages) {
    graph[stage.id] = stage.dependsOn || [];
  }

  // DFS cycle detection
  const visited = new Set();
  const inStack = new Set();

  function hasCycle(node) {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);

    for (const dep of (graph[node] || [])) {
      if (hasCycle(dep)) return true;
    }

    inStack.delete(node);
    return false;
  }

  for (const id of stageIds) {
    if (hasCycle(id)) return { valid: false, message: `Cycle detected involving ${id}` };
  }

  // Check all dependencies reference valid stage IDs
  for (const stage of stages) {
    for (const dep of (stage.dependsOn || [])) {
      if (!stageIds.has(dep)) {
        return { valid: false, message: `Stage ${stage.id} depends on unknown stage: ${dep}` };
      }
    }
  }

  return { valid: true };
}

// ── Test Suite ────────────────────────────────────────────────────────────

describe('HCFullPipeline YAML Config Validation', () => {
  let yamlContent;
  let yamlStages;

  beforeAll(() => {
    yamlContent = loadYamlConfig();
    yamlStages = extractYamlStages(yamlContent);
  });

  // ─── Schema Integrity ────────────────────────────────────────
  describe('Schema Integrity', () => {
    test('YAML config file exists and is readable', () => {
      expect(fs.existsSync(YAML_PATH)).toBe(true);
      expect(yamlContent.length).toBeGreaterThan(1000);
    });

    test('contains exactly 21 stages (fib(8))', () => {
      expect(yamlStages.length).toBe(STAGE_COUNT);
    });

    test('all canonical stage IDs are present', () => {
      const ids = yamlStages.map(s => s.id);
      for (const expected of CANONICAL_STAGE_IDS) {
        expect(ids).toContain(expected);
      }
    });

    test('stage orders are sequential 0–20', () => {
      const orders = yamlStages.map(s => s.order).sort((a, b) => a - b);
      for (let i = 0; i < STAGE_COUNT; i++) {
        expect(orders[i]).toBe(i);
      }
    });

    test('every stage has a non-empty name', () => {
      for (const stage of yamlStages) {
        expect(stage.name).toBeDefined();
        expect(stage.name.length).toBeGreaterThan(0);
      }
    });

    test('every stage has required field defined', () => {
      for (const stage of yamlStages) {
        expect(typeof stage.required).toBe('boolean');
      }
    });

    test('required stages are marked required: true', () => {
      for (const stage of yamlStages) {
        if (REQUIRED_STAGES.includes(stage.id)) {
          expect(stage.required).toBe(true);
        }
      }
    });
  });

  // ─── Task Coverage ──────────────────────────────────────────
  describe('Task Coverage', () => {
    test('every stage has at least 1 task', () => {
      for (const stage of yamlStages) {
        expect(stage.tasks.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('channel-entry stage has vector storage scan as first task', () => {
      const channelEntry = yamlStages.find(s => s.id === 'channel-entry');
      expect(channelEntry.tasks[0]).toBe('scan_3d_persistent_vector_storage');
    });

    test('receipt stage includes Ed25519 signing task', () => {
      const receipt = yamlStages.find(s => s.id === 'receipt');
      expect(receipt.tasks).toContain('sign_pipeline_receipt');
    });

    test('verify stage includes assertion and integrity tasks', () => {
      const verify = yamlStages.find(s => s.id === 'verify');
      expect(verify.tasks).toContain('run_verification_assertions');
      expect(verify.tasks).toContain('check_system_integrity');
    });
  });

  // ─── Node Pool Assignments ──────────────────────────────────
  describe('Node Pool Configuration', () => {
    test('every stage has a valid node pool assignment', () => {
      for (const stage of yamlStages) {
        expect(VALID_NODE_POOLS).toContain(stage.nodePool);
      }
    });

    test('user-facing stages (channel-entry, execute, approve) use hot pool', () => {
      const hotRequired = ['channel-entry', 'execute', 'approve'];
      for (const id of hotRequired) {
        const stage = yamlStages.find(s => s.id === id);
        expect(stage.nodePool).toBe('hot');
      }
    });

    test('receipt stage uses hot pool (user-facing final response)', () => {
      const receipt = yamlStages.find(s => s.id === 'receipt');
      expect(receipt.nodePool).toBe('hot');
    });
  });

  // ─── Dependency DAG Validation ──────────────────────────────
  describe('Dependency DAG', () => {
    test('dependency graph is a valid DAG (no cycles)', () => {
      const result = validateDAG(yamlStages);
      expect(result.valid).toBe(true);
    });

    test('all dependsOn references point to valid stage IDs', () => {
      const validIds = new Set(yamlStages.map(s => s.id));
      for (const stage of yamlStages) {
        for (const dep of stage.dependsOn) {
          expect(validIds.has(dep)).toBe(true);
        }
      }
    });

    test('channel-entry (stage 0) has no dependencies', () => {
      const entry = yamlStages.find(s => s.id === 'channel-entry');
      expect(entry.dependsOn.length).toBe(0);
    });

    test('receipt (stage 20) depends on evolution (stage 19)', () => {
      const receipt = yamlStages.find(s => s.id === 'receipt');
      expect(receipt.dependsOn).toContain('evolution');
    });

    test('stages maintain topological ordering', () => {
      // Each stage's dependsOn should only reference earlier-ordered stages
      for (const stage of yamlStages) {
        for (const dep of stage.dependsOn) {
          const depStage = yamlStages.find(s => s.id === dep);
          expect(depStage.order).toBeLessThan(stage.order);
        }
      }
    });
  });

  // ─── Phi-Compliance ─────────────────────────────────────────
  describe('Phi-Compliance (Sacred Geometry)', () => {
    test('global retryBackoffMs uses phi-backoff [1618, 2618, 4236]', () => {
      expect(yamlContent).toContain('retryBackoffMs: [1618, 2618, 4236]');
    });

    test('maxConcurrentTasks is fib(6) = 8', () => {
      expect(yamlContent).toContain('maxConcurrentTasks: 8');
    });

    test('maxRetries is fib(4) = 3', () => {
      expect(yamlContent).toContain('maxRetries: 3');
    });

    test('CSL gate thresholds use 1/φ ≈ 0.618', () => {
      // Multiple CSL gates should use 0.618
      const gateMatches = [...yamlContent.matchAll(/(?:resonanceThreshold|environmentReadiness|selfAwarenessConfidence|confidenceThreshold|relevanceThreshold):\s*([\d.]+)/g)];
      for (const m of gateMatches) {
        expect(parseFloat(m[1])).toBeCloseTo(PHI_INVERSE, 2);
      }
    });

    test('phi-based timeout values are valid φ^n × 1000', () => {
      const knownPhiTimeouts = [1618, 2618, 4236, 6854, 11090, 17944, 29034, 46979];
      const timeoutMatches = [...yamlContent.matchAll(/timeoutMs:\s*(\d+)/g)];
      for (const m of timeoutMatches) {
        const val = parseInt(m[1], 10);
        // Every timeoutMs should be a phi-power × 1000, or a round number for non-phi timeouts
        if (val > 1000 && val < 100000) {
          expect(knownPhiTimeouts.includes(val) || val % 1000 === 0).toBe(true);
        }
      }
    });

    test('version is 4.0.0', () => {
      expect(yamlContent).toContain('version: "4.0.0"');
    });
  });

  // ─── Pipeline Variants ─────────────────────────────────────
  describe('Pipeline Variants (YAML triage paths)', () => {
    test('FAST path includes minimum required stages', () => {
      const fastMatch = yamlContent.match(/FAST:\s*\n\s*stages:\s*\[([^\]]+)\]/);
      expect(fastMatch).not.toBeNull();
      const stages = fastMatch[1].split(',').map(s => parseInt(s.trim(), 10));
      // FAST must include channel-entry(0), intake(2), execute(12), verify(13), receipt(20)
      expect(stages).toContain(0);
      expect(stages).toContain(12);
      expect(stages).toContain(13);
      expect(stages).toContain(20);
    });

    test('FULL path includes all or nearly all stages', () => {
      const fullMatch = yamlContent.match(/FULL:\s*\n\s*stages:\s*\[([^\]]+)\]/);
      expect(fullMatch).not.toBeNull();
      const stages = fullMatch[1].split(',').map(s => parseInt(s.trim(), 10));
      expect(stages.length).toBeGreaterThanOrEqual(15);
    });

    test('LEARNING path includes all 21 stages', () => {
      const learningMatch = yamlContent.match(/LEARNING:\s*\n\s*stages:\s*\[([^\]]+)\]/);
      expect(learningMatch).not.toBeNull();
      const stages = learningMatch[1].split(',').map(s => parseInt(s.trim(), 10));
      expect(stages.length).toBe(STAGE_COUNT);
    });

    test('all path stage IDs are valid (0–20)', () => {
      const pathMatches = [...yamlContent.matchAll(/stages:\s*\[([^\]]+)\]/g)];
      for (const m of pathMatches) {
        const stages = m[1].split(',').map(s => parseInt(s.trim(), 10));
        for (const id of stages) {
          if (!isNaN(id)) {
            expect(id).toBeGreaterThanOrEqual(0);
            expect(id).toBeLessThanOrEqual(20);
          }
        }
      }
    });
  });

  // ─── Parallel Side Lanes ───────────────────────────────────
  describe('Parallel Side Lanes', () => {
    test('system_operations lane exists', () => {
      expect(yamlContent).toContain('system_operations:');
    });

    test('pqc lane exists with post-quantum crypto config', () => {
      expect(yamlContent).toContain('pqc:');
      expect(yamlContent).toContain('x25519+kyber768');
    });

    test('improvement lane exists', () => {
      expect(yamlContent).toContain('improvement:');
    });

    test('learning lane exists', () => {
      expect(yamlContent).toContain('learning:');
    });
  });

  // ─── Stop Rule Validation ──────────────────────────────────
  describe('Stop Rule', () => {
    test('stop rule has error_rate condition', () => {
      expect(yamlContent).toContain('type: error_rate');
    });

    test('stop rule has critical_alarm condition', () => {
      expect(yamlContent).toContain('type: critical_alarm');
    });

    test('stop rule has data_integrity_failure halt action', () => {
      expect(yamlContent).toContain('type: data_integrity_failure');
      expect(yamlContent).toContain('action: halt_immediately');
    });

    test('user_queue prioritization rules exist', () => {
      expect(yamlContent).toContain('type: user_queue_not_empty');
      expect(yamlContent).toContain('type: user_queue_empty');
    });
  });
});

// ─── JSON Config Validation ──────────────────────────────────────────────

describe('HCFullPipeline JSON Config Validation', () => {
  let jsonConfig;

  beforeAll(() => {
    jsonConfig = loadJsonConfig();
  });

  describe('Schema Integrity', () => {
    test('JSON config file exists and parses', () => {
      expect(jsonConfig).toBeDefined();
      expect(jsonConfig._meta).toBeDefined();
    });

    test('contains exactly 21 stages', () => {
      expect(jsonConfig.stages.length).toBe(STAGE_COUNT);
    });

    test('all stages have sequential IDs 0–20', () => {
      for (let i = 0; i < STAGE_COUNT; i++) {
        expect(jsonConfig.stages[i].id).toBe(i);
      }
    });

    test('all canonical stage names are present', () => {
      const names = jsonConfig.stages.map(s => s.name);
      for (const expected of CANONICAL_JSON_NAMES) {
        expect(names).toContain(expected);
      }
    });

    test('every stage has timeout, tokenBudget, and description', () => {
      for (const stage of jsonConfig.stages) {
        expect(stage.timeout).toBeDefined();
        expect(stage.timeout).toBeGreaterThan(0);
        expect(stage.tokenBudget).toBeDefined();
        expect(stage.tokenBudget).toBeGreaterThan(0);
        expect(stage.description).toBeDefined();
        expect(stage.description.length).toBeGreaterThan(10);
      }
    });

    test('every stage has outputs array', () => {
      for (const stage of jsonConfig.stages) {
        expect(Array.isArray(stage.outputs)).toBe(true);
        expect(stage.outputs.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Phi-Compliance', () => {
    test('token budgets are Fibonacci numbers', () => {
      const fibSet = new Set([1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233,
        377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711]);
      for (const stage of jsonConfig.stages) {
        expect(fibSet.has(stage.tokenBudget)).toBe(true);
      }
    });

    test('timeouts are phi-power multiples', () => {
      const phiTimeouts = new Set([1618, 2618, 4236, 6854, 11090, 17944, 29034, 46979]);
      for (const stage of jsonConfig.stages) {
        expect(phiTimeouts.has(stage.timeout)).toBe(true);
      }
    });

    test('retry backoff uses phi multiplier', () => {
      expect(jsonConfig.global.retryPolicy.backoffMs).toBe(1618);
      expect(jsonConfig.global.retryPolicy.backoffMultiplier).toBeCloseTo(PHI, 2);
    });

    test('coherence threshold is 1 - 1/φ² + margin', () => {
      expect(jsonConfig.global.coherenceThreshold).toBeCloseTo(0.809, 2);
    });

    test('JUDGE gate weights sum to 1.00', () => {
      const judgeStage = jsonConfig.stages.find(s => s.name === 'JUDGE');
      const weights = judgeStage.gate.weights;
      const sum = weights.correctness + weights.safety + weights.performance
                + weights.quality + weights.elegance;
      expect(sum).toBeCloseTo(1.0, 2);
    });

    test('JUDGE gate uses 0.618 (1/φ) as min pass score', () => {
      const judgeStage = jsonConfig.stages.find(s => s.name === 'JUDGE');
      expect(judgeStage.gate.minPassScore).toBeCloseTo(PHI_INVERSE, 2);
    });
  });

  describe('Pipeline Variants', () => {
    test('FAST_PATH variant exists with valid stages', () => {
      expect(jsonConfig.variants.FAST_PATH).toBeDefined();
      expect(jsonConfig.variants.FAST_PATH.stages.length).toBeGreaterThan(3);
    });

    test('FULL_PATH variant includes all 21 stages', () => {
      expect(jsonConfig.variants.FULL_PATH).toBeDefined();
      expect(jsonConfig.variants.FULL_PATH.stages.length).toBe(STAGE_COUNT);
    });

    test('ARENA_PATH variant exists', () => {
      expect(jsonConfig.variants.ARENA_PATH).toBeDefined();
    });

    test('LEARNING_PATH variant exists', () => {
      expect(jsonConfig.variants.LEARNING_PATH).toBeDefined();
    });

    test('all variant stage IDs are valid (0–20)', () => {
      for (const [name, variant] of Object.entries(jsonConfig.variants)) {
        for (const id of variant.stages) {
          expect(id).toBeGreaterThanOrEqual(0);
          expect(id).toBeLessThanOrEqual(20);
        }
      }
    });
  });

  describe('Resource Pools', () => {
    test('LLM token pool tiers use phi-scaling', () => {
      const tiers = jsonConfig.pools.llm_tokens.tiers;
      expect(tiers.working).toBe(8192);
      // session ≈ base × φ²
      expect(Math.abs(tiers.session - 8192 * PHI * PHI)).toBeLessThan(200);
    });

    test('concurrent request limits use Fibonacci numbers', () => {
      const fibSet = new Set([1, 2, 3, 5, 8, 13, 21, 34, 55]);
      const perNode = jsonConfig.pools.concurrent_requests.perNode;
      for (const [key, val] of Object.entries(perNode)) {
        if (key !== '_note') {
          expect(fibSet.has(val)).toBe(true);
        }
      }
    });

    test('bee worker pool uses Fibonacci sizing', () => {
      const bees = jsonConfig.pools.bee_workers;
      const fibSet = new Set([1, 2, 3, 5, 8, 13, 21, 34]);
      expect(fibSet.has(bees.default)).toBe(true);
      expect(fibSet.has(bees.max)).toBe(true);
    });
  });

  describe('Full Auto Mode', () => {
    test('full auto mode is enabled', () => {
      expect(jsonConfig.fullAutoMode.enabled).toBe(true);
    });

    test('coherence floor is 0.618 (1/φ)', () => {
      expect(jsonConfig.fullAutoMode.coherenceFloor).toBeCloseTo(PHI_INVERSE, 2);
    });

    test('requires judge gate', () => {
      expect(jsonConfig.fullAutoMode.requireJudgeGate).toBe(true);
    });

    test('token budget thresholds follow phi-complement pattern', () => {
      // warning ≈ 1 - ψ², critical ≈ 1 - ψ³, hardStop ≈ 1 - ψ⁴
      expect(jsonConfig.fullAutoMode.tokenBudgetWarningAt).toBeCloseTo(0.764, 2);
      expect(jsonConfig.fullAutoMode.tokenBudgetCriticalAt).toBeCloseTo(0.854, 2);
      expect(jsonConfig.fullAutoMode.tokenBudgetHardStopAt).toBeCloseTo(0.910, 2);
    });
  });

  describe('Error Handling', () => {
    test('retryable errors include TIMEOUT and RATE_LIMIT', () => {
      expect(jsonConfig.errorHandling.retryableErrors).toContain('TIMEOUT');
      expect(jsonConfig.errorHandling.retryableErrors).toContain('RATE_LIMIT');
    });

    test('fatal errors include SAFETY_VIOLATION', () => {
      expect(jsonConfig.errorHandling.fatalErrors).toContain('SAFETY_VIOLATION');
    });

    test('cascade depth is fib(5) = 5', () => {
      expect(jsonConfig.errorHandling.maxCascadeDepth).toBe(5);
    });
  });
});

// ─── YAML ↔ JSON Parity ──────────────────────────────────────────────────

describe('YAML ↔ JSON Parity', () => {
  let yamlStages;
  let jsonConfig;

  beforeAll(() => {
    yamlStages = extractYamlStages(loadYamlConfig());
    jsonConfig = loadJsonConfig();
  });

  test('both configs have exactly 21 stages', () => {
    expect(yamlStages.length).toBe(STAGE_COUNT);
    expect(jsonConfig.stages.length).toBe(STAGE_COUNT);
  });

  test('stage ordering matches between YAML and JSON', () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      expect(yamlStages[i].order).toBe(jsonConfig.stages[i].id);
    }
  });

  test('stage names correspond between YAML (kebab-case) and JSON (SCREAMING_SNAKE)', () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const yamlId = yamlStages[i].id;
      const jsonName = jsonConfig.stages[i].name;
      // Convert YAML kebab-case to SCREAMING_SNAKE_CASE for comparison
      const yamlToSnake = yamlId.toUpperCase().replace(/-/g, '_');
      expect(yamlToSnake).toBe(jsonName);
    }
  });

  test('required stages match between configs', () => {
    for (let i = 0; i < STAGE_COUNT; i++) {
      const yamlRequired = yamlStages[i].required;
      const jsonStage = jsonConfig.stages[i];
      // JSON `required` field is the source of truth; `requiredFor` is metadata only
      const jsonRequired = jsonStage.required === true;
      expect(yamlRequired).toBe(jsonRequired);
    }
  });
});
