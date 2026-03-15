---
name: heady-firebase-auth-orchestrator
description: Skill for managing Firebase Authentication across all 9 Heady multi-site deployments. Use when implementing auth flows, configuring cross-site token relay, setting up httpOnly cookie auth, handling OAuth state/nonce, managing Firestore user profiles, or connecting auth events to HeadyAutoContext vector memory. Firebase project ID is gen-lang-client-0920560496. Triggers on "Firebase", "auth", "login", "sign-in", "OAuth", "JWT", "cross-site auth", "cookie relay", or any authentication task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: security
---

# Heady Firebase Auth Orchestrator

## When to Use This Skill

Use this skill when:

- Implementing the central auth domain at `auth.headysystems.com/login`
- Configuring Firebase Auth relay iframes for cross-site token sharing
- Setting up httpOnly/Secure/SameSite=Strict cookies (NOT browser storage)
- Wiring OAuth state/nonce CSRF protection
- Managing Firestore security rules
- Indexing user profiles into HeadyAutoContext on sign-in
- Rate-limiting anonymous sign-ins

## Architecture

```
Firebase Auth (gen-lang-client-0920560496)
    ↓ Google OAuth + Email/Password + Anonymous
auth.headysystems.com/login
    ↓ Mint custom Firebase token (server-side)
    ↓ Set httpOnly Secure SameSite=Strict cookie
    ↓ Relay iframe posts token to all 9 domains via postMessage
         ↓ Each site stores session cookie
    ↓ HeadyAutoContext indexes user profile on sign-in
    ↓ Firestore stores: { uid, email, displayName, photoURL, provider }
    ↓ pgvector syncs user preferences for personalization
```

## Instructions

### Step 1 — Central Auth Domain Setup

```javascript
// auth.headysystems.com — server-side token minting
import { getAuth } from 'firebase-admin/auth';

app.post('/auth/custom-token', async (req, res) => {
  const { idToken, redirect } = req.body;
  
  // Validate redirect against server-side allowlist (CSRF protection)
  const ALLOWED_REDIRECTS = [
    'headyme.com', 'headysystems.com', 'heady-ai.com', 'headyos.com',
    'headyconnection.org', 'headyconnection.com', 'headyex.com',
    'headyfinance.com', 'admin.headysystems.com',
  ];
  const redirectHost = new URL(redirect).hostname;
  if (!ALLOWED_REDIRECTS.some(d => redirectHost === d || redirectHost.endsWith(`.${d}`))) {
    return res.status(400).json({ error: 'Invalid redirect' });
  }
  
  // Verify incoming Firebase ID token
  const decoded = await getAuth().verifyIdToken(idToken);
  
  // Mint custom token for cross-domain use
  const customToken = await getAuth().createCustomToken(decoded.uid, {
    email: decoded.email,
    provider: decoded.firebase.sign_in_provider,
  });
  
  // Set httpOnly cookie (NOT browser storage — XSS vulnerable)
  res.cookie('heady_session', customToken, {
    httpOnly: true,
    secure:   true,
    sameSite: 'Strict',
    maxAge:   60 * 60 * 1000,  // 1 hour (short expiry)
    domain:   '.headysystems.com',
  });
  
  // Index user into AutoContext on sign-in
  await indexAuthEvent({ uid: decoded.uid, email: decoded.email, provider: decoded.firebase.sign_in_provider });
  
  res.json({ success: true, redirect });
});
```

### Step 2 — Relay Iframe Pattern

```html
<!-- relay.headysystems.com — hosted once, iframed by all 9 sites -->
<script>
  // Receive token from auth domain
  window.addEventListener('message', async (event) => {
    if (!event.origin.endsWith('.headysystems.com')) return;
    const { type, token, nonce } = event.data;
    
    if (type === 'heady:auth:token') {
      // Validate nonce (prevents replay attacks)
      if (!validateNonce(nonce)) return;
      
      // Sign into Firebase on this domain
      await signInWithCustomToken(auth, token);
      
      // Emit auth changed event for reactive UI
      window.dispatchEvent(new CustomEvent('heady:auth:changed', {
        detail: { user: auth.currentUser }
      }));
    }
  });
</script>
```

### Step 3 — Auth Widget (embed in ALL 9 sites)

```javascript
// packages/auth-widget/auth-widget.js
class HeadyAuthWidget extends HTMLElement {
  connectedCallback() {
    this.render();
    window.addEventListener('heady:auth:changed', () => this.render());
    
    // Start relay iframe heartbeat for token refresh
    this.startRelayHeartbeat();
  }
  
  render() {
    const user = window._headyUser;
    this.innerHTML = user
      ? `<button class="auth-widget signed-in">
           <img src="${user.photoURL}" alt="${user.displayName}" />
           <span>${user.displayName}</span>
         </button>`
      : `<button class="auth-widget sign-in" 
           onclick="window.location='https://auth.headysystems.com/login?redirect='+location.href">
           Sign In
         </button>`;
  }
  
  startRelayHeartbeat() {
    // Refresh token every 30 * PHI seconds ≈ 48s
    setInterval(() => {
      document.getElementById('heady-relay-iframe')?.contentWindow
        ?.postMessage({ type: 'heady:auth:refresh' }, 'https://relay.headysystems.com');
    }, Math.round(30000 * 1.618));
  }
}
customElements.define('heady-auth-widget', HeadyAuthWidget);
```

### Step 4 — Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Public content readable by all authenticated users
    match /public/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

### Step 5 — Anonymous Rate Limiting

```javascript
// Prevent anonymous sign-in abuse
const ANON_RATE_LIMIT = new Map(); // IP → { count, windowStart }
const ANON_MAX_PER_HOUR = 5;

function checkAnonymousRateLimit(ip) {
  const now = Date.now();
  const entry = ANON_RATE_LIMIT.get(ip) || { count: 0, windowStart: now };
  
  if (now - entry.windowStart > 3600_000) {
    // Reset window
    ANON_RATE_LIMIT.set(ip, { count: 1, windowStart: now });
    return true;
  }
  
  if (entry.count >= ANON_MAX_PER_HOUR) return false;
  
  ANON_RATE_LIMIT.set(ip, { ...entry, count: entry.count + 1 });
  return true;
}
```

## Environment Variables

```
FIREBASE_PROJECT_ID=gen-lang-client-0920560496
FIREBASE_SERVICE_ACCOUNT_KEY=<path to JSON key>
AUTH_COOKIE_SECRET=<strong random secret>
ALLOWED_REDIRECT_DOMAINS=headyme.com,headysystems.com,...
```

## References

- Firebase project: `gen-lang-client-0920560496`
- [Firebase Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase Extensions](https://firebase.google.com/docs/extensions)
- Auth service: `auth.headysystems.com` (port 443, Cloud Run)
