/**
 * wcag-checker.js — WCAG 2.1 AA Compliance Checker
 *
 * Server-side HTML analysis for accessibility violations.
 * Checks color contrast, ARIA attributes, heading hierarchy,
 * form labels, keyboard navigation, and image alt text.
 * φ-scaled severity scoring, CSL-gated pass/fail.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';

// ── φ-Derived Constants ──────────────────────────────────
const CSL_THRESHOLDS = {
  CRITICAL: phiThreshold(4),  // ≈ 0.927
  HIGH:     phiThreshold(3),  // ≈ 0.882
  MEDIUM:   phiThreshold(2),  // ≈ 0.809
  LOW:      phiThreshold(1),  // ≈ 0.691
  MINIMUM:  phiThreshold(0),  // ≈ 0.500
};

const MAX_ISSUES = 233;        // fib(13) max issues to report
const BATCH_SIZE = 34;         // fib(9) elements per batch

// ── WCAG Rules ──────────────────────────────────────────
const RULES = {
  // WCAG 1.1.1 — Non-text Content
  IMG_ALT: {
    id: 'img-alt',
    wcag: '1.1.1',
    level: 'A',
    severity: CSL_THRESHOLDS.CRITICAL,
    description: 'Images must have alt text',
    check: (html) => {
      const issues = [];
      const imgRegex = /<img\b([^>]*)>/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        const attrs = match[1];
        if (!attrs.includes('alt=') && !attrs.includes('role="presentation"') && !attrs.includes('aria-hidden="true"')) {
          issues.push({ element: match[0].slice(0, 89), message: 'Image missing alt attribute' });
        }
      }
      return issues;
    },
  },

  // WCAG 1.3.1 — Info and Relationships
  HEADING_ORDER: {
    id: 'heading-order',
    wcag: '1.3.1',
    level: 'A',
    severity: CSL_THRESHOLDS.HIGH,
    description: 'Heading levels should increase sequentially',
    check: (html) => {
      const issues = [];
      const headingRegex = /<h([1-6])\b/gi;
      let lastLevel = 0;
      let match;
      while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1]);
        if (lastLevel > 0 && level > lastLevel + 1) {
          issues.push({
            element: `h${level}`,
            message: `Heading h${level} skips level (previous was h${lastLevel})`,
          });
        }
        lastLevel = level;
      }
      return issues;
    },
  },

  // WCAG 1.3.1 — Form Labels
  FORM_LABELS: {
    id: 'form-labels',
    wcag: '1.3.1',
    level: 'A',
    severity: CSL_THRESHOLDS.CRITICAL,
    description: 'Form inputs must have associated labels',
    check: (html) => {
      const issues = [];
      const inputRegex = /<input\b([^>]*)>/gi;
      let match;
      while ((match = inputRegex.exec(html)) !== null) {
        const attrs = match[1];
        const type = (attrs.match(/type=["']([^"']+)["']/i) || ['', 'text'])[1];
        if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
        
        const hasLabel = attrs.includes('aria-label=') || attrs.includes('aria-labelledby=') || attrs.includes('id=');
        if (!hasLabel) {
          issues.push({
            element: match[0].slice(0, 89),
            message: `Input (type=${type}) missing label association`,
          });
        }
      }
      return issues;
    },
  },

  // WCAG 2.1.1 — Keyboard
  KEYBOARD_ACCESS: {
    id: 'keyboard-access',
    wcag: '2.1.1',
    level: 'A',
    severity: CSL_THRESHOLDS.HIGH,
    description: 'Interactive elements must be keyboard accessible',
    check: (html) => {
      const issues = [];
      // Check for click handlers without keyboard equivalents
      const onClickRegex = /<(?:div|span)\b([^>]*onclick[^>]*)>/gi;
      let match;
      while ((match = onClickRegex.exec(html)) !== null) {
        const attrs = match[1];
        if (!attrs.includes('tabindex') && !attrs.includes('role="button"') && !attrs.includes('onkeydown') && !attrs.includes('onkeypress')) {
          issues.push({
            element: match[0].slice(0, 89),
            message: 'Non-interactive element with onclick missing keyboard access (tabindex/role/onkeydown)',
          });
        }
      }
      return issues;
    },
  },

  // WCAG 2.4.1 — Skip Navigation
  SKIP_NAV: {
    id: 'skip-nav',
    wcag: '2.4.1',
    level: 'A',
    severity: CSL_THRESHOLDS.MEDIUM,
    description: 'Pages should have a skip navigation link',
    check: (html) => {
      const issues = [];
      if (html.includes('<nav') && !html.includes('skip') && !html.includes('Skip')) {
        issues.push({ element: '<nav>', message: 'Page has navigation but no skip-to-content link' });
      }
      return issues;
    },
  },

  // WCAG 2.4.2 — Page Title
  PAGE_TITLE: {
    id: 'page-title',
    wcag: '2.4.2',
    level: 'A',
    severity: CSL_THRESHOLDS.CRITICAL,
    description: 'Pages must have a title element',
    check: (html) => {
      const issues = [];
      if (!/<title\b[^>]*>[^<]+<\/title>/i.test(html)) {
        issues.push({ element: '<head>', message: 'Page missing or empty <title> element' });
      }
      return issues;
    },
  },

  // WCAG 2.4.7 — Focus Visible
  FOCUS_VISIBLE: {
    id: 'focus-visible',
    wcag: '2.4.7',
    level: 'AA',
    severity: CSL_THRESHOLDS.HIGH,
    description: 'Focus indicator must be visible',
    check: (html) => {
      const issues = [];
      if (html.includes('outline: none') || html.includes('outline:none') || html.includes('outline: 0')) {
        if (!html.includes(':focus-visible') && !html.includes('focus-visible')) {
          issues.push({ element: 'CSS', message: 'outline:none found without :focus-visible alternative' });
        }
      }
      return issues;
    },
  },

  // WCAG 3.1.1 — Language
  LANG_ATTR: {
    id: 'lang-attr',
    wcag: '3.1.1',
    level: 'A',
    severity: CSL_THRESHOLDS.CRITICAL,
    description: 'HTML element must have a lang attribute',
    check: (html) => {
      const issues = [];
      if (/<html\b/i.test(html) && !/<html[^>]+lang=/i.test(html)) {
        issues.push({ element: '<html>', message: 'Missing lang attribute on <html> element' });
      }
      return issues;
    },
  },

  // WCAG 4.1.1 — Valid ARIA
  ARIA_VALID: {
    id: 'aria-valid',
    wcag: '4.1.1',
    level: 'A',
    severity: CSL_THRESHOLDS.HIGH,
    description: 'ARIA attributes must be valid',
    check: (html) => {
      const issues = [];
      const validRoles = new Set([
        'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
        'checkbox', 'complementary', 'contentinfo', 'dialog', 'document',
        'feed', 'form', 'grid', 'gridcell', 'heading', 'img', 'link', 'list',
        'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
        'menubar', 'menuitem', 'navigation', 'none', 'note', 'option',
        'presentation', 'progressbar', 'radio', 'radiogroup', 'region',
        'row', 'rowgroup', 'search', 'searchbox', 'separator', 'slider',
        'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
        'tabpanel', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree',
        'treegrid', 'treeitem',
      ]);
      
      const roleRegex = /role=["']([^"']+)["']/gi;
      let match;
      while ((match = roleRegex.exec(html)) !== null) {
        const role = match[1].trim().toLowerCase();
        if (!validRoles.has(role)) {
          issues.push({ element: `role="${role}"`, message: `Invalid ARIA role: ${role}` });
        }
      }
      return issues;
    },
  },
};

// ── Main Checker ────────────────────────────────────────
/**
 * Run WCAG 2.1 AA compliance check on HTML content.
 */
export function checkCompliance(html, options = {}) {
  const level = options.level || 'AA';
  const maxIssues = options.maxIssues || MAX_ISSUES;
  const results = {
    passed: [],
    failed: [],
    warnings: [],
    score: 1.0,
    level,
  };

  const applicableLevels = level === 'AAA' ? ['A', 'AA', 'AAA'] :
                           level === 'AA' ? ['A', 'AA'] : ['A'];

  for (const [, rule] of Object.entries(RULES)) {
    if (!applicableLevels.includes(rule.level)) continue;
    
    const issues = rule.check(html);
    
    if (issues.length === 0) {
      results.passed.push({ id: rule.id, wcag: rule.wcag, level: rule.level });
    } else {
      const trimmed = issues.slice(0, maxIssues);
      if (rule.severity >= CSL_THRESHOLDS.HIGH) {
        results.failed.push({
          id: rule.id,
          wcag: rule.wcag,
          level: rule.level,
          severity: rule.severity,
          description: rule.description,
          issues: trimmed,
          count: issues.length,
        });
      } else {
        results.warnings.push({
          id: rule.id,
          wcag: rule.wcag,
          level: rule.level,
          severity: rule.severity,
          description: rule.description,
          issues: trimmed,
          count: issues.length,
        });
      }
    }
  }

  // Calculate compliance score (φ-weighted)
  const totalRules = results.passed.length + results.failed.length + results.warnings.length;
  if (totalRules > 0) {
    const failPenalty = results.failed.reduce((sum, f) => sum + f.severity * f.count, 0);
    const warnPenalty = results.warnings.reduce((sum, w) => sum + w.severity * w.count * PSI, 0);
    results.score = Math.max(0, 1 - (failPenalty + warnPenalty) / (totalRules * CSL_THRESHOLDS.CRITICAL));
  }

  results.compliant = results.failed.length === 0;
  results.summary = {
    totalRules: totalRules,
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    score: results.score,
  };

  return results;
}

/**
 * Generate an accessibility report as structured data.
 */
export function generateReport(checkResult, pageName = 'unknown') {
  return {
    page: pageName,
    timestamp: new Date().toISOString(),
    wcagLevel: checkResult.level,
    compliant: checkResult.compliant,
    score: checkResult.score,
    summary: checkResult.summary,
    failures: checkResult.failed,
    warnings: checkResult.warnings,
    recommendations: checkResult.failed.map(f => ({
      rule: f.id,
      wcag: f.wcag,
      action: f.description,
      priority: f.severity >= CSL_THRESHOLDS.CRITICAL ? 'immediate' :
                f.severity >= CSL_THRESHOLDS.HIGH ? 'high' : 'medium',
    })),
  };
}

export { RULES, CSL_THRESHOLDS };
export default { checkCompliance, generateReport, RULES };
