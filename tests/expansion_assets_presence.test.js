import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const mustExist = [
  '/home/user/workspace/heady-system-build/apps/pricing/index.html',
  '/home/user/workspace/heady-system-build/apps/developer-portal/index.html',
  '/home/user/workspace/heady-system-build/apps/status/index.html',
  '/home/user/workspace/heady-system-build/apps/api-docs/index.html',
  '/home/user/workspace/heady-system-build/apps/blog/index.html',
  '/home/user/workspace/heady-system-build/infra/nats/jetstream.conf',
  '/home/user/workspace/heady-system-build/infra/pgbouncer/pgbouncer.ini',
  '/home/user/workspace/heady-system-build/proto/search.proto',
  '/home/user/workspace/heady-system-build/proto/notifications.proto',
  '/home/user/workspace/heady-system-build/docs/architecture/c4-context.md',
  '/home/user/workspace/heady-system-build/docs/architecture/c4-container.md',
  '/home/user/workspace/heady-system-build/docs/operations/ERROR_CODES.md',
];

test('expanded pages and contracts exist', () => {
  for (const path of mustExist) {
    assert.ok(existsSync(path), `missing ${path}`);
  }
});
