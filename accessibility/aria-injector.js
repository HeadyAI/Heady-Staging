/**
 * aria-injector.js — Automatic ARIA Attribute Injection
 *
 * Enhances HTML output with missing ARIA attributes, roles,
 * landmarks, and live regions. CSL-gated injection decisions.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),
  HIGH:     phiThreshold(3),
  MEDIUM:   phiThreshold(2),
  LOW:      phiThreshold(1),
  MINIMUM:  phiThreshold(0),
};

const MAX_INJECTIONS = 89;  // fib(11) per page

// ── Injection Rules ─────────────────────────────────────
const INJECTORS = [
  // Add role="main" to first <main> if missing
  {
    id: 'main-landmark',
    pattern: /<main\b(?![^>]*role=)/gi,
    replacement: '<main role="main"',
    description: 'Add role="main" to <main> element',
  },
  
  // Add role="navigation" to <nav> if missing
  {
    id: 'nav-landmark',
    pattern: /<nav\b(?![^>]*role=)/gi,
    replacement: '<nav role="navigation"',
    description: 'Add role="navigation" to <nav> element',
  },
  
  // Add role="banner" to <header> (site-level) if missing
  {
    id: 'header-landmark',
    pattern: /<header\b(?![^>]*role=)/gi,
    replacement: '<header role="banner"',
    description: 'Add role="banner" to <header> element',
  },
  
  // Add role="contentinfo" to <footer> if missing
  {
    id: 'footer-landmark',
    pattern: /<footer\b(?![^>]*role=)/gi,
    replacement: '<footer role="contentinfo"',
    description: 'Add role="contentinfo" to <footer> element',
  },
  
  // Add role="search" to search forms
  {
    id: 'search-form',
    pattern: /<form\b([^>]*class=["'][^"']*search[^"']*["'][^>]*)(?!role=)/gi,
    replacement: '<form$1 role="search"',
    description: 'Add role="search" to search forms',
  },
  
  // Add aria-label to icon-only buttons
  {
    id: 'icon-button-label',
    pattern: /<button\b([^>]*)>\s*<(?:svg|i|img)\b[^>]*>\s*<\/button>/gi,
    replacement: (match, attrs) => {
      if (attrs.includes('aria-label')) return match;
      const title = (attrs.match(/title=["']([^"']+)["']/i) || [null, 'action'])[1];
      return match.replace('<button', `<button aria-label="${title}"`);
    },
    description: 'Add aria-label to icon-only buttons',
  },
  
  // Add aria-live to notification/alert containers
  {
    id: 'live-region',
    pattern: /<div\b([^>]*class=["'][^"']*(?:alert|notification|toast|message|snackbar)[^"']*["'][^>]*)(?!aria-live=)/gi,
    replacement: '<div$1 aria-live="polite" role="alert"',
    description: 'Add aria-live to notification containers',
  },
  
  // Add aria-expanded to accordion/collapse triggers
  {
    id: 'accordion-expanded',
    pattern: /<button\b([^>]*(?:data-toggle|data-collapse|accordion)[^>]*)(?!aria-expanded=)/gi,
    replacement: '<button$1 aria-expanded="false"',
    description: 'Add aria-expanded to accordion triggers',
  },
  
  // Add aria-current to active navigation items
  {
    id: 'nav-current',
    pattern: /<a\b([^>]*class=["'][^"']*(?:active|current)[^"']*["'][^>]*)(?!aria-current=)/gi,
    replacement: '<a$1 aria-current="page"',
    description: 'Add aria-current to active nav items',
  },
  
  // Add aria-hidden to decorative images
  {
    id: 'decorative-image',
    pattern: /<img\b([^>]*alt=["']["'][^>]*)(?!aria-hidden=)/gi,
    replacement: '<img$1 aria-hidden="true" role="presentation"',
    description: 'Add aria-hidden to decorative images (empty alt)',
  },
  
  // Add autocomplete to common form fields
  {
    id: 'autocomplete-name',
    pattern: /<input\b([^>]*(?:name|id)=["'](?:name|fullname|full_name)[^>]*)(?!autocomplete=)/gi,
    replacement: '<input$1 autocomplete="name"',
    description: 'Add autocomplete="name" to name fields',
  },
  
  {
    id: 'autocomplete-email',
    pattern: /<input\b([^>]*(?:type=["']email["']|name=["']email["'])[^>]*)(?!autocomplete=)/gi,
    replacement: '<input$1 autocomplete="email"',
    description: 'Add autocomplete="email" to email fields',
  },
];

// ── Skip Link Generator ─────────────────────────────────
function generateSkipLink() {
  const skipStyles = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;';
  return [
    '<a href="#main-content"',
    ' class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:outline-2 focus:outline-blue-600"',
    ` style="${skipStyles}"`,
    '>Skip to main content</a>',
  ].join('');
}

// ── Main Injector ───────────────────────────────────────
/**
 * Inject ARIA attributes into HTML.
 * Returns enhanced HTML and a log of injections made.
 */
export function injectAria(html, options = {}) {
  const maxInjections = options.maxInjections || MAX_INJECTIONS;
  const addSkipLink = options.skipLink !== false;
  const log = [];
  let result = html;
  let injectionCount = 0;

  // Add skip link if missing
  if (addSkipLink && !result.includes('skip') && !result.includes('Skip')) {
    const bodyMatch = result.match(/<body\b[^>]*>/i);
    if (bodyMatch) {
      const skipLink = generateSkipLink();
      result = result.replace(bodyMatch[0], bodyMatch[0] + '\n' + skipLink);
      log.push({ id: 'skip-link', description: 'Added skip-to-content link' });
      injectionCount++;
    }
  }

  // Apply injection rules
  for (const rule of INJECTORS) {
    if (injectionCount >= maxInjections) break;
    
    const before = result;
    if (typeof rule.replacement === 'function') {
      result = result.replace(rule.pattern, rule.replacement);
    } else {
      result = result.replace(rule.pattern, rule.replacement);
    }
    
    if (result !== before) {
      const count = (before.length - result.length + (result.match(rule.pattern)?.length || 0));
      log.push({ id: rule.id, description: rule.description });
      injectionCount++;
    }
  }

  return {
    html: result,
    injections: log,
    injectionCount: log.length,
    enhanced: log.length > 0,
  };
}

/**
 * Generate CSS for accessibility (screen-reader-only class, focus styles).
 */
export function generateA11yCSS() {
  return `/* Heady Accessibility CSS — Generated by aria-injector.js */
/* Eric Haywood — HeadySystems */

/* Screen reader only — visible on focus */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only.focus\\:not-sr-only:focus,
.sr-only:focus-within {
  position: static;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}

/* Focus indicators — φ-scaled outline */
:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
  border-radius: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :focus-visible {
    outline: 3px solid CanvasText;
    outline-offset: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Color contrast helpers */
.a11y-high-contrast {
  color: #000;
  background-color: #fff;
}

.a11y-dark-high-contrast {
  color: #fff;
  background-color: #000;
}`;
}

/**
 * Express/Connect middleware to inject ARIA into HTML responses.
 */
export function middleware(options = {}) {
  return (req, res, next) => {
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (typeof body === 'string' && body.includes('<html')) {
        const enhanced = injectAria(body, options);
        return originalSend(enhanced.html);
      }
      return originalSend(body);
    };
    next();
  };
}

export { INJECTORS, generateSkipLink };
export default { injectAria, generateA11yCSS, middleware, generateSkipLink };
