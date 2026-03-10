/* ═══════════════════════════════════════════════════════════════════════
   HEADY™ CORE JS v3.0.0 — Sacred Geometry Interactive Layer
   All timing constants derived from φ (1.618033988749895)
   Author: Eric Haywood / HeadySystems Inc.
   ═══════════════════════════════════════════════════════════════════════ */

const PHI = 1.618033988749895;
const PSI = 1 / PHI; // 0.618...
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

/* ─── Sacred Geometry Background Canvas ─── */
class SacredGeometryCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.connections = [];
    this.mouse = { x: 0, y: 0 };
    this.frame = 0;
    this.particleCount = FIB[10]; // 89
    this.connectionDistance = FIB[12]; // 233
    this.resize();
    this.init();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - PSI) * PSI,
        vy: (Math.random() - PSI) * PSI,
        radius: Math.random() * FIB[3] + 1,
        alpha: Math.random() * PSI + 0.1
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.init();
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.frame++;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      /* Draw particle */
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(212, 168, 67, ${p.alpha * 0.382})`;
      this.ctx.fill();

      /* Draw connections */
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.connectionDistance) {
          const alpha = (1 - dist / this.connectionDistance) * 0.146;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(q.x, q.y);
          this.ctx.strokeStyle = `rgba(212, 168, 67, ${alpha})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }

      /* Mouse interaction */
      const mdx = p.x - this.mouse.x;
      const mdy = p.y - this.mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < FIB[12]) {
        const force = (FIB[12] - mdist) / FIB[12];
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.strokeStyle = `rgba(45, 212, 191, ${force * 0.236})`;
        this.ctx.lineWidth = force;
        this.ctx.stroke();
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

/* ─── Scroll Reveal Observer ─── */
class ScrollReveal {
  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.146, rootMargin: '0px 0px -55px 0px' }
    );
    document.querySelectorAll('.fade-in').forEach((el) => {
      this.observer.observe(el);
    });
  }
}

/* ─── Smooth Scroll for Anchor Links ─── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ─── Mobile Navigation Toggle ─── */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-links');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('nav-open');
      toggle.classList.toggle('active');
    });
  }
}

/* ─── Counter Animation (φ-timed) ─── */
function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          const prefix = el.dataset.prefix || '';
          const duration = 1618; /* φ × 1000 */
          const start = performance.now();

          function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            /* Phi easing: decelerate */
            const eased = 1 - Math.pow(1 - progress, PHI);
            const current = Math.floor(eased * target);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) {
              requestAnimationFrame(update);
            } else {
              el.textContent = prefix + target.toLocaleString() + suffix;
            }
          }
          requestAnimationFrame(update);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.382 }
  );
  counters.forEach((c) => observer.observe(c));
}

/* ─── Typing Effect ─── */
function typeWriter(elementId, text, speed) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const baseSpeed = speed || Math.round(1000 / FIB[9]); /* ~18ms per char */
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, baseSpeed);
    }
  }
  type();
}

/* ─── Tab System ─── */
function initTabs() {
  document.querySelectorAll('.tab-group').forEach((group) => {
    const tabs = group.querySelectorAll('.tab-btn');
    const panels = group.querySelectorAll('.tab-panel');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        panels.forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  });
}

/* ─── Service Health Polling Simulator ─── */
class HealthMonitor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.services = [];
    this.pollInterval = FIB[9] * 1000; /* 34 seconds × ψ approximation */
    this.init();
  }

  init() {
    const items = this.container.querySelectorAll('[data-service]');
    items.forEach((item) => {
      this.services.push({
        name: item.dataset.service,
        el: item,
        dot: item.querySelector('.status-dot'),
        status: 'healthy'
      });
    });
    this.poll();
    setInterval(() => this.poll(), this.pollInterval);
  }

  poll() {
    this.services.forEach((svc) => {
      /* Simulate: 92% healthy, 5% warning, 3% critical */
      const roll = Math.random();
      if (roll < 0.92) {
        svc.status = 'healthy';
      } else if (roll < 0.97) {
        svc.status = 'warning';
      } else {
        svc.status = 'critical';
      }
      if (svc.dot) {
        svc.dot.className = 'status-dot status-' + svc.status;
      }
    });
  }
}

/* ─── Init Everything ─── */
document.addEventListener('DOMContentLoaded', () => {
  new ScrollReveal();
  initSmoothScroll();
  initMobileNav();
  animateCounters();
  initTabs();

  const sacredCanvas = document.getElementById('sacred-bg');
  if (sacredCanvas) {
    new SacredGeometryCanvas('sacred-bg');
  }

  const healthContainer = document.getElementById('health-monitor');
  if (healthContainer) {
    new HealthMonitor('health-monitor');
  }
});
