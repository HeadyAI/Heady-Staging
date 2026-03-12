#!/usr/bin/env node
/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * Heady™ Platform Health Check
 * Runs comprehensive checks on all services and sites.
 */
const http = require('http');

const SERVICES = [
    { name: 'HeadyManager', url: 'http://localhost:3301/health/live' },
];

const SITES = [
    { name: 'HeadySystems', port: 9000 },
    { name: 'HeadyMe', port: 9001 },
    { name: 'HeadyConnection', port: 9002 },
    { name: 'HeadyBuddy', port: 9003 },
    { name: 'HeadyMCP', port: 9004 },
    { name: 'HeadyIO', port: 9005 },
    { name: 'HeadyAPI', port: 9006 },
    { name: 'HeadyOS', port: 9007 },
    { name: 'Discord', port: 9008 },
    { name: 'DiscordConn', port: 9009 },
    { name: 'HeadyIO-com', port: 9010 },
    { name: 'HeadyBuddy-org', port: 9011 },
    { name: 'HeadyConn-org', port: 9012 },
    { name: 'HeadyMe-com', port: 9013 },
    { name: 'HeadyMCP-com', port: 9014 },
    { name: 'HeadySys-com', port: 9015 },
    { name: '1ime1', port: 9016 },
    { name: 'AdminUI', port: 9017 },
    { name: 'Instant', port: 9018 },
    { name: 'HeadyDocs', port: 9019 },
    { name: 'HeadyWeb', port: 3000 },
];

function checkUrl(url, timeout = 3000) {
    return new Promise((resolve) => {
        const req = http.get(url, { timeout }, (res) => {
            resolve({ ok: res.statusCode < 400, status: res.statusCode });
        });
        req.on('error', () => resolve({ ok: false, status: 'ERR' }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT' }); });
    });
}

async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  🏥 Heady™ Platform Health Check');
    console.log('═══════════════════════════════════════════════\n');

    let total = 0, passing = 0;

    // Core services
    console.log('── Core Services ──');
    for (const svc of SERVICES) {
        total++;
        const result = await checkUrl(svc.url);
        const icon = result.ok ? '✅' : '❌';
        if (result.ok) passing++;
        console.log(`  ${icon} ${svc.name}: ${result.status}`);
    }

    // Sites
    console.log('\n── Sites ──');
    const siteResults = await Promise.all(
        SITES.map(async (site) => {
            total++;
            const result = await checkUrl(`http://localhost:${site.port}/`);
            if (result.ok) passing++;
            return { ...site, ...result };
        })
    );

    for (const site of siteResults) {
        const icon = site.ok ? '✅' : '❌';
        console.log(`  ${icon} ${site.name} (:${site.port}): ${site.status}`);
    }

    console.log(`\n── Summary ──`);
    console.log(`  ${passing}/${total} services healthy (${Math.round(passing / total * 100)}%)`);
    console.log('═══════════════════════════════════════════════');

    process.exit(passing === total ? 0 : 1);
}

main();
