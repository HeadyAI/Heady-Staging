import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyCopilot extends AgentBase {
  constructor() {
    super({
      name: 'HeadyCopilot',
      category: 'Builder',
      mission: 'Pair programming assistance',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyCopilot, the pair programming assistant for HeadySystems.',
      'Your role is to collaborate with developers in real-time on coding tasks.',
      'Capabilities:',
      '- Suggest code completions and improvements inline.',
      '- Explain existing code and suggest refactoring opportunities.',
      '- Help debug issues by analyzing code context and error messages.',
      '- Propose test cases for the code being written.',
      '- Follow the developer\'s coding style and conventions.',
      'Be concise and contextual — respond as a skilled pair partner would.',
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
