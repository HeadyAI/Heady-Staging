import { AnalyticsEvent, FunnelAnalysis, FunnelStep } from '../types';
import { logger } from '../logger';
import { cslGateEngine } from '../csl-gates';
import { FUNNEL_ANALYSIS_WINDOW_MS } from '../constants';

export class FunnelAnalyzer {
  private funnelDefinitions: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDefaultFunnels();
  }

  private initializeDefaultFunnels(): void {
    this.funnelDefinitions.set('signup_flow', [
      'page_view.signup',
      'form_focus.email',
      'form_submit.signup',
      'email_verify',
      'onboarding_complete'
    ]);

    this.funnelDefinitions.set('checkout_flow', [
      'page_view.cart',
      'item_selected',
      'cart_submit',
      'shipping_selected',
      'payment_submitted',
      'order_confirmed'
    ]);

    this.funnelDefinitions.set('authentication', [
      'page_view.login',
      'form_focus.credentials',
      'auth_submit',
      'auth_success'
    ]);

    logger.info('funnel_analyzer', 'Default funnels initialized', {
      count: this.funnelDefinitions.size
    });
  }

  defineFunnel(name: string, steps: string[]): void {
    this.funnelDefinitions.set(name, steps);
    logger.info('funnel_analyzer', 'Funnel defined', {
      funnelName: name,
      stepCount: steps.length
    });
  }

  analyzeFunnel(
    funnelName: string,
    events: AnalyticsEvent[],
    startTime: number,
    endTime: number
  ): FunnelAnalysis | null {
    const steps = this.funnelDefinitions.get(funnelName);

    if (!steps) {
      logger.warn('funnel_analyzer', 'Funnel not defined', { funnelName });
      return null;
    }

    const windowEvents = events.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );

    if (windowEvents.length === 0) {
      logger.warn('funnel_analyzer', 'No events in time window', { funnelName, windowStart: startTime, windowEnd: endTime });
      return null;
    }

    const userProgressMap = new Map<string, number>();
    const stepCountMap = new Map<number, Set<string>>();

    for (let i = 0; i < steps.length; i++) {
      stepCountMap.set(i, new Set());
    }

    windowEvents.forEach((event) => {
      const stepIndex = steps.indexOf(event.eventName);

      if (stepIndex !== -1) {
        const currentProgress = userProgressMap.get(event.userId) || -1;

        if (stepIndex > currentProgress) {
          userProgressMap.set(event.userId, stepIndex);
        }
      }
    });

    const funnelSteps = steps.map((stepName, index) => {
      let count = 0;

      userProgressMap.forEach((progress) => {
        if (progress >= index) {
          count += 1;
        }
      });

      stepCountMap.get(index)!.add(stepName);
      return count;
    });

    const consistencyGate = cslGateEngine.evaluateFunnelConsistency(funnelSteps);

    if (!consistencyGate.decision) {
      logger.warn('funnel_analyzer', 'Funnel consistency check failed', {
        funnelName,
        reason: consistencyGate.reason
      });
    }

    const startCount = funnelSteps[0];
    const endCount = funnelSteps[funnelSteps.length - 1];
    const completionRate = startCount > 0 ? (endCount / startCount) : 0;

    const funnelStepDetails: FunnelStep[] = funnelSteps.map((count, index) => {
      const percentage = startCount > 0 ? (count / startCount) * 100 : 0;
      let avgTimeToNext: number | undefined = undefined;

      if (index < funnelSteps.length - 1) {
        const currentStepName = steps[index];
        const nextStepName = steps[index + 1];

        const transitions: number[] = [];

        windowEvents.forEach((event, eventIndex) => {
          if (event.eventName === currentStepName && event.userId) {
            const nextEvent = windowEvents
              .slice(eventIndex + 1)
              .find(e => e.userId === event.userId && e.eventName === nextStepName);

            if (nextEvent) {
              transitions.push(nextEvent.timestamp - event.timestamp);
            }
          }
        });

        if (transitions.length > 0) {
          avgTimeToNext = Math.round(
            transitions.reduce((a, b) => a + b, 0) / transitions.length
          );
        }
      }

      return {
        name: steps[index],
        count,
        percentage: Math.round(percentage * 100) / 100,
        avgTimeToNext
      };
    });

    logger.info('funnel_analyzer', 'Funnel analyzed', {
      funnelName,
      stepCount: steps.length,
      completionRate: Math.round(completionRate * 100) / 100,
      totalConversions: endCount,
      timeWindow: { start: startTime, end: endTime }
    });

    return {
      funnelName,
      steps: funnelStepDetails,
      startCount,
      completionRate: Math.round(completionRate * 10000) / 10000,
      totalConversions: endCount,
      timeWindow: {
        start: startTime,
        end: endTime
      },
      generatedAt: Date.now()
    };
  }

  analyzeMultipleFunnels(
    events: AnalyticsEvent[],
    startTime: number,
    endTime: number
  ): FunnelAnalysis[] {
    const analyses: FunnelAnalysis[] = [];

    this.funnelDefinitions.forEach((_, funnelName) => {
      const analysis = this.analyzeFunnel(funnelName, events, startTime, endTime);

      if (analysis) {
        analyses.push(analysis);
      }
    });

    logger.info('funnel_analyzer', 'Multiple funnels analyzed', {
      funnelCount: analyses.length,
      timeWindow: { start: startTime, end: endTime }
    });

    return analyses;
  }

  getDefinedFunnels(): Array<{ name: string; steps: string[] }> {
    const funnels: Array<{ name: string; steps: string[] }> = [];

    this.funnelDefinitions.forEach((steps, name) => {
      funnels.push({ name, steps });
    });

    return funnels;
  }
}

export const funnelAnalyzer = new FunnelAnalyzer();
