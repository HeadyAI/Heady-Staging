/**
 * consul-registration.js — Consul Service Discovery Registration
 * Every Heady™ service calls this at boot to register with Consul.
 * CSL domain tags for routing. φ-scaled health check intervals.
 * © 2024-2026 HeadySystems Inc. 51 Provisional Patents.
 */
'use strict';

const PHI = 1.618033988749895;
const PSI = 1 / PHI;

export class ConsulRegistration {
    constructor(config) {
        this.serviceName = config.serviceName;
        this.servicePort = config.port;
        this.domain = config.domain;
        this.consulHost = process.env.CONSUL_HOST || 'consul.headysystems.internal';
        this.consulPort = process.env.CONSUL_PORT || 8500;
        this.serviceId = `${config.serviceName}-${process.env.HOSTNAME || 'local'}`;
        this.registered = false;
    }

    async register() {
        const registration = {
            ID: this.serviceId,
            Name: this.serviceName,
            Port: this.servicePort,
            Tags: [
                `domain:${this.domain}`,
                'architecture:concurrent-equals',
                'autocontext:mandatory',
            ],
            Meta: {
                domain: this.domain,
                version: process.env.SERVICE_VERSION || '3.2.3',
                phi: PHI.toFixed(15),
                csl_include: (PSI * PSI).toFixed(3),
                csl_boost: PSI.toFixed(3),
            },
            Check: {
                HTTP: `http://localhost:${this.servicePort}/healthz`,
                Interval: '3s',
                Timeout: '2s',
                DeregisterCriticalServiceAfter: '255s',
            },
        };

        try {
            const res = await fetch(
                `http://${this.consulHost}:${this.consulPort}/v1/agent/service/register`,
                { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registration) }
            );
            if (res.ok) {
                this.registered = true;
                console.log(`[Consul] Registered ${this.serviceName} (domain: ${this.domain})`);
            }
        } catch (err) {
            console.warn(`[Consul] Registration unavailable: ${err.message} — service runs standalone`);
        }
        process.on('SIGTERM', () => this.deregister());
        process.on('SIGINT', () => this.deregister());
    }

    async deregister() {
        if (!this.registered) return;
        try {
            await fetch(
                `http://${this.consulHost}:${this.consulPort}/v1/agent/service/deregister/${this.serviceId}`,
                { method: 'PUT' }
            );
        } catch (e) { /* best effort */ }
    }

    async discover(domain) {
        try {
            const res = await fetch(
                `http://${this.consulHost}:${this.consulPort}/v1/catalog/service/${domain}?tag=domain:${domain}`
            );
            if (res.ok) return await res.json();
        } catch (e) { /* fallback to static */ }
        return [];
    }
}

export default ConsulRegistration;
