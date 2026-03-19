/**
 * Heady™ Site Registry — All 60 domains
 * Each site materializes from CSL gate evaluation, not static config.
 */
import { PHI_TIMING, PSI } from './csl-engine';

interface SiteEntry { repo: string; tier: string; cacheTtl: number }

function r(repo: string, tier: string, ttl: number): SiteEntry {
  return { repo, tier, cacheTtl: ttl };
}

// Auto-register domain + www variant
function dual(domain: string, repo: string, tier: string, ttl: number): Record<string, SiteEntry> {
  return { [domain]: r(repo, tier, ttl), [`www.${domain}`]: r(repo, tier, ttl) };
}

const E = PHI_TIMING.EPOCH, T = PHI_TIMING.TIDE, C = PHI_TIMING.CYCLE;
const F = PHI_TIMING.FLOW, S = PHI_TIMING.SURGE;

export const SITE_REGISTRY: Record<string, SiteEntry> = {
  // ── Core ──────────────────────────────────────────────
  ...dual('headyme.com',            'headyme',             'core', E),
  ...dual('headysystems.com',       'headysystems',        'core', E),
  ...dual('headyconnection.com',    'headyconnection',     'core', E),
  ...dual('headyconnection.org',    'headyconnection-org', 'core', E),
  ...dual('headybuddy.org',         'headybuddy-org',      'core', E),
  ...dual('headybot.com',           'headybot',            'core', E),
  ...dual('1ime1.com',              '1ime1',               'core', E),
  ...dual('1imi1.com',              '1imi1',               'core', E),
  'instant.headysystems.com': r('instant', 'core', T),

  // ── Product / Platform ────────────────────────────────
  ...dual('headyos.com',            'headyos',             'product', T),
  ...dual('headyapi.com',           'headyapi',            'product', T),
  ...dual('headymcp.com',           'headymcp-com',        'product', T),
  ...dual('headyio.com',            'headyio-com',         'product', T),
  ...dual('headyweb.com',           'headyweb',            'product', T),
  ...dual('heady-ai.com',           'heady-ai',            'product', T),
  ...dual('headycloud.com',         'headycloud',          'product', T),
  ...dual('headycore.com',          'headycore',           'product', T),
  ...dual('headyagent.com',         'headyagent',          'product', T),
  ...dual('headyadvisor.com',       'headyadvisor',        'product', T),
  ...dual('headyassist.com',        'headyassist',         'product', T),
  ...dual('headycheck.com',         'headycheck',          'product', T),
  ...dual('headylens.com',         'headysense',          'product', T),
  ...dual('headydb.com',            'headydb',             'product', T),
  ...dual('headysafe.com',          'headysafe',           'product', T),
  ...dual('headysecure.com',        'headysecure',         'product', T),
  ...dual('headyvault.com',         'headyvault',          'product', T),
  ...dual('headykey.com',           'headykey',            'product', T),
  ...dual('headycrypt.com',         'headycrypt',          'product', T),
  ...dual('headytube.com',          'headytube',           'product', T),
  ...dual('headystudio.com',        'headystudio',         'product', T),
  ...dual('headylibrary.com',       'headylibrary',        'product', T),
  ...dual('headyarchive.com',       'headyarchive',        'product', T),
  ...dual('headyplus.com',          'headyplus',           'product', T),
  ...dual('headyu.com',             'headyu',              'product', T),
  ...dual('headyusa.com',           'headyusa',            'product', T),
  ...dual('headyhome.com',          'headyhome',           'product', T),
  ...dual('headybet.com',           'headybet',            'product', T),
  ...dual('headybare.com',          'headybare',           'product', T),
  ...dual('headyaid.com',           'headyaid',            'product', T),
  ...dual('headyassure.com',        'headyassure',         'product', T),
  ...dual('headyfed.com',           'headyfed',            'product', T),
  ...dual('headykiosk.com',         'headykiosk',          'product', T),
  ...dual('headymx.com',            'headymx',             'product', T),
  ...dual('headyship.com',          'headyship',           'product', T),
  ...dual('headystate.com',         'headystate',          'product', T),
  ...dual('headytxt.com',           'headytxt',            'product', T),
  ...dual('headycreator.com',       'headycreator',        'product', T),
  ...dual('headymd.com',            'headymd',             'product', T),

  // ── Verticals ─────────────────────────────────────────
  ...dual('headyfinance.com',       'headyfinance',        'vertical', C),
  ...dual('headymusic.com',         'headymusic',          'vertical', C),
  ...dual('headystore.com',         'headystore',          'vertical', C),
  ...dual('headyex.com',            'headyex',             'vertical', C),
  ...dual('headylegal.com',         'headylegal',          'vertical', C),
  ...dual('headyrx.com',            'headyrx',             'vertical', C),
  ...dual('headygov.com',           'headygov',            'vertical', C),
  ...dual('headycorrections.com',   'headycorrections',    'vertical', C),
  ...dual('headymanufacturing.com', 'headymanufacturing',  'vertical', C),
  ...dual('headybio.com',           'headybio',            'vertical', C),
  ...dual('headyfield.com',         'headyfield',          'vertical', C),

  // ── Community ─────────────────────────────────────────
  ...dual('openmindsplace.com',     'openmindsplace',      'product', T),
  ...dual('openmindstop.com',       'openmindstop',        'product', T),

  // ── Internal (headysystems.com subdomains) ────────────
  'admin.headysystems.com':      r('admin-ui',         'internal', F),
  'metrics.headysystems.com':    r('heady-metrics',    'internal', F),
  'logs.headysystems.com':       r('heady-logs',       'internal', F),
  'traces.headysystems.com':     r('heady-traces',     'internal', F),
  'sentinel.headysystems.com':   r('heady-sentinel',   'internal', F),
  'observer.headysystems.com':   r('heady-observer',   'internal', F),
  'patterns.headysystems.com':   r('heady-patterns',   'internal', F),

  // ── Compute (headysystems.com subdomains) ─────────────
  'critique.headysystems.com':   r('heady-critique',   'compute', S),
  'pythia.headysystems.com':     r('heady-pythia',     'compute', S),
  'vinci.headysystems.com':      r('heady-vinci',      'compute', S),
  'montecarlo.headysystems.com': r('heady-montecarlo', 'compute', S),
  'kinetics.headysystems.com':   r('heady-kinetics',   'compute', S),
  'maestro.headysystems.com':    r('heady-maestro',    'compute', S),
  'builder.headysystems.com':    r('heady-builder',    'compute', S),
  'stories.headysystems.com':    r('heady-stories',    'compute', S),
};
