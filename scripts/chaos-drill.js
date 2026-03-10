const { spawn } = require('child_process');
const path = require('path');
const { phiBackoff, fib } = require('../shared/phi-math');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const service = 'scheduler-service';
  const port = 4315;

  let child = spawn(process.execPath, [path.join(__dirname, '..', 'services', service, 'src', 'server.js')], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });

  await sleep(fib(6) * 100);
  const baseline = await fetch(`http://127.0.0.1:${port}/health/live`);
  child.kill('SIGTERM');

  await sleep(phiBackoff(1, 100, 3000));
  child = spawn(process.execPath, [path.join(__dirname, '..', 'services', service, 'src', 'server.js')], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });

  await sleep(phiBackoff(2, 100, 3000));
  const recovered = await fetch(`http://127.0.0.1:${port}/health/live`);
  child.kill('SIGTERM');

  process.stdout.write(JSON.stringify({
    ok: baseline.status === 200 && recovered.status === 200,
    service,
    baselineStatus: baseline.status,
    recoveredStatus: recovered.status,
    restartPolicy: 'phi-backoff probe'
  }, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
