'use strict';

// FIB[9] = 34 notifications/min per user rate limit
const RATE_LIMIT_PER_MIN = 34;

const VALID_CHANNELS = new Set(['system', 'alerts', 'deployments', 'agents']);

/**
 * Channel subscription and messaging manager.
 */
class ChannelManager {
  constructor(log) {
    this._log = log;
    /** @type {Map<string, Set<string>>} channel → Set<userId> */
    this._subscriptions = new Map();
    /** @type {Map<string, Set<{ userId: string, send: Function }>>} channel → Set<connection> */
    this._connections = new Map();
    /** @type {Map<string, { userId: string, send: Function }[]>} userId → connections */
    this._userConnections = new Map();
    /** @type {Map<string, { count: number, windowStart: number }>} userId → rate info */
    this._rateLimits = new Map();

    for (const ch of VALID_CHANNELS) {
      this._subscriptions.set(ch, new Set());
      this._connections.set(ch, new Set());
    }
  }

  /**
   * Check and update rate limit for a user.
   * @param {string} userId
   * @returns {boolean} true if within limit
   */
  _checkRateLimit(userId) {
    const now = Date.now();
    let entry = this._rateLimits.get(userId);

    if (!entry || now - entry.windowStart > 60000) {
      entry = { count: 0, windowStart: now };
      this._rateLimits.set(userId, entry);
    }

    if (entry.count >= RATE_LIMIT_PER_MIN) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Register a connection for a user.
   *
   * @param {string} userId
   * @param {{ send: Function }} conn — connection with a send method
   */
  registerConnection(userId, conn) {
    const tagged = { userId, send: conn.send.bind(conn) };
    if (!this._userConnections.has(userId)) {
      this._userConnections.set(userId, []);
    }
    this._userConnections.get(userId).push(tagged);
    return tagged;
  }

  /**
   * Remove a connection for a user.
   *
   * @param {string} userId
   * @param {object} tagged — the tagged connection object from registerConnection
   */
  removeConnection(userId, tagged) {
    const conns = this._userConnections.get(userId);
    if (conns) {
      const idx = conns.indexOf(tagged);
      if (idx !== -1) conns.splice(idx, 1);
      if (conns.length === 0) {
        this._userConnections.delete(userId);
        // Remove user from all channel subscriptions
        for (const [, subs] of this._subscriptions) {
          subs.delete(userId);
        }
      }
    }
    // Remove from channel connection sets
    for (const [, connSet] of this._connections) {
      connSet.delete(tagged);
    }
  }

  /**
   * Subscribe a user to a channel.
   *
   * @param {string} userId
   * @param {string} channel
   * @param {object} tagged — tagged connection
   * @returns {boolean}
   */
  subscribe(userId, channel) {
    if (!VALID_CHANNELS.has(channel)) {
      this._log.warn('Subscribe: invalid channel', { userId, channel });
      return false;
    }
    this._subscriptions.get(channel).add(userId);
    this._log.debug('User subscribed', { userId, channel });
    return true;
  }

  /**
   * Unsubscribe a user from a channel.
   *
   * @param {string} userId
   * @param {string} channel
   * @returns {boolean}
   */
  unsubscribe(userId, channel) {
    if (!VALID_CHANNELS.has(channel)) return false;
    this._subscriptions.get(channel).delete(userId);
    return true;
  }

  /**
   * Broadcast a payload to all subscribers of a channel.
   *
   * @param {string} channel
   * @param {object} payload
   * @returns {number} number of users notified
   */
  broadcast(channel, payload) {
    if (!VALID_CHANNELS.has(channel)) {
      this._log.warn('Broadcast: invalid channel', { channel });
      return 0;
    }

    const subscribers = this._subscriptions.get(channel);
    let notified = 0;

    const message = JSON.stringify({
      type: 'broadcast',
      channel,
      payload,
      timestamp: new Date().toISOString(),
    });

    for (const userId of subscribers) {
      if (!this._checkRateLimit(userId)) {
        this._log.warn('Rate limit exceeded', { userId, channel });
        continue;
      }
      const conns = this._userConnections.get(userId);
      if (conns) {
        for (const conn of conns) {
          try {
            conn.send(message);
            notified++;
          } catch (err) {
            this._log.error('Broadcast send failed', { userId, error: err.message });
          }
        }
      }
    }

    this._log.info('Broadcast sent', { channel, subscribers: subscribers.size, notified });
    return notified;
  }

  /**
   * Send a direct message to a specific user.
   *
   * @param {string} userId
   * @param {object} payload
   * @returns {boolean} true if delivered to at least one connection
   */
  directMessage(userId, payload) {
    if (!this._checkRateLimit(userId)) {
      this._log.warn('Rate limit exceeded for DM', { userId });
      return false;
    }

    const conns = this._userConnections.get(userId);
    if (!conns || conns.length === 0) {
      this._log.debug('No connections for user', { userId });
      return false;
    }

    const message = JSON.stringify({
      type: 'direct',
      payload,
      timestamp: new Date().toISOString(),
    });

    let delivered = false;
    for (const conn of conns) {
      try {
        conn.send(message);
        delivered = true;
      } catch (err) {
        this._log.error('DM send failed', { userId, error: err.message });
      }
    }
    return delivered;
  }

  /**
   * Get stats about current subscriptions and connections.
   * @returns {object}
   */
  getStats() {
    const stats = { channels: {}, totalUsers: this._userConnections.size };
    for (const [ch, subs] of this._subscriptions) {
      stats.channels[ch] = subs.size;
    }
    return stats;
  }
}

module.exports = {
  ChannelManager,
  VALID_CHANNELS,
  RATE_LIMIT_PER_MIN,
};
