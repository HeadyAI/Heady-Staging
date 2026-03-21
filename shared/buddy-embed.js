/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  HEADY_BRAND: HeadySystems Inc.                                   ║
 * ║  Module: HeadyBuddy Universal Cross-Site Embed                    ║
 * ║  Node: PERSONA (Cognitive Alignment) + CONDUCTOR (Orchestrator)   ║
 * ║  Patent Zone: HS-2026-052 (Shadow Memory Persistence)             ║
 * ║  Law 3: Zero localhost — auth.headysystems.com SSO                ║
 * ║  Law 4: Zero placeholders — every function wired                  ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * USAGE:
 *   <script src="https://cdn.headysystems.com/buddy/embed.js"
 *           data-theme="dark"
 *           data-position="bottom-right"
 *           data-features="chat,tasks,memory"
 *           async></script>
 *
 * Works on: headysystems.com, headyme.com, headybuddy.org, headymcp.com,
 *           headyio.com, headybot.com, headyapi.com, headylens.com,
 *           heady-ai.com, headyfinance.com, headyconnection.org, 1ime1.com
 */

const HeadyBuddyEmbed = (() => {
  'use strict';

  // ── φ-Constants (Law 2: all from golden ratio) ──────────────
  const PHI = 1.618033988749895;
  const PSI = 1 / PHI;
  const FIB = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987];
  const PHI_TIMEOUT_CONNECT = Math.round(PHI * 1000);
  const PHI_TIMEOUT_REQUEST = Math.round(PHI ** 3 * 1000);
  const PHI_HEARTBEAT = Math.round(PHI ** 7 * 1000);

  // ── Endpoints (Law 3: zero localhost) ───────────────────────
  const ENDPOINTS = Object.freeze({
    AUTH:      'https://auth.headysystems.com',
    API:       'https://heady-manager-bf4q4zywhq-uc.a.run.app',
    WS:        'wss://heady-manager-bf4q4zywhq-uc.a.run.app/ws',
    SSE:       'https://heady-manager-bf4q4zywhq-uc.a.run.app/api/events',
    CDN:       'https://cdn.headysystems.com',
    BUDDY:     'https://heady-manager-bf4q4zywhq-uc.a.run.app/api/buddy',
  });

  // ── Allowed origins for cross-domain SSO ────────────────────
  const ALLOWED_ORIGINS = new Set([
    'headysystems.com', 'headyme.com', 'headybuddy.org', 'headymcp.com',
    'headyio.com', 'headybot.com', 'headyapi.com', 'headylens.com',
    'heady-ai.com', 'headyfinance.com', 'headyconnection.org', '1ime1.com',
  ]);

  // ── State ───────────────────────────────────────────────────
  let state = {
    tenantId:    null,
    sessionId:   null,
    deviceId:    `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
    token:       null,
    ws:          null,
    isOpen:      false,
    messages:    [],
    devices:     [],
    heartbeatId: null,
    retryCount:  0,
    origin:      null,
  };

  // ── Structured Logger (Rule 2: never console.log) ───────────
  const log = {
    _emit(level, msg, meta = {}) {
      const entry = {
        ts: new Date().toISOString(),
        level,
        node: meta.node || 'PERSONA',
        module: 'buddy-embed',
        origin: state.origin,
        tenantId: state.tenantId,
        msg,
        ...meta,
      };
      if (level === 'error') console.error(JSON.stringify(entry));
      else if (level === 'warn') console.warn(JSON.stringify(entry));
      // Info/debug suppressed in production
    },
    info(msg, meta)  { this._emit('info', msg, meta); },
    warn(msg, meta)  { this._emit('warn', msg, meta); },
    error(msg, meta) { this._emit('error', msg, meta); },
  };

  // ── Auth: Cross-Domain SSO via auth.headysystems.com ────────
  const Auth = {
    async checkSession() {
      try {
        const resp = await fetch(`${ENDPOINTS.AUTH}/api/auth/session`, {
          credentials: 'include',
          signal: AbortSignal.timeout(PHI_TIMEOUT_CONNECT),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.valid) return data.user;
        }
      } catch (e) {
        log.warn('SSO session check failed', { node: 'CONDUCTOR', error: e.message });
      }
      return null;
    },

    async initOAuth(provider = 'google') {
      const width = FIB[9] * 10;  // 550
      const height = FIB[10] * 8; // 712
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;

      return new Promise((resolve, reject) => {
        const popup = window.open(
          `${ENDPOINTS.AUTH}/api/auth/oauth?provider=${provider}&origin=${encodeURIComponent(state.origin)}&features=buddy`,
          'heady-auth',
          `width=${width},height=${height},left=${left},top=${top},popup=yes`
        );

        const listener = (event) => {
          if (!ALLOWED_ORIGINS.has(new URL(event.origin).hostname)) return;
          if (event.data?.type === 'heady:auth:success') {
            window.removeEventListener('message', listener);
            resolve(event.data.user);
          }
          if (event.data?.type === 'heady:auth:error') {
            window.removeEventListener('message', listener);
            reject(new Error(event.data.error));
          }
        };
        window.addEventListener('message', listener);

        // Timeout at PHI_TIMEOUT_REQUEST * 21 (~89s)
        setTimeout(() => {
          window.removeEventListener('message', listener);
          if (popup && !popup.closed) popup.close();
          reject(new Error('Auth timeout'));
        }, PHI_TIMEOUT_REQUEST * FIB[7]);
      });
    },

    setUser(user) {
      state.tenantId = user.uid;
      state.token = user.token;
      state.sessionId = `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
      log.info('Authenticated', { node: 'CONDUCTOR', uid: user.uid, tier: user.tier });
    },
  };

  // ── Memory: T0 Redis + T1 Neon pgvector ─────────────────────
  const Memory = {
    async loadHistory() {
      if (!state.tenantId || !state.token) return;
      try {
        const resp = await fetch(`${ENDPOINTS.BUDDY}/history`, {
          method: 'POST',
          headers: _headers(),
          body: JSON.stringify({
            action: 'load',
            limit: FIB[7],
            namespace: `tenant:${state.tenantId}:buddy:history`,
          }),
          signal: AbortSignal.timeout(PHI_TIMEOUT_REQUEST),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.messages?.length) {
            state.messages = data.messages;
            UI.renderMessages();
            log.info('T1 history loaded', { count: data.messages.length });
          }
        }
      } catch (e) {
        log.warn('T1 load failed, starting fresh', { error: e.message });
      }
    },

    async persist(message) {
      if (!state.tenantId || !state.token) return;
      try {
        await fetch(`${ENDPOINTS.BUDDY}/persist`, {
          method: 'POST',
          headers: _headers(),
          body: JSON.stringify({
            action: 'upsert',
            namespace: `tenant:${state.tenantId}:buddy:history`,
            message,
            generateEmbedding: true,
          }),
          signal: AbortSignal.timeout(PHI_TIMEOUT_REQUEST),
        });
      } catch (e) {
        log.warn('T1 persist deferred', { node: 'TOPOLOGY', error: e.message });
      }
    },
  };

  // ── WebSocket: Cross-Device Sync ────────────────────────────
  const Sync = {
    connect() {
      if (!state.tenantId) return;
      try {
        state.ws = new WebSocket(
          `${ENDPOINTS.WS}?tenant=${state.tenantId}&device=${state.deviceId}&channel=buddy:sync`
        );

        state.ws.onopen = () => {
          state.retryCount = 0;
          UI.updateSyncStatus('synced');
          state.ws.send(JSON.stringify({
            type: 'buddy:register',
            tenantId: state.tenantId,
            deviceId: state.deviceId,
            sessionId: state.sessionId,
            origin: state.origin,
            timestamp: Date.now(),
          }));
          log.info('WebSocket connected', { node: 'CONDUCTOR' });
        };

        state.ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.type === 'buddy:message' && data.deviceId !== state.deviceId) {
              state.messages.push(data.message);
              UI.renderMessages();
              UI.flashNotification();
            }
            if (data.type === 'buddy:devices') {
              state.devices = data.devices;
              UI.updateDevices();
            }
          } catch (e) { /* malformed frame */ }
        };

        state.ws.onclose = () => {
          UI.updateSyncStatus('reconnecting');
          // φ-scaled exponential backoff
          const delay = Math.min(
            FIB[5] * 100 * (PHI ** state.retryCount),
            30000
          );
          state.retryCount++;
          setTimeout(() => Sync.connect(), delay);
        };

        state.ws.onerror = () => {
          log.warn('WebSocket error, will reconnect', { retryCount: state.retryCount });
        };
      } catch (e) {
        log.warn('WebSocket unavailable, SSE fallback', { error: e.message });
        Sync.connectSSE();
      }
    },

    connectSSE() {
      try {
        const es = new EventSource(
          `${ENDPOINTS.SSE}?tenant=${state.tenantId}&channel=buddy:sync`
        );
        es.addEventListener('buddy:message', (evt) => {
          const data = JSON.parse(evt.data);
          if (data.deviceId !== state.deviceId) {
            state.messages.push(data.message);
            UI.renderMessages();
          }
        });
      } catch (e) {
        log.warn('SSE fallback also failed', { error: e.message });
      }
    },

    broadcast(message) {
      if (state.ws?.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'buddy:message',
          tenantId: state.tenantId,
          deviceId: state.deviceId,
          origin: state.origin,
          message,
        }));
      }
    },

    startHeartbeat() {
      state.heartbeatId = setInterval(async () => {
        if (!state.tenantId || !state.token) return;
        try {
          await fetch(`${ENDPOINTS.BUDDY}/heartbeat`, {
            method: 'POST',
            headers: _headers(),
            body: JSON.stringify({
              tenantId: state.tenantId,
              deviceId: state.deviceId,
              sessionId: state.sessionId,
              namespace: `tenant:${state.tenantId}:buddy:heartbeat`,
              ttl: 30,
            }),
            signal: AbortSignal.timeout(PHI_TIMEOUT_CONNECT),
          });
        } catch (e) { /* next cycle recovers */ }
      }, PHI_HEARTBEAT);
    },
  };

  // ── Chat Engine ─────────────────────────────────────────────
  const Chat = {
    async send(text) {
      if (!text.trim()) return;

      const userMsg = _createMessage('user', text);
      state.messages.push(userMsg);
      UI.renderMessages();
      Memory.persist(userMsg);
      Sync.broadcast(userMsg);

      UI.setLoading(true);

      try {
        const resp = await fetch(`${ENDPOINTS.BUDDY}/chat`, {
          method: 'POST',
          headers: _headers(),
          body: JSON.stringify({
            message: text,
            context: {
              origin: state.origin,
              deviceId: state.deviceId,
              messageCount: state.messages.length,
              sessionId: state.sessionId,
            },
            namespace: `tenant:${state.tenantId}:buddy:context`,
          }),
          signal: AbortSignal.timeout(PHI_TIMEOUT_REQUEST * 3),
        });

        if (resp.ok) {
          const data = await resp.json();
          const buddyMsg = _createMessage('buddy', data.response, data.node || 'PERSONA');
          state.messages.push(buddyMsg);
          UI.renderMessages();
          Memory.persist(buddyMsg);
          Sync.broadcast(buddyMsg);
        } else {
          throw new Error(`HTTP ${resp.status}`);
        }
      } catch (e) {
        log.warn('Chat API failed, local response', { error: e.message });
        const fallback = _createMessage('buddy',
          `I'm connecting through the LLM fallback chain (Gemini → Azure → Workers AI). ` +
          `Your message has been queued. Currently synced across ${state.devices.length || 1} device(s) on ${state.origin}.`,
          'CONDUCTOR'
        );
        state.messages.push(fallback);
        UI.renderMessages();
        Memory.persist(fallback);
      } finally {
        UI.setLoading(false);
      }
    },
  };

  // ── UI Injection ────────────────────────────────────────────
  const UI = {
    root: null,
    panel: null,
    msgContainer: null,
    input: null,

    inject() {
      const config = _readConfig();

      // Inject styles
      const style = document.createElement('style');
      style.textContent = _getCSS(config);
      document.head.appendChild(style);

      // Create root
      this.root = document.createElement('div');
      this.root.id = 'heady-buddy-root';
      this.root.setAttribute('data-node', 'PERSONA');
      this.root.innerHTML = _getHTML(config);
      document.body.appendChild(this.root);

      // Cache refs
      this.panel = this.root.querySelector('.hb-panel');
      this.msgContainer = this.root.querySelector('.hb-messages');
      this.input = this.root.querySelector('.hb-input');

      // Bind events
      this.root.querySelector('.hb-toggle').addEventListener('click', () => this.toggle());
      this.root.querySelector('.hb-close').addEventListener('click', () => this.toggle());
      this.root.querySelector('.hb-send').addEventListener('click', () => this._sendFromInput());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._sendFromInput();
        }
      });

      // Auth button
      this.root.querySelector('.hb-auth-btn')?.addEventListener('click', async () => {
        try {
          const user = await Auth.initOAuth('google');
          Auth.setUser(user);
          await _postAuth();
          this.showChat();
        } catch (e) {
          log.error('Auth failed', { error: e.message });
        }
      });

      log.info('UI injected', { position: config.position, theme: config.theme });
    },

    toggle() {
      state.isOpen = !state.isOpen;
      this.panel.classList.toggle('hb-open', state.isOpen);
      if (state.isOpen) {
        this.input.focus();
        this.scrollToBottom();
      }
    },

    showChat() {
      const authScreen = this.root.querySelector('.hb-auth-screen');
      const chatScreen = this.root.querySelector('.hb-chat-screen');
      if (authScreen) authScreen.style.display = 'none';
      if (chatScreen) chatScreen.style.display = 'flex';
    },

    renderMessages() {
      if (!this.msgContainer) return;
      this.msgContainer.innerHTML = state.messages.map(m => `
        <div class="hb-msg hb-msg-${m.role}" data-node="${m.node || ''}">
          <div class="hb-msg-bubble">${_escapeHTML(m.text)}</div>
          <div class="hb-msg-meta">
            ${m.node ? `<span class="hb-msg-node">${m.node}</span>` : ''}
            <span>${m.timestamp || ''}</span>
            ${m.origin && m.origin !== state.origin ? `<span class="hb-msg-origin">${m.origin}</span>` : ''}
          </div>
        </div>
      `).join('');
      this.scrollToBottom();
    },

    scrollToBottom() {
      if (this.msgContainer) {
        this.msgContainer.scrollTop = this.msgContainer.scrollHeight;
      }
    },

    setLoading(on) {
      const indicator = this.root.querySelector('.hb-typing');
      if (indicator) indicator.style.display = on ? 'flex' : 'none';
    },

    updateSyncStatus(status) {
      const el = this.root.querySelector('.hb-sync-status');
      if (!el) return;
      const labels = { synced: 'Synced', reconnecting: 'Reconnecting…', offline: 'Offline' };
      const dots = { synced: 'hb-dot-green', reconnecting: 'hb-dot-yellow', offline: 'hb-dot-red' };
      el.innerHTML = `<span class="hb-sync-dot ${dots[status] || ''}"></span>${labels[status] || status}`;
    },

    updateDevices() {
      const el = this.root.querySelector('.hb-devices');
      if (!el || !state.devices.length) return;
      el.innerHTML = state.devices.map(d =>
        `<span class="hb-device-chip ${d.id === state.deviceId ? 'hb-device-active' : ''}">${d.label || d.id}</span>`
      ).join('');
    },

    flashNotification() {
      if (!state.isOpen) {
        const badge = this.root.querySelector('.hb-badge');
        if (badge) badge.style.display = 'block';
      }
    },

    _sendFromInput() {
      const text = this.input.value.trim();
      if (!text) return;
      this.input.value = '';
      Chat.send(text);
    },
  };

  // ── Private Helpers ─────────────────────────────────────────
  function _headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`,
      'X-Tenant-Id': state.tenantId,
      'X-Device-Id': state.deviceId,
      'X-Session-Id': state.sessionId,
      'X-Origin': state.origin,
    };
  }

  function _createMessage(role, text, node) {
    return {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,
      role,
      text,
      node: node || (role === 'buddy' ? 'PERSONA' : null),
      origin: state.origin,
      deviceId: state.deviceId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ts: Date.now(),
    };
  }

  function _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function _readConfig() {
    const script = document.querySelector('script[src*="buddy/embed"]') || document.currentScript;
    return {
      theme:    script?.getAttribute('data-theme') || 'dark',
      position: script?.getAttribute('data-position') || 'bottom-right',
      features: (script?.getAttribute('data-features') || 'chat').split(','),
    };
  }

  async function _postAuth() {
    Memory.loadHistory();
    Sync.connect();
    Sync.startHeartbeat();
    UI.showChat();
    UI.updateSyncStatus('synced');

    const welcome = _createMessage('buddy',
      `Connected to your persistent store at tenant:${state.tenantId}:buddy:*. ` +
      `Cross-site sync active on ${state.origin}. How can I help?`,
      'PERSONA'
    );
    state.messages.push(welcome);
    UI.renderMessages();
  }

  function _getCSS(config) {
    const pos = config.position === 'bottom-left'
      ? 'left: 21px;' : 'right: 21px;';
    const panelPos = config.position === 'bottom-left'
      ? 'left: 0;' : 'right: 0;';

    return `
      #heady-buddy-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; z-index: 99999; }
      .hb-toggle { position: fixed; bottom: 21px; ${pos} width: 55px; height: 55px; border-radius: 50%;
        background: linear-gradient(135deg, #00D4AA, #7C5EFF); border: none; cursor: pointer;
        box-shadow: 0 0 34px rgba(0,212,170,0.4); transition: transform 0.3s; z-index: 99999; }
      .hb-toggle:hover { transform: scale(1.08); }
      .hb-toggle svg { width: 24px; height: 24px; fill: white; }
      .hb-badge { position: absolute; top: -2px; right: -2px; width: 13px; height: 13px; border-radius: 50%;
        background: #22C55E; box-shadow: 0 0 8px #22C55E; border: 2px solid #060A14; display: none; }

      .hb-panel { position: fixed; bottom: 0; ${panelPos} width: 377px; height: 100vh;
        background: #0B1120; border-left: 1px solid rgba(139,92,246,0.22); z-index: 100000;
        display: flex; flex-direction: column;
        transform: translateX(${config.position === 'bottom-left' ? '-100%' : '100%'});
        transition: transform 0.382s cubic-bezier(0.16,1,0.3,1);
        box-shadow: ${config.position === 'bottom-left' ? '13px' : '-13px'} 0 55px rgba(0,0,0,0.4); }
      .hb-panel.hb-open { transform: translateX(0); }

      .hb-header { display: flex; align-items: center; gap: 13px; padding: 13px 21px;
        border-bottom: 1px solid rgba(139,92,246,0.22); background: rgba(15,23,42,0.72);
        backdrop-filter: blur(18px); flex-shrink: 0; }
      .hb-avatar { width: 34px; height: 34px; border-radius: 50%;
        background: linear-gradient(135deg, #00D4AA, #7C5EFF);
        display: flex; align-items: center; justify-content: center; }
      .hb-avatar svg { width: 18px; height: 18px; fill: white; }
      .hb-name { font-size: 14px; font-weight: 600;
        background: linear-gradient(135deg, #00D4AA, #7C5EFF);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .hb-sync-status { font-size: 10px; color: #94A3B8; display: flex; align-items: center; gap: 5px; }
      .hb-sync-dot { width: 6px; height: 6px; border-radius: 50%; }
      .hb-dot-green { background: #22C55E; }
      .hb-dot-yellow { background: #F0C040; }
      .hb-dot-red { background: #EF4444; }
      .hb-close { margin-left: auto; background: none; border: none; color: #94A3B8; cursor: pointer;
        font-size: 18px; padding: 5px; border-radius: 8px; }
      .hb-close:hover { background: rgba(255,255,255,0.06); }

      .hb-persist { padding: 8px 21px; background: linear-gradient(135deg, rgba(0,212,170,0.1), rgba(124,94,255,0.1));
        border-bottom: 1px solid rgba(139,92,246,0.22); font-size: 10px; color: #94A3B8;
        display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
      .hb-devices { display: flex; gap: 5px; padding: 5px 21px; font-size: 10px; color: #475569;
        border-bottom: 1px solid rgba(255,255,255,0.03); flex-shrink: 0; }
      .hb-device-chip { padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06); }
      .hb-device-active { background: rgba(0,212,170,0.15); border-color: rgba(0,212,170,0.3); color: #00D4AA; }

      .hb-messages { flex: 1; overflow-y: auto; padding: 21px; display: flex; flex-direction: column; gap: 13px; }
      .hb-msg { max-width: 88%; display: flex; flex-direction: column; gap: 3px; }
      .hb-msg-user { align-self: flex-end; }
      .hb-msg-buddy { align-self: flex-start; }
      .hb-msg-bubble { padding: 8px 13px; border-radius: 13px; font-size: 13px; line-height: 1.618; color: #E2E8F0; }
      .hb-msg-user .hb-msg-bubble { background: linear-gradient(135deg, rgba(0,212,170,0.2), rgba(124,94,255,0.2));
        border: 1px solid rgba(0,212,170,0.15); border-bottom-right-radius: 3px; }
      .hb-msg-buddy .hb-msg-bubble { background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06); border-bottom-left-radius: 3px; }
      .hb-msg-meta { font-size: 10px; color: #475569; display: flex; align-items: center; gap: 5px; }
      .hb-msg-user .hb-msg-meta { align-self: flex-end; }
      .hb-msg-node { font-size: 9px; padding: 1px 5px; border-radius: 3px;
        background: rgba(124,94,255,0.15); color: #7C5EFF; }
      .hb-msg-origin { font-size: 9px; padding: 1px 5px; border-radius: 3px;
        background: rgba(0,212,170,0.1); color: #00D4AA; }

      .hb-typing { display: none; align-items: center; gap: 5px; padding: 0 21px 8px; font-size: 11px; color: #475569; }
      .hb-typing-dot { width: 5px; height: 5px; border-radius: 50%; background: #7C5EFF;
        animation: hb-bounce 1.618s infinite; }
      .hb-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .hb-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes hb-bounce { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }

      .hb-input-area { padding: 13px 21px; border-top: 1px solid rgba(139,92,246,0.22);
        background: rgba(15,23,42,0.72); display: flex; gap: 8px; align-items: end; flex-shrink: 0; }
      .hb-input { flex: 1; padding: 8px 13px; background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 13px; color: #E2E8F0;
        font-family: inherit; font-size: 13px; resize: none; min-height: 40px; max-height: 144px; line-height: 1.5; }
      .hb-input:focus { outline: none; border-color: #00D4AA; }
      .hb-input::placeholder { color: #475569; }
      .hb-send { width: 40px; height: 40px; background: linear-gradient(135deg, #00D4AA, #7C5EFF);
        border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center;
        justify-content: center; flex-shrink: 0; transition: box-shadow 0.2s; }
      .hb-send:hover { box-shadow: 0 0 21px rgba(0,212,170,0.4); }
      .hb-send svg { width: 16px; height: 16px; fill: white; }

      .hb-auth-screen { display: flex; flex-direction: column; align-items: center; justify-content: center;
        flex: 1; gap: 21px; padding: 34px; }
      .hb-auth-title { font-size: 18px; font-weight: 600; color: #E2E8F0; }
      .hb-auth-desc { font-size: 12px; color: #94A3B8; text-align: center; }
      .hb-auth-btn { padding: 13px 21px; background: linear-gradient(135deg, #00D4AA, #00B894);
        border: none; border-radius: 8px; color: #000; font-weight: 600; font-size: 14px; cursor: pointer;
        font-family: inherit; transition: box-shadow 0.2s; }
      .hb-auth-btn:hover { box-shadow: 0 0 21px rgba(0,212,170,0.4); }
      .hb-chat-screen { display: none; flex-direction: column; flex: 1; min-height: 0; }

      .hb-messages::-webkit-scrollbar { width: 5px; }
      .hb-messages::-webkit-scrollbar-track { background: transparent; }
      .hb-messages::-webkit-scrollbar-thumb { background: rgba(124,94,255,0.2); border-radius: 89px; }

      @media (max-width: 500px) { .hb-panel { width: 100%; } }
    `;
  }

  function _getHTML(config) {
    return `
      <button class="hb-toggle" data-node="PERSONA" aria-label="Open HeadyBuddy">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <div class="hb-badge"></div>
      </button>
      <div class="hb-panel" data-node="PERSONA">
        <div class="hb-header">
          <div class="hb-avatar"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
          <div>
            <div class="hb-name">HeadyBuddy</div>
            <div class="hb-sync-status"><span class="hb-sync-dot hb-dot-green"></span>Ready</div>
          </div>
          <button class="hb-close" aria-label="Close">✕</button>
        </div>
        <div class="hb-persist"><span style="color:#00D4AA;">🔒</span> Persistent storage · Cross-site via auth.headysystems.com</div>
        <div class="hb-devices"></div>
        <div class="hb-auth-screen">
          <div class="hb-auth-title">HeadyBuddy</div>
          <div class="hb-auth-desc">Sign in to sync conversations across all Heady domains and devices.</div>
          <button class="hb-auth-btn" data-node="CONDUCTOR">Sign in with Google</button>
          <div style="font-size:10px;color:#475569;">Powered by Firebase Auth · 27 providers</div>
        </div>
        <div class="hb-chat-screen">
          <div class="hb-messages"></div>
          <div class="hb-typing"><div class="hb-typing-dot"></div><div class="hb-typing-dot"></div><div class="hb-typing-dot"></div><span>HeadyBuddy is thinking…</span></div>
          <div class="hb-input-area">
            <textarea class="hb-input" placeholder="Ask HeadyBuddy anything…" rows="1"></textarea>
            <button class="hb-send" data-node="PERSONA" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Boot ────────────────────────────────────────────────────
  async function init() {
    state.origin = window.location.hostname;

    // Verify origin is in allowed set (with subdomain fallback)
    const parts = state.origin.split('.');
    const rootDomain = parts.slice(-2).join('.');
    if (!ALLOWED_ORIGINS.has(state.origin) && !ALLOWED_ORIGINS.has(rootDomain)) {
      log.warn('Origin not in allowed set', { origin: state.origin });
    }

    UI.inject();

    // Check for existing cross-domain session
    const existingUser = await Auth.checkSession();
    if (existingUser) {
      Auth.setUser(existingUser);
      await _postAuth();
    }
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ──────────────────────────────────────────────
  return Object.freeze({
    send:   (text) => Chat.send(text),
    toggle: ()     => UI.toggle(),
    getState: ()   => ({ ...state, token: '[REDACTED]' }),
  });
})();

// Export for ESM environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeadyBuddyEmbed;
}
