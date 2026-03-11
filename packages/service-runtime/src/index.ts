import Fastify from 'fastify';
import { logEvent } from '@heady-ai/observability-client';
import type { ServiceManifest } from '@heady-ai/contract-types';

export function createServiceApp(manifest: ServiceManifest) {
  const app = Fastify({ logger: true });

  app.get('/health/live', async () => ({ ok: true, service: manifest.name, live: true }));
  app.get('/health/ready', async () => ({ ok: true, service: manifest.name, ready: true, dependencies: manifest.dependencies }));
  app.get('/manifest', async () => manifest);

  app.addHook('onRequest', async (request) => {
    logEvent('service.request', { service: manifest.name, path: request.url, method: request.method });
  });

  return app;
}
