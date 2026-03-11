/**
 * @heady-ai/shared-ui — Brand Configuration
 * 
 * Resolves the current domain to its brand configuration
 * from the centralized domain registry.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface DomainEntry {
    domain: string;
    siteId: string;
    node: string;
    type: string;
    group: string;
    purpose: string;
    sitePath: string;
    productRefs: string[];
    primaryAudience: string[];
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    seo: { title: string; description: string; ogImage: string };
    theme: { primary: string; secondary: string; accent: string; font: string };
    status: string;
}

interface DomainRegistry {
    version: string;
    brand: string;
    organization: string;
    domains: DomainEntry[];
}

let _registry: DomainRegistry | null = null;

/**
 * Load the domain registry from configs/domains.json
 */
export function loadRegistry(registryPath?: string): DomainRegistry {
    if (_registry) return _registry;

    const path = registryPath || join(process.cwd(), 'configs', 'domains.json');
    const raw = readFileSync(path, 'utf-8');
    _registry = JSON.parse(raw) as DomainRegistry;
    return _registry;
}

/**
 * Resolve a domain string to its full configuration.
 * Falls back to HEADY_DOMAIN env var if no domain provided.
 */
export function resolveBrand(domain?: string): DomainEntry | null {
    const registry = loadRegistry();
    const target = domain || process.env.HEADY_DOMAIN || '';

    return registry.domains.find(d => d.domain === target) || null;
}

/**
 * Get the theme for a domain.
 */
export function resolveTheme(domain?: string) {
    const brand = resolveBrand(domain);
    if (!brand) return null;
    return brand.theme;
}

/**
 * Get the SEO configuration for a domain.
 */
export function resolveSEO(domain?: string) {
    const brand = resolveBrand(domain);
    if (!brand) return null;
    return brand.seo;
}

/**
 * List all active domains.
 */
export function listActiveDomains(): DomainEntry[] {
    const registry = loadRegistry();
    return registry.domains.filter(d => d.status === 'active');
}

/**
 * List domains by group.
 */
export function listDomainsByGroup(group: string): DomainEntry[] {
    const registry = loadRegistry();
    return registry.domains.filter(d => d.group === group);
}
