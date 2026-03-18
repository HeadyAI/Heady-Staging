/**
 * ARGUS v2 — Panoptic AI Observability
 * OTel GenAI Semantic Conventions v1.37+
 * Priority: 1.272
 */
const { trace, metrics, context } = require('@opentelemetry/api');

class ArgusV2 {
  constructor(config = {}) {
    this.tracer = trace.getTracer('heady-argus', '2.0.0');
    this.meter = metrics.getMeter('heady-argus', '2.0.0');

    // GenAI Semantic Convention metrics
    this.tokenUsage = this.meter.createHistogram('gen_ai.client.token.usage', {
      description: 'Input/output token counts',
      unit: 'tokens'
    });
    this.ttft = this.meter.createHistogram('gen_ai.server.time_to_first_token', {
      description: 'Time to first token',
      unit: 'ms'
    });
    this.requestDuration = this.meter.createHistogram('gen_ai.server.request_duration', {
      description: 'Total request duration',
      unit: 'ms'
    });
  }

  traceInference(model, fn) {
    return this.tracer.startActiveSpan(`gen_ai.${model}`, async (span) => {
      const start = Date.now();
      try {
        const result = await fn();
        span.setAttributes({
          'gen_ai.system': model.split('/')[0],
          'gen_ai.request.model': model,
          'gen_ai.response.finish_reasons': ['stop'],
        });
        this.requestDuration.record(Date.now() - start, { model });
        return result;
      } catch (err) {
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  recordTokens(model, inputTokens, outputTokens) {
    this.tokenUsage.record(inputTokens, { 'gen_ai.token.type': 'input', model });
    this.tokenUsage.record(outputTokens, { 'gen_ai.token.type': 'output', model });
  }
}

module.exports = { ArgusV2 };
