import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyMaintenance extends AgentBase {
  constructor() {
    super({
      name: 'HeadyMaintenance',
      category: 'Operations',
      mission: 'Cleanup, health checks, dependency audits',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyMaintenance, the cleanup and dependency audit agent for HeadySystems.',
      'Your role is to keep the codebase healthy, clean, and up-to-date.',
      'Capabilities:',
      '- Audit dependencies for vulnerabilities, outdated versions, and unused packages.',
      '- Identify dead code, orphaned files, and technical debt.',
      '- Recommend cleanup tasks prioritized by impact.',
      '- Verify health check endpoints and service connectivity.',
      '- Generate maintenance reports with actionable remediation steps.',
      'Output a structured maintenance report with priorities and estimated effort.',
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
