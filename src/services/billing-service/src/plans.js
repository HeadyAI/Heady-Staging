'use strict';

/**
 * Heady subscription plans with Fibonacci-based API call limits.
 *
 * FIB[9]  = 34  → Explorer (free tier)
 * FIB[11] = 89  → Builder (paid tier)
 * FIB[13] = 233 → Enterprise (custom tier)
 */
const PLANS = {
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    description: 'Free tier for exploration and evaluation',
    priceId: null, // free
    monthlyPriceCents: 0,
    apiCallsPerDay: 34,
    apiCallsPerMin: 34,
    features: {
      vectorSearch: true,
      customAgents: false,
      prioritySupport: false,
      analytics: false,
      webhooks: false,
      sso: false,
      maxNamespaces: 1,
      maxVectorDimensions: 384,
      maxStorageMB: 100,
    },
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    description: 'For developers and small teams building with Heady',
    priceId: process.env.STRIPE_BUILDER_PRICE_ID || null,
    monthlyPriceCents: 2900,
    apiCallsPerDay: 89,
    apiCallsPerMin: 89,
    features: {
      vectorSearch: true,
      customAgents: true,
      prioritySupport: false,
      analytics: true,
      webhooks: true,
      sso: false,
      maxNamespaces: 5,
      maxVectorDimensions: 384,
      maxStorageMB: 1000,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom plan for organizations with advanced needs',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    monthlyPriceCents: null, // custom pricing
    apiCallsPerDay: 233,
    apiCallsPerMin: 233,
    features: {
      vectorSearch: true,
      customAgents: true,
      prioritySupport: true,
      analytics: true,
      webhooks: true,
      sso: true,
      maxNamespaces: 50,
      maxVectorDimensions: 384,
      maxStorageMB: 10000,
    },
  },
};

/**
 * Get a plan by ID.
 * @param {string} planId
 * @returns {object|undefined}
 */
function getPlan(planId) {
  return PLANS[planId];
}

/**
 * Get all plans as an array.
 * @returns {object[]}
 */
function getAllPlans() {
  return Object.values(PLANS);
}

/**
 * Get the API call limit per day for a plan.
 * @param {string} planId
 * @returns {number}
 */
function getApiLimit(planId) {
  const plan = PLANS[planId];
  return plan ? plan.apiCallsPerDay : PLANS.explorer.apiCallsPerDay;
}

/**
 * Get the rate limit (per minute) for a plan.
 * @param {string} planId
 * @returns {number}
 */
function getRateLimit(planId) {
  const plan = PLANS[planId];
  return plan ? plan.apiCallsPerMin : PLANS.explorer.apiCallsPerMin;
}

/**
 * Check if a feature is available on a given plan.
 * @param {string} planId
 * @param {string} feature
 * @returns {boolean}
 */
function hasFeature(planId, feature) {
  const plan = PLANS[planId];
  if (!plan) return false;
  return !!plan.features[feature];
}

module.exports = {
  PLANS,
  getPlan,
  getAllPlans,
  getApiLimit,
  getRateLimit,
  hasFeature,
};
