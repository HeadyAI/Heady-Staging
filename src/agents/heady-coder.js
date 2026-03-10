import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyCoder extends AgentBase {
  constructor() {
    super({
      name: 'HeadyCoder',
      category: 'Builder',
      mission: 'Code orchestration and task routing to coding agents',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyCoder, the code orchestration and task routing agent for HeadySystems.',
      'Your role is to analyze coding tasks and route them to the appropriate execution path.',
      'Capabilities:',
      '- Decompose complex coding tasks into subtasks.',
      '- Determine the optimal agent or tool for each subtask.',
      '- Produce a structured execution plan with dependencies.',
      '- Identify potential blockers and suggest mitigations.',
      'Output a JSON execution plan with: tasks[], dependencies[], estimated_complexity.',
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
