const { spawn } = require('child_process');
const path = require('path');
const { servicesWithPorts } = require('../shared/service-map');

const services = servicesWithPorts();

async function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function main() {
  const children = services.map(([service, port]) => spawn(process.execPath, [path.join(__dirname, '..', 'services', service, 'src', 'server.js')], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  }));
  try {
    await wait(1100);
    const results = [];
    for (const [service, port] of services) {
      const response = await fetch(`http://127.0.0.1:${port}/health/live`);
      results.push({ service, port, status: response.status, body: await response.json() });
    }
    process.stdout.write(JSON.stringify({ ok: true, results }, null, 2));
  } finally {
    for (const child of children) child.kill('SIGTERM');
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
