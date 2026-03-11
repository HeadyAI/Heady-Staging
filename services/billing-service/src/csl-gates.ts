import { CSLGate, Subscription, UsageMetrics } from './types';
import { PSI, PHI } from './constants';

export class CSLGateEngine {
  private readonly confidenceThreshold = PHI - 1;

  evaluateSubscriptionValidity(subscription: Subscription, currentTime: number): CSLGate {
    const isActive = subscription.status === 'active';
    const isWithinPeriod = currentTime >= subscription.currentPeriodStart && currentTime <= subscription.currentPeriodEnd;
    const notCanceled = !subscription.canceledAt || subscription.canceledAt > currentTime;

    const statusConfidence = isActive ? 1 : PSI;
    const periodConfidence = isWithinPeriod ? 1 : 0.5;
    const cancelConfidence = notCanceled ? 1 : 0;

    const confidence = (statusConfidence + periodConfidence + cancelConfidence) / 3;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold && isActive,
      reason: `Subscription validity: ${confidence.toFixed(3)} (status: ${statusConfidence.toFixed(3)}, period: ${periodConfidence.toFixed(3)}, canceled: ${cancelConfidence.toFixed(3)})`
    };
  }

  evaluateUsageCompliance(
    usage: UsageMetrics,
    requestLimit: number
  ): CSLGate {
    if (requestLimit === -1) {
      return {
        confidence: 1,
        decision: true,
        reason: 'Unlimited tier'
      };
    }

    const utilizationRatio = usage.requestCount / requestLimit;
    const confidence = Math.max(0, 1 - (utilizationRatio * 0.8));

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Usage compliance: ${confidence.toFixed(3)} (utilization: ${utilizationRatio.toFixed(3)})`
    };
  }

  evaluatePaymentValidity(
    status: string,
    daysSincePaid: number
  ): CSLGate {
    const statusValid = status === 'active';
    const daysConfidence = Math.max(0, 1 - (daysSincePaid / 90));

    const confidence = statusValid ? daysConfidence : 0;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Payment validity: ${confidence.toFixed(3)} (status: ${statusValid ? 'valid' : 'invalid'}, days_since_paid: ${daysSincePaid})`
    };
  }

  evaluateWebhookIntegrity(
    expectedSignature: string,
    actualSignature: string
  ): CSLGate {
    const isValid = expectedSignature === actualSignature;
    const confidence = isValid ? 1 : 0;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: isValid ? 'Signature verified' : 'Signature mismatch'
    };
  }

  evaluateStripeConnectivity(
    lastSuccessTime: number,
    errorCount: number,
    isResponding: boolean
  ): CSLGate {
    const responseConfidence = isResponding ? 1 : 0;
    const errorConfidence = Math.max(0, 1 - (errorCount / 10));
    const recentSuccess = Math.max(0, 1 - ((Date.now() - lastSuccessTime) / (5 * 60 * 1000)));

    const confidence = (responseConfidence + errorConfidence + recentSuccess) / 3;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Stripe connectivity: ${confidence.toFixed(3)} (response: ${responseConfidence.toFixed(3)}, errors: ${errorConfidence.toFixed(3)}, recent: ${recentSuccess.toFixed(3)})`
    };
  }

  evaluateBillingPeriodConsistency(
    createdAt: number,
    currentPeriodStart: number,
    currentPeriodEnd: number,
    currentTime: number
  ): CSLGate {
    const periodDuration = currentPeriodEnd - currentPeriodStart;
    const expectedMonthlyDuration = 30 * 24 * 60 * 60 * 1000;
    const durationRatio = periodDuration / expectedMonthlyDuration;
    const durationConfidence = Math.min(1, durationRatio);

    const periodValid = currentTime >= currentPeriodStart && currentTime <= currentPeriodEnd;
    const periodConfidence = periodValid ? 1 : 0;

    const confidence = (durationConfidence + periodConfidence) / 2;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Period consistency: ${confidence.toFixed(3)} (duration: ${durationConfidence.toFixed(3)}, valid: ${periodConfidence.toFixed(3)})`
    };
  }
}

export const cslGateEngine = new CSLGateEngine();
