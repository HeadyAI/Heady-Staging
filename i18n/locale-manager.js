/**
 * locale-manager.js — Runtime Locale Management for Heady Platform
 *
 * Provides translation lookup, locale negotiation, pluralization,
 * interpolation, and fallback chains. φ-scaled cache, Fibonacci batch loading.
 *
 * Eric Haywood — HeadySystems
 * License: PROPRIETARY
 */

import { PHI, PSI, phiThreshold } from '../shared/phi-math.js';

// ── φ-Derived Constants ──────────────────────────────────
const CACHE_SIZE         = 987;          // fib(16) cached translations
const MAX_INTERPOLATIONS = 13;           // fib(7) per string
const FALLBACK_DEPTH     = 5;            // fib(5) locale fallback chain
const DEFAULT_LOCALE     = 'en';

// ── Supported Locales ────────────────────────────────────
const SUPPORTED_LOCALES = new Map([
  ['en',    { name: 'English',     dir: 'ltr', pluralRules: 'english' }],
  ['es',    { name: 'Español',     dir: 'ltr', pluralRules: 'romance' }],
  ['fr',    { name: 'Français',    dir: 'ltr', pluralRules: 'romance' }],
  ['de',    { name: 'Deutsch',     dir: 'ltr', pluralRules: 'germanic' }],
  ['ja',    { name: '日本語',       dir: 'ltr', pluralRules: 'east_asian' }],
  ['zh',    { name: '中文',         dir: 'ltr', pluralRules: 'east_asian' }],
  ['ko',    { name: '한국어',       dir: 'ltr', pluralRules: 'east_asian' }],
  ['ar',    { name: 'العربية',     dir: 'rtl', pluralRules: 'arabic' }],
  ['pt',    { name: 'Português',   dir: 'ltr', pluralRules: 'romance' }],
  ['hi',    { name: 'हिन्दी',        dir: 'ltr', pluralRules: 'indic' }],
  ['ru',    { name: 'Русский',     dir: 'ltr', pluralRules: 'slavic' }],
  ['it',    { name: 'Italiano',    dir: 'ltr', pluralRules: 'romance' }],
  ['nl',    { name: 'Nederlands',  dir: 'ltr', pluralRules: 'germanic' }],
]);

// ── Pluralization Rules ─────────────────────────────────
const PLURAL_RULES = {
  english:   (n) => n === 1 ? 'one' : 'other',
  romance:   (n) => n === 0 || n === 1 ? 'one' : 'other',
  germanic:  (n) => n === 1 ? 'one' : 'other',
  east_asian: () => 'other',  // No plural forms
  arabic:    (n) => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const mod100 = n % 100;
    if (mod100 >= 3 && mod100 <= 10) return 'few';
    if (mod100 >= 11 && mod100 <= 99) return 'many';
    return 'other';
  },
  slavic:    (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'other';
  },
  indic:     (n) => n === 0 || n === 1 ? 'one' : 'other',
};

// ── Translation Cache ────────────────────────────────────
const translationCache = new Map();

function cacheKey(locale, key) {
  return `${locale}:${key}`;
}

function cacheGet(locale, key) {
  const ck = cacheKey(locale, key);
  const v = translationCache.get(ck);
  if (v !== undefined) {
    translationCache.delete(ck);
    translationCache.set(ck, v);
  }
  return v;
}

function cacheSet(locale, key, value) {
  if (translationCache.size >= CACHE_SIZE) {
    const oldest = translationCache.keys().next().value;
    translationCache.delete(oldest);
  }
  translationCache.set(cacheKey(locale, key), value);
}

// ── Locale Manager ──────────────────────────────────────
/**
 * Create a locale manager instance.
 */
export function createLocaleManager(options = {}) {
  const translations = new Map(); // locale -> { key -> value }
  let currentLocale = options.defaultLocale || DEFAULT_LOCALE;

  return {
    /**
     * Load translations for a locale.
     */
    loadLocale(locale, data) {
      if (!SUPPORTED_LOCALES.has(locale) && locale !== DEFAULT_LOCALE) {
        throw new Error(`Unsupported locale: ${locale}`);
      }
      
      // Flatten nested structure
      const flat = {};
      function flatten(obj, prefix = '') {
        for (const [k, v] of Object.entries(obj)) {
          if (k === '_meta') continue;
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            flatten(v, fullKey);
          } else {
            flat[fullKey] = v;
          }
        }
      }
      flatten(data);
      translations.set(locale, flat);
    },

    /**
     * Set the active locale.
     */
    setLocale(locale) {
      if (!SUPPORTED_LOCALES.has(locale)) {
        throw new Error(`Unsupported locale: ${locale}`);
      }
      currentLocale = locale;
    },

    /**
     * Get the active locale.
     */
    getLocale() {
      return currentLocale;
    },

    /**
     * Get locale metadata.
     */
    getLocaleInfo(locale = currentLocale) {
      return SUPPORTED_LOCALES.get(locale) || null;
    },

    /**
     * Translate a key with interpolation and pluralization.
     * @param {string} key — Translation key
     * @param {object} params — Interpolation params and count for pluralization
     */
    t(key, params = {}) {
      // Check cache first
      const cached = cacheGet(currentLocale, key);
      if (cached !== undefined && Object.keys(params).length === 0) return cached;

      // Build fallback chain
      const chain = this.getFallbackChain(currentLocale);
      let value = null;
      
      for (const locale of chain) {
        const localeData = translations.get(locale);
        if (!localeData) continue;
        
        // Handle pluralization
        if (params.count !== undefined) {
          const localeInfo = SUPPORTED_LOCALES.get(locale) || SUPPORTED_LOCALES.get(DEFAULT_LOCALE);
          const ruleName = localeInfo?.pluralRules || 'english';
          const rule = PLURAL_RULES[ruleName] || PLURAL_RULES.english;
          const pluralForm = rule(params.count);
          
          const pluralKey = `${key}.${pluralForm}`;
          if (localeData[pluralKey]) {
            value = localeData[pluralKey];
            break;
          }
        }
        
        if (localeData[key]) {
          value = localeData[key];
          break;
        }
      }

      if (value === null) {
        // Return key itself as fallback
        return key;
      }

      // Interpolation
      let result = value;
      let interpolations = 0;
      for (const [param, val] of Object.entries(params)) {
        if (interpolations >= MAX_INTERPOLATIONS) break;
        result = result.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(val));
        interpolations++;
      }

      // Cache if no params
      if (Object.keys(params).length === 0) {
        cacheSet(currentLocale, key, result);
      }

      return result;
    },

    /**
     * Build locale fallback chain.
     * en-US → en → default
     */
    getFallbackChain(locale) {
      const chain = [locale];
      // Add base language (en-US → en)
      if (locale.includes('-')) {
        chain.push(locale.split('-')[0]);
      }
      // Add default
      if (!chain.includes(DEFAULT_LOCALE)) {
        chain.push(DEFAULT_LOCALE);
      }
      return chain.slice(0, FALLBACK_DEPTH);
    },

    /**
     * Negotiate locale from Accept-Language header.
     */
    negotiateLocale(acceptLanguage) {
      if (!acceptLanguage) return DEFAULT_LOCALE;
      
      const requested = acceptLanguage
        .split(',')
        .map(part => {
          const [lang, qPart] = part.trim().split(';');
          const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1.0;
          return { lang: lang.trim().toLowerCase(), q };
        })
        .sort((a, b) => b.q - a.q);

      for (const { lang } of requested) {
        if (SUPPORTED_LOCALES.has(lang)) return lang;
        const base = lang.split('-')[0];
        if (SUPPORTED_LOCALES.has(base)) return base;
      }
      
      return DEFAULT_LOCALE;
    },

    /**
     * Check if all keys have translations for a locale.
     */
    getCoverage(locale) {
      const baseKeys = translations.get(DEFAULT_LOCALE);
      const targetKeys = translations.get(locale);
      if (!baseKeys || !targetKeys) return { covered: 0, total: 0, pct: 0 };
      
      const baseCount = Object.keys(baseKeys).length;
      let covered = 0;
      for (const key of Object.keys(baseKeys)) {
        if (targetKeys[key]) covered++;
      }
      return { covered, total: baseCount, pct: baseCount > 0 ? covered / baseCount : 0 };
    },

    /**
     * List supported locales.
     */
    getSupportedLocales() {
      return Array.from(SUPPORTED_LOCALES.entries()).map(([code, info]) => ({
        code,
        ...info,
      }));
    },

    /**
     * Express/Connect middleware for automatic locale detection.
     */
    middleware() {
      return (req, res, next) => {
        const locale = this.negotiateLocale(req.headers?.['accept-language']);
        req.locale = locale;
        req.t = (key, params) => this.t(key, params);
        res.setHeader('Content-Language', locale);
        
        const localeInfo = SUPPORTED_LOCALES.get(locale);
        if (localeInfo?.dir === 'rtl') {
          res.setHeader('X-Content-Direction', 'rtl');
        }
        next();
      };
    },

    /** Flush translation cache */
    flushCache() {
      translationCache.clear();
    },
  };
}

export { SUPPORTED_LOCALES, PLURAL_RULES, DEFAULT_LOCALE };
export default { createLocaleManager, SUPPORTED_LOCALES, PLURAL_RULES };
