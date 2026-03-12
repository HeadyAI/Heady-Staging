/**
 * HeadyPolicy Service — Budget and policy enforcement
 */
'use strict';

class BudgetService {
  constructor() {
    this._dailySpend = {};
    this._monthlySpend = 0;
    this._caps = {
      daily: {
        anthropic: parseFloat(process.env.BUDGET_DAILY_ANTHROPIC || '50'),
        openai:    parseFloat(process.env.BUDGET_DAILY_OPENAI    || '40'),
        groq:      parseFloat(process.env.BUDGET_DAILY_GROQ      || '10'),
        perplexity:parseFloat(process.env.BUDGET_DAILY_PPLX      || '20'),
        google:    parseFloat(process.env.BUDGET_DAILY_GOOGLE    || '20'),
        cloudflare:parseFloat(process.env.BUDGET_DAILY_CF        || '5'),
        local:     0,
      },
      monthly: parseFloat(process.env.BUDGET_MONTHLY || '500'),
    };
    this._lastReset = this._dayKey();
  }

  _dayKey() { return new Date().toISOString().slice(0, 10); }

  _checkReset() {
    const today = this._dayKey();
    if (today !== this._lastReset) {
      this._dailySpend = {};
      this._lastReset = today;
    }
  }

  track(provider, costUSD) {
    this._checkReset();
    this._dailySpend[provider] = (this._dailySpend[provider] || 0) + (costUSD || 0);
    this._monthlySpend += (costUSD || 0);
  }

  isOverBudget(provider) {
    this._checkReset();
    const dailyCap = this._caps.daily[provider] || Infinity;
    if ((this._dailySpend[provider] || 0) >= dailyCap) return true;
    if (this._monthlySpend >= this._caps.monthly) return true;
    return false;
  }

  getStatus() {
    this._checkReset();
    return {
      daily: { ...this._dailySpend },
      dailyCaps: this._caps.daily,
      monthly: this._monthlySpend,
      monthlyCap: this._caps.monthly,
      lastReset: this._lastReset,
    };
  }
}

const budgetService = new BudgetService();
module.exports = { budgetService, BudgetService };
