/**
 * © 2026 HeadySystems Inc. PROPRIETARY AND CONFIDENTIAL.
 * Liquid Topology Dashboard — Client-side rendering.
 * Renders 3D topology on canvas, populates node/layer/connection panels.
 *
 * Founder: Eric Haywood
 */

(function () {
  'use strict';

  const PHI = 1.6180339887;
  const PSI = 0.6180339887;
  const PSI2 = PSI * PSI;

  // ── Sample Topology Data (replaced by API in production) ──────────

  const NODES = [
    { id: 'cf-gateway', name: 'Liquid Gateway', platform: 'cloudflare', type: 'worker', vector: { x: 1.0, y: 0.0, z: PHI }, status: 'active' },
    { id: 'cf-edge-auth', name: 'Edge Auth', platform: 'cloudflare', type: 'worker', vector: { x: PHI, y: 0.0, z: 1.0 }, status: 'active' },
    { id: 'cf-edge-cache', name: 'Edge Cache', platform: 'cloudflare', type: 'worker', vector: { x: 1.0, y: 0.0, z: PHI * PHI }, status: 'active' },
    { id: 'cf-edge-embed', name: 'Edge Embed', platform: 'cloudflare', type: 'worker', vector: { x: PHI, y: PSI, z: PHI }, status: 'active' },
    { id: 'colab-1', name: 'Colab US-East', platform: 'colab', type: 'gpu', vector: { x: 0.0, y: PHI, z: 0.0 }, status: 'active' },
    { id: 'colab-2', name: 'Colab US-West', platform: 'colab', type: 'gpu', vector: { x: 0.0, y: 1.0, z: PSI }, status: 'standby' },
    { id: 'colab-3', name: 'Colab EU-West', platform: 'colab', type: 'gpu', vector: { x: PSI, y: PHI, z: 0.0 }, status: 'standby' },
    { id: 'vertex-gemini', name: 'Vertex Gemini', platform: 'vertex', type: 'llm', vector: { x: PSI, y: 1.0, z: PSI }, status: 'active' },
    { id: 'vertex-embed', name: 'Vertex Embed', platform: 'vertex', type: 'embedding', vector: { x: PSI, y: PSI, z: 1.0 }, status: 'active' },
    { id: 'origin-manager', name: 'Heady Manager', platform: 'cloud_run', type: 'service', vector: { x: PSI2, y: PSI2, z: PSI2 }, status: 'active' },
    { id: 'origin-drupal', name: 'Drupal CMS', platform: 'local', type: 'cms', vector: { x: PSI, y: 0.0, z: 1.0 }, status: 'active' },
  ];

  const CONNECTIONS = [
    { from: 'cf-gateway', to: 'origin-manager', type: 'proxy', weight: PHI },
    { from: 'cf-gateway', to: 'origin-drupal', type: 'proxy', weight: 1.0 },
    { from: 'cf-gateway', to: 'colab-1', type: 'compute', weight: PSI },
    { from: 'cf-gateway', to: 'colab-2', type: 'compute', weight: PSI },
    { from: 'cf-gateway', to: 'colab-3', type: 'compute', weight: PSI },
    { from: 'origin-manager', to: 'vertex-gemini', type: 'ai', weight: PHI },
    { from: 'origin-manager', to: 'vertex-embed', type: 'ai', weight: 1.0 },
    { from: 'origin-manager', to: 'origin-drupal', type: 'internal', weight: PSI2 },
  ];

  const PLATFORM_COLORS = {
    cloudflare: '#06b6d4',
    colab: '#f59e0b',
    vertex: '#8b5cf6',
    cloud_run: '#10b981',
    local: '#10b981',
  };

  const STATUS_COLORS = {
    active: '#10b981',
    degraded: '#f59e0b',
    quarantined: '#ef4444',
    standby: '#6b7280',
    unreachable: '#dc2626',
  };

  // ── 3D Canvas Rendering ──────────────────────────────────────────

  const canvas = document.getElementById('topology-canvas');
  const ctx = canvas.getContext('2d');
  let rotation = 0;

  function project3D(x, y, z, width, height) {
    const scale = 100;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos;
    const perspective = 4 / (4 + rz * 0.5);
    return {
      px: width / 2 + rx * scale * perspective,
      py: height / 2 - y * scale * perspective + rz * 20 * perspective,
      depth: rz,
    };
  }

  function drawTopology() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = (w / 10) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      const y = (h / 10) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Project all nodes
    const projected = NODES.map(node => ({
      ...node,
      ...project3D(node.vector.x, node.vector.y, node.vector.z, w, h),
    }));

    // Draw connections
    for (const conn of CONNECTIONS) {
      const from = projected.find(n => n.id === conn.from);
      const to = projected.find(n => n.id === conn.to);
      if (!from || !to) continue;

      ctx.beginPath();
      ctx.moveTo(from.px, from.py);
      ctx.lineTo(to.px, to.py);
      ctx.strokeStyle = 'rgba(100, 116, 139, ' + (0.2 + conn.weight * 0.15) + ')';
      ctx.lineWidth = conn.weight * 0.8;
      ctx.stroke();
    }

    // Sort by depth for correct overlap
    projected.sort((a, b) => a.depth - b.depth);

    // Draw nodes
    for (const node of projected) {
      const color = PLATFORM_COLORS[node.platform] || '#6b7280';
      const radius = 8 + (node.depth + 2) * 2;

      // Glow effect
      const gradient = ctx.createRadialGradient(node.px, node.py, 0, node.px, node.py, radius * 2);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.fillRect(node.px - radius * 2, node.py - radius * 2, radius * 4, radius * 4);

      // Node circle
      ctx.beginPath();
      ctx.arc(node.px, node.py, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Status ring
      ctx.beginPath();
      ctx.arc(node.px, node.py, radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = STATUS_COLORS[node.status] || '#6b7280';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.px, node.py + radius + 14);
    }

    // Axis indicators
    const axes = [
      { label: 'X', color: '#06b6d4', vec: { x: 2, y: 0, z: 0 } },
      { label: 'Y', color: '#f59e0b', vec: { x: 0, y: 2, z: 0 } },
      { label: 'Z', color: '#8b5cf6', vec: { x: 0, y: 0, z: 2 } },
    ];
    const origin = project3D(0, 0, 0, w, h);
    for (const axis of axes) {
      const tip = project3D(axis.vec.x, axis.vec.y, axis.vec.z, w, h);
      ctx.beginPath();
      ctx.moveTo(origin.px, origin.py);
      ctx.lineTo(tip.px, tip.py);
      ctx.strokeStyle = axis.color + '60';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = axis.color;
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(axis.label, tip.px + 5, tip.py - 5);
    }

    rotation += 0.003;
    requestAnimationFrame(drawTopology);
  }

  // ── Panel Population ─────────────────────────────────────────────

  function populateNodeList() {
    const container = document.getElementById('node-list');
    container.innerHTML = NODES.map(node => `
      <div class="node-card">
        <div>
          <div class="node-name">${node.name}</div>
          <div class="node-platform">${node.platform} · ${node.type}</div>
        </div>
        <div class="node-status">
          <span class="status-badge ${node.status}"></span>
          ${node.status}
        </div>
      </div>
    `).join('');
  }

  function populateLayers() {
    const container = document.getElementById('layers-status');
    const layers = [
      { key: 'edge', name: 'Edge Layer', platform: 'cloudflare', anchor: `(1.0, 0.0, ${PHI.toFixed(3)})` },
      { key: 'compute', name: 'Compute Layer', platform: 'colab', anchor: `(0.0, ${PHI.toFixed(3)}, 0.0)` },
      { key: 'ai', name: 'AI Layer', platform: 'vertex', anchor: `(${PSI.toFixed(3)}, 1.0, ${PSI.toFixed(3)})` },
      { key: 'origin', name: 'Origin Layer', platform: 'cloud_run', anchor: `(${PSI2.toFixed(3)}, ${PSI2.toFixed(3)}, ${PSI2.toFixed(3)})` },
    ];

    container.innerHTML = layers.map(layer => {
      const count = NODES.filter(n => n.platform === layer.platform || (layer.platform === 'cloud_run' && n.platform === 'local')).length;
      return `
        <div class="layer-card ${layer.key}">
          <h3>${layer.name}</h3>
          <div class="layer-count">${count} nodes · anchor ${layer.anchor}</div>
        </div>
      `;
    }).join('');
  }

  function populateConnections() {
    const container = document.getElementById('connections-list');
    container.innerHTML = CONNECTIONS.map(conn => `
      <div class="connection-card">
        <div class="conn-path">${conn.from} → ${conn.to}</div>
        <div class="conn-weight">${conn.type} · weight: ${conn.weight.toFixed(3)}</div>
      </div>
    `).join('');
  }

  function populateRoutingStats() {
    const container = document.getElementById('routing-stats');
    const stats = [
      { label: 'Active Nodes', value: NODES.filter(n => n.status === 'active').length },
      { label: 'Total Nodes', value: NODES.length },
      { label: 'Connections', value: CONNECTIONS.length },
      { label: 'Avg Weight', value: (CONNECTIONS.reduce((s, c) => s + c.weight, 0) / CONNECTIONS.length).toFixed(3) },
      { label: 'Dimensions', value: '3D (x,y,z)' },
      { label: 'Scale', value: `φ = ${PHI.toFixed(3)}` },
    ];

    container.innerHTML = stats.map(s => `
      <div class="metric-row">
        <span class="metric-label">${s.label}</span>
        <span class="metric-value">${s.value}</span>
      </div>
    `).join('');
  }

  function updateClusterHealth() {
    const activeCount = NODES.filter(n => n.status === 'active').length;
    const ratio = activeCount / NODES.length;
    const el = document.getElementById('cluster-health');
    const dot = el.querySelector('.health-dot');
    const label = el.querySelector('.health-label');

    if (ratio >= 0.882) {
      label.textContent = 'Cluster Healthy';
      dot.className = 'health-dot';
    } else if (ratio >= 0.691) {
      label.textContent = 'Cluster Degraded';
      dot.className = 'health-dot degraded';
    } else {
      label.textContent = 'Cluster Critical';
      dot.className = 'health-dot critical';
    }
  }

  // ── Initialize ───────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    populateNodeList();
    populateLayers();
    populateConnections();
    populateRoutingStats();
    updateClusterHealth();
    drawTopology();
  });
})();
