/**
 * HeadyShared — Shared runtime utilities for all Heady sites
 * Provides: navigation, FAQ accordion, scroll animations,
 *           theme toggle, AutoContext bridge, content injectors
 */
(function (global) {
  'use strict';

  // ============================================================
  // THEME TOGGLE
  // ============================================================
  function initTheme() {
    const root = document.documentElement;
    const toggles = document.querySelectorAll('[data-theme-toggle]');
    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);
    toggles.forEach(t => updateToggleIcon(t, theme));

    toggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', theme);
        toggles.forEach(t => updateToggleIcon(t, theme));
      });
    });
  }

  function updateToggleIcon(el, theme) {
    el.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    el.innerHTML = theme === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ============================================================
  // NAV SCROLL BEHAVIOR
  // ============================================================
  function initNav() {
    const nav = document.querySelector('.heady-nav');
    if (!nav) return;

    const burger = nav.querySelector('.nav-hamburger');
    const links = nav.querySelector('.nav-links');

    // Scroll class
    const observer = new IntersectionObserver(
      ([entry]) => nav.classList.toggle('scrolled', !entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:1px;left:0;width:1px;height:1px;pointer-events:none;';
    document.body.prepend(sentinel);
    observer.observe(sentinel);

    // Mobile menu
    if (burger && links) {
      burger.addEventListener('click', () => {
        const open = burger.classList.toggle('open');
        links.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', open);
      });
      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          burger.classList.remove('open');
          links.classList.remove('open');
        });
      });
    }
  }

  // ============================================================
  // FAQ ACCORDION
  // ============================================================
  function initFAQ() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const question = item.querySelector('.faq-question');
      if (!question) return;
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close all
        document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  // ============================================================
  // SCROLL ANIMATIONS
  // ============================================================
  function initScrollAnimations() {
    const els = document.querySelectorAll('.fade-in');
    if (!els.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => io.observe(el));
  }

  // ============================================================
  // COUNTER ANIMATION (for stats)
  // ============================================================
  function initCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 1800;
      let start = null;

      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        io.unobserve(el);

        function step(ts) {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = eased * target;
          el.textContent = prefix + (Number.isInteger(target) ? Math.round(value) : value.toFixed(1)) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  // ============================================================
  // HEADY AUTO CONTEXT BRIDGE
  // ============================================================
  const HeadyAutoContext = {
    version: '1.0.0',
    site: null,
    context: {},
    listeners: [],

    init(siteMeta) {
      this.site = siteMeta;
      this.context = {
        site: siteMeta.slug,
        domain: siteMeta.domain || window.location.hostname,
        timestamp: Date.now(),
        user: null,
        session: null,
        theme: document.documentElement.getAttribute('data-theme') || 'dark',
      };

      // Listen for auth sync from auth.headysystems.com
      window.addEventListener('message', (event) => {
        if (!['https://auth.headysystems.com', 'https://headysystems.com'].includes(event.origin)) return;
        if (event.data?.type === 'heady:auth:sync') {
          const relayNonce = event.data?.session?.nonce;
          if (relayNonce && this._relayNonce && relayNonce !== this._relayNonce) return;
          this.context.user = event.data.user;
          this.context.session = event.data.session;
          this.broadcast('auth:update', { user: event.data.user, session: event.data.session });
        }
        if (event.data?.type === 'heady:context:inject') {
          Object.assign(this.context, event.data.context || {});
          this.broadcast('context:update', this.context);
        }
      });

      // Expose on window for integrations
      window.HeadyAutoContext = this;
      this.broadcast('init', this.context);

      // Request auth state
      this._pingAuth();
    },

    _pingAuth() {
      const iframe = document.getElementById('heady-auth-relay');
      if (iframe?.contentWindow) {
        this._relayNonce = global.crypto?.randomUUID ? global.crypto.randomUUID() : 'heady-' + Math.random().toString(36).slice(2);
        iframe.contentWindow.postMessage({ type: 'heady:context:request', site: this.site?.slug, nonce: this._relayNonce }, 'https://auth.headysystems.com');
      }
    },

    get(key) {
      return key ? this.context[key] : { ...this.context };
    },

    set(key, value) {
      this.context[key] = value;
      this.broadcast('context:update', { [key]: value });
    },

    on(event, cb) {
      this.listeners.push({ event, cb });
      return () => { this.listeners = this.listeners.filter(l => l.cb !== cb); };
    },

    broadcast(event, data) {
      this.listeners.filter(l => l.event === event || l.event === '*').forEach(l => {
        try { l.cb(data); } catch (e) {
          global.dispatchEvent(new CustomEvent('heady:error', { detail: { event, message: e.message } }));
        }
      });
    }
  };

  // ============================================================
  // HEADY BEE CONTENT INJECTOR
  // ============================================================
  const HeadyBeeInjector = {
    version: '1.0.0',
    queue: [],
    loaded: false,

    init(config = {}) {
      this.config = {
        endpoint: config.endpoint || 'https://api.headysystems.com/v1/content',
        site: config.site || window.location.hostname,
        autoInject: config.autoInject !== false,
        ...config
      };

      document.querySelectorAll('[data-heady-bee]').forEach(el => {
        this._injectElement(el);
      });

      // Watch for dynamic elements
      const mo = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.dataset?.headyBee) this._injectElement(node);
            node.querySelectorAll?.('[data-heady-bee]').forEach(el => this._injectElement(el));
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });

      window.HeadyBeeInjector = this;
    },

    _injectElement(el) {
      const key = el.dataset.headyBee;
      const fallback = el.innerHTML;
      // In production this would fetch from the Bee content API
      // For static builds, we use data attributes or fallback content
      if (el.dataset.headyBeeContent) {
        el.innerHTML = el.dataset.headyBeeContent;
      }
      // Mark as processed
      el.setAttribute('data-heady-bee-injected', 'true');
    },

    inject(selector, content) {
      document.querySelectorAll(selector).forEach(el => {
        el.innerHTML = content;
        el.setAttribute('data-heady-bee-injected', 'true');
      });
    }
  };

  // ============================================================
  // AUTH RELAY IFRAME (hidden)
  // ============================================================
  function initAuthRelay() {
    if (document.getElementById('heady-auth-relay')) return;
    const iframe = document.createElement('iframe');
    iframe.id = 'heady-auth-relay';
    iframe.src = 'https://auth.headysystems.com/relay.html';
    iframe.style.cssText = 'display:none;width:1px;height:1px;position:absolute;top:-9999px;';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    document.body.appendChild(iframe);
  }

  // ============================================================
  // AUTH WIDGET BUTTON STATE
  // ============================================================
  function initAuthWidget() {
    const btn = document.querySelector('.auth-widget-btn');
    if (!btn) return;

    window.addEventListener('message', event => {
      if (!['https://auth.headysystems.com'].includes(event.origin)) return;
      if (event.data?.type === 'heady:auth:sync') {
        const user = event.data.user;
        const dot = btn.querySelector('.dot');
        if (user) {
          btn.querySelector('.auth-label').textContent = user.displayName?.split(' ')[0] || 'Account';
          if (dot) dot.classList.add('online');
        } else {
          btn.querySelector('.auth-label').textContent = 'Sign In';
          if (dot) dot.classList.remove('online');
        }
      }
    });

    btn.addEventListener('click', () => {
      window.location.href = 'https://auth.headysystems.com?return=' + encodeURIComponent(window.location.href);
    });
  }

  // ============================================================
  // SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================================
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id === '#') return; // skip dead links
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', id);
      }
    });
  }

  // ============================================================
  // HEADY BUDDY CHAT WIDGET
  // ============================================================
  function initBuddyChat() {
    // Don't inject on auth pages
    if (location.hostname === 'auth.headysystems.com') return;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
      .buddy-fab{position:fixed;bottom:24px;right:24px;z-index:9999;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,0.35);transition:transform .2s,box-shadow .2s;background:linear-gradient(135deg,var(--color-accent,#00d4aa),#8b5cf6);}
      .buddy-fab:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(0,0,0,0.45);}
      .buddy-fab svg{width:28px;height:28px;fill:#fff;}
      .buddy-fab .buddy-pulse{position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--color-accent,#00d4aa);animation:buddy-pulse 2s ease-out infinite;pointer-events:none;}
      @keyframes buddy-pulse{0%{opacity:.8;transform:scale(1);}100%{opacity:0;transform:scale(1.5);}}
      .buddy-window{position:fixed;bottom:92px;right:24px;z-index:9998;width:380px;max-width:calc(100vw - 48px);height:520px;max-height:calc(100vh - 120px);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 48px rgba(0,0,0,0.4);opacity:0;transform:translateY(16px) scale(0.95);pointer-events:none;transition:opacity .25s,transform .25s;background:var(--color-bg,#0b0e14);border:1px solid var(--glass-border,rgba(255,255,255,0.08));}
      .buddy-window.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
      .buddy-header{padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,0.08));background:linear-gradient(135deg,rgba(0,212,170,0.08),rgba(139,92,246,0.08));}
      .buddy-header-dot{width:10px;height:10px;border-radius:50%;background:#00d4aa;box-shadow:0 0 8px rgba(0,212,170,0.5);}
      .buddy-header-title{font-weight:600;font-size:15px;color:var(--color-text,#fff);flex:1;}
      .buddy-header-close{background:none;border:none;cursor:pointer;color:var(--color-text-muted,#888);font-size:20px;line-height:1;padding:4px;}
      .buddy-header-close:hover{color:var(--color-text,#fff);}
      .buddy-messages{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;}
      .buddy-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-wrap:break-word;animation:buddy-msg-in .3s ease;}
      .buddy-msg.bot{align-self:flex-start;background:rgba(255,255,255,0.06);border:1px solid var(--glass-border,rgba(255,255,255,0.08));color:var(--color-text,#e0e0e0);border-bottom-left-radius:4px;}
      .buddy-msg.user{align-self:flex-end;background:linear-gradient(135deg,var(--color-accent,#00d4aa),#8b5cf6);color:#fff;border-bottom-right-radius:4px;}
      @keyframes buddy-msg-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      .buddy-input-area{padding:12px 16px;border-top:1px solid var(--glass-border,rgba(255,255,255,0.08));display:flex;gap:8px;background:rgba(255,255,255,0.02);}
      .buddy-input{flex:1;padding:10px 14px;border-radius:12px;border:1px solid var(--glass-border,rgba(255,255,255,0.08));background:rgba(255,255,255,0.04);color:var(--color-text,#fff);font-size:14px;outline:none;font-family:inherit;}
      .buddy-input::placeholder{color:var(--color-text-faint,#666);}
      .buddy-input:focus{border-color:var(--color-accent,#00d4aa);}
      .buddy-send{width:40px;height:40px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:var(--color-accent,#00d4aa);transition:background .2s,transform .15s;}
      .buddy-send:hover{background:#00b891;transform:scale(1.05);}
      .buddy-send:active{transform:scale(0.95);}
      .buddy-send svg{width:18px;height:18px;fill:#fff;}
      .buddy-typing{display:flex;gap:4px;padding:10px 14px;align-self:flex-start;}
      .buddy-typing span{width:6px;height:6px;border-radius:50%;background:var(--color-text-faint,#666);animation:buddy-dot 1.4s infinite;}
      .buddy-typing span:nth-child(2){animation-delay:.2s;}
      .buddy-typing span:nth-child(3){animation-delay:.4s;}
      @keyframes buddy-dot{0%,80%,100%{transform:scale(0.6);opacity:0.4;}40%{transform:scale(1);opacity:1;}}
    `;
    document.head.appendChild(style);

    // Inject HTML
    const fab = document.createElement('button');
    fab.className = 'buddy-fab';
    fab.setAttribute('aria-label', 'Open HeadyBuddy chat');
    fab.innerHTML = '<span class="buddy-pulse"></span><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
    document.body.appendChild(fab);

    const win = document.createElement('div');
    win.className = 'buddy-window';
    win.innerHTML = `
      <div class="buddy-header">
        <span class="buddy-header-dot"></span>
        <span class="buddy-header-title">HeadyBuddy</span>
        <button class="buddy-header-close" aria-label="Close chat">&times;</button>
      </div>
      <div class="buddy-messages" id="buddy-messages"></div>
      <div class="buddy-input-area">
        <input class="buddy-input" id="buddy-input" type="text" placeholder="Ask Buddy anything…" autocomplete="off">
        <button class="buddy-send" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
      </div>
    `;
    document.body.appendChild(win);

    const msgs = win.querySelector('#buddy-messages');
    const input = win.querySelector('#buddy-input');
    const sendBtn = win.querySelector('.buddy-send');
    const closeBtn = win.querySelector('.buddy-header-close');
    let isOpen = false;

    function addMsg(text, role) {
      const el = document.createElement('div');
      el.className = 'buddy-msg ' + role;
      el.textContent = text;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function showTyping() {
      const el = document.createElement('div');
      el.className = 'buddy-typing';
      el.id = 'buddy-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function hideTyping() {
      const t = document.getElementById('buddy-typing');
      if (t) t.remove();
    }

    const siteName = (global.__HEADY_SITE_META__?.name || document.title || 'Heady').replace(/\s*[—–\-|].*/, '');

    function toggle() {
      isOpen = !isOpen;
      win.classList.toggle('open', isOpen);
      fab.setAttribute('aria-label', isOpen ? 'Close HeadyBuddy chat' : 'Open HeadyBuddy chat');
      if (isOpen && msgs.children.length === 0) {
        addMsg('Hey! 👋 I\'m Buddy, your Heady assistant. Ask me anything about ' + siteName + ' or the Heady ecosystem.', 'bot');
      }
      if (isOpen) input.focus();
    }

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMsg(text, 'user');
      input.value = '';
      showTyping();

      try {
        const endpoint = global.__HEADY_AUTH_CONFIG__?.cookieEndpoint?.replace('/session/start', '/buddy/chat')
          || 'https://auth.headysystems.com/api/buddy/chat';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message: text,
            site: global.__HEADY_SITE_META__?.slug || 'unknown',
            context: HeadyAutoContext?.get() || {}
          })
        });
        hideTyping();
        if (res.ok) {
          const data = await res.json();
          addMsg(data.reply || data.message || 'Got it!', 'bot');
        } else {
          addMsg(getBuddyFallback(text), 'bot');
        }
      } catch (e) {
        hideTyping();
        addMsg(getBuddyFallback(text), 'bot');
      }
    }

    function getBuddyFallback(text) {
      const lower = text.toLowerCase();
      if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
        return 'Hello! 😊 How can I help you today?';
      if (lower.includes('what') && (lower.includes('heady') || lower.includes('platform')))
        return 'Heady is a sovereign AI orchestration platform with 60+ patents, 9 domains, and 20 AI nodes. Check the features section on this page for a deep dive!';
      if (lower.includes('help'))
        return 'I can help with:\n• Navigation across Heady sites\n• Understanding features & architecture\n• Getting started with the platform\n• Finding documentation\nJust ask!';
      if (lower.includes('price') || lower.includes('cost') || lower.includes('pricing'))
        return 'Visit headyfinance.com for investment and pricing details, or contact sales through the headysystems.com contact section.';
      if (lower.includes('doc') || lower.includes('api'))
        return 'Check out our docs at headyio.com and API reference at headyapi.com. For MCP tools, visit headymcp.com.';
      if (lower.includes('sign') || lower.includes('login') || lower.includes('account'))
        return 'You can sign in or create an account at auth.headysystems.com. Sessions carry across all Heady sites!';
      return 'Great question! The Heady ecosystem is constantly evolving. You can explore more at headysystems.com or check our documentation at headyio.com. Is there something specific I can help with?';
    }

    fab.addEventListener('click', toggle);
    closeBtn.addEventListener('click', toggle);
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) toggle();
    });
  }

  // ============================================================
  // INIT ALL
  // ============================================================
  function initAll() {
    initTheme();
    initNav();
    initFAQ();
    initScrollAnimations();
    initCounters();
    initSmoothScroll();
    initAuthRelay();
    initAuthWidget();
    initBuddyChat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Expose globals
  global.HeadyAutoContext = HeadyAutoContext;
  global.HeadyBeeInjector = HeadyBeeInjector;

})(window);
