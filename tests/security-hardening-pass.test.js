'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');

const mtls = require('../src/security/mtls');
const HealthMonitor = require('../src/monitoring/health-monitor');
const bootServer = require('../src/bootstrap/server-boot');
const { fib } = require('../src/shared/phi-math');

jest.mock('../src/core/heady-server', () => {
  class FakeWss {
    constructor() {
      this.handlers = {};
    }

    on(event, handler) {
      this.handlers[event] = handler;
    }

    emit(event, ...args) {
      if (this.handlers[event]) {
        this.handlers[event](...args);
      }
    }

    handleUpgrade(request, socket, head, callback) {
      callback({ on: jest.fn(), close: jest.fn(), send: jest.fn(), readyState: 1 });
    }
  }

  return {
    HeadyWebSocket: {
      Server: FakeWss,
    },
  };
});

jest.mock('../src/utils/redis-pool', () => ({
  init: jest.fn(() => Promise.resolve()),
}));

describe('bounded hardening pass', () => {
  afterEach(() => {
    delete process.env.HEADY_CERT_DIR;
    delete process.env.HEADY_ALLOW_INSECURE_MTLS;
    delete process.env.HEADY_REQUIRE_VOICE_AUTH;
    jest.restoreAllMocks();
  });

  test('mTLS config refuses strict mode when CA bundle is missing', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heady-mtls-'));
    fs.writeFileSync(path.join(tempDir, 'server.crt'), 'certificate');
    fs.writeFileSync(path.join(tempDir, 'server.key'), 'private-key');

    const config = mtls.loadMTLSConfig({ certDir: tempDir });
    expect(config).toBeNull();
  });

  test('mTLS config allows explicit insecure override for local development only', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heady-mtls-'));
    fs.writeFileSync(path.join(tempDir, 'server.crt'), 'certificate');
    fs.writeFileSync(path.join(tempDir, 'server.key'), 'private-key');

    const config = mtls.loadMTLSConfig({ certDir: tempDir, allowInsecure: true });
    expect(config).toBeTruthy();
    expect(config.rejectUnauthorized).toBe(false);
  });

  test('health monitor thresholds now derive from fibonacci values', () => {
    expect(HealthMonitor.THRESHOLD.HEALTHY).toBe(fib(11) - fib(3));
    expect(HealthMonitor.THRESHOLD.DEGRADED).toBe(fib(10) - fib(5));
  });

  test('boot server rejects unauthenticated voice websocket upgrades by default', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heady-mtls-'));
    fs.writeFileSync(path.join(tempDir, 'server.crt'), 'certificate');
    fs.writeFileSync(path.join(tempDir, 'server.key'), 'private-key');
    fs.writeFileSync(path.join(tempDir, 'ca.crt'), 'ca-bundle');
    process.env.HEADY_CERT_DIR = tempDir;

    const logger = {
      logNodeActivity: jest.fn(),
      logError: jest.fn(),
    };

    const voiceSessions = new Map();
    let upgradeHandler;
    const fakeServer = {
      on: jest.fn((event, handler) => {
        if (event === 'upgrade') upgradeHandler = handler;
      }),
      listen: jest.fn((port, host, callback) => callback()),
    };

    jest.spyOn(https, 'createServer').mockReturnValue(fakeServer);

    bootServer((req, res) => res.end('ok'), { logger, voiceSessions });

    const socket = {
      write: jest.fn(),
      destroy: jest.fn(),
    };

    upgradeHandler(
      {
        url: '/ws/voice/demo-session?role=receiver',
        headers: { host: 'localhost:3301' },
      },
      socket,
      Buffer.alloc(0)
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(socket.write).toHaveBeenCalledWith('HTTP/1.1 401 Unauthorized\r\n\r\n');
    expect(socket.destroy).toHaveBeenCalled();
    expect(logger.logError).toHaveBeenCalled();
  });
});
