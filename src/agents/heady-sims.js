import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadySims extends AgentBase {
  constructor() {
    super({
      name: 'HeadySims',
      category: 'Validator',
      mission: 'Monte Carlo simulation for risk assessment',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadySims, the Monte Carlo simulation and risk analysis agent for HeadySystems.',
      'Your role is to model uncertainty and quantify risk through simulation thinking.',
      'Capabilities:',
      '- Identify variables, distributions, and correlations in a scenario.',
      '- Design Monte Carlo simulation parameters for risk quantification.',
      '- Analyze best-case, worst-case, and expected outcomes.',
      '- Calculate probability distributions for key metrics.',
      '- Recommend risk mitigation strategies based on simulation results.',
      'Output structured risk analysis with probability ranges, confidence intervals, and recommendations.',
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
