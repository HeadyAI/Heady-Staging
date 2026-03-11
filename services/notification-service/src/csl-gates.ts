import { CSLGate, AuthToken } from './types';
import { PSI, PHI } from './constants';

export class CSLGateEngine {
  private readonly confidenceThreshold = PHI - 1;

  evaluateTokenValidity(token: AuthToken, currentTime: number): CSLGate {
    const timeToExpiry = token.exp - currentTime;
    const isExpired = timeToExpiry <= 0;
    const timeSinceIssue = currentTime - token.iat;
    const ageConfidence = Math.max(0, 1 - (timeSinceIssue / (token.exp - token.iat)));

    const confidence = isExpired ? 0 : ageConfidence;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: isExpired ? 'Token expired' : `Token age confidence: ${ageConfidence.toFixed(3)}`
    };
  }

  evaluateConnectionHealth(
    connectionUptime: number,
    messageCount: number,
    lastHeartbeatAge: number
  ): CSLGate {
    const heartbeatConfidence = lastHeartbeatAge < 60000 ? 1 : Math.max(0, 1 - (lastHeartbeatAge / 120000));
    const activityConfidence = messageCount > 0 ? 1 : PSI;
    const uptimeConfidence = Math.min(1, connectionUptime / (24 * 60 * 60 * 1000));

    const confidence = (heartbeatConfidence + activityConfidence + uptimeConfidence) / 3;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Health confidence: ${confidence.toFixed(3)} (heartbeat: ${heartbeatConfidence.toFixed(3)}, activity: ${activityConfidence.toFixed(3)}, uptime: ${uptimeConfidence.toFixed(3)})`
    };
  }

  evaluateRateLimitCompliance(
    currentCount: number,
    windowLimit: number,
    windowAge: number
  ): CSLGate {
    const utilizationRatio = currentCount / windowLimit;
    const confidence = Math.max(0, 1 - utilizationRatio);

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Rate limit confidence: ${confidence.toFixed(3)} (usage: ${utilizationRatio.toFixed(3)})`
    };
  }

  evaluateDataIntegrity(
    expectedChecksum: string,
    actualChecksum: string
  ): CSLGate {
    const isValid = expectedChecksum === actualChecksum;
    const confidence = isValid ? 1 : 0;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: isValid ? 'Checksum verified' : 'Checksum mismatch'
    };
  }

  evaluateChannelAvailability(
    isResponding: boolean,
    lastErrorAge: number,
    errorCount: number
  ): CSLGate {
    const responseConfidence = isResponding ? 1 : 0;
    const errorConfidence = Math.max(0, 1 - (errorCount / 10));
    const recoveryConfidence = lastErrorAge > 300000 ? 1 : PSI;

    const confidence = (responseConfidence + errorConfidence + recoveryConfidence) / 3;

    return {
      confidence,
      decision: confidence >= this.confidenceThreshold,
      reason: `Channel availability: ${confidence.toFixed(3)} (responsive: ${responseConfidence.toFixed(3)}, errors: ${errorConfidence.toFixed(3)}, recovery: ${recoveryConfidence.toFixed(3)})`
    };
  }
}

export const cslGateEngine = new CSLGateEngine();
