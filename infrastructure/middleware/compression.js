/**
 * Heady™ Compression Middleware
 * Gzip + Brotli with φ-scaled thresholds
 * © 2026 HeadySystems Inc.
 */

const zlib = require('zlib');

const PHI = 1.618033988749895;
const MIN_SIZE = 987; // Fibonacci — don't compress responses < 987 bytes

function compression(req, res, next) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks = [];

    res.write = function (chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    };

    res.end = function (chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const body = Buffer.concat(chunks);

        // Skip compression for small responses or non-compressible types
        const contentType = res.getHeader('content-type') || '';
        const isCompressible = /json|text|javascript|css|html|xml|svg/.test(contentType);

        if (body.length < MIN_SIZE || !isCompressible) {
            res.setHeader('Content-Length', body.length);
            originalWrite(body);
            return originalEnd();
        }

        // Prefer Brotli > Gzip
        if (acceptEncoding.includes('br')) {
            zlib.brotliCompress(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } }, (err, compressed) => {
                if (err) { originalWrite(body); return originalEnd(); }
                res.setHeader('Content-Encoding', 'br');
                res.setHeader('Content-Length', compressed.length);
                res.removeHeader('Content-Length');
                originalWrite(compressed);
                originalEnd();
            });
        } else if (acceptEncoding.includes('gzip')) {
            zlib.gzip(body, { level: 6 }, (err, compressed) => {
                if (err) { originalWrite(body); return originalEnd(); }
                res.setHeader('Content-Encoding', 'gzip');
                res.removeHeader('Content-Length');
                originalWrite(compressed);
                originalEnd();
            });
        } else {
            res.setHeader('Content-Length', body.length);
            originalWrite(body);
            originalEnd();
        }
    };

    next();
}

module.exports = { compression };
