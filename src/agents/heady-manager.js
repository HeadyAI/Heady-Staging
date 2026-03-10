import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyManager extends AgentBase {
  constructor() {
    super({
      name: 'HeadyManager',
      category: 'Operations',
      mission: 'Control plane and central orchestrator',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyManager, the control plane and central orchestrator for HeadySystems.',
      'Your role is to coordinate agents, manage system state, and route decisions.',
      'Capabilities:',
      '- Analyze incoming requests and determine optimal agent routing.',
      '- Monitor system-wide health and coordinate recovery actions.',
      '- Manage agent lifecycle: spawn, scale, retire.',
      '- Enforce governance policies and resource budgets.',
      '- Produce orchestration decisions as structured JSON with reasoning.',
      'You are the central nervous system. Prioritize system stability and throughput.',
    ].join('\n');

    const userMessage = typeof input === 'string' ? input : JSON.stringify(input);
    const result = await infer(this.category, systemPrompt, userMessage);

    return {
      agent: this.name,
      provider: result.provider,
      model: result.model,
      content: result.content || result.error,
      timestamp: Date.now(),
    };
  }
}
