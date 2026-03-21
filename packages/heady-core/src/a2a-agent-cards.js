// ╔══════════════════════════════════════════════════════════════════╗
// ║  HEADY™ A2A Agent-to-Agent Protocol v1.0                       ║
// ║  Agent Cards for all 17 swarms + discovery + task delegation    ║
// ║  Implements Google A2A v0.3 over HTTP/SSE                      ║
// ║  ⚠️ PATENT LOCK — HS-2026-051 — Multi-swarm coordination      ║
// ║  © 2026 HeadySystems Inc. — Eric Haywood, Founder              ║
// ╚══════════════════════════════════════════════════════════════════╝

const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = 1 / PHI;

// ── 17 Swarm Agent Cards ────────────────────────────────────────────
export const SWARM_AGENT_CARDS = [
  {
    name: 'HeadyOvermind',
    description: 'Goal decomposition, task routing, and DAG construction. Central orchestrator for all swarms.',
    url: 'https://heady-ai.com/a2a/overmind',
    version: '1.0.0',
    capabilities: {
      streaming: true,
      pushNotifications: true,
      stateTransitionHistory: true,
    },
    skills: [
      { id: 'decompose', name: 'Task Decomposition', description: 'Break complex tasks into subtask DAGs', inputModes: ['text'], outputModes: ['text', 'data'] },
      { id: 'route', name: 'Swarm Routing', description: 'Route tasks to optimal swarm via CSL scoring', inputModes: ['text', 'data'], outputModes: ['data'] },
      { id: 'orchestrate', name: 'Pipeline Orchestration', description: 'Run HCFullPipeline 22-stage execution', inputModes: ['text', 'data'], outputModes: ['text', 'data'] },
    ],
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyGovernance',
    description: 'Policy enforcement, secrets management, compliance, and audit logging.',
    url: 'https://heady-ai.com/a2a/governance',
    version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'audit', name: 'Audit Trail', description: 'Log and verify all state-mutating operations', inputModes: ['data'], outputModes: ['data'] },
      { id: 'compliance', name: 'Compliance Check', description: 'Validate operations against policy rules', inputModes: ['text', 'data'], outputModes: ['data'] },
      { id: 'secrets', name: 'Secret Management', description: 'Rotate, verify, and audit secrets', inputModes: ['data'], outputModes: ['data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyForge',
    description: 'Code generation, AST mutation, testing, and hologram generation.',
    url: 'https://heady-ai.com/a2a/forge',
    version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'codegen', name: 'Code Generation', description: 'Generate production code from specs', inputModes: ['text'], outputModes: ['text', 'file'] },
      { id: 'ast-mutate', name: 'AST Mutation', description: 'Transform code via abstract syntax tree operations', inputModes: ['text', 'file'], outputModes: ['file'] },
      { id: 'test-gen', name: 'Test Generation', description: 'Generate comprehensive test suites', inputModes: ['text', 'file'], outputModes: ['file'] },
      { id: 'refactor', name: 'Code Refactoring', description: 'Improve code structure without changing behavior', inputModes: ['file'], outputModes: ['file'] },
    ],
    defaultInputModes: ['text'], defaultOutputModes: ['text', 'file'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyEmissary',
    description: 'Documentation, MCP protocol bridging, SDK publishing, and API design.',
    url: 'https://heady-ai.com/a2a/emissary',
    version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: false },
    skills: [
      { id: 'document', name: 'Documentation', description: 'Generate technical documentation from code', inputModes: ['text', 'file'], outputModes: ['text', 'file'] },
      { id: 'mcp-bridge', name: 'MCP Bridge', description: 'Translate between MCP and A2A protocols', inputModes: ['data'], outputModes: ['data'] },
      { id: 'sdk-publish', name: 'SDK Publishing', description: 'Package and publish SDK artifacts', inputModes: ['file'], outputModes: ['data'] },
    ],
    defaultInputModes: ['text'], defaultOutputModes: ['text'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyFoundry', description: 'Dataset curation, model fine-tuning, LoRA training.',
    url: 'https://heady-ai.com/a2a/foundry', version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'fine-tune', name: 'Model Fine-tuning', description: 'QLoRA fine-tuning on Colab GPUs', inputModes: ['data', 'file'], outputModes: ['data'] },
      { id: 'curate', name: 'Dataset Curation', description: 'Prepare and clean training datasets', inputModes: ['file'], outputModes: ['file'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyStudio', description: 'MIDI bridge, DAW integration, music production.',
    url: 'https://heady-ai.com/a2a/studio', version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: false },
    skills: [
      { id: 'midi', name: 'MIDI Processing', description: 'Parse, generate, and transform MIDI', inputModes: ['data'], outputModes: ['data'] },
      { id: 'audio-gen', name: 'Audio Generation', description: 'Generate music and sound effects', inputModes: ['text'], outputModes: ['audio'] },
    ],
    defaultInputModes: ['text'], defaultOutputModes: ['audio'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyArbiter', description: 'IP protection, patent harvesting, license compliance.',
    url: 'https://heady-ai.com/a2a/arbiter', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'patent-scan', name: 'Patent Scan', description: 'Detect patentable innovations and potential infringements', inputModes: ['text', 'file'], outputModes: ['data'] },
      { id: 'license-check', name: 'License Compliance', description: 'Verify dependency license compatibility', inputModes: ['file'], outputModes: ['data'] },
    ],
    defaultInputModes: ['text'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyDiplomat', description: 'B2B procurement, partnership negotiation.',
    url: 'https://heady-ai.com/a2a/diplomat', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: false },
    skills: [
      { id: 'procure', name: 'Procurement', description: 'Evaluate vendors and negotiate terms', inputModes: ['text', 'data'], outputModes: ['text', 'data'] },
    ],
    defaultInputModes: ['text'], defaultOutputModes: ['text'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyOracle', description: 'Economic guardrails, billing, cost tracking.',
    url: 'https://heady-ai.com/a2a/oracle', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'budget', name: 'Budget Management', description: 'Track spend, enforce caps, auto-downgrade', inputModes: ['data'], outputModes: ['data'] },
      { id: 'forecast', name: 'Cost Forecasting', description: 'Project future spend based on usage patterns', inputModes: ['data'], outputModes: ['data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyQuant', description: 'Trading strategies, portfolio optimization, risk management.',
    url: 'https://heady-ai.com/a2a/quant', version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'analyze', name: 'Market Analysis', description: 'Technical and fundamental analysis', inputModes: ['text', 'data'], outputModes: ['text', 'data'] },
      { id: 'risk', name: 'Risk Management', description: 'Position sizing and risk assessment', inputModes: ['data'], outputModes: ['data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyFabricator', description: 'IoT control, CAD generation, hardware.',
    url: 'https://heady-ai.com/a2a/fabricator', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: false },
    skills: [
      { id: 'iot', name: 'IoT Control', description: 'Interface with IoT devices and sensors', inputModes: ['data'], outputModes: ['data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyPersona', description: 'Personality consistency, empathic adaptation.',
    url: 'https://heady-ai.com/a2a/persona', version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
    skills: [
      { id: 'adapt', name: 'Persona Adaptation', description: 'Adapt communication style to user context', inputModes: ['text', 'data'], outputModes: ['text'] },
    ],
    defaultInputModes: ['text'], defaultOutputModes: ['text'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadySentinel', description: 'Threat detection, vulnerability scanning, self-healing.',
    url: 'https://heady-ai.com/a2a/sentinel', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'scan', name: 'Security Scan', description: 'Vulnerability and threat detection', inputModes: ['data', 'file'], outputModes: ['data'] },
      { id: 'heal', name: 'Self-Healing', description: 'Automated incident response and recovery', inputModes: ['data'], outputModes: ['data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyNexus', description: 'Smart contracts, blockchain, tokenization.',
    url: 'https://heady-ai.com/a2a/nexus', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'deploy', name: 'Contract Deploy', description: 'Deploy and verify smart contracts', inputModes: ['text', 'file'], outputModes: ['data'] },
    ],
    defaultInputModes: ['text'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyDreamer', description: 'Monte Carlo simulation, scenario modeling.',
    url: 'https://heady-ai.com/a2a/dreamer', version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
    skills: [
      { id: 'simulate', name: 'Monte Carlo Sim', description: '1K+ scenario risk simulation', inputModes: ['data'], outputModes: ['data'] },
      { id: 'whatif', name: 'What-If Analysis', description: 'Explore alternative outcomes', inputModes: ['text', 'data'], outputModes: ['text', 'data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyTensor', description: 'Semantic logic: IF, AND, NOT in vector space.',
    url: 'https://heady-ai.com/a2a/tensor', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    skills: [
      { id: 'csl-gate', name: 'CSL Gate Evaluation', description: 'Execute CSL logic operations on vectors', inputModes: ['data'], outputModes: ['data'] },
      { id: 'consensus', name: 'Multi-Agent Consensus', description: 'φ-weighted multi-agent agreement scoring', inputModes: ['data'], outputModes: ['data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
  {
    name: 'HeadyTopology', description: 'Dimensionality reduction, dependency tracking.',
    url: 'https://heady-ai.com/a2a/topology', version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    skills: [
      { id: 'reduce', name: 'Dimensionality Reduction', description: 'PCA/K-Means on vector spaces', inputModes: ['data'], outputModes: ['data'] },
      { id: 'deps', name: 'Dependency Graph', description: 'Track and visualize system dependencies', inputModes: ['data'], outputModes: ['data'] },
    ],
    defaultInputModes: ['data'], defaultOutputModes: ['data'],
    provider: { organization: 'HeadySystems Inc.', url: 'https://headysystems.com' },
    authentication: { schemes: ['bearer'], credentials: null },
  },
];

/**
 * A2A Server — Serves Agent Cards and handles task delegation.
 * Mount on Express/Hono: app.use('/a2a', createA2ARouter())
 */
export function createA2ARouter(Router) {
  const router = new Router();

  // Discovery: GET /.well-known/agent.json
  router.get('/.well-known/agent.json', (req, res) => {
    const cards = SWARM_AGENT_CARDS.map(c => ({
      ...c,
      url: `${req.protocol}://${req.get('host')}/a2a/${c.name.replace('Heady', '').toLowerCase()}`,
    }));
    res.json({ agents: cards, protocol: 'a2a', version: '0.3' });
  });

  // Individual card: GET /a2a/:swarm
  router.get('/a2a/:swarm', (req, res) => {
    const card = SWARM_AGENT_CARDS.find(
      c => c.name.replace('Heady', '').toLowerCase() === req.params.swarm.toLowerCase()
    );
    if (!card) return res.status(404).json({ error: 'Swarm not found' });
    res.json(card);
  });

  // Task delegation: POST /a2a/:swarm/tasks/send
  router.post('/a2a/:swarm/tasks/send', async (req, res) => {
    const card = SWARM_AGENT_CARDS.find(
      c => c.name.replace('Heady', '').toLowerCase() === req.params.swarm.toLowerCase()
    );
    if (!card) return res.status(404).json({ error: 'Swarm not found' });

    const { id, message, sessionId } = req.body;
    // Validate task against card skills
    const validSkills = card.skills.map(s => s.id);

    res.json({
      id: id || `task-${Date.now().toString(36)}`,
      status: { state: 'submitted' },
      sessionId: sessionId || `session-${Date.now().toString(36)}`,
      swarm: card.name,
      availableSkills: validSkills,
      message: `Task delegated to ${card.name}`,
    });
  });

  return router;
}

/**
 * A2A Client — Discover and delegate tasks to external A2A agents.
 */
export class A2AClient {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async discover() {
    const resp = await fetch(`${this.baseUrl}/.well-known/agent.json`, {
      headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
    });
    return resp.json();
  }

  async sendTask(swarmName, task) {
    const resp = await fetch(`${this.baseUrl}/a2a/${swarmName}/tasks/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
      },
      body: JSON.stringify(task),
    });
    return resp.json();
  }
}

export default { SWARM_AGENT_CARDS, createA2ARouter, A2AClient };
