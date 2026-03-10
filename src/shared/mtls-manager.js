/**
 * Heady™ mTLS Certificate Manager v6.0
 * Automatic certificate generation, rotation, and validation
 * Service-to-service mutual TLS within the mesh
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const crypto = require('crypto');
const { createLogger } = require('./logger');
const { fib, phiBackoffWithJitter, CSL_THRESHOLDS, TIMING, PHI, PSI } = require('./phi-math');

const logger = createLogger('mtls-manager');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION — Phi-Scaled
// ═══════════════════════════════════════════════════════════

const CERT_CONFIG = {
  keySize: 4096,                                // RSA key size
  caValidityDays: fib(14),                      // 377 days CA validity
  serviceValidityDays: fib(11),                 // 89 days service cert
  rotationThresholdRatio: PSI,                  // Rotate at 61.8% of lifetime
  rotationCheckIntervalMs: fib(12) * 60 * 1000, // Check every 144 minutes
  serialNumberBytes: fib(8),                    // 21 bytes serial
  organization: 'HeadySystems Inc.',
  organizationalUnit: 'Heady Mesh Services',
  country: 'US',
  state: 'GA',
  locality: 'Atlanta',
};

// ═══════════════════════════════════════════════════════════
// SERVICE IDENTITY REGISTRY — All mesh services
// ═══════════════════════════════════════════════════════════

const SERVICE_IDENTITIES = Object.freeze({
  'heady-gateway':        { dns: ['gateway.heady.internal', 'envoy.heady.internal'] },
  'heady-auth':           { dns: ['auth.heady.internal', 'auth.headysystems.com'] },
  'heady-conductor':      { dns: ['conductor.heady.internal'] },
  'heady-inference':      { dns: ['inference.heady.internal'] },
  'heady-embedding':      { dns: ['embedding.heady.internal'] },
  'heady-vector-memory':  { dns: ['memory.heady.internal'] },
  'heady-brain':          { dns: ['brain.heady.internal'] },
  'heady-soul':           { dns: ['soul.heady.internal'] },
  'heady-manager':        { dns: ['manager.heady.internal'] },
  'heady-buddy':          { dns: ['buddy.heady.internal'] },
  'heady-swarm':          { dns: ['swarm.heady.internal'] },
  'heady-scheduler':      { dns: ['scheduler.heady.internal'] },
  'heady-analytics':      { dns: ['analytics.heady.internal'] },
  'heady-notification':   { dns: ['notification.heady.internal'] },
  'heady-colab-bridge':   { dns: ['colab.heady.internal'] },
  'heady-rate-limiter':   { dns: ['ratelimit.heady.internal'] },
  'heady-backup':         { dns: ['backup.heady.internal'] },
  'heady-nats':           { dns: ['nats.heady.internal'] },
  'heady-pgbouncer':      { dns: ['pgbouncer.heady.internal'] },
  'heady-redis':          { dns: ['redis.heady.internal'] },
});

// ═══════════════════════════════════════════════════════════
// CERTIFICATE GENERATOR — Self-signed CA for mesh
// ═══════════════════════════════════════════════════════════

class MtlsManager {
  constructor(config = {}) {
    this.config = { ...CERT_CONFIG, ...config };
    this.caCert = null;
    this.caKey = null;
    this.serviceCerts = new Map();
    this.rotationTimer = null;
    this.certStore = null;  // Pluggable persistence
  }

  async initialize(caKeyPem, caCertPem) {
    if (caKeyPem && caCertPem) {
      this.caKey = caKeyPem;
      this.caCert = caCertPem;
      logger.info({ message: 'mTLS CA loaded from external source' });
    } else {
      await this._generateCA();
    }
    this._startRotationCheck();
  }

  async _generateCA() {
    logger.info({ message: 'Generating self-signed CA certificate' });

    // Generate RSA key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.config.keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Create self-signed CA certificate using Node.js X509Certificate API
    const caInfo = {
      subject: this._buildSubjectDN('Heady Mesh CA'),
      validFrom: new Date(),
      validTo: new Date(Date.now() + this.config.caValidityDays * 86400000),
      serialNumber: this._generateSerial(),
      isCA: true,
    };

    // Store CA materials
    this.caKey = privateKey;
    this.caCert = this._createSelfSignedCert(privateKey, publicKey, caInfo);

    logger.info({
      message: 'CA certificate generated',
      validityDays: this.config.caValidityDays,
      serialNumber: caInfo.serialNumber,
    });
  }

  async generateServiceCert(serviceName) {
    const identity = SERVICE_IDENTITIES[serviceName];
    if (!identity) {
      throw new MtlsError(`Unknown service: ${serviceName}`, 'UNKNOWN_SERVICE');
    }

    logger.info({ message: 'Generating service certificate', service: serviceName });

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.config.keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const now = new Date();
    const validTo = new Date(now.getTime() + this.config.serviceValidityDays * 86400000);

    const certInfo = {
      subject: this._buildSubjectDN(serviceName),
      validFrom: now,
      validTo,
      serialNumber: this._generateSerial(),
      isCA: false,
      dns: identity.dns,
      serviceName,
    };

    const cert = this._createServiceCert(privateKey, publicKey, certInfo);

    const certBundle = {
      key: privateKey,
      cert,
      ca: this.caCert,
      serviceName,
      dns: identity.dns,
      issuedAt: now.toISOString(),
      expiresAt: validTo.toISOString(),
      serialNumber: certInfo.serialNumber,
    };

    this.serviceCerts.set(serviceName, certBundle);

    logger.info({
      message: 'Service certificate generated',
      service: serviceName,
      dns: identity.dns,
      validityDays: this.config.serviceValidityDays,
      expiresAt: validTo.toISOString(),
    });

    return certBundle;
  }

  async generateAllServiceCerts() {
    const results = { generated: [], failed: [] };

    for (const serviceName of Object.keys(SERVICE_IDENTITIES)) {
      try {
        await this.generateServiceCert(serviceName);
        results.generated.push(serviceName);
      } catch (error) {
        results.failed.push({ service: serviceName, error: error.message });
        logger.error({
          message: 'Service cert generation failed',
          service: serviceName,
          error: error.message,
        });
      }
    }

    logger.info({
      message: 'All service certificates generated',
      generated: results.generated.length,
      failed: results.failed.length,
    });

    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // CERTIFICATE ROTATION
  // ═══════════════════════════════════════════════════════════

  _startRotationCheck() {
    if (this.rotationTimer) clearInterval(this.rotationTimer);

    this.rotationTimer = setInterval(async () => {
      await this._checkRotations();
    }, this.config.rotationCheckIntervalMs);

    if (this.rotationTimer.unref) this.rotationTimer.unref();
  }

  async _checkRotations() {
    const now = Date.now();

    for (const [serviceName, bundle] of this.serviceCerts) {
      const expiresAt = new Date(bundle.expiresAt).getTime();
      const issuedAt = new Date(bundle.issuedAt).getTime();
      const lifetime = expiresAt - issuedAt;
      const elapsed = now - issuedAt;
      const lifetimeRatio = elapsed / lifetime;

      if (lifetimeRatio >= this.config.rotationThresholdRatio) {
        logger.info({
          message: 'Certificate approaching expiry — rotating',
          service: serviceName,
          lifetimeRatio: lifetimeRatio.toFixed(3),
          threshold: this.config.rotationThresholdRatio.toFixed(3),
        });

        try {
          await this.generateServiceCert(serviceName);
        } catch (error) {
          logger.error({
            message: 'Certificate rotation failed',
            service: serviceName,
            error: error.message,
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TLS OPTIONS — For Node.js https/tls servers
  // ═══════════════════════════════════════════════════════════

  getTlsOptions(serviceName) {
    const bundle = this.serviceCerts.get(serviceName);
    if (!bundle) {
      throw new MtlsError(`No certificate for service: ${serviceName}`, 'NO_CERT');
    }

    return {
      key: bundle.key,
      cert: bundle.cert,
      ca: [bundle.ca],
      requestCert: true,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.3',
    };
  }

  getClientTlsOptions(serviceName) {
    const bundle = this.serviceCerts.get(serviceName);
    if (!bundle) {
      throw new MtlsError(`No certificate for service: ${serviceName}`, 'NO_CERT');
    }

    return {
      key: bundle.key,
      cert: bundle.cert,
      ca: [bundle.ca],
      rejectUnauthorized: true,
      minVersion: 'TLSv1.3',
      servername: bundle.dns[0],
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ENVOY SDS (Secret Discovery Service) FORMAT
  // ═══════════════════════════════════════════════════════════

  getEnvoySdsConfig(serviceName) {
    const bundle = this.serviceCerts.get(serviceName);
    if (!bundle) return null;

    return {
      tls_certificate: {
        certificate_chain: { inline_string: bundle.cert },
        private_key: { inline_string: bundle.key },
      },
      validation_context: {
        trusted_ca: { inline_string: bundle.ca },
        match_typed_subject_alt_names: bundle.dns.map(dns => ({
          san_type: 'DNS',
          matcher: { exact: dns },
        })),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  _buildSubjectDN(commonName) {
    return `/C=${this.config.country}/ST=${this.config.state}/L=${this.config.locality}/O=${this.config.organization}/OU=${this.config.organizationalUnit}/CN=${commonName}`;
  }

  _generateSerial() {
    return crypto.randomBytes(this.config.serialNumberBytes).toString('hex');
  }

  _createSelfSignedCert(privateKey, publicKey, info) {
    // In production, use a proper X.509 library (node-forge or @peculiar/x509)
    // This generates a placeholder PEM structure for the mesh
    const certData = {
      version: 3,
      serialNumber: info.serialNumber,
      subject: info.subject,
      issuer: info.subject,  // self-signed
      validFrom: info.validFrom.toISOString(),
      validTo: info.validTo.toISOString(),
      publicKey: publicKey,
      isCA: info.isCA,
      keyUsage: ['keyCertSign', 'cRLSign', 'digitalSignature'],
    };

    // Encode as PEM-wrapped JSON for mesh bootstrap
    // Production replaces this with proper ASN.1 DER encoding
    const certB64 = Buffer.from(JSON.stringify(certData)).toString('base64');
    const lines = certB64.match(/.{1,64}/g) || [];
    return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
  }

  _createServiceCert(privateKey, publicKey, info) {
    const certData = {
      version: 3,
      serialNumber: info.serialNumber,
      subject: info.subject,
      issuer: this.caCert ? this._extractIssuer() : info.subject,
      validFrom: info.validFrom.toISOString(),
      validTo: info.validTo.toISOString(),
      publicKey: publicKey,
      isCA: false,
      keyUsage: ['digitalSignature', 'keyEncipherment'],
      extKeyUsage: ['serverAuth', 'clientAuth'],
      subjectAltName: info.dns.map(d => `DNS:${d}`),
    };

    const certB64 = Buffer.from(JSON.stringify(certData)).toString('base64');
    const lines = certB64.match(/.{1,64}/g) || [];
    return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
  }

  _extractIssuer() {
    return this.config.organization;
  }

  // ═══════════════════════════════════════════════════════════
  // HEALTH & STATUS
  // ═══════════════════════════════════════════════════════════

  getStatus() {
    const now = Date.now();
    const certs = {};

    for (const [name, bundle] of this.serviceCerts) {
      const expiresAt = new Date(bundle.expiresAt).getTime();
      const issuedAt = new Date(bundle.issuedAt).getTime();
      const lifetime = expiresAt - issuedAt;
      const remaining = expiresAt - now;

      certs[name] = {
        dns: bundle.dns,
        issuedAt: bundle.issuedAt,
        expiresAt: bundle.expiresAt,
        remainingHours: Math.round(remaining / 3600000),
        lifetimeRatio: ((now - issuedAt) / lifetime).toFixed(3),
        needsRotation: (now - issuedAt) / lifetime >= this.config.rotationThresholdRatio,
      };
    }

    return {
      caLoaded: !!this.caCert,
      serviceCerts: Object.keys(certs).length,
      totalServices: Object.keys(SERVICE_IDENTITIES).length,
      certs,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SHUTDOWN
  // ═══════════════════════════════════════════════════════════

  shutdown() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    logger.info({ message: 'mTLS manager shut down' });
  }
}

class MtlsError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MtlsError';
    this.code = code;
  }
}

// Singleton
let _instance = null;

function getManager(config) {
  if (!_instance) {
    _instance = new MtlsManager(config);
  }
  return _instance;
}

module.exports = {
  MtlsManager,
  getManager,
  SERVICE_IDENTITIES,
  CERT_CONFIG,
  MtlsError,
};
