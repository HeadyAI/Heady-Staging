/**
 * heady-distiller — Execution Recipe Distillation Engine (v8 §12)
 * Reverse-engineers successful pipeline executions into reusable, tiered routes.
 * Sits after Stage 20 (RECEIPT) in the 22-stage HCFullPipeline.
 *
 * Architecture:
 *   Layer 1: Trace Capture — records full execution trace from pipeline
 *   Layer 2: Trajectory Filtering — filters traces by JUDGE score ≥ 0.85
 *   Layer 3: Multi-Tier Distillation — extracts patterns into tiered recipes
 *   Layer 4: Recipe Routing — integrates with AutoContext Pass 2.5
 *
 * Based on DSPy GEPA, Temporal trace replay, SWE-Gym filtering, Voyager synthesis.
 *
 * Heady™ Service | Domain: distillation | Port: 3375
 * © 2024-2026 HeadySystems Inc. All Rights Reserved.
 */
'use strict';

import express from 'express';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

// ─── φ-Math Constants ────────────────────────────────────────────────────────
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI_SQ = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const VECTOR_DIM = 384;
const CSL_GATES = Object.freeze({ include: PSI_SQ, boost: PSI, inject: PSI + 0.1 });

const SERVICE_NAME = 'heady-distiller';
const PORT = process.env.PORT || 3375;
const DOMAIN = 'distillation';
const BOOT_TIME = Date.now();

// ─── Wisdom Store ─────────────────────────────────────────────────────────────
const WISDOM_PATH = process.env.WISDOM_PATH || path.join(process.cwd(), 'data', 'wisdom.json');

function loadWisdom() {
  try {
    if (fs.existsSync(WISDOM_PATH)) {
      return JSON.parse(fs.readFileSync(WISDOM_PATH, 'utf8'));
    }
  } catch (e) { /* first run */ }
  return {
    version: '1.0.0',
    updated: new Date().toISOString(),
    recipes: [],
    composites: [],
    stats: { totalDistilled: 0, tier1: 0, tier2: 0, tier3: 0, metaCompressions: 0 },
  };
}

function saveWisdom(wisdom) {
  wisdom.updated = new Date().toISOString();
  try {
    const dir = path.dirname(WISDOM_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WISDOM_PATH, JSON.stringify(wisdom, null, 2));
  } catch (e) {
    log('error', `Failed to save wisdom: ${e.message}`);
  }
}

let wisdom = loadWisdom();

// ─── Express Setup ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '16mb' }));
app.disable('x-powered-by');

app.use((req, res, next) => {
  req.headyContext = {
    service: SERVICE_NAME,
    domain: DOMAIN,
    correlationId: req.headers['x-correlation-id'] || randomUUID(),
    timestamp: Date.now(),
  };
  res.setHeader('X-Heady-Service', SERVICE_NAME);
  res.setHeader('X-Correlation-Id', req.headyContext.correlationId);
  next();
});

function log(level, msg, meta = {}) {
  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(), service: SERVICE_NAME, level, message: msg, ...meta,
  }) + '\n');
}

// ─── Recipe Tiers ─────────────────────────────────────────────────────────────
// Tier 1: Prompt template (inject into system prompt)
// Tier 2: Config preset (temperature, model, seed, context)
// Tier 3: Full deterministic route (input→output mapping, fast-path)
function classifyRecipe(trace) {
  const judgeScore = trace.judgeScore || 0;
  const complexity = trace.stages?.length || 0;
  const determinism = trace.outputHash ? 1.0 : 0.5;

  // Tier 3: High judge score + deterministic + simple
  if (judgeScore >= 0.95 && determinism >= 0.9 && complexity <= FIB[7]) return 3;
  // Tier 2: Good score + moderate complexity
  if (judgeScore >= 0.85 && complexity <= FIB[9]) return 2;
  // Tier 1: Passing score
  if (judgeScore >= PSI) return 1;
  return 0; // Below threshold, do not store
}

function hashTrace(trace) {
  return createHash('sha256')
    .update(JSON.stringify({ input: trace.input, stages: trace.stages?.map(s => s.name) }))
    .digest('hex')
    .slice(0, 16);
}

// ─── Health Endpoints ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    service: SERVICE_NAME, status: 'operational', domain: DOMAIN,
    uptime: Math.round((Date.now() - BOOT_TIME) / 1000),
    port: PORT, recipes: wisdom.recipes.length,
    stats: wisdom.stats, timestamp: new Date().toISOString(),
  });
});
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// ─── Distillation Endpoint (Stage 21 of HCFullPipeline) ──────────────────────
app.post('/api/distill', (req, res) => {
  const { trace } = req.body;
  if (!trace) return res.status(400).json({ error: 'Execution trace required' });

  const judgeScore = trace.judgeScore || 0;
  if (judgeScore < 0.85) {
    return res.json({
      distilled: false, reason: `Judge score ${judgeScore} below threshold 0.85`,
      service: SERVICE_NAME,
    });
  }

  const tier = classifyRecipe(trace);
  if (tier === 0) {
    return res.json({ distilled: false, reason: 'Below all tier thresholds' });
  }

  const traceHash = hashTrace(trace);

  // Check for duplicate
  const existing = wisdom.recipes.find(r => r.traceHash === traceHash);
  if (existing) {
    // Update with better score if applicable
    if (judgeScore > existing.judgeScore) {
      existing.judgeScore = judgeScore;
      existing.tier = tier;
      existing.updatedAt = new Date().toISOString();
      existing.executions++;
      saveWisdom(wisdom);
      return res.json({ distilled: true, updated: true, recipe: existing });
    }
    return res.json({ distilled: false, reason: 'Duplicate trace, existing score higher' });
  }

  const recipe = {
    id: randomUUID(),
    traceHash,
    tier,
    judgeScore,
    taskClass: trace.taskClass || 'general',
    input: trace.input ? { type: typeof trace.input, length: JSON.stringify(trace.input).length } : null,
    stages: trace.stages?.map(s => ({ name: s.name, duration: s.duration })) || [],
    outputHash: trace.outputHash || null,
    config: trace.config || {},
    prompt: trace.prompt || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executions: 1,
  };

  wisdom.recipes.push(recipe);
  wisdom.stats.totalDistilled++;
  wisdom.stats[`tier${tier}`]++;

  // Meta-compression: if task class has > 34 recipes, compress
  const classRecipes = wisdom.recipes.filter(r => r.taskClass === recipe.taskClass);
  if (classRecipes.length > FIB[9]) {
    const composite = metaCompress(classRecipes);
    wisdom.composites.push(composite);
    wisdom.stats.metaCompressions++;
    log('info', `Meta-compressed ${classRecipes.length} recipes for class "${recipe.taskClass}"`, {
      compositeId: composite.id,
    });
  }

  saveWisdom(wisdom);
  log('info', `Distilled tier-${tier} recipe`, {
    recipeId: recipe.id, traceHash, judgeScore, taskClass: recipe.taskClass,
    correlationId: req.headyContext.correlationId,
  });

  res.json({ distilled: true, recipe, service: SERVICE_NAME });
});

// ─── Recipe Lookup (AutoContext Pass 2.5) ────────────────────────────────────
app.post('/api/recipes/match', (req, res) => {
  const { intent, taskClass, minTier } = req.body;
  const tier = minTier || 1;

  let matches = wisdom.recipes.filter(r => r.tier >= tier);

  if (taskClass) {
    matches = matches.filter(r => r.taskClass === taskClass);
  }

  // Sort by tier (desc) then judge score (desc)
  matches.sort((a, b) => (b.tier - a.tier) || (b.judgeScore - a.judgeScore));

  // Return top matches
  res.json({
    matches: matches.slice(0, FIB[7]),
    total: matches.length,
    composites: wisdom.composites.filter(c => !taskClass || c.taskClass === taskClass),
  });
});

// ─── Recipe Registry ──────────────────────────────────────────────────────────
app.get('/api/recipes', (req, res) => {
  const tier = parseInt(req.query.tier) || 0;
  const recipes = tier > 0
    ? wisdom.recipes.filter(r => r.tier === tier)
    : wisdom.recipes;

  res.json({
    recipes: recipes.slice(-(FIB[10])),
    total: recipes.length,
    stats: wisdom.stats,
  });
});

app.get('/api/wisdom', (req, res) => {
  res.json(wisdom);
});

// ─── Meta-Compression ─────────────────────────────────────────────────────────
function metaCompress(recipes) {
  // CSL CONSENSUS: normalize(Σwᵢ · recipe_vectorᵢ) weighted by JUDGE scores
  const totalWeight = recipes.reduce((sum, r) => sum + r.judgeScore, 0);
  const avgScore = totalWeight / recipes.length;

  // Extract consensus config
  const configs = recipes.map(r => r.config).filter(Boolean);
  const consensusConfig = {};
  if (configs.length > 0) {
    const keys = new Set(configs.flatMap(Object.keys));
    for (const key of keys) {
      const values = configs.map(c => c[key]).filter(v => v !== undefined);
      // Most common value
      const counts = {};
      values.forEach(v => { counts[JSON.stringify(v)] = (counts[JSON.stringify(v)] || 0) + 1; });
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (best) consensusConfig[key] = JSON.parse(best[0]);
    }
  }

  return {
    id: randomUUID(),
    taskClass: recipes[0]?.taskClass || 'general',
    recipeCount: recipes.length,
    avgJudgeScore: avgScore,
    maxJudgeScore: Math.max(...recipes.map(r => r.judgeScore)),
    consensusConfig,
    commonStages: extractCommonStages(recipes),
    createdAt: new Date().toISOString(),
  };
}

function extractCommonStages(recipes) {
  const stageCounts = {};
  recipes.forEach(r => {
    (r.stages || []).forEach(s => {
      stageCounts[s.name] = (stageCounts[s.name] || 0) + 1;
    });
  });
  // Stages present in > 50% of recipes
  const threshold = recipes.length * 0.5;
  return Object.entries(stageCounts)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, frequency: count / recipes.length }));
}

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  log('error', err.message, { correlationId: req.headyContext?.correlationId });
  res.status(500).json({ error: err.message, service: SERVICE_NAME });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log('info', `${SERVICE_NAME} operational on port ${PORT}`, {
    domain: DOMAIN, recipes: wisdom.recipes.length, stats: wisdom.stats,
  });
});

export default app;
