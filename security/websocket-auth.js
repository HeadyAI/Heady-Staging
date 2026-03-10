/**
 * Heady WebSocket Auth — Secure WS connection with session binding
 * Ticket-based auth, heartbeat, session-bound connections
 * Author: Eric Haywood | All constants φ-derived | ESM only
 */
import { createHash, randomBytes } from 'crypto';
import { PHI, PSI, PSI2, phiThreshold, phiBackoff, fibonacci } from '../shared/phi-math-v2.js';
import { cslGate } from '../shared/csl-engine-v2.js';

const TICKET_TTL_MS      = fibonacci(10) * 1000;  // 55s
const HEARTBEAT_INTERVAL = fibonacci(9) * 1000;   // 34s
const MAX_CONNECTIONS    = fibonacci(14);          // 377
const MAX_PER_USER       = fibonacci(5);           // 5
const MESSAGE_RATE_LIMIT = fibonacci(8);           // 21 per window
const RATE_WINDOW_MS     = fibonacci(10) * 1000;   // 55s

function sha256(input) { return createHash('sha256').update(String(input)).digest('hex'); }

const tickets = new Map();
const connections = new Map();
const userConnections = new Map();
const metrics = { issued: 0, authenticated: 0, rejected: 0, heartbeats: 0 };

function issueTicket(userId, sessionId, fingerprint) {
  const ticketId = sha256(randomBytes(32).toString('hex') + Date.now());
  const ticket = {
    ticketId, userId, sessionId,
    fingerprint: sha256(fingerprint || 'unknown'),
    created: Date.now(),
    expiresAt: Date.now() + TICKET_TTL_MS,
    used: false,
    hash: sha256(ticketId + userId + sessionId),
  };
  tickets.set(ticketId, ticket);
  metrics.issued++;

  // Cleanup expired
  for (const [id, t] of tickets) {
    if (Date.now() > t.expiresAt) tickets.delete(id);
  }

  return { ticketId, expiresIn: TICKET_TTL_MS };
}

function authenticateConnection(ticketId, connectionId, clientFingerprint) {
  const ticket = tickets.get(ticketId);
  if (!ticket) return { authenticated: false, reason: 'invalid_ticket' };
  if (ticket.used) return { authenticated: false, reason: 'ticket_already_used' };
  if (Date.now() > ticket.expiresAt) {
    tickets.delete(ticketId);
    return { authenticated: false, reason: 'ticket_expired' };
  }

  const fpMatch = ticket.fingerprint === sha256(clientFingerprint || 'unknown') ? 1.0 : 0.0;
  const fpGate = cslGate(fpMatch, fpMatch, phiThreshold(3), PSI * PSI * PSI);
  if (fpGate < phiThreshold(2)) {
    metrics.rejected++;
    return { authenticated: false, reason: 'fingerprint_mismatch' };
  }

  if (connections.size >= MAX_CONNECTIONS) {
    metrics.rejected++;
    return { authenticated: false, reason: 'max_connections' };
  }

  const userConns = userConnections.get(ticket.userId) || new Set();
  if (userConns.size >= MAX_PER_USER) {
    const oldest = userConns.values().next().value;
    disconnectConnection(oldest);
  }

  ticket.used = true;
  tickets.delete(ticketId);

  const connection = {
    connectionId,
    userId: ticket.userId,
    sessionId: ticket.sessionId,
    fingerprint: ticket.fingerprint,
    authenticatedAt: Date.now(),
    lastHeartbeat: Date.now(),
    messageCount: 0,
    rateWindowStart: Date.now(),
    status: 'active',
    hash: sha256(connectionId + ticket.userId),
  };
  connections.set(connectionId, connection);
  userConns.add(connectionId);
  userConnections.set(ticket.userId, userConns);
  metrics.authenticated++;

  return { authenticated: true, connectionId, userId: ticket.userId, heartbeatInterval: HEARTBEAT_INTERVAL };
}

function handleHeartbeat(connectionId) {
  const conn = connections.get(connectionId);
  if (!conn) return { valid: false, reason: 'unknown_connection' };
  conn.lastHeartbeat = Date.now();
  metrics.heartbeats++;
  return { valid: true, nextHeartbeat: Date.now() + HEARTBEAT_INTERVAL };
}

function checkMessageRate(connectionId) {
  const conn = connections.get(connectionId);
  if (!conn) return { allowed: false, reason: 'unknown_connection' };
  const now = Date.now();
  if ((now - conn.rateWindowStart) > RATE_WINDOW_MS) {
    conn.messageCount = 0;
    conn.rateWindowStart = now;
  }
  conn.messageCount++;
  const loadFactor = conn.messageCount / MESSAGE_RATE_LIMIT;
  const gate = cslGate(1.0, 1.0 - loadFactor, phiThreshold(1), PSI * PSI * PSI);
  return { allowed: gate > PSI2, messageCount: conn.messageCount, limit: MESSAGE_RATE_LIMIT };
}

function disconnectConnection(connectionId) {
  const conn = connections.get(connectionId);
  if (!conn) return { disconnected: false };
  connections.delete(connectionId);
  const userConns = userConnections.get(conn.userId);
  if (userConns) { userConns.delete(connectionId); if (userConns.size === 0) userConnections.delete(conn.userId); }
  return { disconnected: true, connectionId, userId: conn.userId };
}

function pruneStaleConnections() {
  const staleThreshold = Date.now() - (HEARTBEAT_INTERVAL * fibonacci(3));
  const pruned = [];
  for (const [id, conn] of connections) {
    if (conn.lastHeartbeat < staleThreshold) {
      pruned.push(disconnectConnection(id));
    }
  }
  return { pruned: pruned.length };
}

function createServer(port = 3392) {
  return import('http').then(({ default: http }) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const respond = (s, b) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
      const readBody = () => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => { try { r(JSON.parse(Buffer.concat(c).toString())); } catch { r({}); } }); });

      if (url.pathname === '/ws-auth/ticket' && req.method === 'POST') { const b = await readBody(); respond(201, issueTicket(b.userId, b.sessionId, b.fingerprint)); }
      else if (url.pathname === '/ws-auth/authenticate' && req.method === 'POST') { const b = await readBody(); respond(200, authenticateConnection(b.ticketId, b.connectionId, b.fingerprint)); }
      else if (url.pathname === '/ws-auth/heartbeat' && req.method === 'POST') { const b = await readBody(); respond(200, handleHeartbeat(b.connectionId)); }
      else if (url.pathname === '/ws-auth/rate-check' && req.method === 'POST') { const b = await readBody(); respond(200, checkMessageRate(b.connectionId)); }
      else if (url.pathname === '/ws-auth/disconnect' && req.method === 'POST') { const b = await readBody(); respond(200, disconnectConnection(b.connectionId)); }
      else if (url.pathname === '/ws-auth/prune' && req.method === 'POST') respond(200, pruneStaleConnections());
      else if (url.pathname === '/health') respond(200, { service: 'websocket-auth', status: 'healthy', connections: connections.size, tickets: tickets.size, metrics });
      else respond(404, { error: 'not_found' });
    });
    server.listen(port);
    return server;
  });
}

export default { createServer, issueTicket, authenticateConnection, handleHeartbeat, checkMessageRate, disconnectConnection, pruneStaleConnections };
export { createServer, issueTicket, authenticateConnection, handleHeartbeat, checkMessageRate, disconnectConnection, pruneStaleConnections };
