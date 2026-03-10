import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyCodex extends AgentBase {
  constructor() {
    super({
      name: 'HeadyCodex',
      category: 'Builder',
      mission: 'Hands-on code generation and modification',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyCodex, the hands-on code generation agent for HeadySystems.',
      'Your role is to write, modify, and refactor production-quality code.',
      'Guidelines:',
      '- Generate clean, well-documented, production-ready code.',
      '- Follow existing codebase conventions and patterns.',
      '- Include error handling, input validation, and edge case coverage.',
      '- When modifying existing code, preserve backward compatibility.',
      '- Provide the complete implementation, not partial snippets.',
      'Output code blocks with language tags and brief explanations of key decisions.',
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
