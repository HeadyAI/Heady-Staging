// Cloudflare Worker for headyio - headyio.com
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Route to appropriate handler
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, url, 'headyio');
    }
    
    return handleStatic(request, url, 'headyio', 'headyio.com');
  }
};

async function handleAPI(request, url, domain) {
  const path = url.pathname;
  
  // API endpoints
  if (path === '/api/health') {
    return Response.json({
      status: 'ok',
      service: domain,
      domain: 'headyio.com',
      timestamp: Date.now(),
      version: '1.0.0',
      deployment: 'cloudflare-workers',
      hcfp_managed: true
    });
  }
  
  if (path === '/api/info') {
    return Response.json({
      service: domain,
      domain: 'headyio.com',
      description: getServiceDescription(domain),
      features: getServiceFeatures(domain),
      endpoints: ['/api/health', '/api/info'],
      hcfp_auto_deploy: true
    });
  }
  
  return new Response('API endpoint not found', { status: 404 });
}

async function handleStatic(request, url, domain, fqdn) {
  const content = getStaticContent(domain, fqdn);
  
  return new Response(content, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
      'X-Heady-Service': domain,
      'X-Heady-Domain': fqdn,
      'X-Heady-Version': '1.0.0',
      'X-HCFP-Managed': 'true',
      'X-Deployment': 'cloudflare-workers'
    }
  });
}

function getServiceDescription(domain) {
  const descriptions = {
    'headybuddy': 'AI Companion & Cross-Device Launcher',
    'headysystems': 'Commercial Platform & System Hub',
    'headyconnection': 'Nonprofit Mission Platform',
    'headymcp': 'Model Context Protocol Server',
    'headyio': 'Developer Platform & Tools',
    'headyme': 'Personal Cloud & Identity'
  };
  return descriptions[domain] || 'Heady Systems Service';
}

function getServiceFeatures(domain) {
  const features = {
    'headybuddy': ['Cross-device sync', 'AI assistance', 'Context awareness', 'HCFP auto-deploy'],
    'headysystems': ['API gateway', 'System monitoring', 'Cross-domain routing', 'Enterprise features'],
    'headyconnection': ['Nonprofit tools', 'Community features', 'Mission tracking', 'Donation management'],
    'headymcp': ['MCP protocol', 'Model serving', 'API integration', 'Developer tools'],
    'headyio': ['Developer resources', 'Documentation', 'Tools & SDKs', 'Community'],
    'headyme': ['Personal identity', 'Data storage', 'Cross-device sync', 'Privacy features']
  };
  return features[domain] || ['Heady ecosystem integration'];
}

function getStaticContent(domain, fqdn) {
  const colors = {
    'headybuddy': { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', logo: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)', button: '#3b82f6' },
    'headysystems': { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', logo: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', button: '#7c3aed' },
    'headyconnection': { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', logo: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', button: '#059669' },
    'headymcp': { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', logo: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', button: '#dc2626' },
    'headyio': { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', logo: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', button: '#ea580c' },
    'headyme': { bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', logo: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', button: '#0891b2' }
  };
  
  const color = colors[domain] || colors['headysystems'];
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${domain} - Heady Systems</title>
    <meta name="description" content="${getServiceDescription(domain)} - Part of the Heady Systems ecosystem">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            background: ${color.bg}; 
            color: #e2e8f0; 
            min-height: 100vh; 
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 3rem; }
        .logo { 
            font-size: 3rem; 
            font-weight: bold; 
            background: ${color.logo}; 
            -webkit-background-clip: text; 
            -webkit-text-fill-color: transparent; 
            margin-bottom: 1rem; 
        }
        .nav { display: flex; justify-content: center; gap: 1rem; margin-bottom: 3rem; flex-wrap: wrap; }
        .nav button { 
            background: rgba(${color.button}, 0.2); 
            border: 1px solid ${color.button}; 
            color: ${color.button}; 
            padding: 0.75rem 1.5rem; 
            border-radius: 0.5rem; 
            cursor: pointer; 
            transition: all 0.2s; 
        }
        .nav button:hover { background: rgba(${color.button}, 0.3); transform: scale(1.05); }
        .card { 
            background: rgba(30, 41, 59, 0.8); 
            border: 1px solid #334155; 
            border-radius: 0.5rem; 
            padding: 2rem; 
            margin-bottom: 2rem; 
        }
        .status { 
            display: inline-block; 
            padding: 0.25rem 0.75rem; 
            border-radius: 0.25rem; 
            font-size: 0.875rem; 
            background: rgba(34, 197, 94, 0.2); 
            color: #22c55e; 
            margin-bottom: 1rem; 
        }
        .pulse { 
            width: 8px; 
            height: 8px; 
            background: #22c55e; 
            border-radius: 50%; 
            animation: pulse 2s infinite; 
            display: inline-block; 
            margin-right: 0.5rem; 
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .api-links { display: flex; gap: 1rem; flex-wrap: wrap; }
        .api-links a { 
            color: ${color.button}; 
            text-decoration: none; 
            padding: 0.5rem 1rem; 
            border: 1px solid ${color.button}; 
            border-radius: 0.25rem; 
            transition: all 0.2s; 
        }
        .api-links a:hover { background: rgba(${color.button}, 0.1); }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="logo">${domain}</div>
            <p>${getServiceDescription(domain)}</p>
        </header>
        
        <nav class="nav">
            <button onclick="window.open('https://headybuddy.org', '_blank')">HeadyBuddy</button>
            <button onclick="window.open('https://headysystems.com', '_blank')">HeadySystems</button>
            <button onclick="window.open('https://headyconnection.org', '_blank')">HeadyConnection</button>
            <button onclick="window.open('https://headymcp.com', '_blank')">HeadyMCP</button>
            <button onclick="window.open('https://headyio.com', '_blank')">HeadyIO</button>
            <button onclick="window.open('https://headyme.com', '_blank')">HeadyMe</button>
        </nav>
        
        <div class="card">
            <div class="status"><span class="pulse"></span>HCFP Auto-Deployed</div>
            <h2>Welcome to ${domain}</h2>
            <p>This domain is part of the Heady Systems ecosystem, providing integrated AI-powered solutions with Sacred Geometry architecture.</p>
            <p>
                <strong>Status:</strong> Production Ready<br>
                <strong>Version:</strong> 1.0.0<br>
                <strong>Domain:</strong> ${fqdn}<br>
                <strong>Deployment:</strong> Automated via HCFP<br>
                <strong>Infrastructure:</strong> Cloudflare Workers
            </p>
        </div>
        
        <div class="card">
            <h3>HCFP Integration</h3>
            <p>✅ Auto-deployment enabled</p>
            <p>✅ Health monitoring active</p>
            <p>✅ Performance optimization</p>
            <p>✅ Cross-domain navigation</p>
            <p>✅ Global edge delivery</p>
        </div>
        
        <div class="card">
            <h3>System Features</h3>
            ${getServiceFeatures(domain).map(feature => `<p>✅ ${feature}</p>`).join('')}
        </div>
        
        <div class="card">
            <h3>API Endpoints</h3>
            <div class="api-links">
                <a href="/api/health">Health Check</a>
                <a href="/api/info">Service Info</a>
                <a href="https://admin.headysystems.com">Admin Panel</a>
            </div>
        </div>
        
        <div class="card">
            <h3>Real-time Status</h3>
            <p id="status">Loading status...</p>
            <script>
                fetch('/api/health')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('status').innerHTML = 
                            'Service: ' + data.service + '<br>' +
                            'Domain: ' + data.domain + '<br>' +
                            'Uptime: ' + Math.floor((Date.now() - data.timestamp) / 1000) + 's<br>' +
                            'Deployment: ' + data.deployment;
                    })
                    .catch(error => {
                        document.getElementById('status').innerHTML = '❌ Status check failed';
                    });
                
                // Auto-refresh status
                setInterval(() => {
                    fetch('/api/health')
                        .then(response => response.json())
                        .then(data => {
                            document.getElementById('status').innerHTML = 
                                'Service: ' + data.service + '<br>' +
                                'Domain: ' + data.domain + '<br>' +
                                'Uptime: ' + Math.floor((Date.now() - data.timestamp) / 1000) + 's<br>' +
                                'Deployment: ' + data.deployment;
                        });
                }, 30000);
            </script>
        </div>
    </div>
</body>
</html>`;
}
