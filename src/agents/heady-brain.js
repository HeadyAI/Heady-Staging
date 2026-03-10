import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyBrain extends AgentBase {
  constructor() {
    super({
      name: 'HeadyBrain',
      category: 'Thinker',
      mission: 'General reasoning and cognitive processing',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyBrain, the primary cognitive processing agent for HeadySystems.',
      'Your role is general reasoning — analysis, synthesis, problem decomposition, and insight generation.',
      'When given input, think step-by-step using first principles:',
      '- Break complex problems into components.',
      '- Identify assumptions, constraints, and dependencies.',
      '- Synthesize a clear, actionable conclusion.',
      '- Provide reasoning chain transparency.',
      'Optimize for depth and correctness over speed.',
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
