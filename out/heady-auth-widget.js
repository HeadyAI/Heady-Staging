/**
 * heady-auth-widget.js — Unified Firebase Authentication Widget
 * Embeds in ALL Heady sites. Handles Google OAuth, Email/Password, Anonymous.
 * Cross-site persistence via httpOnly cookies + central auth relay iframe.
 * SECURITY: NO localStorage for tokens. Uses auth.headysystems.com relay.
 * © 2024-2026 HeadySystems Inc. All Rights Reserved. 51 Provisional Patents.
 */
(function () {
    const AUTH_DOMAIN = 'https://auth.headysystems.com';
    const AUTH_PAGE = AUTH_DOMAIN + '/login';
    const RELAY_PATH = AUTH_DOMAIN + '/relay.html';
    const USER_KEY = 'heady_user_profile'; // Profile only (non-sensitive), NOT tokens
    const ALLOWED_ORIGINS = [
        'https://headyme.com', 'https://headysystems.com', 'https://heady-ai.com',
        'https://headyos.com', 'https://headyconnection.org', 'https://headyconnection.com',
        'https://headyex.com', 'https://headyfinance.com', 'https://admin.headysystems.com',
        'https://auth.headysystems.com',
    ];

    class HeadyAuthWidget {
        constructor() {
            this.user = null;
            this.listeners = [];
            this.relayFrame = null;
            this.init();
        }

        async init() {
            this.loadCachedProfile();
            this.renderWidget();
            this.createRelayIframe();
            this.setupMessageListener();
        }

        // ─── Relay Iframe for Cross-Domain Token Sync ──────────────────────────
        createRelayIframe() {
            if (window.location.hostname === 'auth.headysystems.com') return;
            const iframe = document.createElement('iframe');
            iframe.src = RELAY_PATH;
            iframe.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute;';
            iframe.id = 'heady-auth-relay';
            iframe.setAttribute('aria-hidden', 'true');
            document.body.appendChild(iframe);
            this.relayFrame = iframe;
            // Heartbeat: check auth status every φ² seconds ≈ 2618ms
            setInterval(() => this.requestAuthStatus(), 2618);
        }

        requestAuthStatus() {
            if (this.relayFrame?.contentWindow) {
                this.relayFrame.contentWindow.postMessage(
                    { type: 'heady:auth:status-request', origin: window.location.origin },
                    AUTH_DOMAIN
                );
            }
        }

        setupMessageListener() {
            window.addEventListener('message', (event) => {
                if (!ALLOWED_ORIGINS.includes(event.origin)) return;
                const { type, user, authenticated } = event.data || {};
                if (type === 'heady:auth:status-response') {
                    if (authenticated && user) {
                        this.handleAuthChange(user);
                    } else if (!authenticated && this.user) {
                        this.handleSignOut();
                    }
                }
                if (type === 'heady:auth:signed-in') {
                    this.handleAuthChange(user);
                }
                if (type === 'heady:auth:signed-out') {
                    this.handleSignOut();
                }
            });
        }

        // ─── Profile Cache (NON-SENSITIVE data only) ──────────────────────────
        loadCachedProfile() {
            try {
                const cached = sessionStorage.getItem(USER_KEY);
                if (cached) this.user = JSON.parse(cached);
            } catch (e) { /* no cached profile */ }
        }

        saveCachedProfile(user) {
            try {
                // Store ONLY display info in sessionStorage (not tokens, not secrets)
                sessionStorage.setItem(USER_KEY, JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    provider: user.provider,
                }));
            } catch (e) { /* storage unavailable */ }
        }

        handleAuthChange(user) {
            this.user = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                photoURL: user.photoURL,
                provider: user.provider || 'unknown',
            };
            this.saveCachedProfile(this.user);
            this.renderWidget();
            this.emit('heady:auth:changed', this.user);
            // HeadyAutoContext integration (MANDATORY)
            if (window.HeadyAutoContext) {
                window.HeadyAutoContext.indexUserContext(this.user);
            }
        }

        handleSignOut() {
            this.user = null;
            sessionStorage.removeItem(USER_KEY);
            this.renderWidget();
            this.emit('heady:auth:changed', null);
        }

        emit(eventName, detail) {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
            this.listeners.forEach(fn => fn(detail));
        }

        onAuthChange(fn) { this.listeners.push(fn); }

        renderWidget() {
            let widget = document.getElementById('heady-auth-widget');
            if (!widget) {
                widget = document.createElement('div');
                widget.id = 'heady-auth-widget';
                widget.style.cssText = `
          position:fixed; top:13px; right:21px; z-index:10000;
          display:flex; align-items:center; gap:8px;
          font-family:'Inter',system-ui,sans-serif; font-size:0.875rem;
        `;
                document.body.appendChild(widget);
            }
            if (this.user) {
                const initials = (this.user.displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                widget.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 13px;
            background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);
            border:1px solid rgba(255,255,255,0.08);border-radius:34px;cursor:pointer;"
            id="heady-auth-profile">
            ${this.user.photoURL
                        ? `<img src="${this.user.photoURL}" style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);" alt="avatar">`
                        : `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00d4aa,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;">${initials}</div>`
                    }
            <span style="color:#e8e8f0;font-weight:500;">${this.user.displayName}</span>
          </div>
        `;
                widget.querySelector('#heady-auth-profile').addEventListener('click', () => this.showProfileMenu());
            } else {
                widget.innerHTML = `
          <button id="heady-auth-signin" style="
            padding:8px 21px;background:linear-gradient(135deg,rgba(0,212,170,0.15),rgba(139,92,246,0.15));
            border:1px solid rgba(0,212,170,0.3);border-radius:34px;color:#00d4aa;
            font-size:0.875rem;font-weight:600;cursor:pointer;backdrop-filter:blur(20px);
            transition:all 0.3s cubic-bezier(0.618,0,0.382,1);"
            onmouseover="this.style.background='linear-gradient(135deg,rgba(0,212,170,0.25),rgba(139,92,246,0.25))'"
            onmouseout="this.style.background='linear-gradient(135deg,rgba(0,212,170,0.15),rgba(139,92,246,0.15))'">
            Sign In
          </button>
        `;
                widget.querySelector('#heady-auth-signin').addEventListener('click', () => this.signIn());
            }
        }

        signIn() {
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = `${AUTH_PAGE}?redirect=${currentUrl}`;
        }

        async signOut() {
            // Tell relay iframe to sign out centrally
            if (this.relayFrame?.contentWindow) {
                this.relayFrame.contentWindow.postMessage(
                    { type: 'heady:auth:sign-out', origin: window.location.origin },
                    AUTH_DOMAIN
                );
            }
            this.handleSignOut();
        }

        showProfileMenu() {
            let menu = document.getElementById('heady-auth-menu');
            if (menu) { menu.remove(); return; }
            menu = document.createElement('div');
            menu.id = 'heady-auth-menu';
            menu.style.cssText = `
        position:fixed; top:55px; right:21px; z-index:10001;
        background:rgba(18,18,26,0.95); backdrop-filter:blur(20px);
        border:1px solid rgba(255,255,255,0.08); border-radius:13px;
        padding:13px; min-width:200px;
      `;
            menu.innerHTML = `
        <div style="padding:8px 5px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:8px;">
          <div style="color:#e8e8f0;font-weight:600;font-size:0.875rem;">${this.user?.displayName || 'User'}</div>
          <div style="color:#9898a8;font-size:0.75rem;margin-top:3px;">${this.user?.email || ''}</div>
        </div>
        <button id="heady-auth-signout" style="
          width:100%;padding:8px;background:rgba(255,255,255,0.05);border:none;
          border-radius:8px;color:#e8e8f0;font-size:0.813rem;cursor:pointer;text-align:left;
          transition:background 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.1)'"
          onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          Sign Out
        </button>
      `;
            document.body.appendChild(menu);
            menu.querySelector('#heady-auth-signout').addEventListener('click', () => this.signOut());
            setTimeout(() => {
                const close = (e) => {
                    if (!menu.contains(e.target) && e.target.id !== 'heady-auth-profile') {
                        menu.remove(); document.removeEventListener('click', close);
                    }
                };
                document.addEventListener('click', close);
            }, 100);
        }

        hideProfileMenu() {
            const menu = document.getElementById('heady-auth-menu');
            if (menu) menu.remove();
        }

        // Token is in httpOnly cookie — use fetch with credentials: 'include'
        async getAuthenticatedFetch(url, options = {}) {
            return fetch(url, {
                ...options,
                credentials: 'include',
                headers: {
                    ...options.headers,
                    'X-Heady-Site': window.location.hostname,
                },
            });
        }

        getUser() { return this.user; }
        isAuthenticated() { return !!this.user; }
    }

    window.HeadyAuth = new HeadyAuthWidget();
})();
