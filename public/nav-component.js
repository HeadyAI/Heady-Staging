/* HEADY_BRAND:BEGIN
 * HeadyOS Global Navigation Component
 * Auto-injects consistent top navigation into any HeadyOS page.
 * Include via: <script src="/nav-component.js"></script>
 * HEADY_BRAND:END */

(function () {
  'use strict';

  // --- Configuration ---
  const NAV_LINKS = [
    { href: '/',                     icon: '⬡',  label: 'Home'     },
    { href: '/products.html',        icon: '✦',  label: 'Products' },
    { href: '/headyos-desktop.html', icon: '🖥️', label: 'Desktop'  },
    { href: '/swarm.html',           icon: '🐝',  label: 'Swarm'   },
    { href: '/colab.html',           icon: '⚡',  label: 'Colab'   },
    { href: '/vector.html',          icon: '∞',   label: 'Vector'  },
    { href: '/liquid.html',          icon: '💧',  label: 'Liquid'  },
    { href: '/docs.html',            icon: '📖',  label: 'Docs'    },
    { href: '/status.html',          icon: '📊',  label: 'Status'  },
  ];

  // --- Determine active link ---
  function getActivePath() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return '/';
    return path;
  }

  // --- Build nav HTML ---
  function buildNav() {
    const activePath = getActivePath();

    const linksHtml = NAV_LINKS.map(link => {
      const isActive = link.href === activePath ||
        (link.href !== '/' && activePath.startsWith(link.href.replace('.html', '')));
      return `<a href="${link.href}" class="${isActive ? 'active' : ''}" aria-current="${isActive ? 'page' : 'false'}">
        <span class="nav-icon" aria-hidden="true">${link.icon}</span>
        ${link.label}
      </a>`;
    }).join('');

    const mobileLinksHtml = NAV_LINKS.map(link => {
      const isActive = link.href === activePath ||
        (link.href !== '/' && activePath.startsWith(link.href.replace('.html', '')));
      return `<a href="${link.href}" class="${isActive ? 'active' : ''}">
        <span aria-hidden="true">${link.icon}</span>
        ${link.label}
      </a>`;
    }).join('');

    return `
<link rel="stylesheet" href="/heady-nav.css">
<nav class="heady-nav" role="navigation" aria-label="Main navigation">
  <a href="/" class="heady-nav-logo" aria-label="HeadyOS Home">
    <div class="heady-nav-logo-orb" aria-hidden="true">H</div>
    <div>
      <span class="heady-nav-logo-text">HEADY</span>
      <span class="heady-nav-logo-sub">OS · LIVE</span>
    </div>
  </a>

  <div class="heady-nav-divider" aria-hidden="true"></div>

  <ul class="heady-nav-links" role="list">
    ${linksHtml}
  </ul>

  <div class="heady-nav-actions">
    <a href="/auth.html" class="heady-nav-btn heady-nav-btn-ghost">Sign In</a>
    <a href="/onboarding.html" class="heady-nav-btn heady-nav-btn-primary">Get Started</a>
  </div>

  <button class="heady-nav-hamburger" id="headyNavHamburger" aria-label="Toggle menu" aria-expanded="false" aria-controls="headyNavDrawer">
    <span></span><span></span><span></span>
  </button>
</nav>

<div class="heady-nav-mobile-drawer" id="headyNavDrawer" role="dialog" aria-modal="false" aria-label="Mobile navigation">
  ${mobileLinksHtml}
  <div class="mobile-nav-actions">
    <a href="/auth.html" class="heady-nav-btn heady-nav-btn-ghost">Sign In</a>
    <a href="/onboarding.html" class="heady-nav-btn heady-nav-btn-primary">Get Started</a>
  </div>
</div>

<div class="heady-nav-spacer" aria-hidden="true"></div>`;
  }

  // --- Inject nav into DOM ---
  function injectNav() {
    // Don't inject if already present
    if (document.querySelector('.heady-nav')) return;

    const navHtml = buildNav();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = navHtml;

    const body = document.body;
    const firstChild = body.firstChild;
    while (tempDiv.firstChild) {
      body.insertBefore(tempDiv.firstChild, firstChild);
    }

    // Wire up hamburger
    const hamburger = document.getElementById('headyNavHamburger');
    const drawer = document.getElementById('headyNavDrawer');
    if (hamburger && drawer) {
      hamburger.addEventListener('click', function () {
        const isOpen = drawer.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', String(isOpen));
      });
      // Close drawer on link click
      drawer.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          drawer.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  // --- Run ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }

})();
