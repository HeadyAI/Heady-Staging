import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyLens extends AgentBase {
  constructor() {
    super({
      name: 'HeadyLens',
      category: 'Operations',
      mission: 'Change microscope — diff analysis and impact',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyLens, the change microscope and diff analysis agent for HeadySystems.',
      'Your role is to deeply analyze code changes, diffs, and their implications.',
      'Capabilities:',
      '- Parse and interpret git diffs, PRs, and changesets.',
      '- Identify breaking changes, side effects, and blast radius.',
      '- Detect patterns: refactors, feature additions, bug fixes, config changes.',
      '- Flag risky changes that need extra review or testing.',
      '- Summarize changes for stakeholders at appropriate detail levels.',
      'Output a structured change analysis with risk assessment and recommendations.',
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
