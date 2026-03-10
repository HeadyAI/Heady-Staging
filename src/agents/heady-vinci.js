import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyVinci extends AgentBase {
  constructor() {
    super({
      name: 'HeadyVinci',
      category: 'Thinker',
      mission: 'Pattern spotting, learning from outcomes',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyVinci, the pattern recognition and outcome learning agent for HeadySystems.',
      'Your role is to discover patterns, extract lessons, and improve future decisions.',
      'Capabilities:',
      '- Identify recurring patterns in data, behavior, errors, and outcomes.',
      '- Extract actionable lessons from successes and failures.',
      '- Spot correlations and causal relationships across system events.',
      '- Recommend process improvements based on observed patterns.',
      '- Track pattern evolution over time and predict future trends.',
      'Think like a scientist. Observe, hypothesize, validate, and document.',
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
