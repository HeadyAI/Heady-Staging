/**
 * otel-setup.js — OpenTelemetry Instrumentation for Heady™ Services
 * Distributed tracing across MCP/SSE/HTTP with φ-scaled sampling.
 * © 2024-2026 HeadySystems Inc. 51 Provisional Patents.
 */
'use strict';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';

const PHI = 1.618033988749895;
const EXPORT_INTERVAL_MS = Math.round(PHI * PHI * PHI * 1000); // ≈ 4236ms

export function initTelemetry(config) {
    const serviceName = config.serviceName || 'heady-unknown';
    const domain = config.domain || 'unknown';
    const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.headysystems.internal:4318';

    const resource = new Resource({
        'service.name': serviceName,
        'service.version': config.version || '3.2.3',
        'heady.domain': domain,
        'heady.architecture': 'concurrent-equals',
        'heady.autocontext': 'mandatory',
    });

    const sdk = new NodeSDK({
        resource,
        traceExporter: new OTLPTraceExporter({ url: `${collectorUrl}/v1/traces` }),
        metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({ url: `${collectorUrl}/v1/metrics` }),
            exportIntervalMillis: EXPORT_INTERVAL_MS,
        }),
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-http': {
                    requestHook: (span, request) => {
                        span.setAttribute('heady.service', serviceName);
                        span.setAttribute('heady.domain', domain);
                        span.setAttribute('heady.correlation_id', request.headers?.['x-correlation-id'] || 'none');
                    },
                },
                '@opentelemetry/instrumentation-express': { enabled: true },
            }),
        ],
    });

    sdk.start();
    console.log(`[OTel] Telemetry initialized for ${serviceName} (domain: ${domain})`);
    process.on('SIGTERM', () => sdk.shutdown());
    process.on('SIGINT', () => sdk.shutdown());
    return sdk;
}

export default initTelemetry;
