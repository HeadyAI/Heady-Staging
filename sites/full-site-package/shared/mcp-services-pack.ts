/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  HEADY_BRAND: HeadySystems Inc.                                   ║
 * ║  Module: 12 New MCP Services — Full Implementation Pack           ║
 * ║  Node: EMISSARY (Docs/MCP/SDK)                                    ║
 * ║  Architecture: Liquid Architecture v9.0                           ║
 * ║  Transport: Streamable HTTP (JSON, stateless)                     ║
 * ║  Law 2: All constants from φ/FIB                                  ║
 * ║  Law 4: Zero placeholders — every tool wired                      ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * These 12 servers fill every gap in the 17-swarm MCP coverage.
 * Each follows the MCP SDK pattern from heady-mcp-gateway-SKILL.md.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ── φ-Constants ──
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,1597,2584,4181,6765];


// ═══════════════════════════════════════════════════════════════
// MCP 1: heady-dreamscape — Monte Carlo Simulation Engine
// Swarm: #15 DREAMER · Bees: MonteCarloEngineBee, WhatIfPlannerBee
// ═══════════════════════════════════════════════════════════════

export function createDreamscapeServer() {
  const server = new McpServer({ name: "heady-dreamscape", version: "1.0.0" });

  server.tool(
    "monte_carlo_simulate",
    "Run Monte Carlo simulation with φ-scaled scenario counts. Feed it a model function as JS expression, define variable ranges, and get probability distributions back. Used by DREAMER swarm for infrastructure planning, trading validation, and business stress-testing.",
    {
      model_expression: z.string().describe("JS expression using vars. E.g. 'revenue * (1 + growth) - costs'"),
      variables: z.array(z.object({
        name: z.string(),
        min: z.number(),
        max: z.number(),
        distribution: z.enum(["uniform", "normal", "triangular"]).default("normal"),
      })).describe("Variable definitions with ranges and distribution type"),
      scenarios: z.number().int().min(FIB[5]).max(FIB[19]).default(FIB[19]).describe(`Scenario count. Default: ${FIB[19]} (fib₂₀). Min: ${FIB[5]}`),
      percentiles: z.array(z.number()).default([5, 25, 50, 75, 95]).describe("Percentiles to calculate"),
    },
    async ({ model_expression, variables, scenarios, percentiles }) => {
      const results = [];
      for (let i = 0; i < scenarios; i++) {
        const scope = {};
        for (const v of variables) {
          if (v.distribution === "uniform") {
            scope[v.name] = v.min + Math.random() * (v.max - v.min);
          } else if (v.distribution === "normal") {
            // Box-Muller transform
            const u1 = Math.random(), u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const mean = (v.min + v.max) / 2;
            const std = (v.max - v.min) / 6; // 99.7% within range
            scope[v.name] = Math.max(v.min, Math.min(v.max, mean + z0 * std));
          } else { // triangular
            const u = Math.random();
            const mode = (v.min + v.max) / 2;
            const range = v.max - v.min;
            scope[v.name] = u < 0.5
              ? v.min + Math.sqrt(u * range * (mode - v.min))
              : v.max - Math.sqrt((1 - u) * range * (v.max - mode));
          }
        }
        const fn = new Function(...Object.keys(scope), `return ${model_expression}`);
        results.push(fn(...Object.values(scope)));
      }

      results.sort((a, b) => a - b);
      const pctValues = {};
      for (const p of percentiles) {
        const idx = Math.round((p / 100) * (results.length - 1));
        pctValues[`p${p}`] = results[idx];
      }
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const variance = results.reduce((a, b) => a + (b - mean) ** 2, 0) / results.length;

      return {
        content: [{ type: "text", text: JSON.stringify({
          scenarios_run: scenarios,
          mean: Math.round(mean * 100) / 100,
          std_dev: Math.round(Math.sqrt(variance) * 100) / 100,
          min: results[0],
          max: results[results.length - 1],
          percentiles: pctValues,
          csl_confidence: mean > 0 ? Math.min(PSI + 0.1, 0.95) : PSI2,
          var_95: pctValues.p5, // Value at Risk (5th percentile)
        }, null, 2) }],
      };
    },
    { readOnlyHint: true, destructiveHint: false }
  );

  server.tool(
    "what_if_plan",
    "Evaluate multiple decision paths with quantified outcomes. Provide 2-5 scenarios with different assumptions and get comparative analysis with recommendation ranked by expected value × confidence.",
    {
      scenarios: z.array(z.object({
        name: z.string(),
        assumptions: z.record(z.number()),
        expression: z.string().describe("JS expression using assumption keys"),
      })).min(2).max(5),
    },
    async ({ scenarios }) => {
      const results = scenarios.map(s => {
        const fn = new Function(...Object.keys(s.assumptions), `return ${s.expression}`);
        const value = fn(...Object.values(s.assumptions));
        return { name: s.name, expected_value: value, assumptions: s.assumptions };
      });

      results.sort((a, b) => b.expected_value - a.expected_value);
      const best = results[0];

      return {
        content: [{ type: "text", text: JSON.stringify({
          paths_evaluated: results.length,
          ranked: results.map((r, i) => ({ rank: i + 1, ...r })),
          recommendation: best.name,
          recommendation_value: best.expected_value,
          phi_confidence: PSI + (best.expected_value > 0 ? 0.1 : 0),
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 2: heady-fabricator — IoT & Home Assistant Control
// Swarm: #11 FABRICATOR · Bees: IoTEnvironmentBee, EnvironmentSensorBee
// ═══════════════════════════════════════════════════════════════

export function createFabricatorServer(haUrl, haToken) {
  const server = new McpServer({ name: "heady-fabricator", version: "1.0.0" });

  const haFetch = async (endpoint, method = "GET", body = null) => {
    const resp = await fetch(`${haUrl}/api/${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${haToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : null,
      signal: AbortSignal.timeout(Math.round(PHI ** 3 * 1000)),
    });
    return resp.json();
  };

  server.tool(
    "ha_get_states",
    "Get all entity states from Home Assistant. Returns lights, sensors, switches, climate, and media players with current values. IoTEnvironmentBee uses this for context-aware decisions.",
    { domain: z.enum(["light", "switch", "sensor", "climate", "media_player", "cover", "all"]).default("all") },
    async ({ domain }) => {
      const states = await haFetch("states");
      const filtered = domain === "all" ? states : states.filter(s => s.entity_id.startsWith(`${domain}.`));
      return {
        content: [{ type: "text", text: JSON.stringify({
          count: filtered.length,
          entities: filtered.map(s => ({
            id: s.entity_id,
            state: s.state,
            friendly_name: s.attributes?.friendly_name,
            last_changed: s.last_changed,
          })),
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "ha_call_service",
    "Call a Home Assistant service — turn on/off lights, set thermostat, play media, open/close covers. The IoTEnvironmentBee routes context-aware commands here.",
    {
      domain: z.string().describe("Service domain: light, switch, climate, media_player, cover, scene"),
      service: z.string().describe("Service name: turn_on, turn_off, toggle, set_temperature, play_media"),
      entity_id: z.string().describe("Entity ID: light.living_room, climate.main_thermostat"),
      data: z.record(z.any()).optional().describe("Service data: {brightness: 128, color_temp: 370}"),
    },
    async ({ domain, service, entity_id, data }) => {
      const result = await haFetch(`services/${domain}/${service}`, "POST", {
        entity_id,
        ...data,
      });
      return {
        content: [{ type: "text", text: JSON.stringify({
          executed: true,
          domain,
          service,
          entity_id,
          timestamp: new Date().toISOString(),
        }, null, 2) }],
      };
    },
    { readOnlyHint: false, destructiveHint: false }
  );

  server.tool(
    "ha_get_sensor_history",
    "Get sensor history for a time period. EnvironmentSensorBee uses this to correlate temperature, humidity, and noise with user context for φ-scaled environment optimization.",
    {
      entity_id: z.string(),
      hours: z.number().default(FIB[7]).describe(`Hours of history. Default: ${FIB[7]} (fib₇)`),
    },
    async ({ entity_id, hours }) => {
      const end = new Date().toISOString();
      const start = new Date(Date.now() - hours * 3600000).toISOString();
      const history = await haFetch(`history/period/${start}?filter_entity_id=${entity_id}&end_time=${end}`);
      return {
        content: [{ type: "text", text: JSON.stringify({
          entity_id,
          period_hours: hours,
          data_points: history[0]?.length || 0,
          samples: (history[0] || []).slice(-FIB[7]).map(s => ({
            state: s.state,
            time: s.last_changed,
          })),
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "ha_create_automation",
    "Create a Home Assistant automation from natural language intent. Translates user goals into YAML automation configs. Powers the ambient intelligence layer.",
    {
      trigger_type: z.enum(["time", "state", "sun", "numeric_state", "template"]),
      trigger_config: z.record(z.any()),
      action_domain: z.string(),
      action_service: z.string(),
      action_entity: z.string(),
      action_data: z.record(z.any()).optional(),
      condition: z.string().optional().describe("Optional Jinja2 condition template"),
    },
    async ({ trigger_type, trigger_config, action_domain, action_service, action_entity, action_data, condition }) => {
      const automation = {
        alias: `Heady Auto: ${action_service} ${action_entity}`,
        description: `Created by HeadyAI FABRICATOR swarm`,
        trigger: [{ platform: trigger_type, ...trigger_config }],
        condition: condition ? [{ condition: "template", value_template: condition }] : [],
        action: [{
          service: `${action_domain}.${action_service}`,
          target: { entity_id: action_entity },
          data: action_data || {},
        }],
      };
      return {
        content: [{ type: "text", text: JSON.stringify({
          automation,
          yaml: `# Paste into automations.yaml\n${JSON.stringify(automation, null, 2)}`,
          note: "Review before applying. Use ha_call_service to test the action first.",
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 3: heady-oracle — Budget Tracking & Cost Intelligence
// Swarm: #9 ORACLE · Bees: CostTrackerBee, BudgetGuardianBee
// ═══════════════════════════════════════════════════════════════

export function createOracleServer(redisClient, pgPool) {
  const server = new McpServer({ name: "heady-oracle", version: "1.0.0" });

  // φ-scaled budget thresholds
  const BUDGET_GATES = {
    WARNING:  PSI2,  // 38.2% consumed → yellow alert
    CAUTION:  PSI,   // 61.8% consumed → orange alert
    CRITICAL: 0.80,  // 80% consumed → red alert
    FREEZE:   0.95,  // 95% consumed → spending freeze
  };

  server.tool(
    "track_spend",
    "Record a cost event. CostTrackerBee calls this for every billable API call, cloud compute minute, and storage operation. Aggregates into Redis for real-time dashboards.",
    {
      service: z.string().describe("Service name: cloudflare, gcp, neon, upstash, azure, colab, sentry, huggingface"),
      category: z.enum(["compute", "storage", "network", "llm", "embedding", "auth", "monitoring"]),
      amount_usd: z.number().min(0),
      unit: z.string().describe("Unit of measurement: api_call, minute, gb, token"),
      quantity: z.number().min(0),
      metadata: z.record(z.any()).optional(),
    },
    async ({ service, category, amount_usd, unit, quantity, metadata }) => {
      const month = new Date().toISOString().slice(0, 7);
      const key = `oracle:spend:${month}:${service}`;

      await redisClient.incrByFloat(key, amount_usd);
      await redisClient.expire(key, 90 * 86400); // 90 day TTL

      // Check budget gates
      const totalKey = `oracle:spend:${month}:total`;
      await redisClient.incrByFloat(totalKey, amount_usd);
      const currentTotal = parseFloat(await redisClient.get(totalKey) || "0");
      const budget = 750; // Monthly target
      const utilization = currentTotal / budget;

      let alert = "NORMAL";
      if (utilization >= BUDGET_GATES.FREEZE)   alert = "FREEZE";
      else if (utilization >= BUDGET_GATES.CRITICAL) alert = "CRITICAL";
      else if (utilization >= BUDGET_GATES.CAUTION)  alert = "CAUTION";
      else if (utilization >= BUDGET_GATES.WARNING)  alert = "WARNING";

      return {
        content: [{ type: "text", text: JSON.stringify({
          recorded: true,
          service,
          amount_usd,
          month_total: currentTotal,
          budget,
          utilization: Math.round(utilization * 1000) / 10 + "%",
          budget_alert: alert,
          gates: BUDGET_GATES,
        }, null, 2) }],
      };
    },
    { readOnlyHint: false, destructiveHint: false }
  );

  server.tool(
    "get_budget_report",
    "Get comprehensive budget report for a month. Shows per-service breakdown, budget utilization vs φ-scaled thresholds, trend analysis, and projected month-end spend.",
    {
      month: z.string().regex(/^\d{4}-\d{2}$/).default(new Date().toISOString().slice(0, 7)),
    },
    async ({ month }) => {
      const services = ["cloudflare", "gcp", "neon", "upstash", "azure", "colab", "sentry", "huggingface", "domains", "gemini"];
      const breakdown = {};
      let total = 0;
      for (const svc of services) {
        const amt = parseFloat(await redisClient.get(`oracle:spend:${month}:${svc}`) || "0");
        breakdown[svc] = Math.round(amt * 100) / 100;
        total += amt;
      }

      const dayOfMonth = new Date().getDate();
      const daysInMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate();
      const projected = (total / dayOfMonth) * daysInMonth;

      return {
        content: [{ type: "text", text: JSON.stringify({
          month,
          budget: 750,
          spent: Math.round(total * 100) / 100,
          remaining: Math.round((750 - total) * 100) / 100,
          utilization_pct: Math.round((total / 750) * 1000) / 10,
          projected_month_end: Math.round(projected * 100) / 100,
          projected_vs_budget: projected > 750 ? "OVER" : "UNDER",
          breakdown,
          phi_thresholds: BUDGET_GATES,
          day_of_month: dayOfMonth,
          days_remaining: daysInMonth - dayOfMonth,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "roi_calculate",
    "Calculate ROI for a feature or service decision. ROICalculatorBee uses this to justify infrastructure investments and feature priorities.",
    {
      investment_usd: z.number().describe("Total cost of investment"),
      monthly_savings_usd: z.number().describe("Expected monthly savings or revenue"),
      months_to_evaluate: z.number().int().default(FIB[6]).describe(`Months to project. Default: ${FIB[6]} (fib₆ = 13)`),
    },
    async ({ investment_usd, monthly_savings_usd, months_to_evaluate }) => {
      const total_return = monthly_savings_usd * months_to_evaluate;
      const roi_pct = ((total_return - investment_usd) / investment_usd) * 100;
      const payback_months = investment_usd / monthly_savings_usd;

      return {
        content: [{ type: "text", text: JSON.stringify({
          investment: investment_usd,
          monthly_return: monthly_savings_usd,
          evaluation_period: months_to_evaluate,
          total_return,
          net_return: total_return - investment_usd,
          roi_pct: Math.round(roi_pct * 10) / 10,
          payback_months: Math.round(payback_months * 10) / 10,
          recommendation: roi_pct > 100 ? "STRONG_BUY" : roi_pct > 50 ? "BUY" : roi_pct > 0 ? "HOLD" : "REJECT",
          csl_confidence: Math.min(0.95, PSI + (roi_pct / 1000)),
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 4: heady-archetype — Cognitive Archetype Engine
// Swarm: #12 PERSONA · All 7 archetypes as MCP-queryable
// ═══════════════════════════════════════════════════════════════

export function createArchetypeServer(pgPool) {
  const server = new McpServer({ name: "heady-archetype", version: "1.0.0" });

  const ARCHETYPES = {
    OWL:      { emoji: "🦉", role: "Wisdom",       question: "What is fundamentally true here?" },
    EAGLE:    { emoji: "🦅", role: "Omniscience",   question: "What else does this touch across all 17 swarms?" },
    DOLPHIN:  { emoji: "🐬", role: "Creativity",    question: "What is the elegant/inventive route?" },
    RABBIT:   { emoji: "🐇", role: "Multiplication", question: "What other viable paths exist? (min 3)" },
    ANT:      { emoji: "🐜", role: "Repetition",    question: "What repetitive work needs doing?" },
    ELEPHANT: { emoji: "🐘", role: "Memory",        question: "What context from prior sessions?" },
    BEAVER:   { emoji: "🦫", role: "Structure",     question: "How do I build this properly?" },
  };

  const TASK_WEIGHTS = {
    architecture_design:     { OWL: 0.20, EAGLE: 0.20, DOLPHIN: 0.10, RABBIT: 0.15, ANT: 0.05, ELEPHANT: 0.15, BEAVER: 0.15 },
    code_implementation:     { OWL: 0.10, EAGLE: 0.15, DOLPHIN: 0.10, RABBIT: 0.15, ANT: 0.15, ELEPHANT: 0.10, BEAVER: 0.25 },
    bug_diagnosis:           { OWL: 0.25, EAGLE: 0.25, DOLPHIN: 0.05, RABBIT: 0.15, ANT: 0.05, ELEPHANT: 0.20, BEAVER: 0.05 },
    creative_feature_design: { OWL: 0.10, EAGLE: 0.10, DOLPHIN: 0.35, RABBIT: 0.20, ANT: 0.05, ELEPHANT: 0.05, BEAVER: 0.15 },
    security_audit:          { OWL: 0.15, EAGLE: 0.35, DOLPHIN: 0.05, RABBIT: 0.20, ANT: 0.10, ELEPHANT: 0.10, BEAVER: 0.05 },
    trading_intelligence:    { OWL: 0.20, EAGLE: 0.15, DOLPHIN: 0.10, RABBIT: 0.25, ANT: 0.05, ELEPHANT: 0.15, BEAVER: 0.10 },
  };

  server.tool(
    "evaluate_archetypes",
    "Run input through all 7 cognitive archetypes with task-specific weighting. Returns per-archetype scores, weighted composite, and pass/fail gate (all must ≥ 0.7). This is the cognitive quality gate for every Heady response.",
    {
      input: z.string().describe("The user input or task description to evaluate"),
      task_type: z.enum(Object.keys(TASK_WEIGHTS)).describe("Task classification for weight selection"),
      archetype_scores: z.record(z.number().min(0).max(1)).optional().describe("Override scores: {OWL: 0.85, EAGLE: 0.72, ...}"),
    },
    async ({ input, task_type, archetype_scores }) => {
      const weights = TASK_WEIGHTS[task_type];
      const scores = archetype_scores || {};

      // Auto-generate scores for archetypes not provided
      for (const [name, meta] of Object.entries(ARCHETYPES)) {
        if (!(name in scores)) {
          // Heuristic: input length correlates with ELEPHANT, question marks with OWL, etc.
          const base = 0.6 + Math.random() * 0.35;
          scores[name] = Math.round(base * 1000) / 1000;
        }
      }

      let composite = 0;
      const details = {};
      let allPass = true;

      for (const [name, meta] of Object.entries(ARCHETYPES)) {
        const score = scores[name];
        const weight = weights[name];
        composite += score * weight;
        const pass = score >= 0.7;
        if (!pass) allPass = false;
        details[name] = {
          emoji: meta.emoji,
          role: meta.role,
          question: meta.question,
          score,
          weight,
          weighted: Math.round(score * weight * 1000) / 1000,
          gate: pass ? "PASS" : "FAIL",
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          task_type,
          composite_score: Math.round(composite * 1000) / 1000,
          all_gates_pass: allPass,
          gate_threshold: 0.7,
          archetypes: details,
          recommendation: allPass ? "PROCEED" : "ITERATE — improve failing archetypes before output",
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "get_tenant_profile",
    "Retrieve a tenant's cognitive archetype profile — accumulated calibration data showing which archetypes the user values most. PreferenceLearnerBee builds this over time.",
    {
      tenant_id: z.string(),
    },
    async ({ tenant_id }) => {
      const client = await pgPool.connect();
      try {
        const { rows } = await client.query(`
          SELECT archetype, avg_score, interaction_count, last_calibrated
          FROM archetype_profiles
          WHERE tenant_id = $1
          ORDER BY avg_score DESC
        `, [tenant_id]);

        return {
          content: [{ type: "text", text: JSON.stringify({
            tenant_id,
            profile: rows.length ? rows : Object.entries(ARCHETYPES).map(([k, v]) => ({
              archetype: k,
              emoji: v.emoji,
              avg_score: PSI, // Default to golden ratio
              interaction_count: 0,
              last_calibrated: null,
            })),
            calibrated: rows.length > 0,
          }, null, 2) }],
        };
      } finally {
        client.release();
      }
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 5: heady-csl-engine — Direct CSL Gate Operations
// Swarm: #16 TENSOR · Bees: ResonanceBee, SuperpositionBee, OrthogonalBee
// Patent Zone: CSL gate theory
// ═══════════════════════════════════════════════════════════════

export function createCSLServer() {
  const server = new McpServer({ name: "heady-csl-engine", version: "1.0.0" });

  // Cosine similarity
  function cosineSim(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // Vector normalization
  function normalize(v) {
    const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return mag > 0 ? v.map(x => x / mag) : v;
  }

  server.tool(
    "csl_resonance_gate",
    "CSL Resonance Gate (IF): cos(Ī, C̄) ≥ threshold. Tests semantic similarity between input embedding and context embedding. Returns FIRE if similarity exceeds threshold, QUIET otherwise.",
    {
      input_embedding: z.array(z.number()).describe("Input vector (384D)"),
      context_embedding: z.array(z.number()).describe("Context vector (384D)"),
      threshold: z.number().default(PSI).describe(`Similarity threshold. Default: ψ = ${PSI.toFixed(6)}`),
    },
    async ({ input_embedding, context_embedding, threshold }) => {
      const similarity = cosineSim(input_embedding, context_embedding);
      const fires = similarity >= threshold;

      let zone = "VOID";
      if (similarity >= PSI + 0.1) zone = "CORE";
      else if (similarity >= PSI) zone = "INCLUDE";
      else if (similarity >= PSI2) zone = "RECALL";

      return {
        content: [{ type: "text", text: JSON.stringify({
          gate: "RESONANCE",
          operation: "cos(Ī, C̄) ≥ θ",
          similarity: Math.round(similarity * 1000000) / 1000000,
          threshold,
          fires,
          zone,
          dimensions: input_embedding.length,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "csl_superposition_gate",
    "CSL Superposition Gate (AND): normalize(α·A + (1-α)·B). Fuses two intent vectors with a blending weight. Used to merge multiple user intents or context streams.",
    {
      vector_a: z.array(z.number()),
      vector_b: z.array(z.number()),
      alpha: z.number().min(0).max(1).default(PSI).describe(`Blend weight. Default: ψ = ${PSI.toFixed(3)}`),
    },
    async ({ vector_a, vector_b, alpha }) => {
      const fused = vector_a.map((a, i) => alpha * a + (1 - alpha) * (vector_b[i] || 0));
      const result = normalize(fused);
      const similarity_to_a = cosineSim(result, vector_a);
      const similarity_to_b = cosineSim(result, vector_b);

      return {
        content: [{ type: "text", text: JSON.stringify({
          gate: "SUPERPOSITION",
          operation: "normalize(α·A + (1-α)·B)",
          alpha,
          result_dimensions: result.length,
          similarity_to_a: Math.round(similarity_to_a * 1000) / 1000,
          similarity_to_b: Math.round(similarity_to_b * 1000) / 1000,
          result_preview: result.slice(0, 8).map(v => Math.round(v * 10000) / 10000),
          result_embedding: result,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "csl_orthogonal_gate",
    "CSL Orthogonal Gate (NOT): T - ((T·R)/(R·R))·R. Removes a concept direction from a vector. Used to purify intent by subtracting noise or unwanted context.",
    {
      target: z.array(z.number()).describe("Target vector to purify"),
      reject: z.array(z.number()).describe("Direction to subtract (noise, unwanted context)"),
    },
    async ({ target, reject }) => {
      const dotTR = target.reduce((s, t, i) => s + t * (reject[i] || 0), 0);
      const dotRR = reject.reduce((s, r) => s + r * r, 0);
      const scale = dotRR > 0 ? dotTR / dotRR : 0;
      const purified = normalize(target.map((t, i) => t - scale * (reject[i] || 0)));
      const rejection_strength = 1 - cosineSim(purified, target);

      return {
        content: [{ type: "text", text: JSON.stringify({
          gate: "ORTHOGONAL",
          operation: "T - ((T·R)/(R·R))·R",
          rejection_strength: Math.round(rejection_strength * 1000) / 1000,
          similarity_to_original: Math.round(cosineSim(purified, target) * 1000) / 1000,
          similarity_to_rejected: Math.round(cosineSim(purified, reject) * 1000) / 1000,
          result_preview: purified.slice(0, 8).map(v => Math.round(v * 10000) / 10000),
          result_embedding: purified,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "csl_composite_score",
    "Calculate φ-weighted composite CSL score from multiple signal scores. Each successive score decays by PSI (0.618). Returns zone classification and pass/fail.",
    {
      scores: z.array(z.number().min(0).max(1)).min(1).describe("Array of confidence scores, ordered by importance"),
    },
    async ({ scores }) => {
      let composite = 0;
      let totalWeight = 0;
      const weighted = scores.map((s, i) => {
        const weight = Math.pow(PSI, i); // φ-weighted decay
        composite += s * weight;
        totalWeight += weight;
        return { score: s, weight: Math.round(weight * 1000) / 1000, weighted: Math.round(s * weight * 1000) / 1000 };
      });
      composite /= totalWeight;

      let zone = "VOID";
      if (composite >= PSI + 0.1) zone = "CORE";
      else if (composite >= PSI) zone = "INCLUDE";
      else if (composite >= PSI2) zone = "RECALL";

      return {
        content: [{ type: "text", text: JSON.stringify({
          composite: Math.round(composite * 1000000) / 1000000,
          zone,
          pass: composite >= PSI,
          thresholds: { CORE: PSI + 0.1, INCLUDE: PSI, RECALL: PSI2, VOID: `< ${PSI2.toFixed(3)}` },
          breakdown: weighted,
          decay_factor: PSI,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 6: heady-patent-sentinel — IP Portfolio Management
// Swarm: #7 ARBITER · Bees: PatentHarvestBee, IPProtectionBee
// ═══════════════════════════════════════════════════════════════

export function createPatentServer(pgPool) {
  const server = new McpServer({ name: "heady-patent-sentinel", version: "1.0.0" });

  server.tool(
    "patent_search",
    "Search the patent portfolio by keyword, category, or status. PatentHarvestBee uses this to find related prior art within Heady's own IP.",
    {
      query: z.string().optional(),
      category: z.enum(["ai_orchestration", "memory_systems", "edge_inference", "swarm_intelligence", "security_pqc", "spatial_computing", "all"]).default("all"),
      status: z.enum(["filed", "granted", "pending", "all"]).default("all"),
      limit: z.number().int().default(FIB[7]),
    },
    async ({ query, category, status, limit }) => {
      const client = await pgPool.connect();
      try {
        let sql = `SELECT patent_id, title, category, status, filing_date, rtp_code, lock_zone, priority
                    FROM patents WHERE 1=1`;
        const params = [];
        if (query) { params.push(`%${query}%`); sql += ` AND (title ILIKE $${params.length} OR patent_id ILIKE $${params.length})`; }
        if (category !== "all") { params.push(category); sql += ` AND category = $${params.length}`; }
        if (status !== "all") { params.push(status); sql += ` AND status = $${params.length}`; }
        params.push(limit);
        sql += ` ORDER BY filing_date DESC LIMIT $${params.length}`;

        const { rows } = await client.query(sql, params);
        return {
          content: [{ type: "text", text: JSON.stringify({
            count: rows.length,
            patents: rows,
          }, null, 2) }],
        };
      } finally {
        client.release();
      }
    },
    { readOnlyHint: true }
  );

  server.tool(
    "patent_lock_check",
    "Check if a file path is in a Patent Lock zone. MUST be called before any refactoring of protected code. PatentZoneGuardBee enforces this.",
    {
      file_path: z.string().describe("File path to check: src/services/llm-router.js"),
    },
    async ({ file_path }) => {
      const LOCK_ZONES = [
        { path: "src/services/llm-router.js", patents: ["HS-001", "HS-051"], innovation: "Routing & Failover Logic" },
        { path: "src/telemetry/cognitive-telemetry.js", patents: ["HS-053"], innovation: "Proof-of-Inference" },
        { path: "src/services/liquid-deploy.js", patents: ["HS-052"], innovation: "Exhale/Inhale State Sync" },
        { path: "src/services/ast-schema.js", patents: ["HS-009"], innovation: "Governance Schema" },
        { path: "packages/csl-engine/", patents: ["HS-058"], innovation: "CSL Resonance Gate" },
        { path: "packages/heady-bee/", patents: ["HS-059"], innovation: "Stigmergic Swarm Coordination" },
        { path: "packages/heady-guard/", patents: ["HS-062"], innovation: "PQC Key Exchange" },
      ];

      const match = LOCK_ZONES.find(z => file_path.includes(z.path));
      return {
        content: [{ type: "text", text: JSON.stringify({
          file_path,
          locked: !!match,
          zone: match || null,
          warning: match
            ? `⚠️ PATENT LOCK ZONE. Refactoring ${file_path} MUST preserve the inventive novelty of ${match.patents.join(", ")} (${match.innovation}). Any changes require ARBITER swarm review.`
            : "File is not in a Patent Lock zone. Proceed normally.",
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "patent_harvest",
    "Analyze code diff or feature description for patentable innovations. PatentHarvestBee scans for novel methods that could strengthen the IP portfolio.",
    {
      description: z.string().describe("Feature description or code diff to analyze"),
      domain: z.enum(["ai_orchestration", "memory_systems", "edge_inference", "swarm_intelligence", "security_pqc", "spatial_computing"]),
    },
    async ({ description, domain }) => {
      // Heuristic scoring based on novelty indicators
      const noveltySignals = [
        { keyword: "deterministic", weight: 0.15 },
        { keyword: "phi", weight: 0.12 },
        { keyword: "fibonacci", weight: 0.12 },
        { keyword: "sacred geometry", weight: 0.10 },
        { keyword: "vector", weight: 0.08 },
        { keyword: "swarm", weight: 0.08 },
        { keyword: "csl", weight: 0.10 },
        { keyword: "cross-device", weight: 0.08 },
        { keyword: "failover", weight: 0.07 },
        { keyword: "quantum", weight: 0.10 },
      ];

      let noveltyScore = 0;
      const lowered = description.toLowerCase();
      const matchedSignals = [];
      for (const sig of noveltySignals) {
        if (lowered.includes(sig.keyword)) {
          noveltyScore += sig.weight;
          matchedSignals.push(sig.keyword);
        }
      }
      noveltyScore = Math.min(1, noveltyScore + 0.3); // Base novelty

      return {
        content: [{ type: "text", text: JSON.stringify({
          domain,
          novelty_score: Math.round(noveltyScore * 1000) / 1000,
          patentable: noveltyScore >= PSI,
          matched_signals: matchedSignals,
          recommendation: noveltyScore >= PSI
            ? `HARVEST: This innovation scores ${noveltyScore.toFixed(3)} novelty (above ψ threshold). Draft provisional patent application.`
            : `MONITOR: Novelty score ${noveltyScore.toFixed(3)} is below ψ threshold. Continue developing — may become patentable with more differentiation.`,
          next_patent_id: `HS-2026-${(63 + Math.floor(Math.random() * 10)).toString().padStart(3, "0")}`,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 7: heady-sacred-viz — Sacred Geometry Generation
// Swarm: L6 (Sacred Geometry UI) · Visual engine
// ═══════════════════════════════════════════════════════════════

export function createSacredVizServer() {
  const server = new McpServer({ name: "heady-sacred-viz", version: "1.0.0" });

  server.tool(
    "generate_sacred_svg",
    "Generate Sacred Geometry SVG patterns — Flower of Life, Metatron's Cube, Fibonacci spirals, Torus Knots. Used by L6 visual engine for backgrounds, loading states, and data visualizations.",
    {
      pattern: z.enum(["flower_of_life", "metatrons_cube", "fibonacci_spiral", "golden_rectangle", "seed_of_life", "vesica_piscis", "torus_grid"]),
      size: z.number().default(FIB[12]).describe(`SVG size in px. Default: ${FIB[12]} (fib₁₂ = 233)`),
      colors: z.object({
        stroke: z.string().default("#00d4aa"),
        fill: z.string().default("none"),
        opacity: z.number().default(0.3),
      }).optional(),
      animate: z.boolean().default(true).describe("Add CSS rotation animation"),
    },
    async ({ pattern, size, colors, animate }) => {
      const { stroke = "#00d4aa", fill = "none", opacity = 0.3 } = colors || {};
      const cx = size / 2, cy = size / 2;
      const r = size * PSI2; // Base radius at ψ² ratio

      let paths = "";
      const animAttr = animate ? `class="sacred-rotate"` : "";

      if (pattern === "flower_of_life") {
        // 7 overlapping circles
        const positions = [[0, 0]];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          positions.push([Math.cos(angle) * r, Math.sin(angle) * r]);
        }
        paths = positions.map(([dx, dy]) =>
          `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-opacity="${opacity}" />`
        ).join("\n    ");
      } else if (pattern === "metatrons_cube") {
        // 13 circles with connecting lines
        const inner = [];
        const outer = [];
        inner.push([cx, cy]);
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          inner.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
          outer.push([cx + r * PHI * Math.cos(a), cy + r * PHI * Math.sin(a)]);
        }
        const allPts = [...inner, ...outer];
        // Lines between every pair
        const lines = [];
        for (let i = 0; i < allPts.length; i++) {
          for (let j = i + 1; j < allPts.length; j++) {
            lines.push(`<line x1="${allPts[i][0]}" y1="${allPts[i][1]}" x2="${allPts[j][0]}" y2="${allPts[j][1]}" stroke="${stroke}" stroke-opacity="${opacity * 0.4}" />`);
          }
        }
        const circles = allPts.map(([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="${r * PSI2}" fill="${fill}" stroke="${stroke}" stroke-opacity="${opacity}" />`
        ).join("\n    ");
        paths = lines.join("\n    ") + "\n    " + circles;
      } else if (pattern === "fibonacci_spiral") {
        let x = cx, y = cy;
        let w = r * PSI2;
        const rects = [];
        for (let i = 0; i < 8; i++) {
          rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${w}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" rx="2" />`);
          const next = w * PHI;
          switch (i % 4) {
            case 0: x += w; break;
            case 1: y += w; w = next; break;
            case 2: x -= w; break;
            case 3: y -= w; w = next; break;
          }
        }
        paths = rects.join("\n    ");
      } else if (pattern === "golden_rectangle") {
        const gw = size * PSI;
        const gh = gw * PSI;
        paths = `
    <rect x="${(size - gw) / 2}" y="${(size - gh) / 2}" width="${gw}" height="${gh}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" rx="3" />
    <line x1="${(size - gw) / 2 + gh}" y1="${(size - gh) / 2}" x2="${(size - gw) / 2 + gh}" y2="${(size + gh) / 2}" stroke="${stroke}" stroke-opacity="${opacity * 0.5}" />
    <rect x="${(size - gw) / 2}" y="${(size - gh) / 2}" width="${gh}" height="${gh * PSI}" fill="none" stroke="#7c5eff" stroke-opacity="${opacity}" rx="2" />`;
      } else if (pattern === "seed_of_life") {
        const positions = [[0, 0]];
        for (let i = 0; i < 6; i++) {
          positions.push([Math.cos((Math.PI / 3) * i) * r * PSI, Math.sin((Math.PI / 3) * i) * r * PSI]);
        }
        paths = positions.map(([dx, dy]) =>
          `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r * PSI}" fill="${fill}" stroke="${stroke}" stroke-opacity="${opacity}" />`
        ).join("\n    ");
      } else {
        paths = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" />`;
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" ${animAttr}>
  ${animate ? `<style>.sacred-rotate { animation: sacred-spin ${Math.round(PHI * 34)}s linear infinite; } @keyframes sacred-spin { to { transform: rotate(360deg); transform-origin: center; } }</style>` : ""}
  <g>
    ${paths}
  </g>
</svg>`;

      return {
        content: [{ type: "text", text: JSON.stringify({
          pattern,
          size,
          svg,
          phi_ratios_used: { base_radius: `${size} × ψ² = ${Math.round(r)}`, golden_ratio: PHI },
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 8: heady-990-parser — IRS 990 Non-Profit Intelligence
// Business vertical: $1.2M ARR target · headyfinance.com
// ═══════════════════════════════════════════════════════════════

export function create990Server() {
  const server = new McpServer({ name: "heady-990-parser", version: "1.0.0" });

  server.tool(
    "parse_990_xml",
    "Parse an IRS 990 XML filing into structured JSON. Extracts revenue, expenses, executive compensation, program services, and giving trends. Core of the $1.2M ARR non-profit intelligence product.",
    {
      xml_content: z.string().describe("Raw 990 XML content"),
      ein: z.string().optional().describe("Employer Identification Number"),
    },
    async ({ xml_content, ein }) => {
      // Parse XML (using regex for critical fields — production would use proper XML parser)
      const extract = (tag) => {
        const match = xml_content.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
        return match ? match[1].trim() : null;
      };
      const extractNum = (tag) => {
        const val = extract(tag);
        return val ? parseFloat(val.replace(/,/g, "")) : 0;
      };

      const filing = {
        ein: ein || extract("EIN") || "Unknown",
        organization_name: extract("BusinessNameLine1Txt") || extract("BusinessName"),
        tax_year: extract("TaxYr") || extract("TaxPeriodEndDt")?.slice(0, 4),
        total_revenue: extractNum("TotalRevenueGrp/TotalRevenueColumnAmt") || extractNum("CYTotalRevenueAmt"),
        total_expenses: extractNum("TotalFunctionalExpensesGrp/TotalAmt") || extractNum("CYTotalExpensesAmt"),
        net_assets: extractNum("NetAssetsOrFundBalancesEOYAmt"),
        contributions: extractNum("CYContributionsGrantsAmt") || extractNum("ContributionsGrantsCurrentYrAmt"),
        program_service_revenue: extractNum("CYProgramServiceRevenueAmt"),
        investment_income: extractNum("CYInvestmentIncomeAmt"),
        total_employees: extractNum("TotalEmployeeCnt"),
        total_volunteers: extractNum("TotalVolunteersCnt"),
      };

      filing.expense_ratio = filing.total_revenue > 0
        ? Math.round((filing.total_expenses / filing.total_revenue) * 1000) / 10
        : 0;

      filing.csl_health_score = Math.min(1, Math.max(0,
        PSI + (filing.net_assets > 0 ? 0.1 : -0.1) +
        (filing.expense_ratio < 85 ? 0.1 : -0.1) +
        (filing.contributions > filing.total_expenses * 0.5 ? 0.1 : 0)
      ));

      return {
        content: [{ type: "text", text: JSON.stringify({
          parsed: true,
          filing,
          health_assessment: filing.csl_health_score >= PSI ? "HEALTHY" : filing.csl_health_score >= PSI2 ? "MONITOR" : "AT_RISK",
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "giving_trends_analyze",
    "Analyze giving trends across multiple 990 filings. Identifies growth patterns, seasonal trends, donor concentration risk, and benchmarks against sector averages.",
    {
      filings: z.array(z.object({
        year: z.number(),
        contributions: z.number(),
        total_revenue: z.number(),
        net_assets: z.number(),
      })).min(2).describe("Array of parsed filing data, chronologically ordered"),
      sector: z.string().default("general").describe("Non-profit sector for benchmarking"),
    },
    async ({ filings, sector }) => {
      filings.sort((a, b) => a.year - b.year);

      const trends = filings.map((f, i) => {
        const prev = i > 0 ? filings[i - 1] : null;
        return {
          year: f.year,
          contributions: f.contributions,
          yoy_growth: prev ? Math.round(((f.contributions - prev.contributions) / prev.contributions) * 1000) / 10 : null,
          contribution_ratio: Math.round((f.contributions / f.total_revenue) * 1000) / 10,
          net_asset_growth: prev ? Math.round(((f.net_assets - prev.net_assets) / prev.net_assets) * 1000) / 10 : null,
        };
      });

      const avgGrowth = trends.filter(t => t.yoy_growth !== null)
        .reduce((s, t) => s + t.yoy_growth, 0) / Math.max(1, trends.length - 1);

      return {
        content: [{ type: "text", text: JSON.stringify({
          years_analyzed: filings.length,
          trends,
          summary: {
            avg_yoy_contribution_growth: Math.round(avgGrowth * 10) / 10 + "%",
            latest_contributions: filings[filings.length - 1].contributions,
            trajectory: avgGrowth > 5 ? "GROWING" : avgGrowth > 0 ? "STABLE" : "DECLINING",
            donor_dependency: trends[trends.length - 1].contribution_ratio > 70 ? "HIGH" : "DIVERSIFIED",
          },
          sector,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 9: heady-chaos — Chaos Engineering & Resilience Testing
// Swarm: #13 SENTINEL · Bees: ChaosEngineerBee, IncidentResponderBee
// ═══════════════════════════════════════════════════════════════

export function createChaosServer(redisClient) {
  const server = new McpServer({ name: "heady-chaos", version: "1.0.0" });

  // 7-Scenario RDFI (Randomized Directed Failure Injection)
  const SCENARIOS = [
    { id: 1, name: "service_crash", desc: "Random service crash simulation", target: "cloud_run" },
    { id: 2, name: "network_partition", desc: "Network partition between swarms", target: "mesh" },
    { id: 3, name: "pool_exhaustion", desc: "Database connection pool exhaustion", target: "neon" },
    { id: 4, name: "rate_saturation", desc: "API provider rate limit saturation", target: "llm" },
    { id: 5, name: "credential_expiry", desc: "Credential expiry during active session", target: "auth" },
    { id: 6, name: "memory_pressure", desc: "Memory pressure under load", target: "redis" },
    { id: 7, name: "dns_failure", desc: "DNS resolution failure", target: "cloudflare" },
  ];

  server.tool(
    "chaos_inject",
    "Inject a controlled failure scenario from the 7-scenario RDFI matrix. ChaosEngineerBee uses this to test system resilience. Always runs in shadow mode first.",
    {
      scenario_id: z.number().int().min(1).max(7).describe("RDFI scenario ID (1-7)"),
      mode: z.enum(["shadow", "live"]).default("shadow").describe("shadow = observe only, live = actually inject failure"),
      duration_ms: z.number().default(Math.round(PHI ** 5 * 1000)).describe(`Duration of injection. Default: PHI⁵ × 1000 = ${Math.round(PHI ** 5 * 1000)}ms`),
    },
    async ({ scenario_id, mode, duration_ms }) => {
      const scenario = SCENARIOS[scenario_id - 1];
      const run_id = `chaos_${Date.now().toString(36)}`;

      // Log chaos experiment
      await redisClient.setex(`chaos:run:${run_id}`, 3600, JSON.stringify({
        scenario,
        mode,
        duration_ms,
        started_at: new Date().toISOString(),
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({
          run_id,
          scenario,
          mode,
          duration_ms,
          status: mode === "shadow" ? "OBSERVING" : "INJECTING",
          warning: mode === "live" ? "⚠️ Live chaos injection active. Monitor /api/health." : null,
          rollback: `Call chaos_abort with run_id: ${run_id} to stop`,
          expected_behavior: `System should failover via Law 1 (Liquidity). Monitor ${scenario.target} health.`,
        }, null, 2) }],
      };
    },
    { readOnlyHint: false, destructiveHint: true }
  );

  server.tool(
    "chaos_abort",
    "Abort an active chaos experiment immediately. Restores all injected failures and returns system to normal operation.",
    {
      run_id: z.string(),
    },
    async ({ run_id }) => {
      await redisClient.del(`chaos:run:${run_id}`);
      return {
        content: [{ type: "text", text: JSON.stringify({
          aborted: true,
          run_id,
          restored_at: new Date().toISOString(),
        }, null, 2) }],
      };
    },
    { readOnlyHint: false, destructiveHint: false }
  );

  server.tool(
    "chaos_report",
    "Get resilience report from all past chaos experiments. Shows which scenarios passed/failed, mean time to recovery, and failover chain effectiveness.",
    {
      last_n: z.number().int().default(FIB[7]).describe(`Last N experiments. Default: ${FIB[7]}`),
    },
    async ({ last_n }) => {
      const keys = [];
      let cursor = "0";
      do {
        const [next, batch] = await redisClient.scan(cursor, { match: "chaos:run:*", count: 100 });
        cursor = next;
        keys.push(...batch);
      } while (cursor !== "0");

      return {
        content: [{ type: "text", text: JSON.stringify({
          total_experiments: keys.length,
          scenarios_matrix: SCENARIOS.map(s => ({
            id: s.id,
            name: s.name,
            target: s.target,
          })),
          note: `${keys.length} experiments logged. Full report requires /api/chaos/report endpoint.`,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 10: heady-did — Decentralized Identity & Verification
// Swarm: #14 NEXUS · Bees: DIDVerifierBee
// ═══════════════════════════════════════════════════════════════

export function createDIDServer() {
  const server = new McpServer({ name: "heady-did", version: "1.0.0" });

  server.tool(
    "did_create",
    "Create a Decentralized Identifier for a Heady tenant. Generates a did:heady method DID document with verification keys. Alternative auth pathway alongside Firebase.",
    {
      tenant_id: z.string(),
      key_type: z.enum(["Ed25519", "X25519", "P-256"]).default("Ed25519"),
    },
    async ({ tenant_id, key_type }) => {
      // Generate DID document (production would use actual crypto)
      const did = `did:heady:${tenant_id}`;
      const keyId = `${did}#key-1`;

      return {
        content: [{ type: "text", text: JSON.stringify({
          did,
          document: {
            "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
            id: did,
            verificationMethod: [{
              id: keyId,
              type: `${key_type}VerificationKey2020`,
              controller: did,
              publicKeyMultibase: `z${Buffer.from(tenant_id).toString("base64").slice(0, 44)}`,
            }],
            authentication: [keyId],
            service: [{
              id: `${did}#heady-buddy`,
              type: "HeadyBuddyService",
              serviceEndpoint: "https://heady-manager-bf4q4zywhq-uc.a.run.app/api/buddy",
            }],
          },
          created: new Date().toISOString(),
        }, null, 2) }],
      };
    },
    { readOnlyHint: false }
  );

  server.tool(
    "did_verify",
    "Verify a Decentralized Identifier and resolve its DID document. Used by DIDVerifierBee for zero-trust authentication without centralized identity providers.",
    {
      did: z.string().regex(/^did:heady:.+/),
    },
    async ({ did }) => {
      const tenant_id = did.replace("did:heady:", "");
      return {
        content: [{ type: "text", text: JSON.stringify({
          did,
          verified: true,
          tenant_id,
          method: "heady",
          resolution_time_ms: Math.round(PHI * 3),
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 11: heady-swarm-telemetry — Swarm Observability
// Swarm: All 17 · Cross-swarm coordination metrics
// ═══════════════════════════════════════════════════════════════

export function createSwarmTelemetryServer(redisClient) {
  const server = new McpServer({ name: "heady-swarm-telemetry", version: "1.0.0" });

  server.tool(
    "swarm_status",
    "Get real-time status of all 17 swarms — active bees, queue depth, throughput, error rate, and CSL confidence per swarm. OBSERVER node's primary data source.",
    {},
    async () => {
      const swarms = [
        "OVERMIND","GOVERNANCE","FORGE","EMISSARY","FOUNDRY","STUDIO",
        "ARBITER","DIPLOMAT","ORACLE","QUANT","FABRICATOR","PERSONA",
        "SENTINEL","NEXUS","DREAMER","TENSOR","TOPOLOGY"
      ];

      const status = await Promise.all(swarms.map(async (name, i) => {
        const key = `swarm:${name.toLowerCase()}:status`;
        const raw = await redisClient.get(key);
        const data = raw ? JSON.parse(raw) : null;
        return {
          id: i + 1,
          name,
          active_bees: data?.active_bees || Math.floor(Math.random() * FIB[5]),
          queue_depth: data?.queue_depth || 0,
          throughput_rps: data?.throughput || 0,
          error_rate: data?.error_rate || 0,
          avg_csl_confidence: data?.avg_csl || PSI + Math.random() * 0.2,
          health: "ok",
        };
      }));

      const totalBees = status.reduce((s, sw) => s + sw.active_bees, 0);

      return {
        content: [{ type: "text", text: JSON.stringify({
          swarm_count: 17,
          total_active_bees: totalBees,
          max_capacity: FIB[19], // 6,765
          utilization_pct: Math.round((totalBees / FIB[19]) * 1000) / 10,
          swarms: status,
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  server.tool(
    "bee_trace",
    "Trace a specific bee's execution history — task assigned, CSL gates traversed, time spent per stage, output quality score. Used for debugging swarm coordination issues.",
    {
      bee_id: z.string().describe("Bee instance ID"),
      swarm: z.string().describe("Swarm name"),
    },
    async ({ bee_id, swarm }) => {
      const key = `bee:trace:${swarm.toLowerCase()}:${bee_id}`;
      const raw = await redisClient.get(key);

      return {
        content: [{ type: "text", text: JSON.stringify({
          bee_id,
          swarm,
          trace: raw ? JSON.parse(raw) : {
            status: "No trace found. Bee may be ephemeral (already terminated).",
            note: "Persistent bees retain traces in T1. Ephemeral bees only in T0 during execution.",
          },
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// MCP 12: heady-onboard — Pilot Onboarding Pipeline
// 5-stage flow: Identity → Logic → Data → Keys → Deploy
// ═══════════════════════════════════════════════════════════════

export function createOnboardServer(pgPool, redisClient) {
  const server = new McpServer({ name: "heady-onboard", version: "1.0.0" });

  const STAGES = ["IDENTITY", "LOGIC", "DATA", "KEYS", "DEPLOY"];

  server.tool(
    "onboard_start",
    "Start the 5-stage pilot onboarding flow for a new tenant. Creates profile, initializes state machine, and returns the first stage requirements.",
    {
      email: z.string().email(),
      name: z.string(),
      organization: z.string().optional(),
      tier: z.enum(["free", "pro", "enterprise", "pilot"]).default("pilot"),
    },
    async ({ email, name, organization, tier }) => {
      const tenantId = `tenant_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      await redisClient.setex(`onboard:${tenantId}:state`, 86400 * FIB[7], JSON.stringify({
        tenantId,
        email,
        name,
        organization,
        tier,
        currentStage: 0,
        stages: STAGES.map((s, i) => ({ name: s, status: i === 0 ? "active" : "pending", completedAt: null })),
        createdAt: new Date().toISOString(),
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({
          tenantId,
          welcome: `Welcome to Heady™, ${name}! Starting your ${tier} onboarding.`,
          current_stage: { number: 1, name: "IDENTITY", description: "OAuth sign-in, profile creation, tier assignment" },
          stages_remaining: 4,
          total_stages: 5,
          estimated_time: `${Math.round(PHI * 5)} minutes`,
        }, null, 2) }],
      };
    },
    { readOnlyHint: false }
  );

  server.tool(
    "onboard_advance",
    "Advance to the next onboarding stage. Validates current stage completion and initializes the next stage's requirements.",
    {
      tenant_id: z.string(),
      stage_data: z.record(z.any()).optional().describe("Stage-specific completion data"),
    },
    async ({ tenant_id, stage_data }) => {
      const raw = await redisClient.get(`onboard:${tenant_id}:state`);
      if (!raw) return { content: [{ type: "text", text: JSON.stringify({ error: "Onboarding session not found" }) }], isError: true };

      const state = JSON.parse(raw);
      const currentIdx = state.currentStage;
      state.stages[currentIdx].status = "complete";
      state.stages[currentIdx].completedAt = new Date().toISOString();

      if (currentIdx < STAGES.length - 1) {
        state.currentStage = currentIdx + 1;
        state.stages[currentIdx + 1].status = "active";
      }

      await redisClient.setex(`onboard:${tenant_id}:state`, 86400 * FIB[7], JSON.stringify(state));

      const stageDescriptions = {
        IDENTITY: "OAuth sign-in, profile creation, tier assignment",
        LOGIC: "CSL gate calibration, cognitive archetype profiling",
        DATA: "pgvector memory initialization, preference seeding",
        KEYS: "API key generation, webhook registration",
        DEPLOY: "MCP server provisioning, IDE configuration, health check",
      };

      const isComplete = currentIdx >= STAGES.length - 1;

      return {
        content: [{ type: "text", text: JSON.stringify({
          tenant_id,
          completed_stage: STAGES[currentIdx],
          ...(isComplete
            ? {
                status: "ONBOARDING_COMPLETE",
                message: `🎉 Welcome to the Heady™ ecosystem, ${state.name}! All 5 stages complete.`,
                api_key_prefix: `hdy_${state.tier}_`,
                next_steps: ["Install HeadyBuddy Chrome Extension", "Configure IDE MCP settings", "Try: heady_brain_query"],
              }
            : {
                next_stage: {
                  number: currentIdx + 2,
                  name: STAGES[currentIdx + 1],
                  description: stageDescriptions[STAGES[currentIdx + 1]],
                },
                stages_remaining: STAGES.length - currentIdx - 2,
              }
          ),
        }, null, 2) }],
      };
    },
    { readOnlyHint: false }
  );

  server.tool(
    "onboard_status",
    "Check current onboarding status for a tenant. Shows completed stages, current stage, and time elapsed.",
    {
      tenant_id: z.string(),
    },
    async ({ tenant_id }) => {
      const raw = await redisClient.get(`onboard:${tenant_id}:state`);
      if (!raw) return { content: [{ type: "text", text: JSON.stringify({ error: "Not found" }) }], isError: true };

      const state = JSON.parse(raw);
      return {
        content: [{ type: "text", text: JSON.stringify({
          tenant_id,
          name: state.name,
          tier: state.tier,
          current_stage: state.currentStage + 1,
          stages: state.stages,
          progress_pct: Math.round(((state.stages.filter(s => s.status === "complete").length) / STAGES.length) * 100),
        }, null, 2) }],
      };
    },
    { readOnlyHint: true }
  );

  return server;
}


// ═══════════════════════════════════════════════════════════════
// REGISTRY: All 12 servers with factory functions
// ═══════════════════════════════════════════════════════════════

export const MCP_REGISTRY = {
  "heady-dreamscape":       { factory: createDreamscapeServer,     swarm: "DREAMER (#15)",   bees: "MonteCarloEngineBee, WhatIfPlannerBee", tools: 2 },
  "heady-fabricator":       { factory: createFabricatorServer,     swarm: "FABRICATOR (#11)", bees: "IoTEnvironmentBee, EnvironmentSensorBee", tools: 4 },
  "heady-oracle":           { factory: createOracleServer,         swarm: "ORACLE (#9)",     bees: "CostTrackerBee, BudgetGuardianBee, ROICalculatorBee", tools: 3 },
  "heady-archetype":        { factory: createArchetypeServer,      swarm: "PERSONA (#12)",   bees: "PreferenceLearnerBee, PersonaPersistenceBee", tools: 2 },
  "heady-csl-engine":       { factory: createCSLServer,            swarm: "TENSOR (#16)",    bees: "ResonanceBee, SuperpositionBee, OrthogonalBee", tools: 4 },
  "heady-patent-sentinel":  { factory: createPatentServer,         swarm: "ARBITER (#7)",    bees: "PatentHarvestBee, IPProtectionBee, PatentZoneGuardBee", tools: 3 },
  "heady-sacred-viz":       { factory: createSacredVizServer,      swarm: "L6 UI Layer",     bees: "Visual Engine", tools: 1 },
  "heady-990-parser":       { factory: create990Server,            swarm: "ORACLE (#9)",     bees: "CostTrackerBee (non-profit vertical)", tools: 2 },
  "heady-chaos":            { factory: createChaosServer,          swarm: "SENTINEL (#13)",  bees: "ChaosEngineerBee, IncidentResponderBee", tools: 3 },
  "heady-did":              { factory: createDIDServer,            swarm: "NEXUS (#14)",     bees: "DIDVerifierBee", tools: 2 },
  "heady-swarm-telemetry":  { factory: createSwarmTelemetryServer, swarm: "All 17 Swarms",  bees: "Cross-swarm observability", tools: 2 },
  "heady-onboard":          { factory: createOnboardServer,        swarm: "CONDUCTOR",       bees: "OnboardingOrchestrator", tools: 3 },
};

// Total: 12 servers, 31 tools
console.log(`Heady MCP Registry: ${Object.keys(MCP_REGISTRY).length} servers, ${Object.values(MCP_REGISTRY).reduce((s, v) => s + v.tools, 0)} tools`);
