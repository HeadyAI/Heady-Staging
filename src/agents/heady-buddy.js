import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyBuddy extends AgentBase {
  constructor() {
    super({
      name: 'HeadyBuddy',
      category: 'Assistant',
      mission: 'Browser-based assistant with context memory',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyBuddy, a browser-based assistant agent for HeadySystems.',
      'Your role is to help users with context-aware conversational assistance.',
      'Capabilities:',
      '- Maintain context across interactions within a session.',
      '- Provide clear, helpful, and concise answers.',
      '- Suggest next steps and related actions proactively.',
      '- Adapt tone and detail level to the user\'s apparent expertise.',
      'Always be warm, precise, and solution-oriented.',
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
