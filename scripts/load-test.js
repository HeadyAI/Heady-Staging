const { performance } = require('perf_hooks');
const { spawn } = require('child_process');
const path = require('path');
const { fib } = require('../shared/phi-math');
const { servicesWithPorts } = require('../shared/service-map');

const services = servicesWithPorts();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const children = services.map(([service, port]) => spawn(process.execPath, [path.join(__dirname, '..', 'services', service, 'src', 'server.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      HEADY_SESSION_SECRET: process.env.HEADY_SESSION_SECRET || 'heady-dev-session-secret'
    },
    stdio: 'ignore'
  }));

  try {
    await sleep(fib(6) * 100);
    const timings = [];
    for (const [service, port] of services) {
      for (let attempt = 0; attempt < fib(5); attempt += 1) {
        const start = performance.now();
        const response = await fetch(`http://127.0.0.1:${port}/health/live`);
        await response.text();
        timings.push({
          service,
          durationMs: Number((performance.now() - start).toFixed(3)),
          status: response.status
        });
      }
    }

    const grouped = services.map(([service]) => {
      const values = timings.filter(item => item.service === service);
      const averageMs = values.reduce((sum, item) => sum + item.durationMs, 0) / values.length;
      return { service, averageMs: Number(averageMs.toFixed(3)), samples: values.length };
    });

    process.stdout.write(JSON.stringify({ ok: true, grouped }, null, 2) + '\n');
  } finally {
    for (const child of children) {
      child.kill('SIGTERM');
    }
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
