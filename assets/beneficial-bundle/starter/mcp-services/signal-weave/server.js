
import http from 'node:http';

const port = process.env.PORT || 3232;

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data, null, 2));
}

const sample = {
  service: 'signal-weave',
  status: 'ok',
  snapshot: {
    services_online: 167,
    coherence: 0.931,
    latency_ms: 86,
    top_channels: [
      { id: 'mcp-gateway', freshness: 'fresh', confidence: 0.95 },
      { id: 'swarm-queen', freshness: 'fresh', confidence: 0.91 },
      { id: 'memory-lattice', freshness: 'warm', confidence: 0.88 }
    ]
  }
};

const server = http.createServer((req, res) => {
  if (req.url === '/health') return json(res, { ok: true, service: 'signal-weave' });
  if (req.url === '/snapshot') return json(res, sample);
  if (req.url === '/channels') return json(res, sample.snapshot.top_channels);
  return json(res, { error: 'not_found' }, 404);
});

server.listen(port, () => {
  console.log(`signal-weave listening on ${port}`);
});
