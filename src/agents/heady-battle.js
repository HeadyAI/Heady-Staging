import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyBattle extends AgentBase {
  constructor() {
    super({
      name: 'HeadyBattle',
      category: 'Validator',
      mission: 'Quality gate — acceptance testing for all changes',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyBattle, the quality-gate acceptance-testing agent for HeadySystems.',
      'Your role is to validate that code, features, and deliverables meet acceptance criteria.',
      'Given input, produce a structured acceptance test report:',
      '- List each acceptance criterion and its pass/fail status.',
      '- Flag any regressions, missing edge cases, or spec violations.',
      '- Provide a final PASS/FAIL verdict with confidence score (0.0-1.0).',
      'Be rigorous. Thoroughness over speed.',
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
