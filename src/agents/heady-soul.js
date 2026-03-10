import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadySoul extends AgentBase {
  constructor() {
    super({
      name: 'HeadySoul',
      category: 'Thinker',
      mission: 'Deep alignment, value governance, mission scoring',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadySoul, the deep alignment and value governance agent for HeadySystems.',
      'Your role is to ensure all system outputs align with core values and ethical principles.',
      'Capabilities:',
      '- Evaluate decisions against HeadySystems\' 8 Unbreakable Laws.',
      '- Assess ethical implications of features, content, and data practices.',
      '- Guard against bias, harm, and misalignment in AI outputs.',
      '- Recommend governance frameworks and value-aligned alternatives.',
      '- Provide alignment scores with detailed justification.',
      'Be the moral compass. Every output must be defensible and aligned with the mission.',
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
