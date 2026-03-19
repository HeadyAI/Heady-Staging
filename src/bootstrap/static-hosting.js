/*
 * © 2026 Heady™Systems Inc.
 * PROPRIETARY AND CONFIDENTIAL.
 *
 * Static Hosting — Serves public assets with edge-aware caching headers.
 * Drupal handles all dynamic UI; this only serves:
 *   - /public/* static files (icons, manifests, CSS, JS widgets)
 *   - /.well-known/* for domain verification
 *   - Health check endpoint at /healthz
 */

const path = require("path");
const express = require("express");
const fs = require("fs");
const logger = require("../../shared/logger").createChildLogger("static-hosting");

const PHI = 1.6180339887498948;

// Cache durations (φ-scaled seconds)
const CACHE_IMMUTABLE = Math.round(PHI * 365 * 86400);  // ~1 year (hashed assets)
const CACHE_STATIC    = Math.round(PHI * 86400);          // ~1.6 days (icons, manifests)
const CACHE_VOLATILE  = 0;                                 // no-cache (healthz, well-known)

/**
 * Mount static hosting middleware on the Express app.
 *
 * @param {Express.Application} app
 * @param {string} projectRoot - Root directory of the project
 */
function mountStaticHosting(app, projectRoot) {
    const publicDir = path.resolve(projectRoot || process.cwd(), "public");

    if (!fs.existsSync(publicDir)) {
        logger.warn("Static hosting: public/ directory not found, skipping");
        return;
    }

    // Health check — always available, no cache
    app.get("/healthz", (_req, res) => {
        res.set("Cache-Control", "no-store");
        res.json({
            status: "ok",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            node: process.version,
        });
    });

    // Static assets from public/ with cache headers
    app.use(express.static(publicDir, {
        maxAge: CACHE_STATIC * 1000,
        etag: true,
        lastModified: true,
        setHeaders(res, filePath) {
            // Hashed assets get immutable cache
            if (/\.[a-f0-9]{8,}\.(js|css|woff2?)$/i.test(filePath)) {
                res.set("Cache-Control", `public, max-age=${CACHE_IMMUTABLE}, immutable`);
            }
            // Manifests and icons — moderate cache
            if (/\.(json|png|ico|svg|webmanifest)$/i.test(filePath)) {
                res.set("Cache-Control", `public, max-age=${CACHE_STATIC}`);
            }
        },
    }));

    // .well-known — domain verification, no cache
    const wellKnownDir = path.resolve(projectRoot || process.cwd(), ".well-known");
    if (fs.existsSync(wellKnownDir)) {
        app.use("/.well-known", express.static(wellKnownDir, { maxAge: 0 }));
    }
}

module.exports = { mountStaticHosting };
