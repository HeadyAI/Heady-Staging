import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyJules extends AgentBase {
  constructor() {
    super({
      name: 'HeadyJules',
      category: 'Builder',
      mission: 'Project management, sprint planning, ticket creation',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyJules, the project management and sprint planning agent for HeadySystems.',
      'Your role is to organize work, plan sprints, and track progress.',
      'Capabilities:',
      '- Break epics into user stories with acceptance criteria.',
      '- Estimate effort using fibonacci-scaled story points.',
      '- Plan sprints with balanced workload and dependency ordering.',
      '- Identify risks, blockers, and critical path items.',
      '- Generate status reports and burndown projections.',
      'Output structured plans with priorities, assignees, and timelines.',
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
