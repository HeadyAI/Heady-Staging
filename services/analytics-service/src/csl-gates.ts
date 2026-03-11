import { CSLGate, AnalyticsEvent } from './types';
import { PSI, PHI } from './constants';

export class CSLGateEngine {
  private readonly confidenceThreshold = PHI - 1;

  evaluateEventValidity(event: AnalyticsEvent): CSLGate {
    const hasRequiredFields = event.userId && event.eventName && event.timestamp;
    const hasValidTimestamp = event.timestamp > 0 && event.timestamp <= Date.now();
    const hasValidCategory = event.eventCategory && event.eventCategory.length > 0;

    const fieldConfidence = hasRequiredFields ? 1 : 0;
    const timestampConfidence = hasValidTimestamp ? 1 : 0;
    const categoryConfidence = hasValidCategory ? 1 : PSI;

    const confidence = (fieldConfidence + timestampConfidence + categoryConfidence) / 3;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Event validity: ${confidence.toFixed(3)} (fields: ${fieldConfidence.toFixed(3)}, timestamp: ${timestampConfidence.toFixed(3)}, category: ${categoryConfidence.toFixed(3)})`
    };
  }

  evaluateBatchReadiness(
    eventCount: number,
    batchSize: number,
    ageSinceFirstEvent: number,
    maxAgeMs: number
  ): CSLGate {
    const sizeConfidence = Math.min(1, eventCount / batchSize);
    const ageConfidence = ageSinceFirstEvent >= maxAgeMs ? 1 : (ageSinceFirstEvent / maxAgeMs);

    const confidence = (sizeConfidence + ageConfidence) / 2;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Batch ready: ${confidence.toFixed(3)} (size: ${sizeConfidence.toFixed(3)}, age: ${ageConfidence.toFixed(3)})`
    };
  }

  evaluateDataQuality(
    totalEvents: number,
    invalidEvents: number,
    outlierCount: number
  ): CSLGate {
    if (totalEvents === 0) {
      return {
        confidence: 1,
        decision: true,
        reason: 'No events to validate'
      };
    }

    const validityRate = (totalEvents - invalidEvents) / totalEvents;
    const outlierRate = outlierCount / totalEvents;
    const qualityConfidence = (validityRate + (1 - Math.min(1, outlierRate))) / 2;

    return {
      confidence: qualityConfidence,
      decision: qualityConfidence >= this.confidenceThreshold,
      reason: `Data quality: ${qualityConfidence.toFixed(3)} (validity: ${validityRate.toFixed(3)}, outliers: ${outlierRate.toFixed(3)})`
    };
  }

  evaluateFunnelConsistency(
    stepCounts: number[]
  ): CSLGate {
    if (stepCounts.length < 2) {
      return {
        confidence: 1,
        decision: true,
        reason: 'Insufficient steps for funnel analysis'
      };
    }

    let hasMonotonicDecrease = true;

    for (let i = 1; i < stepCounts.length; i++) {
      if (stepCounts[i] > stepCounts[i - 1]) {
        hasMonotonicDecrease = false;
        break;
      }
    }

    const confidence = hasMonotonicDecrease ? 1 : PSI;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Funnel consistency: ${confidence.toFixed(3)} (monotonic: ${hasMonotonicDecrease})`
    };
  }

  evaluateAggregationValidity(
    eventCount: number,
    minEventsRequired: number,
    timeWindow: number,
    expectedTimeWindow: number
  ): CSLGate {
    const hasMinEvents = eventCount >= minEventsRequired;
    const eventConfidence = hasMinEvents ? 1 : (eventCount / minEventsRequired);

    const timeConfidence = Math.min(1, timeWindow / expectedTimeWindow);
    const confidence = (eventConfidence + timeConfidence) / 2;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Aggregation valid: ${confidence.toFixed(3)} (events: ${eventConfidence.toFixed(3)}, time: ${timeConfidence.toFixed(3)})`
    };
  }

  evaluateStorageHeartbeat(
    lastSuccessTime: number,
    errorCount: number,
    isResponding: boolean
  ): CSLGate {
    const responseConfidence = isResponding ? 1 : 0;
    const errorConfidence = Math.max(0, 1 - (errorCount / 10));
    const recentSuccess = Math.max(0, 1 - ((Date.now() - lastSuccessTime) / (60 * 1000)));

    const confidence = (responseConfidence + errorConfidence + recentSuccess) / 3;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Storage health: ${confidence.toFixed(3)} (response: ${responseConfidence.toFixed(3)}, errors: ${errorConfidence.toFixed(3)}, recent: ${recentSuccess.toFixed(3)})`
    };
  }
}

export const cslGateEngine = new CSLGateEngine();
