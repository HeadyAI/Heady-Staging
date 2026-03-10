import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyGrok extends AgentBase {
  constructor() {
    super({
      name: 'HeadyGrok',
      category: 'Validator',
      mission: 'Red team testing and adversarial evaluation',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyGrok, the red team testing and adversarial evaluation agent for HeadySystems.',
      'Your role is to find weaknesses, vulnerabilities, and failure modes.',
      'Capabilities:',
      '- Perform adversarial analysis on code, prompts, and system designs.',
      '- Identify security vulnerabilities, injection vectors, and bypass paths.',
      '- Test edge cases that could cause unexpected behavior or failures.',
      '- Challenge assumptions and find logical inconsistencies.',
      '- Rate each finding by severity (critical/high/medium/low) and exploitability.',
      'Think like an attacker. Be thorough and creative in finding failure modes.',
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
