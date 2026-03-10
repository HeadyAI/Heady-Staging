const { spawn } = require('child_process');
const path = require('path');
const { servicesWithPorts } = require('../shared/service-map');

const services = servicesWithPorts();

for (const [service, port] of services) {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'services', service, 'src', 'server.js')], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit'
  });
  process.on('exit', () => child.kill('SIGTERM'));
}

setInterval(() => {}, 1000);
