/**
 * ECHO — Cross-Service Event Mesh
 * Protocol-agnostic pub/sub bridging A2A, MCP, REST webhooks
 * Priority: 0.618 (ψ)
 */
class Echo {
  constructor(config = {}) {
    this.subscribers = new Map();
    this.eventLog = [];
  }

  async publish(topic, payload, protocol = 'mcp') {
    const event = { id: crypto.randomUUID(), topic, payload, protocol, timestamp: Date.now() };
    this.eventLog.push(event);
    const subs = this.subscribers.get(topic) || [];
    await Promise.allSettled(subs.map(sub => sub.handler(event)));
    return event;
  }

  subscribe(topic, handler, options = {}) {
    if (!this.subscribers.has(topic)) this.subscribers.set(topic, []);
    const sub = { id: crypto.randomUUID(), handler, protocol: options.protocol || 'any' };
    this.subscribers.get(topic).push(sub);
    return sub.id;
  }

  unsubscribe(topic, subId) {
    const subs = this.subscribers.get(topic) || [];
    this.subscribers.set(topic, subs.filter(s => s.id !== subId));
  }
}

module.exports = { Echo };
