export const PHI = 1.618033988749895;
export const PSI = 0.618033988749895;
export const FIBONACCI = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

export const PORT = 3355;
export const HEALTH_CHECK_INTERVAL_MS = Math.round(55 * 1000);
export const USAGE_AGGREGATION_INTERVAL_MS = Math.round(144 * 1000);
export const WEBHOOK_TIMEOUT_MS = Math.round(34 * 1000);
export const SUBSCRIPTION_SYNC_INTERVAL_MS = Math.round(233 * 1000);

export const LOG_LEVELS = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60
} as const;

export const PRICING_TIERS = {
  FREE: {
    name: 'Free',
    monthlyPriceUSD: 0,
    requests: 5000,
    tier: 0
  },
  STARTER: {
    name: 'Starter',
    monthlyPriceUSD: Math.round(55 * 100) / 100,
    requests: 50000,
    tier: 1
  },
  PROFESSIONAL: {
    name: 'Professional',
    monthlyPriceUSD: Math.round(89 * 100) / 100,
    requests: 500000,
    tier: 2
  },
  ENTERPRISE: {
    name: 'Enterprise',
    monthlyPriceUSD: Math.round(233 * 100) / 100,
    requests: -1,
    tier: 3
  }
} as const;

export const OVERAGE_RATE_USD_PER_1K = Math.round(PHI * 100) / 100;
