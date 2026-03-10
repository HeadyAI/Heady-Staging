const fs = require('fs');
const path = require('path');
const { loadServiceMap } = require('../shared/service-map');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'configs', 'services', 'service-catalog.json'), 'utf8'));
const constitutionalServices = Object.values(catalog.domains).flat();
const overlayServices = new Set(Object.keys(loadServiceMap().services));

const constitutionalPresent = [];
const constitutionalMissing = [];
for (const service of constitutionalServices) {
  if (overlayServices.has(service)) {
    constitutionalPresent.push(service);
  } else {
    constitutionalMissing.push(service);
  }
}

const overlayCriticalPresent = catalog.newCriticalServices.filter(name => overlayServices.has(name));
const overlayCriticalMissing = catalog.newCriticalServices.filter(name => !overlayServices.has(name));

const payload = {
  ok: true,
  targetServices: constitutionalServices.length,
  constitutionalPresent: constitutionalPresent.length,
  constitutionalMissing: constitutionalMissing.length,
  overlayCriticalPresent: overlayCriticalPresent.length,
  overlayCriticalMissing: overlayCriticalMissing.length,
  overlayServiceCount: overlayServices.size,
  overlayCriticalServices: overlayCriticalPresent,
  constitutionalPresentServices: constitutionalPresent,
  constitutionalMissingSample: constitutionalMissing.slice(0, 21)
};

process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
