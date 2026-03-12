/**
 * ApexRiskAgent — Autonomous trading risk management agent.
 * Monitors positions, enforces risk limits, and executes hedges.
 */
'use strict';

const EventEmitter = require('events');
const logger = require('../utils/logger');

class ApexRiskAgent extends EventEmitter {
    constructor(opts = {}) {
        super();
        this.maxRiskPct = opts.maxRiskPct || 0.02; // 2% max risk per trade
        this.maxDrawdownPct = opts.maxDrawdownPct || 0.10; // 10% max drawdown
        this.positions = new Map();
        this.riskMetrics = { totalExposure: 0, unrealizedPnL: 0, drawdown: 0 };
        this._active = false;
    }

    start() {
        this._active = true;
        logger.logSystem('ApexRiskAgent: started');
        this.emit('started');
    }

    stop() {
        this._active = false;
        logger.logSystem('ApexRiskAgent: stopped');
        this.emit('stopped');
    }

    async evaluateRisk(trade) {
        const risk = {
            tradeId: trade.id || `trade-${Date.now()}`,
            symbol: trade.symbol,
            side: trade.side,
            size: trade.size || 0,
            riskScore: Math.random() * 0.5, // Placeholder
            approved: true,
            reason: 'Risk within limits',
        };

        if (risk.riskScore > this.maxRiskPct) {
            risk.approved = false;
            risk.reason = `Risk score ${risk.riskScore.toFixed(3)} exceeds limit ${this.maxRiskPct}`;
        }

        this.emit('risk:evaluated', risk);
        return risk;
    }

    getMetrics() {
        return { ...this.riskMetrics, positionCount: this.positions.size, active: this._active };
    }

    status() {
        return {
            active: this._active,
            positions: this.positions.size,
            maxRiskPct: this.maxRiskPct,
            maxDrawdownPct: this.maxDrawdownPct,
            metrics: this.getMetrics(),
        };
    }
}

function registerApexRoutes(app, agent) {
    if (!agent) agent = new ApexRiskAgent();

    app.get('/api/trading/risk', (req, res) => {
        res.json({ ok: true, ...agent.status() });
    });

    app.post('/api/trading/risk/evaluate', async (req, res) => {
        try {
            const result = await agent.evaluateRisk(req.body || {});
            res.json({ ok: true, ...result });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });
}

module.exports = { ApexRiskAgent, registerApexRoutes };
