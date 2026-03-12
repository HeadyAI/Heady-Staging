// Bridge: memory/telemetry/provider-usage-tracker → stub
'use strict';
const budgets = new Map();
const usageRecords = [];

function checkProviderBudget(provider) {
    const budget = budgets.get(provider);
    if (!budget) return { status: 'ok', provider, used: 0, limit: Infinity };
    return { status: budget.used >= budget.limit ? 'exceeded' : 'ok', provider, used: budget.used, limit: budget.limit };
}

function record({ provider, model, action, latencyMs, success, error, metadata = {} }) {
    const entry = { provider, model, action, latencyMs, success, error, metadata, ts: new Date().toISOString() };
    usageRecords.push(entry);
    if (usageRecords.length > 10000) usageRecords.shift();
    const b = budgets.get(provider) || { used: 0, limit: Infinity };
    b.used += 1;
    budgets.set(provider, b);
}

function setBudget(provider, limit) {
    const existing = budgets.get(provider) || { used: 0, limit };
    existing.limit = limit;
    budgets.set(provider, existing);
}

function getStats() {
    const stats = {};
    for (const [provider, b] of budgets) stats[provider] = { ...b };
    return stats;
}

module.exports = { checkProviderBudget, record, setBudget, getStats };
