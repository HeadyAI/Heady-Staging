# 🚀 Heady™ — Build & Deploy Your Website & App

> Everything your buddy needs to go from zero to live using the Heady™ platform.
> Last updated: 2026-03-08

---

## What You'll Get

| Surface | What It Creates |
|---------|-----------------|
| **Website** | A production-grade site on your own domain (e.g. `yourname.headyme.com` or a custom domain) via Cloudflare |
| **Web App** | A full-stack Next.js app with auth, AI chat (HeadyBuddy), and dashboard — deployed on Cloud Run |
| **AI-Powered** | HeadyBuddy chat widget, MCP tools, vector memory, and multi-model AI gateway included out of the box |
| **Heady IDE** | Code, refactor, and battle-validate inside VS Code or the online HeadyAI-IDE |

---

## Prerequisites

| Requirement | How to Get It |
|-------------|---------------|
| **Node.js 20+** | `nvm install 20` or [nodejs.org](https://nodejs.org) |
| **pnpm** | `npm install -g pnpm@latest` |
| **Git** | `sudo apt install git` or [git-scm.com](https://git-scm.com) |
| **Heady API Key** | Ask Eric — key format: `hdy_xxxxxxxx_xxxxx...` |
| **Google Cloud account** *(for app deploy)* | [cloud.google.com](https://cloud.google.com) — free tier works |
| **Cloudflare account** *(for website deploy)* | [cloudflare.com](https://cloudflare.com) — free tier works |
| **Docker** *(optional, for local containers)* | [docker.com](https://docker.com) |

---

## Quick Paths

Pick the path that matches your goal:

| Goal | Path |
|------|------|
| I just want a **static website** | [Path A → Website](#path-a--static-website) |
| I want a **full web app** with auth + AI | [Path B → Web App](#path-b--full-web-app) |
| I want **both** | Do Path A then Path B |

---

## Path A — Static Website

### A1. Clone the Monorepo

```bash
git clone https://github.com/HeadyMe/Heady-pre-production-9f2f0642.git heady
cd heady
pnpm install
```

### A2. Choose Your Template

Copy the UI template as your starting point:

```bash
cp -r templates/template-heady-ui my-site
cd my-site
pnpm install
```

This gives you:

- React 18 shell with Heady™ branding
- WebSocket-connected telemetry (optional)
- Webpack build configured for production
- Dockerfile for containerized deploy

### A3. Customize

Edit the files in `my-site/src/`:

| File | Purpose |
|------|---------|
| `src/App.jsx` | Your main component — replace the placeholder content with your own |
| `src/App.css` | Styling — Heady's dark theme is pre-configured |
| `public/index.html` | Page shell, title, meta tags |
| `server.js` | Express production server |

**Example: Replace the placeholder content in `App.jsx`:**

```jsx
const App = () => {
    return (
        <div className="heady-shell">
            <header className="heady-header">
                <h1>My Awesome Site</h1>
            </header>
            <main className="heady-content">
                <h2>Welcome!</h2>
                <p>Built with Heady™ Liquid Architecture.</p>
                {/* Add your sections, gallery, portfolio, etc. */}
            </main>
            <footer className="heady-footer">
                <p>© 2026 My Name — Powered by Heady™</p>
            </footer>
        </div>
    );
};
```

### A4. Test Locally

```bash
pnpm dev
# → Opens at http://localhost:3000
```

### A5. Deploy to Cloudflare Workers (Free Tier)

**Option 1: Using Wrangler CLI**

```bash
# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Build production bundle
pnpm build

# Create a worker project
wrangler init my-site-worker --type javascript

# Deploy
wrangler deploy
```

**Option 2: Deploy to Cloud Run (Google Cloud)**

```bash
# Build the container
pnpm build

# Deploy directly from source
gcloud run deploy my-site \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --quiet
```

The URL will be printed: `https://my-site-XXXX-uc.a.run.app`

---

## Path B — Full Web App

### B1. Clone the Monorepo

*(Skip if already done in Path A)*

```bash
git clone https://github.com/HeadyMe/Heady-pre-production-9f2f0642.git heady
cd heady
pnpm install
```

### B2. Use the Onboarding App Template

The `services/heady-onboarding/` directory is a **complete production Next.js app** with:

- ✅ 25+ OAuth providers (Google, GitHub, HuggingFace, etc.)
- ✅ 5-stage onboarding flow
- ✅ HeadyBuddy AI chat widget
- ✅ Prisma database with user management
- ✅ API routes for brain/chat endpoint
- ✅ Tailwind CSS styling
- ✅ Docker-ready

Copy it as your app base:

```bash
cp -r services/heady-onboarding my-app
cd my-app
```

### B3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
DATABASE_URL=postgres://user:pass@host:5432/myapp
NEXTAUTH_SECRET=generate-a-random-32-char-string
NEXTAUTH_URL=https://your-app.run.app

# OAuth (add at least one)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret

# Heady AI (for HeadyBuddy chat)
HEADY_API_KEY=hdy_your_api_key
GROQ_API_KEY=your-groq-key          # Free at console.groq.com
GOOGLE_API_KEY=your-gemini-key       # Free at aistudio.google.com
```

### B4. Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to your database
npx prisma db push
```

> **Free PostgreSQL options:**
>
> - [Neon](https://neon.tech) — free tier, serverless PostgreSQL
> - [Supabase](https://supabase.com) — free tier with dashboard
> - [Railway](https://railway.app) — free PostgreSQL instances

### B5. Install & Run Locally

```bash
npm install
npm run dev
# → Opens at http://localhost:3000
```

### B6. Deploy to Google Cloud Run

```bash
# One-command deploy from source
gcloud run deploy my-app \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=your-db-url,NEXTAUTH_SECRET=your-secret" \
  --min-instances 0 \
  --max-instances 3 \
  --quiet
```

Your live URL: `https://my-app-XXXX-ue.a.run.app`

### B7. Connect a Custom Domain (Optional)

1. Add your domain to Cloudflare (free)
2. Create a CNAME record pointing to the Cloud Run URL
3. Set up SSL (automatic through Cloudflare)
4. Update `NEXTAUTH_URL` in Cloud Run env vars to your domain

---

## 🤖 Add HeadyBuddy AI Chat to Any Page

Drop this snippet into any HTML page to add the AI chat widget:

```html
<!-- HeadyBuddy Chat Widget -->
<script>
  window.__HEADY_CONFIG__ = {
    apiKey: 'hdy_YOUR_API_KEY',
    position: 'bottom-right',
    theme: 'dark',
    greeting: 'Hey! I\'m HeadyBuddy. How can I help?'
  };
</script>
<script src="https://headybuddy.org/widget.js" async></script>
```

---

## 🛠️ Heady Developer Tools

### VS Code Extension

```bash
# Install the Heady AI extension
code --install-extension heady-ai-1.1.0.vsix
```

- `Ctrl+Shift+H` — Open Heady Chat
- Right-click code → **Heady: Explain / Refactor / Battle-Validate**

### SDK for Programmatic Access

```bash
npm install @heady-ai/sdk
```

```javascript
const { HeadyClient } = require('@heady-ai/sdk');
const heady = new HeadyClient('hdy_YOUR_API_KEY');

// AI completion
const answer = await heady.chat('Build me a landing page for a coffee shop');

// Store to vector memory
await heady.callTool('memory.store', {
  userId: 'my-user',
  embedding: [0.1, 0.2, ...],
  metadata: { topic: 'coffee-shop' }
});
```

### MCP Server (for AI tool integration)

```bash
npm install @heady-ai/mcp-server
```

Works with VS Code, Cursor, Windsurf, and any MCP-compatible IDE.

---

## Available AI Models

| Model | Speed | Best For | Tier |
|-------|-------|----------|------|
| `heady-flash` | ⚡ ~1s | Quick answers, code gen | Free |
| `heady-edge` | 🌐 <200ms | Ultra-low latency | Free |
| `heady-buddy` | 🤝 ~3s | Memory-aware companion | Pro |
| `heady-reason` | 🧠 ~10s | Deep analysis | Premium |
| `heady-battle-v1` | 🏆 ~30s | 20-node arena competition | Premium |

---

## Project Structure Cheat Sheet

```
your-project/
├── src/                  # Your source code
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   └── lib/              # Utilities, auth config
├── public/               # Static assets (images, fonts)
├── prisma/               # Database schema
├── .env                  # Environment variables (DON'T commit)
├── package.json          # Dependencies & scripts
├── Dockerfile            # Container build
└── next.config.js        # Next.js configuration
```

---

## Heady Platform URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Onboarding + Auth | `https://heady-onboarding-bf4q4zywhq-ue.a.run.app` | Sign up, login |
| HeadyAI IDE | `https://heady-ide-bf4q4zywhq-ue.a.run.app` | Online code editor |
| HeadyMCP | `https://headymcp.com` | MCP tools dashboard |
| HeadyAPI | `https://headyapi.com` | API gateway |
| HeadyIO Docs | `https://headyio.com` | Developer docs |
| HeadySystems | `https://headysystems.com` | Company site |
| HeadyBuddy | `https://headybuddy.org` | AI companion |

---

## Common Commands

```bash
# Development
pnpm dev                # Start dev server
pnpm build              # Production build
pnpm test               # Run tests

# Deployment
gcloud run deploy my-app --source . --region us-east1 --allow-unauthenticated
wrangler deploy         # Deploy to Cloudflare Workers

# Docker
docker build -t my-app .
docker run -p 3000:3000 --env-file .env my-app

# Database
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes
npx prisma studio       # Visual database editor
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `pnpm install` fails | Run `corepack enable` first, then retry |
| Database connection error | Check `DATABASE_URL` in `.env` — format: `postgres://user:pass@host:5432/dbname` |
| OAuth callback error | Ensure `NEXTAUTH_URL` matches your deployed URL exactly |
| Build fails on Cloud Run | Check you have a `Dockerfile` or `package.json` with `build` and `start` scripts |
| HeadyBuddy not responding | Verify `HEADY_API_KEY` is set correctly |
| `gcloud` not found | Install: `curl <https://sdk.cloud.google.com> | bash` |

---

## Support

- 📧 [eric@headyconnection.org](mailto:eric@headyconnection.org)
- 🌐 [headysystems.com](https://headysystems.com)
- 🐙 [github.com/HeadyMe](https://github.com/HeadyMe)
- 📖 [headyio.com](https://headyio.com) — Developer Docs

---

*© 2026 HeadySystems Inc. — Sacred Geometry :: Organic Systems :: 60+ Provisional Patents*
