const fs = require('fs');
const path = require('path');

const domains = [
  { id: 'headyme', domain: 'headyme.com', title: 'HeadyMe', desc: 'Command center — primary user-facing dashboard and control hub' },
  { id: 'headysystems', domain: 'headysystems.com', title: 'HeadySystems', desc: 'Core architecture — system documentation, API reference, developer portal' },
  { id: 'heady-ai', domain: 'heady-ai.com', title: 'Heady AI', desc: 'Intelligence hub — AI capabilities showcase, model playground, research' },
  { id: 'headyos', domain: 'headyos.com', title: 'HeadyOS', desc: 'OS interface — interactive HeadyLatentOS management and monitoring' },
  { id: 'headyconnection-org', domain: 'headyconnection.org', title: 'HeadyConnection (Org)', desc: 'Nonprofit — community outreach, education, mission, impact reporting' },
  { id: 'headyconnection-com', domain: 'headyconnection.com', title: 'HeadyConnection', desc: 'Community — user forums, collaboration spaces, knowledge sharing' },
  { id: 'headyex', domain: 'headyex.com', title: 'HeadyEx', desc: 'Exchange — marketplace for models, plugins, templates, and integrations' },
  { id: 'headyfinance', domain: 'headyfinance.com', title: 'HeadyFinance', desc: 'Finance — billing, subscriptions, usage analytics, cost management' },
  { id: 'admin-headysystems', domain: 'admin.headysystems.com', title: 'Heady Admin', desc: 'Admin — system administration, user management, global configuration' },
  { id: 'headyio', domain: 'headyio.com', title: 'HeadyIO', desc: 'Core API Gateway and Developer Interface' },
  { id: 'headyweb', domain: 'headyweb.com', title: 'HeadyWeb', desc: 'Web platform and frontend delivery network' }
];

const generateHtml = (site) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.title} — ${site.desc}</title>
    <meta name="description" content="${site.desc}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-card: #16161f;
            --bg-card-hover: #1c1c28;
            --bg-code: #0d0d14;
            --border: #1e1e2e;
            --border-accent: #2a2a3e;
            --text-primary: #e8e8f0;
            --text-secondary: #9898b0;
            --text-muted: #6868a0;
            --accent: #6366f1;
            --accent-bright: #818cf8;
            --accent-glow: rgba(99, 102, 241, 0.15);
            --accent-2: #06b6d4;
            --accent-3: #a855f7;
            --accent-4: #22c55e;
            --accent-5: #f59e0b;
            --accent-6: #ef4444;
            --gold: #fbbf24;
            --phi: 1.618;
            --radius: 12px;
            --radius-lg: 16px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
            scroll-padding-top: 80px;
        }

        body {
            font-family: 'Inter', -apple-system, system-ui, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            overflow-x: hidden;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        code, pre {
            font-family: 'JetBrains Mono', monospace;
        }

        /* ─── Nav ───────────────────────────────────────── */
        nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            backdrop-filter: blur(20px) saturate(180%);
            background: rgba(10, 10, 15, 0.82);
            border-bottom: 1px solid var(--border);
            padding: 0 2rem;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 800;
            font-size: 1.1rem;
            letter-spacing: -0.02em;
            text-decoration: none;
            color: var(--text-primary);
        }

        .nav-brand img.logo-img {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            object-fit: contain;
        }

        .nav-brand span {
            color: var(--accent-bright);
        }

        .nav-links {
            display: flex;
            gap: 2rem;
            align-items: center;
        }

        .nav-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: color 0.2s;
        }

        .nav-links a:hover, .nav-links a.active {
            color: var(--text-primary);
        }

        .nav-links .btn-nav {
            padding: 8px 18px;
            border-radius: 8px;
            font-size: 0.82rem;
            background: var(--accent);
            color: white;
            font-weight: 600;
            transition: all 0.2s;
        }

        .nav-links .btn-nav:hover {
            background: var(--accent-bright);
            transform: translateY(-1px);
        }

        .page-wrapper {
            position: relative;
            z-index: 1;
            flex: 1;
            display: flex;
            flex-direction: column;
            padding-top: 64px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            width: 100%;
        }

        .hero {
            padding-top: 80px;
            padding-bottom: 80px;
            text-align: center;
            position: relative;
        }

        .hero h1 {
            font-size: clamp(2.5rem, 5.5vw, 4rem);
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: -0.03em;
            margin-bottom: 20px;
            background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-bright) 50%, var(--accent-2) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .hero p {
            font-size: 1.15rem;
            color: var(--text-secondary);
            max-width: 620px;
            margin: 0 auto 36px;
        }

        .hero-actions {
            display: flex;
            gap: 14px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 12px 28px;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.25s;
            border: none;
            cursor: pointer;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--accent), var(--accent-3));
            color: white;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4);
        }

        .btn-secondary {
            background: var(--bg-card);
            color: var(--text-primary);
            border: 1px solid var(--border-accent);
        }

        .btn-secondary:hover {
            background: var(--bg-card-hover);
            border-color: var(--accent);
        }

        /* ─── Docs Layout ───────────────────────────────────────── */
        .docs-layout {
            display: flex;
            gap: 40px;
            padding: 40px 0;
            flex: 1;
        }

        .docs-sidebar {
            width: 280px;
            flex-shrink: 0;
            position: sticky;
            top: 104px;
            height: calc(100vh - 104px);
            overflow-y: auto;
            padding-right: 20px;
            border-right: 1px solid var(--border);
        }

        .docs-sidebar h3 {
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 16px;
            margin-top: 32px;
        }

        .docs-sidebar h3:first-child {
            margin-top: 0;
        }

        .docs-sidebar ul {
            list-style: none;
        }

        .docs-sidebar li {
            margin-bottom: 8px;
        }

        .docs-sidebar a {
            display: block;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            padding: 8px 12px;
            border-radius: 6px;
            transition: all 0.2s;
            border-left: 2px solid transparent;
        }

        .docs-sidebar a:hover {
            color: var(--text-primary);
            background: var(--bg-card);
        }

        .docs-sidebar a.active {
            color: var(--accent-bright);
            background: rgba(99, 102, 241, 0.1);
            border-left-color: var(--accent);
        }

        .docs-content {
            flex: 1;
            min-width: 0;
            max-width: 800px;
            padding-bottom: 100px;
        }

        .docs-content section {
            margin-bottom: 60px;
            scroll-margin-top: 100px;
        }

        .section-label {
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--accent-bright);
            margin-bottom: 12px;
        }

        .docs-content h2 {
            font-size: 2.2rem;
            font-weight: 800;
            margin-bottom: 24px;
            letter-spacing: -0.02em;
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
        }

        .docs-content h3 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 40px;
            margin-bottom: 16px;
        }

        .docs-content p {
            margin-bottom: 20px;
            font-size: 1.05rem;
            color: var(--text-secondary);
            line-height: 1.8;
        }

        .docs-content ul, .docs-content ol {
            margin-bottom: 24px;
            padding-left: 24px;
            color: var(--text-secondary);
        }

        .docs-content li {
            margin-bottom: 10px;
        }

        .docs-content code {
            background: rgba(99, 102, 241, 0.1);
            color: var(--accent-bright);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .docs-content pre {
            background: var(--bg-code);
            padding: 20px;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            overflow-x: auto;
            margin-bottom: 24px;
        }

        .docs-content pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }

        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
            margin-bottom: 40px;
        }

        .feature-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            transition: all 0.25s;
        }

        .feature-card:hover {
            border-color: var(--accent);
            transform: translateY(-4px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .feature-card h4 {
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 12px;
            color: var(--text-primary);
        }

        .feature-card p {
            font-size: 0.9rem;
            margin-bottom: 0;
        }

        /* ─── Endpoints Table ──────────────────────────────── */
        .server-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }

        .server-table th {
            text-align: left;
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 16px;
            border-bottom: 2px solid var(--border);
        }

        .server-table td {
            padding: 16px;
            border-bottom: 1px solid var(--border);
            font-size: 0.95rem;
            color: var(--text-secondary);
        }

        .server-table tr:hover td {
            background: var(--bg-card);
        }

        .server-table a {
            color: var(--accent-bright);
            text-decoration: none;
            font-weight: 500;
        }

        .server-table a:hover {
            text-decoration: underline;
        }

        /* ─── Footer ───────────────────────────────────────── */
        footer {
            padding: 60px 0;
            border-top: 1px solid var(--border);
            background: var(--bg-primary);
            margin-top: auto;
        }

        .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 40px;
            margin-bottom: 40px;
        }

        .footer-col h4 {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .footer-col ul {
            list-style: none;
        }

        .footer-col li {
            margin-bottom: 12px;
        }

        .footer-col a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            transition: color 0.2s;
        }

        .footer-col a:hover {
            color: var(--accent-bright);
        }

        .footer-bottom {
            text-align: center;
            padding-top: 30px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        /* ─── Responsive ───────────────────────────────────── */
        @media (max-width: 900px) {
            .docs-layout {
                flex-direction: column;
            }
            .docs-sidebar {
                width: 100%;
                height: auto;
                position: static;
                border-right: none;
                border-bottom: 1px solid var(--border);
                padding-bottom: 20px;
                margin-bottom: 40px;
            }
            .nav-links {
                display: none;
            }
        }
    </style>
</head>
<body>
    <nav>
        <a href="https://${site.domain}" class="nav-brand">
            <div class="logo-icon">H</div>
            Heady<span>${site.title.replace('Heady', '')}</span>
        </a>
        <div class="nav-links">
            <a href="#overview" class="active">Overview</a>
            <a href="#architecture">Architecture</a>
            <a href="#api">API Reference</a>
            <a href="#ecosystem">Ecosystem</a>
            <a href="https://headysystems.com" class="btn-nav">Heady Platform →</a>
        </div>
    </nav>

    <div class="page-wrapper">
        <section class="hero">
            <div class="container">
                <h1>${site.title}</h1>
                <p>${site.desc}</p>
                <div class="hero-actions">
                    <a href="#docs-start" class="btn btn-primary">Read Documentation →</a>
                    <a href="#api" class="btn btn-secondary">API Reference</a>
                </div>
            </div>
        </section>

        <div class="container">
            <div class="docs-layout" id="docs-start">
                <aside class="docs-sidebar">
                    <h3>Getting Started</h3>
                    <ul>
                        <li><a href="#overview" class="nav-item">Overview</a></li>
                        <li><a href="#quickstart" class="nav-item">Quickstart</a></li>
                        <li><a href="#installation" class="nav-item">Installation</a></li>
                    </ul>

                    <h3>Core Concepts</h3>
                    <ul>
                        <li><a href="#architecture" class="nav-item">Architecture</a></li>
                        <li><a href="#data-model" class="nav-item">Data Model</a></li>
                        <li><a href="#security" class="nav-item">Security</a></li>
                    </ul>

                    <h3>Integration</h3>
                    <ul>
                        <li><a href="#api" class="nav-item">API Reference</a></li>
                        <li><a href="#webhooks" class="nav-item">Webhooks</a></li>
                        <li><a href="#sdks" class="nav-item">Client SDKs</a></li>
                    </ul>

                    <h3>Ecosystem</h3>
                    <ul>
                        <li><a href="#ecosystem" class="nav-item">Heady Network</a></li>
                        <li><a href="#support" class="nav-item">Support</a></li>
                    </ul>
                </aside>

                <main class="docs-content">
                    <section id="overview">
                        <div class="section-label">Overview</div>
                        <h2>Introduction to ${site.title}</h2>
                        <p>Welcome to the official documentation for <strong>${site.title}</strong>. This platform serves as the ${site.desc.toLowerCase()}. It is a core component of the broader Heady ecosystem, built on principles of sacred geometry, organic systems, and breathing interfaces.</p>

                        <p>Our infrastructure is designed to provide unparalleled performance, security, and scalability. By deeply integrating with the Heady Model Context Protocol (MCP) and the HCFullPipeline, ${site.title} ensures seamless operation across all layers of the stack.</p>

                        <div class="card-grid">
                            <div class="feature-card">
                                <h4>High Performance</h4>
                                <p>Built on top of Cloudflare edge network and Google Kubernetes Engine for sub-millisecond latency.</p>
                            </div>
                            <div class="feature-card">
                                <h4>Brain-Aware</h4>
                                <p>Fully integrated with the HeadyBrain orchestrator for intelligent, context-aware routing.</p>
                            </div>
                            <div class="feature-card">
                                <h4>Zero Trust Security</h4>
                                <p>Continuous authentication and Continuous Security Posture Management (CSPM) enforced at every node.</p>
                            </div>
                        </div>
                    </section>

                    <section id="architecture">
                        <div class="section-label">Architecture</div>
                        <h2>System Architecture</h2>
                        <p>${site.title} utilizes a microservices-based architecture deployed across multiple global regions. The system is conceptually divided into several key layers:</p>

                        <ul>
                            <li><strong>Edge Layer:</strong> Handles global routing, DDoS protection, and TLS termination via Cloudflare.</li>
                            <li><strong>Gateway Layer:</strong> API Gateway that validates requests, enforces rate limits, and performs JWT verification.</li>
                            <li><strong>Orchestration Layer:</strong> The HCSysOrchestrator manages the flow of data between services based on cognitive load and system health.</li>
                            <li><strong>Service Layer:</strong> The core business logic specific to ${site.domain}.</li>
                            <li><strong>Data Layer:</strong> Distributed Postgres databases with real-time replication and vector stores for AI embeddings.</li>
                        </ul>

                        <pre><code>// Architecture Topology
const topology = {
  edge: 'cloudflare-workers',
  gateway: 'envoy-proxy',
  orchestrator: 'hcsys-orchestrator',
  compute: 'gke-clusters',
  storage: ['postgres', 'redis-cluster', 'qdrant-vector']
};</code></pre>
                    </section>

                    <section id="api">
                        <div class="section-label">Integration</div>
                        <h2>API Reference</h2>
                        <p>Interact with ${site.title} programmatically using our REST and MCP APIs. All endpoints require authentication via a standard Bearer token.</p>

                        <h3>Authentication</h3>
                        <p>Include your API key in the Authorization header of your requests:</p>
                        <pre><code>curl -H "Authorization: Bearer hdy_your_api_key" https://api.${site.domain}/v1/status</code></pre>

                        <h3>Common Endpoints</h3>
                        <table class="server-table">
                            <thead>
                                <tr>
                                    <th>Endpoint</th>
                                    <th>Method</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>/v1/health</code></td>
                                    <td>GET</td>
                                    <td>Returns the current health status of the service cluster.</td>
                                </tr>
                                <tr>
                                    <td><code>/v1/metrics</code></td>
                                    <td>GET</td>
                                    <td>Provides Prometheus-formatted metrics for monitoring.</td>
                                </tr>
                                <tr>
                                    <td><code>/v1/sync</code></td>
                                    <td>POST</td>
                                    <td>Triggers a synchronization event with the Heady Registry.</td>
                                </tr>
                                <tr>
                                    <td><code>/mcp/connect</code></td>
                                    <td>WS</td>
                                    <td>Establishes a WebSocket connection for real-time MCP streaming.</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section id="ecosystem">
                        <div class="section-label">Ecosystem</div>
                        <h2>The Heady Network</h2>
                        <p>${site.title} is just one piece of the puzzle. Explore the rest of the Heady ecosystem to see how our platforms connect.</p>

                        <table class="server-table">
                            <thead>
                                <tr>
                                    <th>Platform</th>
                                    <th>Domain</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${domains.map(d => `
                                <tr>
                                    <td><strong>${d.title}</strong></td>
                                    <td><a href="https://${d.domain}">${d.domain}</a></td>
                                    <td>${d.desc}</td>
                                </tr>
                                `).join('')}
                                <tr>
                                    <td><strong>HeadyMCP</strong></td>
                                    <td><a href="https://headymcp.com">headymcp.com</a></td>
                                    <td>Model Context Protocol Documentation</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </main>
            </div>
        </div>
    </div>

    <footer>
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <h4>Core Platforms</h4>
                    <ul>
                        <li><a href="https://headysystems.com">HeadySystems</a></li>
                        <li><a href="https://headyio.com">HeadyIO</a></li>
                        <li><a href="https://headyme.com">HeadyMe</a></li>
                        <li><a href="https://headyweb.com">HeadyWeb</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Intelligence</h4>
                    <ul>
                        <li><a href="https://heady-ai.com">Heady AI</a></li>
                        <li><a href="https://headymcp.com">HeadyMCP</a></li>
                        <li><a href="https://headyos.com">HeadyOS</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Community & Commerce</h4>
                    <ul>
                        <li><a href="https://headyconnection.org">HeadyConnection (Org)</a></li>
                        <li><a href="https://headyconnection.com">HeadyConnection (Community)</a></li>
                        <li><a href="https://headyex.com">HeadyEx Exchange</a></li>
                        <li><a href="https://headyfinance.com">HeadyFinance</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Admin</h4>
                    <ul>
                        <li><a href="https://admin.headysystems.com">System Admin</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2026 Heady Systems Inc. · <a href="https://headysystems.com">headysystems.com</a> · ∞ Sacred Geometry · Organic Systems · Breathing Interfaces</p>
            </div>
        </div>
    </footer>

    <script>
        // Smooth scroll for nav and sidebar links
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                const target = document.querySelector(a.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    // Update active state
                    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                    if (a.classList.contains('nav-item')) {
                        a.classList.add('active');
                    }
                }
            });
        });

        // Intersection Observer for highlighting sidebar based on scroll position
        const sections = document.querySelectorAll('.docs-content section');
        const navItems = document.querySelectorAll('.docs-sidebar .nav-item');

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.3
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navItems.forEach(item => {
                        item.classList.remove('active');
                        if (item.getAttribute('href') === '#' + id) {
                            item.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    </script>
</body>
</html>`;

const generateEleventyConfig = (site) => `// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: websites/sites/${site.domain}/.eleventy.js
// ║  LAYER: root                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
module.exports = function(eleventyConfig) {
  // ${site.title} specific config
  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};`;

const sitesDir = path.join(__dirname, 'sites');

if (!fs.existsSync(sitesDir)) {
    fs.mkdirSync(sitesDir, { recursive: true });
}

domains.forEach(site => {
    const siteDir = path.join(sitesDir, site.domain);
    if (!fs.existsSync(siteDir)) {
        fs.mkdirSync(siteDir, { recursive: true });
    }

    const indexPath = path.join(siteDir, 'index.html');
    fs.writeFileSync(indexPath, generateHtml(site));
    console.log(`Generated: ${indexPath}`);

    const configPath = path.join(siteDir, '.eleventy.js');
    fs.writeFileSync(configPath, generateEleventyConfig(site));
    console.log(`Generated: ${configPath}`);
});

console.log('Site generation complete.');
