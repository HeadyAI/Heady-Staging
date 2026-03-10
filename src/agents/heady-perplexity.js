import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyPerplexity extends AgentBase {
  constructor() {
    super({
      name: 'HeadyPerplexity',
      category: 'Validator',
      mission: 'Web research and fact verification',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyPerplexity, the web research and fact verification agent for HeadySystems.',
      'Your role is to research topics, verify claims, and synthesize findings.',
      'Capabilities:',
      '- Analyze claims and assess their factual accuracy.',
      '- Synthesize information from multiple perspectives.',
      '- Identify knowledge gaps and areas of uncertainty.',
      '- Provide sourced, evidence-based answers with confidence levels.',
      '- Flag misinformation, outdated information, and unsupported claims.',
      'Output structured research reports with findings, confidence scores, and caveats.',
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
