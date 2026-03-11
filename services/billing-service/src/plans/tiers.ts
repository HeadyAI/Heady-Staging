import { PricingTier, PricingPlan } from '../types';
import { PRICING_TIERS, OVERAGE_RATE_USD_PER_1K, FIBONACCI } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export class PricingTierManager {
  private tiers: Record<string, PricingTier> = PRICING_TIERS;
  private plans: Map<string, PricingPlan> = new Map();

  constructor() {
    this.initializePlans();
  }

  private initializePlans(): void {
    const plans: PricingPlan[] = [
      {
        id: uuidv4(),
        tier: 'FREE',
        name: this.tiers.FREE.name,
        monthlyPriceUSD: this.tiers.FREE.monthlyPriceUSD,
        requestsIncluded: this.tiers.FREE.requests,
        overageRatePerThousand: OVERAGE_RATE_USD_PER_1K,
        features: [
          '5,000 requests/month',
          'Basic support',
          'JSON logging',
          'Community access'
        ],
        createdAt: Date.now()
      },
      {
        id: uuidv4(),
        tier: 'STARTER',
        name: this.tiers.STARTER.name,
        monthlyPriceUSD: this.tiers.STARTER.monthlyPriceUSD,
        requestsIncluded: this.tiers.STARTER.requests,
        overageRatePerThousand: OVERAGE_RATE_USD_PER_1K,
        features: [
          '50,000 requests/month',
          'Email support',
          'Advanced logging',
          'API access',
          'Webhook support'
        ],
        createdAt: Date.now()
      },
      {
        id: uuidv4(),
        tier: 'PROFESSIONAL',
        name: this.tiers.PROFESSIONAL.name,
        monthlyPriceUSD: this.tiers.PROFESSIONAL.monthlyPriceUSD,
        requestsIncluded: this.tiers.PROFESSIONAL.requests,
        overageRatePerThousand: OVERAGE_RATE_USD_PER_1K,
        features: [
          '500,000 requests/month',
          'Priority support',
          'Advanced analytics',
          'Custom integrations',
          'SLA guarantee',
          'Dedicated account manager'
        ],
        createdAt: Date.now()
      },
      {
        id: uuidv4(),
        tier: 'ENTERPRISE',
        name: this.tiers.ENTERPRISE.name,
        monthlyPriceUSD: this.tiers.ENTERPRISE.monthlyPriceUSD,
        requestsIncluded: this.tiers.ENTERPRISE.requests,
        overageRatePerThousand: OVERAGE_RATE_USD_PER_1K,
        features: [
          'Unlimited requests',
          '24/7 phone support',
          'Advanced analytics',
          'Custom integrations',
          'SLA guarantee (99.99% uptime)',
          'Dedicated account manager',
          'Quarterly business reviews',
          'Custom security audit'
        ],
        createdAt: Date.now()
      }
    ];

    plans.forEach(plan => {
      this.plans.set(plan.tier, plan);
    });
  }

  getTier(tierName: string): PricingTier | null {
    const tier = this.tiers[tierName as keyof typeof PRICING_TIERS];
    return tier || null;
  }

  getPlan(tierName: string): PricingPlan | null {
    return this.plans.get(tierName) || null;
  }

  getAllPlans(): PricingPlan[] {
    return Array.from(this.plans.values()).sort((a, b) => a.monthlyPriceUSD - b.monthlyPriceUSD);
  }

  calculateMonthlyCharge(
    tierName: string,
    requestCount: number
  ): { baseCharge: number; overageCharge: number; totalCharge: number } {
    const tier = this.getTier(tierName);

    if (!tier) {
      throw new Error(`Unknown tier: ${tierName}`);
    }

    const baseCharge = tier.monthlyPriceUSD;

    if (tier.requests === -1) {
      return {
        baseCharge,
        overageCharge: 0,
        totalCharge: baseCharge
      };
    }

    if (requestCount <= tier.requests) {
      return {
        baseCharge,
        overageCharge: 0,
        totalCharge: baseCharge
      };
    }

    const overageRequests = requestCount - tier.requests;
    const overageThousands = Math.ceil(overageRequests / 1000);
    const overageCharge = overageThousands * OVERAGE_RATE_USD_PER_1K;

    return {
      baseCharge,
      overageCharge: Math.round(overageCharge * 100) / 100,
      totalCharge: Math.round((baseCharge + overageCharge) * 100) / 100
    };
  }

  getFibonacciMetrics(): {
    requestIncrementSteps: number[];
    revenueTargets: number[];
    timeIntervals: number[];
  } {
    return {
      requestIncrementSteps: [
        this.tiers.FREE.requests,
        this.tiers.STARTER.requests,
        this.tiers.PROFESSIONAL.requests
      ],
      revenueTargets: [
        0,
        Math.round(this.tiers.STARTER.monthlyPriceUSD * 100),
        Math.round(this.tiers.PROFESSIONAL.monthlyPriceUSD * 100),
        Math.round(this.tiers.ENTERPRISE.monthlyPriceUSD * 100)
      ],
      timeIntervals: FIBONACCI.slice(1, 8).map(f => f * 1000)
    };
  }

  recommendTier(monthlyRequestCount: number): string {
    if (monthlyRequestCount <= this.tiers.FREE.requests) {
      return 'FREE';
    }

    if (monthlyRequestCount <= this.tiers.STARTER.requests) {
      return 'STARTER';
    }

    if (monthlyRequestCount <= this.tiers.PROFESSIONAL.requests) {
      return 'PROFESSIONAL';
    }

    return 'ENTERPRISE';
  }

  getTierChangeImpact(
    fromTier: string,
    toTier: string,
    requestCount: number,
    daysRemainingInBillingCycle: number
  ): {
    currentCharge: number;
    newCharge: number;
    creditAmount: number;
    additionalCharge: number;
  } {
    const currentCharge = this.calculateMonthlyCharge(fromTier, requestCount).totalCharge;
    const newCharge = this.calculateMonthlyCharge(toTier, requestCount).totalCharge;

    const daysInCycle = 30;
    const daysElapsed = daysInCycle - daysRemainingInBillingCycle;
    const dailyRate = currentCharge / daysInCycle;
    const creditAmount = dailyRate * daysRemainingInBillingCycle;

    const proRatedNewCharge = (newCharge / daysInCycle) * daysRemainingInBillingCycle;
    const additionalCharge = Math.max(0, proRatedNewCharge - creditAmount);

    return {
      currentCharge: Math.round(currentCharge * 100) / 100,
      newCharge: Math.round(newCharge * 100) / 100,
      creditAmount: Math.round(creditAmount * 100) / 100,
      additionalCharge: Math.round(additionalCharge * 100) / 100
    };
  }
}

export const pricingTierManager = new PricingTierManager();
