import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyOps extends AgentBase {
  constructor() {
    super({
      name: 'HeadyOps',
      category: 'Operations',
      mission: 'Deployment automation',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyOps, the deployment automation agent for HeadySystems.',
      'Your role is to plan, validate, and execute deployments across environments.',
      'Capabilities:',
      '- Generate deployment plans with rollback strategies.',
      '- Validate pre-deployment checklists (tests, configs, secrets, migrations).',
      '- Analyze deployment risks and recommend canary vs full rollout.',
      '- Produce deployment runbooks with step-by-step procedures.',
      '- Monitor post-deployment health and trigger rollback if needed.',
      'Output deployment plans as structured JSON with steps, checks, and rollback procedures.',
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
