export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'pending';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  canceledAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface UsageMetrics {
  userId: string;
  periodStart: number;
  periodEnd: number;
  requestCount: number;
  estimatedCost: number;
  overageCount: number;
  overageCost: number;
  lastUpdated: number;
}

export interface PricingTier {
  name: string;
  monthlyPriceUSD: number;
  requests: number;
  tier: number;
}

export interface PricingPlan {
  id: string;
  tier: string;
  name: string;
  monthlyPriceUSD: number;
  requestsIncluded: number;
  overageRatePerThousand: number;
  features: string[];
  createdAt: number;
}

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
  processed: boolean;
  processedAt?: number;
  error?: string;
}

export interface StripeWebhookPayload {
  id: string;
  object: string;
  type: string;
  created: number;
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };
}

export interface CSLGate {
  confidence: number;
  decision: boolean;
  reason?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  checks: {
    stripe: boolean;
    database: boolean;
    webhook: boolean;
  };
  metrics: {
    activeSubscriptions: number;
    totalRevenueMTD: number;
    webhooksProcessed: number;
  };
}
