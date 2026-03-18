---
name: heady-trading-compliance
description: Enforces Apex Trader Funding compliance rules and risk management logic for all Heady trading code. Use this skill whenever writing, reviewing, or debugging ANY trading-related code — including order execution, risk checks, drawdown calculations, position sizing, P&L tracking, Rithmic/Tradovate API integration, or Apex evaluation/funded account logic. Triggers on mentions of "Apex", "drawdown", "trailing threshold", "consistency rule", "funded account", "Rithmic", "Tradovate", "TradersPost", "PickMyTrade", "contract scaling", "position flattening", or any trading risk management code. Also use when the user asks about prop firm rules, trading compliance, or risk agent logic.
---

# Heady Trading Compliance

This skill ensures all Heady trading code complies with Apex Trader Funding rules and implements proper risk management. The Risk Agent has ultimate veto power — it can flatten all positions within 100ms of detecting a breach condition.

## Apex Trader Funding Rules (Critical — Violations End Accounts)

### Trailing Drawdown (The Most Important Rule)

The trailing drawdown starts at a fixed distance below your starting balance and trails UP with your highest realized balance, but NEVER trails back down. Once your account's real-time equity (including open P&L) touches the trailing drawdown level, the account is BREACHED — game over.

```python
# Core trailing drawdown logic — MUST be implemented exactly
class ApexDrawdownTracker:
    def __init__(self, starting_balance: float, max_drawdown: float):
        self.starting_balance = starting_balance
        self.max_drawdown = max_drawdown
        self.highest_balance = starting_balance
        self.drawdown_level = starting_balance - max_drawdown
        # The drawdown stops trailing once it reaches starting_balance
        self.drawdown_locked = False

    def update(self, current_balance: float, unrealized_pnl: float = 0.0):
        """Call this on EVERY tick, not just on trade close."""
        equity = current_balance + unrealized_pnl

        # Trail UP with highest realized balance (not equity)
        if current_balance > self.highest_balance:
            self.highest_balance = current_balance
            new_level = self.highest_balance - self.max_drawdown
            # Drawdown stops trailing once it reaches starting balance
            if new_level >= self.starting_balance:
                self.drawdown_level = self.starting_balance
                self.drawdown_locked = True
            elif not self.drawdown_locked:
                self.drawdown_level = new_level

        # BREACH CHECK — real-time equity vs drawdown level
        if equity <= self.drawdown_level:
            return {'breached': True, 'equity': equity, 'level': self.drawdown_level}

        return {
            'breached': False,
            'equity': equity,
            'level': self.drawdown_level,
            'cushion': equity - self.drawdown_level,
            'locked': self.drawdown_locked
        }
```

### Account Size Drawdown Table

| Account Size | Max Drawdown | Profit Target (Eval) | Max Contracts |
|-------------|-------------|---------------------|---------------|
| $25,000 | $1,500 | $1,500 | 4 NQ / 10 ES |
| $50,000 | $2,500 | $3,000 | 10 NQ / 20 ES |
| $75,000 | $2,750 | $4,250 | 13 NQ / 26 ES |
| $100,000 | $3,000 | $6,000 | 14 NQ / 28 ES |
| $150,000 | $5,000 | $9,000 | 17 NQ / 34 ES |
| $250,000 | $6,500 | $15,000 | 27 NQ / 54 ES |
| $300,000 | $7,500 | $20,000 | 35 NQ / 70 ES |

### 30% Consistency Rule

No single trading day's profit can exceed 30% of total cumulative profit at the time of payout request. This means you MUST spread profits across multiple days.

```python
def check_consistency_rule(daily_profits: list[float]) -> dict:
    """Check if payout request would pass the 30% consistency rule."""
    total_profit = sum(p for p in daily_profits if p > 0)
    if total_profit <= 0:
        return {'passes': False, 'reason': 'No positive total profit'}

    violations = []
    for i, profit in enumerate(daily_profits):
        if profit > 0:
            ratio = profit / total_profit
            if ratio > 0.30:
                violations.append({
                    'day': i,
                    'profit': profit,
                    'ratio': round(ratio, 4),
                    'max_allowed': round(total_profit * 0.30, 2)
                })

    return {
        'passes': len(violations) == 0,
        'total_profit': total_profit,
        'violations': violations,
        'threshold': 0.30
    }
```

### Additional Apex Rules

1. **No holding through 4:59 PM ET** — All positions MUST be flat by 4:59 PM Eastern. Implement auto-close at 4:55 PM ET with a hard kill at 4:58 PM ET.

2. **No trading during news blackouts** — Some accounts restrict trading 2 minutes before/after major economic releases (FOMC, NFP, CPI, etc.).

3. **Contract scaling** — Never exceed the max contracts for your account size. Use micros (MES/MNQ) to build buffer before scaling up.

4. **Minimum 8 trading days** — Evaluation accounts require at least 8 unique trading days before passing.

5. **No overnight positions** — Futures positions cannot be held past the daily close.

## Risk Management Strategy

### The Lock-First Approach

Build $2,500+ profit cushion before trading aggressively. This locks the trailing drawdown at your starting balance, giving you a permanent safety net.

```python
class RiskManager:
    """Risk manager implementing the Lock-First strategy."""

    def __init__(self, config):
        self.max_risk_per_trade = config.get('max_risk_per_trade', 0.01)  # 1% of account
        self.min_reward_ratio = config.get('min_reward_ratio', 5.0)       # 5:1 R:R
        self.max_mae_ratio = config.get('max_mae_ratio', 0.30)           # 30% MAE limit
        self.auto_close_time = config.get('auto_close_time', '16:55')    # 4:55 PM ET
        self.hard_kill_time = config.get('hard_kill_time', '16:58')      # 4:58 PM ET

    def validate_entry(self, signal: dict, account_state: dict) -> dict:
        """Validate a trade signal against all risk rules before execution."""
        checks = []

        # Check 1: Contract limits
        max_contracts = account_state['max_contracts']
        current_open = account_state['open_contracts']
        requested = signal.get('contracts', 1)
        if current_open + requested > max_contracts:
            checks.append({
                'rule': 'CONTRACT_LIMIT',
                'passed': False,
                'detail': f'Would exceed max {max_contracts} contracts'
            })

        # Check 2: Drawdown cushion
        cushion = account_state['drawdown_cushion']
        risk_amount = signal.get('stop_distance', 0) * requested * signal.get('tick_value', 1)
        if risk_amount > cushion * self.max_risk_per_trade:
            checks.append({
                'rule': 'RISK_LIMIT',
                'passed': False,
                'detail': f'Risk ${risk_amount:.2f} exceeds {self.max_risk_per_trade*100}% of cushion'
            })

        # Check 3: Reward/Risk ratio
        rr_ratio = signal.get('target_distance', 0) / max(signal.get('stop_distance', 1), 0.01)
        if rr_ratio < self.min_reward_ratio:
            checks.append({
                'rule': 'RR_RATIO',
                'passed': False,
                'detail': f'R:R {rr_ratio:.1f} below minimum {self.min_reward_ratio}'
            })

        # Check 4: Time of day
        from datetime import datetime
        now_et = datetime.now()  # Assume already in ET
        close_time = datetime.strptime(self.auto_close_time, '%H:%M').time()
        if now_et.time() >= close_time:
            checks.append({
                'rule': 'TIME_LIMIT',
                'passed': False,
                'detail': f'Past auto-close time {self.auto_close_time} ET'
            })

        all_passed = all(c.get('passed', True) for c in checks)
        return {
            'approved': all_passed if checks else True,
            'checks': checks,
            'signal': signal
        }
```

## Emergency Position Flattening

The Risk Agent MUST be able to flatten all positions within 100ms. This is a non-negotiable requirement.

```python
async def emergency_flatten(api_client, reason: str, logger):
    """Flatten ALL positions immediately. Called by Risk Agent on breach detection."""
    logger.critical({'reason': reason}, 'EMERGENCY FLATTEN TRIGGERED')
    start = time.monotonic()

    try:
        # Get all open positions
        positions = await api_client.get_positions()

        # Fire market orders to close everything simultaneously
        close_tasks = []
        for pos in positions:
            direction = 'SELL' if pos['side'] == 'LONG' else 'BUY'
            close_tasks.append(
                api_client.place_order(
                    instrument=pos['instrument'],
                    side=direction,
                    quantity=abs(pos['quantity']),
                    order_type='MARKET'
                )
            )

        results = await asyncio.gather(*close_tasks, return_exceptions=True)

        elapsed_ms = (time.monotonic() - start) * 1000
        logger.critical({
            'reason': reason,
            'positions_closed': len(positions),
            'elapsed_ms': round(elapsed_ms, 2),
            'results': [str(r) for r in results]
        }, 'EMERGENCY FLATTEN COMPLETE')

        return {
            'success': True,
            'positions_closed': len(positions),
            'elapsed_ms': elapsed_ms
        }
    except Exception as e:
        logger.critical({'error': str(e)}, 'EMERGENCY FLATTEN FAILED — MANUAL INTERVENTION REQUIRED')
        raise
```

## Trading Hours (US Futures)

```python
TRADING_SESSIONS = {
    'CME_FUTURES': {
        'open': '18:00',       # 6 PM ET Sunday
        'close': '17:00',      # 5 PM ET Friday
        'daily_break': ('17:00', '18:00'),  # Daily maintenance
        'optimal_hours': [
            ('09:30', '11:30'),  # Morning session — highest volume
            ('14:00', '16:00'),  # Afternoon session — second highest
        ],
        'auto_close': '16:55',   # Heady auto-close time
        'hard_kill': '16:58',    # Heady hard kill time
        'apex_deadline': '16:59' # Apex requires flat by 4:59 PM
    }
}
```

## API Integration Checklist

When integrating with Rithmic, Tradovate, or TradersPost:

- [ ] All API keys come from environment variables
- [ ] WebSocket connections have auto-reconnect with exponential backoff
- [ ] Order confirmations are validated before updating internal state
- [ ] Partial fills are handled correctly
- [ ] Connection health is monitored with heartbeat ping/pong
- [ ] All trade executions are logged as immutable audit events
- [ ] Paper trading mode is the default — live requires explicit opt-in
- [ ] Rate limits are respected with proper backoff
