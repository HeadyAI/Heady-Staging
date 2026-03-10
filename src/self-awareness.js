const pino = require('pino');
const logger = pino();
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: src/self-awareness.js                                                    ║
// ║  LAYER: backend/src                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

let validateBranding = null;
let fixBrandingViolations = null;

try {
  ({ validateBranding } = require('../scripts/validate-branding'));
} catch (e) {
  logger.warn(`  ⚠ validate-branding not available: ${e.message}`);
}

try {
  ({ fixBrandingViolations } = require('../scripts/migrate-api.headysystems.com-to-domains'));
} catch (e) {
  // Optional — fix function may not exist
}

function startBrandingMonitor() {
  if (!validateBranding) {
    logger.warn('  ⚠ Branding monitor skipped: validateBranding not loaded');
    return;
  }

  setInterval(async () => {
    try {
      const violations = await validateBranding();
      if (Array.isArray(violations) && violations.length > 0) {
        logger.warn(`[BrandingMonitor] ${violations.length} branding violations found`);
        if (process.env.AUTO_FIX_BRANDING === 'true' && fixBrandingViolations) {
          fixBrandingViolations();
        }
      }
    } catch (error) {
      logger.warn(`[BrandingMonitor] Error: ${error.message}`);
    }
  }, 60 * 60 * 1000); // Hourly
}

module.exports = { startBrandingMonitor };

