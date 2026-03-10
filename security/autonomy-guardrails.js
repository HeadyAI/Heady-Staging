/**
 * Heady Autonomy Guardrails — Agent behavior boundaries with CSL enforcement
 * Action classification, escalation rules, human-in-the-loop triggers
 * Author: Eric Haywood | All constants φ-derived | ESM only
 */
import { createHash } from 'crypto';
import { PHI, PSI, PSI2, phiThreshold, phiBackoff, fibonacci } from '../shared/phi-math-v2.js';
import { cslGate, cosineSimilarity } from '../shared/csl-engine-v2.js';

const MAX_AUTONOMOUS_ACTIONS = fibonacci(8);  // 21 before mandatory check-in
const ESCALATION_THRESHOLD   = phiThreshold(3); // ≈0.882
const COOLDOWN_MS            = fibonacci(11) * 1000; // 89s
const AUDIT_LOG_SIZE         = fibonacci(17);  // 1597

function sha256(input) { return createHash('sha256').update(String(input)).digest('hex'); }

const actionLog = [];
const escalations = [];
const guardrailRules = new Map();
const agentStates = new Map();
const metrics = { evaluated: 0, allowed: 0, blocked: 0, escalated: 0 };

const ACTION_CATEGORIES = {
  READ:    { riskLevel: phiThreshold(0), requiresApproval: false },
  ANALYZE: { riskLevel: phiThreshold(1), requiresApproval: false },
  SUGGEST: { riskLevel: phiThreshold(1), requiresApproval: false },
  CREATE:  { riskLevel: phiThreshold(2), requiresApproval: false },
  MODIFY:  { riskLevel: phiThreshold(2), requiresApproval: true },
  DELETE:  { riskLevel: phiThreshold(3), requiresApproval: true },
  DEPLOY:  { riskLevel: phiThreshold(4), requiresApproval: true },
  BILLING: { riskLevel: phiThreshold(4), requiresApproval: true },
  SECURITY:{ riskLevel: phiThreshold(4), requiresApproval: true },
};

function registerGuardrail(name, rule) {
  guardrailRules.set(name, {
    name,
    condition: rule.condition || (() => true),
    action: rule.action || 'block',
    message: rule.message || 'Guardrail triggered',
    severity: rule.severity || 'HIGH',
    hash: sha256(name + rule.message),
  });
  return { registered: name };
}

function evaluateAction(agentId, action) {
  const category = ACTION_CATEGORIES[action.category] || ACTION_CATEGORIES.READ;
  let state = agentStates.get(agentId);
  if (!state) {
    state = { agentId, actionCount: 0, lastCheckin: Date.now(), escalationCount: 0 };
    agentStates.set(agentId, state);
  }

  state.actionCount++;
  metrics.evaluated++;

  // Check autonomous action limit
  if (state.actionCount >= MAX_AUTONOMOUS_ACTIONS) {
    const escalation = {
      type: 'action_limit',
      agentId,
      actionCount: state.actionCount,
      timestamp: Date.now(),
      hash: sha256(agentId + state.actionCount),
    };
    escalations.push(escalation);
    state.escalationCount++;
    metrics.escalated++;
    return {
      allowed: false,
      reason: 'autonomous_action_limit',
      escalation,
      action: 'require_human_checkin',
    };
  }

  // Risk-based CSL gate
  const riskScore = category.riskLevel;
  const trustScore = 1.0 - (state.escalationCount / fibonacci(5));
  const gate = cslGate(trustScore, 1.0 - riskScore, phiThreshold(2), PSI * PSI * PSI);

  if (category.requiresApproval && gate < ESCALATION_THRESHOLD) {
    const escalation = {
      type: 'risk_escalation',
      agentId,
      actionCategory: action.category,
      riskLevel: riskScore,
      trustScore,
      gateScore: gate,
      timestamp: Date.now(),
      hash: sha256(agentId + action.category + Date.now()),
    };
    escalations.push(escalation);
    state.escalationCount++;
    metrics.escalated++;
    return {
      allowed: false,
      reason: 'risk_threshold_exceeded',
      escalation,
      action: 'require_human_approval',
    };
  }

  // Check custom guardrails
  for (const [name, rule] of guardrailRules) {
    try {
      if (rule.condition(action, state)) {
        metrics.blocked++;
        return {
          allowed: false,
          reason: 'guardrail_' + name,
          message: rule.message,
          severity: rule.severity,
        };
      }
    } catch {}
  }

  // Action allowed
  const entry = {
    agentId,
    action: action.category,
    description: action.description || '',
    riskLevel: riskScore,
    gateScore: gate,
    timestamp: Date.now(),
    hash: sha256(agentId + JSON.stringify(action) + Date.now()),
  };
  if (actionLog.length >= AUDIT_LOG_SIZE) actionLog.shift();
  actionLog.push(entry);
  metrics.allowed++;

  return { allowed: true, riskLevel: riskScore, gateScore: gate, actionNumber: state.actionCount };
}

function humanCheckin(agentId) {
  const state = agentStates.get(agentId);
  if (!state) return { error: 'unknown_agent' };
  state.actionCount = 0;
  state.lastCheckin = Date.now();
  return { agentId, checkedIn: true, actionCountReset: true };
}

function getAgentState(agentId) {
  return agentStates.get(agentId) || null;
}

function getEscalations(limit) {
  return { total: escalations.length, escalations: escalations.slice(-(limit || fibonacci(8))) };
}

function getAuditLog(agentId, limit) {
  const filtered = agentId ? actionLog.filter(a => a.agentId === agentId) : actionLog;
  return { total: filtered.length, actions: filtered.slice(-(limit || fibonacci(8))) };
}

function createServer(port = 3394) {
  return import('http').then(({ default: http }) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const respond = (s, b) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
      const readBody = () => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => { try { r(JSON.parse(Buffer.concat(c).toString())); } catch { r({}); } }); });

      if (url.pathname === '/guardrails/evaluate' && req.method === 'POST') { const b = await readBody(); respond(200, evaluateAction(b.agentId, b.action || b)); }
      else if (url.pathname === '/guardrails/checkin' && req.method === 'POST') { const b = await readBody(); respond(200, humanCheckin(b.agentId)); }
      else if (url.pathname === '/guardrails/state' && req.method === 'GET') { const s = getAgentState(url.searchParams.get('agentId')); respond(s ? 200 : 404, s || { error: 'not_found' }); }
      else if (url.pathname === '/guardrails/escalations' && req.method === 'GET') respond(200, getEscalations());
      else if (url.pathname === '/guardrails/audit' && req.method === 'GET') respond(200, getAuditLog(url.searchParams.get('agentId')));
      else if (url.pathname === '/guardrails/register' && req.method === 'POST') { const b = await readBody(); respond(201, registerGuardrail(b.name, b)); }
      else if (url.pathname === '/health') respond(200, { service: 'autonomy-guardrails', status: 'healthy', agents: agentStates.size, escalations: escalations.length, metrics });
      else respond(404, { error: 'not_found' });
    });
    server.listen(port);
    return server;
  });
}

export default { createServer, evaluateAction, humanCheckin, registerGuardrail, getAgentState, getEscalations, getAuditLog, ACTION_CATEGORIES };
export { createServer, evaluateAction, humanCheckin, registerGuardrail, getAgentState, getEscalations, getAuditLog, ACTION_CATEGORIES };
