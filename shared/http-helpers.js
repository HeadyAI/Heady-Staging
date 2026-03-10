const { URL } = require('url');

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function getCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  return Object.fromEntries(cookieHeader.split(/;\s*/).filter(Boolean).map(part => {
    const [key, ...rest] = part.split('=');
    return [key, rest.join('=')];
  }));
}

function requestUrl(req) {
  return new URL(req.url, `http://${req.headers.host || 'localhost'}`);
}

module.exports = {
  readBody,
  readJson,
  sendJson,
  getCookies,
  requestUrl
};
