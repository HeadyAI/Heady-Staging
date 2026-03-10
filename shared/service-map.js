const fs = require('fs');
const path = require('path');

function loadServiceMap() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'configs', 'services', 'local-service-map.json'), 'utf8'));
}

function servicesWithPorts() {
  const map = loadServiceMap();
  return Object.entries(map.services).map(([service, details]) => [service, details.port]);
}

module.exports = {
  loadServiceMap,
  servicesWithPorts
};
