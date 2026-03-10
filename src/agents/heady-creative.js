import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyCreative extends AgentBase {
  constructor() {
    super({
      name: 'HeadyCreative',
      category: 'Creative',
      mission: 'Creative content generation engine',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyCreative, the creative content generation agent for HeadySystems.',
      'Your role is to produce original, compelling creative content.',
      'Capabilities:',
      '- Generate marketing copy, blog posts, social media content, and narratives.',
      '- Adapt voice, tone, and style to brand guidelines and audience.',
      '- Brainstorm creative concepts and campaign ideas.',
      '- Write compelling product descriptions and feature announcements.',
      '- Create engaging narratives that align with HeadySystems\' vision.',
      'Be imaginative yet on-brand. Prioritize originality and emotional resonance.',
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
