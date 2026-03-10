const fs = require('fs');
const path = require('path');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1480" height="980" viewBox="0 0 1480 980" role="img" aria-label="Heady architecture graph">
  <rect width="1480" height="980" fill="#08131a"/>
  <text x="60" y="72" fill="#f3fbff" font-family="Inter, sans-serif" font-size="36" font-weight="700">Heady Maximum Potential Overlay</text>
  <text x="60" y="112" fill="#9ec5cf" font-family="Inter, sans-serif" font-size="18">Auth, gateway, domain routing, cache, health, search, observability, and governance controls.</text>
  <g font-family="Inter, sans-serif">
    <rect x="60" y="170" width="260" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="84" y="212" fill="#49dcb1" font-size="18">Auth Session Server</text>
    <text x="84" y="246" fill="#f3fbff" font-size="14">__Host- cookie issuance</text>
    <text x="84" y="270" fill="#f3fbff" font-size="14">relay origin validation</text>
    <text x="84" y="294" fill="#f3fbff" font-size="14">client binding hashes</text>

    <rect x="370" y="170" width="260" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="394" y="212" fill="#49dcb1" font-size="18">API Gateway</text>
    <text x="394" y="246" fill="#f3fbff" font-size="14">signed internal proxying</text>
    <text x="394" y="270" fill="#f3fbff" font-size="14">route catalog exposure</text>
    <text x="394" y="294" fill="#f3fbff" font-size="14">correlated request flow</text>

    <rect x="680" y="170" width="260" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="704" y="212" fill="#49dcb1" font-size="18">Domain Router</text>
    <text x="704" y="246" fill="#f3fbff" font-size="14">9-site host map</text>
    <text x="704" y="270" fill="#f3fbff" font-size="14">resolve and site inventory</text>
    <text x="704" y="294" fill="#f3fbff" font-size="14">admin route awareness</text>

    <rect x="990" y="170" width="260" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="1014" y="212" fill="#49dcb1" font-size="18">Search + Cache</text>
    <text x="1014" y="246" fill="#f3fbff" font-size="14">signed search requests</text>
    <text x="1014" y="270" fill="#f3fbff" font-size="14">384-dim hybrid retrieval</text>
    <text x="1014" y="294" fill="#f3fbff" font-size="14">Fibonacci LRU caching</text>

    <rect x="150" y="430" width="300" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="174" y="472" fill="#49dcb1" font-size="18">Notification + Analytics</text>
    <text x="174" y="506" fill="#f3fbff" font-size="14">SSE and WebSocket fanout</text>
    <text x="174" y="530" fill="#f3fbff" font-size="14">per-frame auth recheck</text>
    <text x="174" y="554" fill="#f3fbff" font-size="14">privacy-first event durability</text>

    <rect x="500" y="430" width="300" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="524" y="472" fill="#49dcb1" font-size="18">Billing + Asset + Migration</text>
    <text x="524" y="506" fill="#f3fbff" font-size="14">ledgered intents and webhooks</text>
    <text x="524" y="530" fill="#f3fbff" font-size="14">asset manifests and digests</text>
    <text x="524" y="554" fill="#f3fbff" font-size="14">checksum-based migration state</text>

    <rect x="850" y="430" width="300" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="874" y="472" fill="#49dcb1" font-size="18">Scheduler + Health</text>
    <text x="874" y="506" fill="#f3fbff" font-size="14">phi-scaled jobs</text>
    <text x="874" y="530" fill="#f3fbff" font-size="14">matrix aggregation</text>
    <text x="874" y="554" fill="#f3fbff" font-size="14">chaos-recovery probes</text>

    <rect x="1200" y="430" width="220" height="138" rx="18" fill="#0f1e27" stroke="#244652"/>
    <text x="1224" y="472" fill="#49dcb1" font-size="18">Infra Plane</text>
    <text x="1224" y="506" fill="#f3fbff" font-size="14">NATS · OTEL · Vector</text>
    <text x="1224" y="530" fill="#f3fbff" font-size="14">PgBouncer · Envoy · Consul</text>
    <text x="1224" y="554" fill="#f3fbff" font-size="14">guardrails and contracts</text>
  </g>
  <g stroke="#49dcb1" stroke-width="3" fill="none">
    <path d="M320 236 C 340 236, 350 236, 370 236"/>
    <path d="M630 236 C 650 236, 660 236, 680 236"/>
    <path d="M940 236 C 960 236, 970 236, 990 236"/>
    <path d="M1120 308 C 1120 360, 1040 390, 1000 430"/>
    <path d="M500 308 C 470 350, 360 390, 300 430"/>
    <path d="M650 308 C 650 350, 650 390, 650 430"/>
    <path d="M810 308 C 860 350, 940 390, 1000 430"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(__dirname, '..', 'ARCHITECTURE.svg'), svg.trimStart());
process.stdout.write(JSON.stringify({ ok: true, path: path.join(__dirname, '..', 'ARCHITECTURE.svg') }, null, 2));
