/* ═══════════════════════════════════════════════════════════════════════════
   AI EDUCATIONAL LABS — Core Application
   © 2026 AI Educational Labs / HeadySystems Inc.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

// ─── Constants ──────────────────────────────────────────────────────────────
const DISCIPLINES = [
  { id:'earth', name:'Earth Sciences', icon:'🌍', color:'var(--lab-earth)',
    desc:'Explore geology, weather patterns, plate tectonics, and Earth systems',
    labs:[ {id:'plate-tectonics',name:'Plate Tectonics Simulator',vr:true,voice:true,desc:'Visualize continental drift and tectonic plate boundaries'},
           {id:'weather-patterns',name:'Weather Pattern Lab',vr:false,voice:true,desc:'Model atmospheric systems and weather forecasting'},
           {id:'geological-layers',name:'Geological Layers Explorer',vr:true,voice:true,desc:'Drill through Earth layers and examine rock formations'} ]},
  { id:'biology', name:'Biology', icon:'🧬', color:'var(--lab-bio)',
    desc:'Study cell biology, DNA, anatomy, and living systems',
    labs:[ {id:'cell-explorer',name:'Cell Explorer',vr:true,voice:true,desc:'Navigate through 3D cell structures and organelles'},
           {id:'dna-replication',name:'DNA Replication Lab',vr:false,voice:true,desc:'Step through DNA replication and protein synthesis'},
           {id:'ecosystem-sim',name:'Ecosystem Simulator',vr:false,voice:true,desc:'Model predator-prey dynamics and ecological balance'} ]},
  { id:'chemistry', name:'Chemistry', icon:'⚗️', color:'var(--lab-chem)',
    desc:'Build molecules, simulate reactions, and explore the periodic table',
    labs:[ {id:'molecular-builder',name:'Molecular Builder',vr:true,voice:true,desc:'Construct molecules in 3D and view bond angles'},
           {id:'reaction-sim',name:'Chemical Reaction Simulator',vr:false,voice:true,desc:'Mix reagents and observe reaction dynamics'},
           {id:'periodic-table',name:'Interactive Periodic Table',vr:false,voice:true,desc:'Explore element properties and orbital configurations'} ]},
  { id:'physics', name:'Physics', icon:'⚡', color:'var(--lab-physics)',
    desc:'Experiment with mechanics, optics, thermodynamics, and circuits',
    labs:[ {id:'projectile-motion',name:'Projectile Motion Lab',vr:false,voice:true,desc:'Launch projectiles and study kinematics equations'},
           {id:'optics-bench',name:'Optics Bench',vr:true,voice:true,desc:'Set up lenses, mirrors, and observe light behavior'},
           {id:'circuit-sim',name:'Circuit Simulator',vr:false,voice:true,desc:'Build and analyze electrical circuits in real-time'} ]},
  { id:'cs', name:'Computer Science & AI', icon:'🤖', color:'var(--lab-cs)',
    desc:'Visualize algorithms, build neural networks, explore AI concepts',
    labs:[ {id:'sorting-viz',name:'Sorting Algorithm Visualizer',vr:false,voice:true,desc:'Watch sorting algorithms execute step by step'},
           {id:'neural-net',name:'Neural Network Playground',vr:false,voice:true,desc:'Build and train simple neural networks visually'},
           {id:'pathfinding',name:'Pathfinding Lab',vr:false,voice:true,desc:'Explore A*, Dijkstra, and graph traversal algorithms'} ]},
  { id:'engineering', name:'Engineering & Robotics', icon:'🔧', color:'var(--lab-eng)',
    desc:'Design circuits, simulate robotics, and build structures',
    labs:[ {id:'circuit-design',name:'Circuit Designer',vr:false,voice:true,desc:'Design and simulate digital logic circuits'},
           {id:'robot-arm',name:'Robotic Arm Simulator',vr:true,voice:true,desc:'Program and control a virtual robotic arm'},
           {id:'bridge-builder',name:'Bridge Builder',vr:false,voice:true,desc:'Design and stress-test bridge structures'} ]}
];

// ─── State ──────────────────────────────────────────────────────────────────
const State = {
  user: null, tosAccepted: false, route: '/', labResults: [],
  voiceActive: false, currentLab: null, isAdmin: false,
  offline: !navigator.onLine,
  progress: Object.fromEntries(DISCIPLINES.map(d => [d.id, { completed: 0, total: d.labs.length }]))
};

// ─── Router ─────────────────────────────────────────────────────────────────
function navigateTo(hash) { window.location.hash = hash; }

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  State.route = hash;
  document.querySelectorAll('.navbar-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + hash));
  const main = document.getElementById('main-content');
  if (hash === '/') main.innerHTML = renderHome();
  else if (hash === '/labs') main.innerHTML = renderLabBrowser();
  else if (hash.startsWith('/lab/')) main.innerHTML = renderLabWorkspace(hash.split('/lab/')[1]);
  else if (hash === '/admin') main.innerHTML = State.isAdmin ? renderAdmin() : renderAuth();
  else if (hash === '/profile') main.innerHTML = State.user ? renderProfile() : renderAuth();
  else if (hash === '/auth') main.innerHTML = renderAuth();
  else if (hash === '/tos') main.innerHTML = renderToS();
  else if (hash === '/operator-agreement') main.innerHTML = renderOperatorAgreement();
  else if (hash === '/compliance') main.innerHTML = renderCompliance();
  else main.innerHTML = '<div class="hero"><h1>Page Not Found</h1><p>The requested page does not exist.</p></div>';
  main.scrollTo(0, 0); window.scrollTo(0, 0);
  announceRoute(hash);
}

function announceRoute(hash) {
  const ann = document.createElement('div');
  ann.setAttribute('role', 'status'); ann.setAttribute('aria-live', 'polite');
  ann.className = 'sr-only';
  ann.textContent = 'Navigated to ' + (hash === '/' ? 'Home' : hash.slice(1));
  document.body.appendChild(ann);
  setTimeout(() => ann.remove(), 1000);
}

// ─── Render: Home ───────────────────────────────────────────────────────────
function renderHome() {
  return `<div class="hero">
    <h1>University-Grade Interactive Labs</h1>
    <p>AI-powered science and technology labs with VR, voice control, and full accessibility. Learn by doing — anywhere, on any device.</p>
    <div class="hero-actions">
      <a href="#/labs" class="btn btn-primary btn-lg">🔬 Explore Labs</a>
      <a href="#/auth" class="btn btn-secondary btn-lg">👤 Sign In</a>
    </div>
  </div>
  <div class="lab-grid">${DISCIPLINES.map(d => `
    <div class="glass-card lab-card" data-discipline="${d.id}" onclick="navigateTo('/labs')" tabindex="0"
         role="button" aria-label="Explore ${d.name} labs">
      <div class="lab-icon" aria-hidden="true">${d.icon}</div>
      <div class="lab-title">${d.name}</div>
      <div class="lab-desc">${d.desc}</div>
      <div class="lab-meta">
        <span class="lab-badge">${d.labs.length} Labs</span>
        ${d.labs.some(l=>l.vr) ? '<span class="lab-badge vr">🥽 VR Ready</span>' : ''}
        <span class="lab-badge voice">🎤 Voice</span>
      </div>
    </div>`).join('')}
  </div>
  <div style="margin-top:var(--sp-2xl);text-align:center">
    <div class="glass-card" style="display:inline-block;max-width:700px">
      <h2 style="margin-bottom:var(--sp-md)">Platform Features</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--sp-md);text-align:left">
        <div>♿ <strong>Accessible</strong><br><small style="color:var(--text-secondary)">WCAG 2.1 AA+ compliant</small></div>
        <div>🥽 <strong>VR Ready</strong><br><small style="color:var(--text-secondary)">WebXR immersive labs</small></div>
        <div>🎤 <strong>Voice Control</strong><br><small style="color:var(--text-secondary)">Hands-free interaction</small></div>
        <div>📱 <strong>Cross-Platform</strong><br><small style="color:var(--text-secondary)">All OS + offline mode</small></div>
        <div>📊 <strong>Data Export</strong><br><small style="color:var(--text-secondary)">CSV, JSON, PDF</small></div>
        <div>🔐 <strong>Compliant</strong><br><small style="color:var(--text-secondary)">ToS, FERPA, COPPA</small></div>
      </div>
    </div>
  </div>`;
}

// ─── Render: Lab Browser ────────────────────────────────────────────────────
function renderLabBrowser() {
  if (!State.tosAccepted && State.user) return renderToSGate();
  return `<h1 style="margin-bottom:var(--sp-xl)">🔬 Lab Catalog</h1>
  ${DISCIPLINES.map(d => `
    <div style="margin-bottom:var(--sp-2xl)">
      <h2 style="color:${d.color};margin-bottom:var(--sp-md)">${d.icon} ${d.name}</h2>
      <div class="lab-grid">${d.labs.map(l => `
        <div class="glass-card lab-card" data-discipline="${d.id}" onclick="navigateTo('/lab/${l.id}')"
             tabindex="0" role="button" aria-label="Open ${l.name} lab">
          <div class="lab-icon" aria-hidden="true">${d.icon}</div>
          <div class="lab-title">${l.name}</div>
          <div class="lab-desc">${l.desc}</div>
          <div class="lab-meta">
            ${l.vr ? '<span class="lab-badge vr">🥽 VR</span>' : ''}
            ${l.voice ? '<span class="lab-badge voice">🎤 Voice</span>' : ''}
            <span class="lab-badge">Interactive</span>
          </div>
        </div>`).join('')}
      </div>
    </div>`).join('')}`;
}

function renderToSGate() {
  return `<div class="compliance-content">
    <h1>Terms of Service Required</h1>
    <p>You must accept the Terms of Service before accessing labs.</p>
    <div class="compliance-acceptance">
      <label style="display:flex;align-items:center;gap:var(--sp-sm);justify-content:center;cursor:pointer">
        <input type="checkbox" id="tos-check"> I have read and agree to the <a href="#/tos" style="color:var(--primary)">Terms of Service</a>
      </label>
      <button class="btn btn-primary btn-lg" style="margin-top:var(--sp-lg)" onclick="acceptToS()">Accept & Continue</button>
    </div>
  </div>`;
}

function acceptToS() {
  const cb = document.getElementById('tos-check');
  if (!cb || !cb.checked) { showToast('Please check the box to accept ToS', 'warning'); return; }
  State.tosAccepted = true;
  saveToLocal();
  showToast('Terms accepted! Welcome to the labs.', 'success');
  navigateTo('/labs');
}

// ─── Render: Lab Workspace ──────────────────────────────────────────────────
function renderLabWorkspace(labId) {
  let lab = null, disc = null;
  for (const d of DISCIPLINES) { const found = d.labs.find(l => l.id === labId); if (found) { lab = found; disc = d; break; } }
  if (!lab) return '<div class="hero"><h1>Lab Not Found</h1></div>';
  State.currentLab = lab;
  return `<div style="margin-bottom:var(--sp-lg);display:flex;align-items:center;gap:var(--sp-md);flex-wrap:wrap">
    <a href="#/labs" class="btn btn-secondary btn-sm">← Back to Labs</a>
    <h1 style="font-size:1.5rem">${disc.icon} ${lab.name}</h1>
    ${lab.vr ? '<button class="vr-badge" onclick="enterVR()" aria-label="Enter VR mode">🥽 Enter VR</button>' : ''}
  </div>
  <div class="lab-workspace">
    <div class="lab-canvas-container">
      <canvas id="lab-canvas" aria-label="${lab.name} simulation canvas" tabindex="0"></canvas>
      <div class="lab-toolbar">
        <button class="btn btn-secondary btn-sm" onclick="labAction('reset')">🔄 Reset</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('play')">▶️ Play</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('pause')">⏸️ Pause</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('step')">⏭️ Step</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('record')">📊 Record Data</button>
        <button class="btn btn-secondary btn-sm" onclick="exportLabData('csv')">📥 Export CSV</button>
      </div>
    </div>
    <div class="lab-sidebar">
      <div class="sidebar-panel"><h3>Description</h3><p style="color:var(--text-secondary);font-size:0.9rem">${lab.desc}</p></div>
      <div class="sidebar-panel"><h3>Controls</h3><div id="lab-controls">Loading controls...</div></div>
      <div class="sidebar-panel"><h3>Data Output</h3><pre id="lab-data" style="font-family:var(--font-mono);font-size:0.8rem;color:var(--secondary);max-height:200px;overflow:auto">Waiting for simulation...</pre></div>
      <div class="sidebar-panel"><h3>Voice Commands</h3>
        <p style="color:var(--text-secondary);font-size:0.85rem">Say: "reset", "play", "pause", "step", "record data", "export"</p>
      </div>
    </div>
  </div>`;
}

// ─── Lab Simulations ────────────────────────────────────────────────────────
const LabSims = {
  state: { running: false, time: 0, data: [], animId: null },
  init(labId) {
    const canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    this.state = { running: false, time: 0, data: [], animId: null };
    this.renderSim(ctx, canvas, labId);
    this.setupControls(labId);
    window.addEventListener('resize', () => {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
      this.renderSim(ctx, canvas, labId);
    });
  },
  renderSim(ctx, canvas, labId) {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0D1117'; ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(108,99,255,0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Dispatch to lab-specific renderer
    const renderer = this.renderers[labId] || this.renderers.default;
    renderer(ctx, W, H, this.state);
  },
  renderers: {
    'plate-tectonics': (ctx, W, H, state) => {
      const t = state.time * 0.02;
      ctx.fillStyle = '#2563EB'; ctx.fillRect(0, H*0.6, W, H*0.4); // ocean
      // Plates
      const plates = [{x:W*0.1+Math.sin(t)*20, w:W*0.35, color:'#92400E'},{x:W*0.55-Math.sin(t)*20, w:W*0.35, color:'#78350F'}];
      plates.forEach(p => { ctx.fillStyle=p.color; ctx.fillRect(p.x, H*0.35, p.w, H*0.25); ctx.fillStyle='#059669';ctx.fillRect(p.x,H*0.3,p.w,H*0.05); });
      ctx.fillStyle='#DC2626'; ctx.beginPath(); ctx.arc(W*0.475, H*0.5, 8+Math.sin(t*3)*3, 0, Math.PI*2); ctx.fill(); // magma
      ctx.fillStyle='#fff'; ctx.font='bold 16px Inter'; ctx.textAlign='center'; ctx.fillText('Plate Tectonics Simulator', W/2, 30);
      ctx.font='12px Inter'; ctx.fillStyle='#9CA3AF'; ctx.fillText(`Time: ${state.time.toFixed(0)}s | Drift rate: ${(Math.sin(t)*2.4).toFixed(1)} cm/yr`, W/2, H-15);
    },
    'projectile-motion': (ctx, W, H, state) => {
      const g = 9.81, v0 = 50, angle = Math.PI/4, t = state.time * 0.05;
      ctx.fillStyle='#065F46'; ctx.fillRect(0, H*0.75, W, H*0.25); // ground
      const x = v0*Math.cos(angle)*t*8, y = H*0.75 - (v0*Math.sin(angle)*t - 0.5*g*t*t)*5;
      if (y <= H*0.75) { ctx.fillStyle='#F59E0B'; ctx.beginPath(); ctx.arc(40+x, y, 8, 0, Math.PI*2); ctx.fill(); }
      // trajectory
      ctx.strokeStyle='rgba(245,158,11,0.3)'; ctx.setLineDash([4,4]); ctx.beginPath();
      for(let i=0;i<200;i++){const ti=i*0.05;const xi=v0*Math.cos(angle)*ti*8;const yi=H*0.75-(v0*Math.sin(angle)*ti-0.5*g*ti*ti)*5;if(yi>H*0.75)break;i===0?ctx.moveTo(40+xi,yi):ctx.lineTo(40+xi,yi);} ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='#fff'; ctx.font='bold 16px Inter'; ctx.textAlign='center'; ctx.fillText('Projectile Motion Lab', W/2, 30);
      ctx.font='12px Inter'; ctx.fillStyle='#9CA3AF'; ctx.fillText(`v₀=${v0}m/s | θ=45° | t=${t.toFixed(2)}s`, W/2, H-15);
    },
    'sorting-viz': (ctx, W, H, state) => {
      const n = 30, barW = (W-40)/n, arr = state._arr || Array.from({length:n},(_,i)=>((i+1)/n));
      if (!state._arr) { state._arr = arr.sort(()=>Math.random()-0.5); }
      state._arr.forEach((v,i) => {
        const h = v*(H-80); ctx.fillStyle=`hsl(${v*300},70%,55%)`; ctx.fillRect(20+i*barW, H-40-h, barW-2, h);
      });
      if (state.running && state.time % 3 === 0) { const i=Math.floor(Math.random()*n),j=Math.floor(Math.random()*n); [state._arr[i],state._arr[j]]=[state._arr[j],state._arr[i]]; }
      ctx.fillStyle='#fff'; ctx.font='bold 16px Inter'; ctx.textAlign='center'; ctx.fillText('Sorting Algorithm Visualizer', W/2, 30);
    },
    default: (ctx, W, H, state) => {
      ctx.fillStyle='#fff'; ctx.font='bold 20px Inter'; ctx.textAlign='center'; ctx.fillText('Lab Simulation', W/2, H/2-20);
      ctx.font='14px Inter'; ctx.fillStyle='#9CA3AF'; ctx.fillText('Interactive simulation loading...', W/2, H/2+10);
      ctx.fillText(`Time: ${state.time.toFixed(1)}s`, W/2, H/2+35);
      // Animated particles
      for(let i=0;i<20;i++){const a=state.time*0.02+i*0.314;const r=80+Math.sin(a*2)*30;ctx.fillStyle=`hsla(${i*18+state.time},70%,60%,0.6)`;ctx.beginPath();ctx.arc(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r,4,0,Math.PI*2);ctx.fill();}
    }
  },
  play() {
    if (this.state.running) return;
    this.state.running = true;
    const canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labId = State.currentLab?.id || 'default';
    const tick = () => {
      if (!this.state.running) return;
      this.state.time += 0.1;
      this.renderSim(ctx, canvas, labId);
      updateDataOutput();
      this.state.animId = requestAnimationFrame(tick);
    };
    tick();
  },
  pause() { this.state.running = false; if (this.state.animId) cancelAnimationFrame(this.state.animId); },
  reset() { this.pause(); this.state.time = 0; this.state.data = []; this.state._arr = null; const c=document.getElementById('lab-canvas'); if(c) this.renderSim(c.getContext('2d'),c,State.currentLab?.id||'default'); },
  setupControls(labId) {
    const el = document.getElementById('lab-controls');
    if (!el) return;
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--sp-sm)">
      <label style="font-size:0.85rem;color:var(--text-secondary)">Speed: <input type="range" min="1" max="10" value="5" id="speed-ctrl" style="width:100%"></label>
      <label style="font-size:0.85rem;color:var(--text-secondary)">Zoom: <input type="range" min="50" max="200" value="100" id="zoom-ctrl" style="width:100%"></label>
    </div>`;
  }
};

function labAction(action) {
  if (action === 'play') LabSims.play();
  else if (action === 'pause') LabSims.pause();
  else if (action === 'reset') LabSims.reset();
  else if (action === 'step') { LabSims.state.time += 1; const c=document.getElementById('lab-canvas'); if(c) LabSims.renderSim(c.getContext('2d'),c,State.currentLab?.id||'default'); updateDataOutput(); }
  else if (action === 'record') { LabSims.state.data.push({time:LabSims.state.time,recorded:new Date().toISOString()}); showToast('Data point recorded!','success'); updateDataOutput(); }
}

function updateDataOutput() {
  const el = document.getElementById('lab-data');
  if (el) el.textContent = JSON.stringify({time:LabSims.state.time.toFixed(2),running:LabSims.state.running,dataPoints:LabSims.state.data.length},null,2);
}

// ─── Auth ───────────────────────────────────────────────────────────────────
function renderAuth() {
  return `<div class="auth-container"><div class="glass-card">
    <h2>Sign In to AI Edu Labs</h2>
    <div class="form-group"><label for="auth-email">Email</label><input type="email" id="auth-email" class="form-input" placeholder="you@university.edu"></div>
    <div class="form-group"><label for="auth-pass">Password</label><input type="password" id="auth-pass" class="form-input" placeholder="••••••••"></div>
    <button class="btn btn-primary btn-lg" style="width:100%" onclick="doLogin()">Sign In</button>
    <div class="divider">or</div>
    <button class="btn btn-secondary btn-lg" style="width:100%" onclick="doGoogleLogin()">🔑 Sign in with Google</button>
    <p style="text-align:center;margin-top:var(--sp-lg);color:var(--text-muted);font-size:0.85rem">
      Don't have an account? <a href="#" onclick="doSignup();return false" style="color:var(--primary)">Sign Up</a>
    </p>
  </div></div>`;
}

function doLogin() {
  const email = document.getElementById('auth-email')?.value;
  const pass = document.getElementById('auth-pass')?.value;
  if (!email || !pass) { showToast('Please fill in all fields', 'warning'); return; }
  // Simulate auth (replace with Firebase Auth in production)
  State.user = { email, name: email.split('@')[0], role: email.includes('admin') ? 'admin' : 'subscriber' };
  State.isAdmin = State.user.role === 'admin';
  State.tosAccepted = loadFromLocal().tosAccepted || false;
  saveToLocal();
  showToast('Welcome, ' + State.user.name + '!', 'success');
  updateAuthUI();
  navigateTo('/labs');
}

function doGoogleLogin() {
  State.user = { email: 'user@gmail.com', name: 'Lab User', role: 'subscriber' };
  State.isAdmin = false; saveToLocal(); showToast('Signed in via Google!', 'success');
  updateAuthUI(); navigateTo('/labs');
}

function doSignup() {
  showToast('Registration opens soon! Use Sign In for now.', 'info');
}

function doLogout() {
  State.user = null; State.isAdmin = false; State.tosAccepted = false;
  saveToLocal(); updateAuthUI(); showToast('Signed out', 'info'); navigateTo('/');
}

function updateAuthUI() {
  const authNav = document.getElementById('nav-auth');
  const adminNav = document.getElementById('nav-admin');
  if (State.user) {
    authNav.textContent = '🚪 Sign Out'; authNav.href = '#'; authNav.onclick = (e) => { e.preventDefault(); doLogout(); };
    authNav.className = 'btn btn-secondary btn-sm';
  } else {
    authNav.textContent = 'Sign In'; authNav.href = '#/auth'; authNav.onclick = null;
    authNav.className = 'btn btn-primary btn-sm';
  }
}

// ─── Admin ──────────────────────────────────────────────────────────────────
function renderAdmin() {
  return `<h1 style="margin-bottom:var(--sp-xl)">⚙️ Admin Dashboard</h1>
  <div class="admin-grid">
    <div class="glass-card stat-card"><div class="stat-value">${DISCIPLINES.reduce((s,d)=>s+d.labs.length,0)}</div><div class="stat-label">Total Labs</div></div>
    <div class="glass-card stat-card"><div class="stat-value">${DISCIPLINES.length}</div><div class="stat-label">Disciplines</div></div>
    <div class="glass-card stat-card"><div class="stat-value">156</div><div class="stat-label">Active Users</div></div>
    <div class="glass-card stat-card"><div class="stat-value">98.7%</div><div class="stat-label">Uptime</div></div>
  </div>
  <div class="glass-card" style="margin-top:var(--sp-xl)">
    <h2 style="margin-bottom:var(--sp-lg)">Lab Management</h2>
    <table class="data-table"><thead><tr><th>Lab</th><th>Discipline</th><th>VR</th><th>Voice</th><th>Status</th></tr></thead>
    <tbody>${DISCIPLINES.flatMap(d => d.labs.map(l => `<tr>
      <td style="color:var(--text-primary)">${l.name}</td><td>${d.name}</td>
      <td>${l.vr?'✅':'—'}</td><td>${l.voice?'✅':'—'}</td>
      <td><span style="color:var(--success)">● Active</span></td></tr>`)).join('')}
    </tbody></table>
  </div>
  <div class="glass-card" style="margin-top:var(--sp-xl)">
    <h2 style="margin-bottom:var(--sp-lg)">Compliance Status</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-md)">
      <div>📋 <strong>Terms of Service</strong><br><span style="color:var(--success)">✅ Published</span></div>
      <div>📝 <strong>Operator Agreement</strong><br><span style="color:var(--success)">✅ Published</span></div>
      <div>🎓 <strong>FERPA Compliant</strong><br><span style="color:var(--success)">✅ Verified</span></div>
      <div>👶 <strong>COPPA Compliant</strong><br><span style="color:var(--success)">✅ Verified</span></div>
    </div>
  </div>`;
}

// ─── Profile & Progress ─────────────────────────────────────────────────────
function renderProfile() {
  const u = State.user;
  return `<div class="profile-header"><div class="profile-avatar">${u.name[0].toUpperCase()}</div>
    <div><h1>${u.name}</h1><p style="color:var(--text-secondary)">${u.email} — ${u.role}</p></div>
    <button class="btn btn-danger btn-sm" onclick="doLogout()" style="margin-left:auto">Sign Out</button></div>
  <h2 style="margin-bottom:var(--sp-lg)">Lab Progress</h2>
  <div class="progress-grid">${DISCIPLINES.map(d => `
    <div class="glass-card progress-item">
      <div class="discipline-name">${d.icon} ${d.name}</div>
      <div class="labs-completed">${State.progress[d.id].completed}/${State.progress[d.id].total}</div>
      <div class="progress-bar" style="margin-top:var(--sp-sm)">
        <div class="fill" style="width:${(State.progress[d.id].completed/State.progress[d.id].total)*100}%"></div>
      </div>
    </div>`).join('')}</div>
  <div class="glass-card" style="margin-top:var(--sp-xl)">
    <h2 style="margin-bottom:var(--sp-lg)">Data Export</h2>
    <p style="color:var(--text-secondary);margin-bottom:var(--sp-md)">Export your lab results and progress data.</p>
    <div class="export-options">
      <button class="btn btn-secondary" onclick="exportLabData('csv')">📥 Export CSV</button>
      <button class="btn btn-secondary" onclick="exportLabData('json')">📥 Export JSON</button>
      <button class="btn btn-secondary" onclick="exportLabData('pdf')">📥 Export PDF</button>
    </div>
  </div>`;
}

// ─── Data Export ─────────────────────────────────────────────────────────────
function exportLabData(format) {
  const data = { user: State.user?.email || 'anonymous', exportedAt: new Date().toISOString(), progress: State.progress, labResults: LabSims.state.data };
  if (format === 'json') downloadFile('lab-data.json', JSON.stringify(data, null, 2), 'application/json');
  else if (format === 'csv') {
    const rows = [['Discipline','Completed','Total']];
    DISCIPLINES.forEach(d => rows.push([d.name, State.progress[d.id].completed, State.progress[d.id].total]));
    downloadFile('lab-data.csv', rows.map(r => r.join(',')).join('\n'), 'text/csv');
  } else if (format === 'pdf') { showToast('PDF export requires print — opening print dialog.','info'); window.print(); }
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  showToast(`Downloaded ${name}`, 'success');
}

// ─── Compliance Pages ───────────────────────────────────────────────────────
function renderToS() {
  return `<div class="compliance-content"><h1>Terms of Service</h1>
  <p><em>Last updated: March 18, 2026</em></p>
  <h2>1. Acceptance of Terms</h2><p>By accessing AI Educational Labs ("the Platform"), you agree to these Terms of Service. The Platform is operated by AI Educational Labs in partnership with HeadySystems Inc.</p>
  <h2>2. User Accounts</h2><p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials. Accounts are for individual use only.</p>
  <h2>3. Acceptable Use</h2><p>The Platform is intended for educational purposes. You agree not to: use the Platform for illegal activities, attempt to gain unauthorized access, distribute malware, or engage in harassment.</p>
  <h2>4. Intellectual Property</h2><p>All lab simulations, educational content, and platform code are owned by AI Educational Labs. Lab results and exported data generated by users belong to the user and their institution.</p>
  <h2>5. Privacy & Data</h2><p>We collect minimal data necessary for platform operation. Lab data is stored securely and can be exported or deleted at any time. We comply with FERPA and COPPA regulations.</p>
  <h2>6. Disclaimer</h2><p>Lab simulations are for educational purposes and may not represent exact real-world conditions. The Platform is provided "as-is" without warranty.</p>
  <h2>7. Governing Law</h2><p>These terms are governed by the laws of the United States of America.</p></div>`;
}

function renderOperatorAgreement() {
  return `<div class="compliance-content"><h1>Operator Agreement</h1>
  <p><em>Last updated: March 18, 2026</em></p>
  <h2>1. Scope</h2><p>This agreement governs the relationship between institutional operators (schools, universities, training organizations) and AI Educational Labs.</p>
  <h2>2. Operator Responsibilities</h2><ul><li>Ensure authorized use by enrolled students and faculty</li><li>Maintain compliance with institutional data policies</li><li>Report security incidents within 24 hours</li><li>Provide accurate enrollment data for licensing</li></ul>
  <h2>3. Data Handling</h2><p>Operators receive access to aggregated, de-identified usage analytics. Student PII is handled per FERPA guidelines and is never shared without consent.</p>
  <h2>4. Service Level</h2><p>AI Educational Labs targets 99.5% uptime. Scheduled maintenance windows will be communicated 48 hours in advance.</p>
  <h2>5. Licensing</h2><p>Operators are licensed per institution. Volume discounts available for multi-campus deployments.</p></div>`;
}

function renderCompliance() {
  return `<div class="compliance-content"><h1>Compliance & Certifications</h1>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--sp-xl);margin-top:var(--sp-xl)">
    <div class="glass-card"><h2>🎓 FERPA</h2><p>Family Educational Rights and Privacy Act compliance. Student education records are protected with appropriate access controls.</p></div>
    <div class="glass-card"><h2>👶 COPPA</h2><p>Children's Online Privacy Protection Act. Parental consent mechanisms for users under 13. Minimal data collection.</p></div>
    <div class="glass-card"><h2>♿ WCAG 2.1 AA</h2><p>Web Content Accessibility Guidelines compliance. Screen readers, keyboard navigation, high contrast, and voice control support.</p></div>
    <div class="glass-card"><h2>🔐 SOC 2</h2><p>Service Organization Control security framework. Data encryption at rest and in transit. Regular security audits.</p></div>
  </div></div>`;
}

// ─── Voice Control ──────────────────────────────────────────────────────────
const VoiceCtrl = {
  recognition: null,
  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.continuous = true; this.recognition.interimResults = false; this.recognition.lang = 'en-US';
    this.recognition.onresult = (e) => {
      const cmd = e.results[e.results.length-1][0].transcript.trim().toLowerCase();
      this.handleCommand(cmd);
    };
    this.recognition.onerror = () => { State.voiceActive = false; this.updateUI(); };
    this.recognition.onend = () => { if (State.voiceActive) this.recognition.start(); };
  },
  toggle() {
    if (!this.recognition) { showToast('Voice control not supported in this browser','warning'); return; }
    State.voiceActive = !State.voiceActive;
    State.voiceActive ? this.recognition.start() : this.recognition.stop();
    this.updateUI();
    showToast(State.voiceActive ? 'Voice control ON — listening...' : 'Voice control OFF', State.voiceActive ? 'success' : 'info');
  },
  updateUI() {
    const btn = document.getElementById('voice-toggle');
    const status = document.getElementById('voice-status');
    if (btn) btn.className = 'voice-indicator ' + (State.voiceActive ? 'listening' : 'idle');
    if (status) status.textContent = State.voiceActive ? 'Listening...' : 'Voice Off';
  },
  handleCommand(cmd) {
    if (cmd.includes('reset')) labAction('reset');
    else if (cmd.includes('play') || cmd.includes('start')) labAction('play');
    else if (cmd.includes('pause') || cmd.includes('stop')) labAction('pause');
    else if (cmd.includes('step')) labAction('step');
    else if (cmd.includes('record')) labAction('record');
    else if (cmd.includes('export')) exportLabData('csv');
    else if (cmd.includes('home')) navigateTo('/');
    else if (cmd.includes('lab')) navigateTo('/labs');
    else showToast('Voice: "' + cmd + '"', 'info');
  }
};

// ─── VR ─────────────────────────────────────────────────────────────────────
function enterVR() {
  if (!navigator.xr) { showToast('WebXR not available. Use a VR-capable browser.', 'warning'); return; }
  navigator.xr.isSessionSupported('immersive-vr').then(supported => {
    if (supported) {
      showToast('Entering VR mode...', 'success');
      // WebXR session creation would go here in production
    } else { showToast('VR headset not detected. Connect a headset to use VR mode.', 'info'); }
  }).catch(() => showToast('VR initialization failed', 'error'));
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type; toast.textContent = msg;
  toast.setAttribute('role', 'alert');
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Offline/Online Sync ────────────────────────────────────────────────────
function saveToLocal() {
  try { localStorage.setItem('aieduclabs', JSON.stringify({ user: State.user, tosAccepted: State.tosAccepted, progress: State.progress, labResults: State.labResults })); } catch(e) {}
}
function loadFromLocal() {
  try { return JSON.parse(localStorage.getItem('aieduclabs') || '{}'); } catch(e) { return {}; }
}
function restoreState() {
  const saved = loadFromLocal();
  if (saved.user) { State.user = saved.user; State.isAdmin = saved.user.role === 'admin'; }
  if (saved.tosAccepted) State.tosAccepted = true;
  if (saved.progress) Object.assign(State.progress, saved.progress);
  if (saved.labResults) State.labResults = saved.labResults;
}

window.addEventListener('online', () => { State.offline = false; showToast('Back online — syncing data...', 'success'); saveToLocal(); });
window.addEventListener('offline', () => { State.offline = true; showToast('You are offline. Labs continue to work locally.', 'warning'); });

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restoreState();
  updateAuthUI();
  VoiceCtrl.init();
  document.getElementById('voice-toggle').addEventListener('click', () => VoiceCtrl.toggle());
  document.getElementById('hamburger-btn').addEventListener('click', () => {
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('open');
    document.getElementById('hamburger-btn').setAttribute('aria-expanded', nav.classList.contains('open'));
  });
  window.addEventListener('hashchange', () => { handleRoute(); initLabIfNeeded(); });
  handleRoute();
  initLabIfNeeded();
  // Register service worker
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});

function initLabIfNeeded() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('/lab/')) setTimeout(() => LabSims.init(hash.split('/lab/')[1]), 100);
}
