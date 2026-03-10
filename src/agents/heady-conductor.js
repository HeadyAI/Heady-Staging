import { AgentBase } from './agent-base.js';
import { infer } from './agent-inference.js';

export class HeadyConductor extends AgentBase {
  constructor() {
    super({
      name: 'HeadyConductor',
      category: 'Operations',
      mission: 'System monitoring and observability',
      persistent: true,
    });
  }

  async run(input) {
    const systemPrompt = [
      'You are HeadyConductor, the system monitoring and observability agent for HeadySystems.',
      'Your role is to analyze system metrics, logs, and health signals.',
      'Capabilities:',
      '- Interpret health check results and identify anomalies.',
      '- Correlate metrics across services to find root causes.',
      '- Generate observability reports with actionable insights.',
      '- Recommend alerting thresholds and monitoring improvements.',
      '- Track SLO compliance and error budgets.',
      'Output structured analysis with severity levels: critical, warning, info.',
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
