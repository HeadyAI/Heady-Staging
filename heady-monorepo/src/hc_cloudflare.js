/**
 * ∞ HeadyCloudflare — Cloudflare API Manager
 * Manages DNS records, Workers, Pages, Tunnels, and edge configuration.
 * © 2026 Heady™Systems Inc.
 */

const logger = require('./utils/logger');

class CloudflareManager {
    constructor(secretsManager) {
        this.secretsManager = secretsManager;
        this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
        this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
        this.baseUrl = 'https://api.cloudflare.com/client/v4';
        this.zoneCache = new Map();
        this.lastTokenCheck = 0;
        this.tokenValid = false;
    }

    isTokenValid() {
        if (!this.apiToken) return false;
        if (Date.now() - this.lastTokenCheck < 300000) return this.tokenValid;
        return this._checkToken();
    }

    async _checkToken() {
        try {
            const resp = await fetch(`${this.baseUrl}/user/tokens/verify`, {
                headers: { 'Authorization': `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' }
            });
            const data = await resp.json();
            this.tokenValid = data.success === true;
            this.lastTokenCheck = Date.now();
            return this.tokenValid;
        } catch (err) {
            logger.logNodeActivity('CLOUDFLARE', `Token check failed: ${err.message}`);
            this.tokenValid = false;
            this.lastTokenCheck = Date.now();
            return false;
        }
    }

    async _request(method, path, body = null) {
        const opts = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
            },
        };
        if (body) opts.body = JSON.stringify(body);
        const resp = await fetch(`${this.baseUrl}${path}`, opts);
        const data = await resp.json();
        if (!data.success) {
            const errors = (data.errors || []).map(e => e.message).join(', ');
            throw new Error(`Cloudflare API error: ${errors}`);
        }
        return data;
    }

    async listZones() {
        const data = await this._request('GET', '/zones');
        for (const zone of data.result || []) {
            this.zoneCache.set(zone.name, zone.id);
        }
        return data.result || [];
    }

    async getZoneId(domain) {
        if (this.zoneCache.has(domain)) return this.zoneCache.get(domain);
        await this.listZones();
        return this.zoneCache.get(domain) || null;
    }

    async listDnsRecords(zoneId, params = {}) {
        const query = new URLSearchParams(params).toString();
        const path = `/zones/${zoneId}/dns_records${query ? '?' + query : ''}`;
        const data = await this._request('GET', path);
        return data.result || [];
    }

    async createDnsRecord(zoneId, record) {
        return this._request('POST', `/zones/${zoneId}/dns_records`, record);
    }

    async updateDnsRecord(zoneId, recordId, record) {
        return this._request('PUT', `/zones/${zoneId}/dns_records/${recordId}`, record);
    }

    async deleteDnsRecord(zoneId, recordId) {
        return this._request('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
    }

    async purgeCache(zoneId, { files = null, tags = null, purgeEverything = false } = {}) {
        const body = purgeEverything ? { purge_everything: true } : {};
        if (files) body.files = files;
        if (tags) body.tags = tags;
        return this._request('POST', `/zones/${zoneId}/purge_cache`, body);
    }

    async listWorkers() {
        const data = await this._request('GET', `/accounts/${this.accountId}/workers/scripts`);
        return data.result || [];
    }

    async deployWorker(name, script, bindings = []) {
        const formData = new FormData();
        formData.append('script', new Blob([script], { type: 'application/javascript' }), name);
        if (bindings.length > 0) {
            formData.append('metadata', JSON.stringify({ bindings, main_module: name }));
        }
        const resp = await fetch(
            `${this.baseUrl}/accounts/${this.accountId}/workers/scripts/${name}`,
            {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.apiToken}` },
                body: formData,
            }
        );
        return resp.json();
    }

    async listTunnels() {
        const data = await this._request('GET', `/accounts/${this.accountId}/cfd_tunnel`);
        return data.result || [];
    }

    async getAnalytics(zoneId, since = '-360') {
        const data = await this._request('GET', `/zones/${zoneId}/analytics/dashboard?since=${since}`);
        return data.result || {};
    }

    getStatus() {
        return {
            tokenSet: !!this.apiToken,
            tokenValid: this.tokenValid,
            accountId: this.accountId ? `${this.accountId.slice(0, 8)}...` : 'not set',
            cachedZones: this.zoneCache.size,
        };
    }
}

module.exports = { CloudflareManager };
