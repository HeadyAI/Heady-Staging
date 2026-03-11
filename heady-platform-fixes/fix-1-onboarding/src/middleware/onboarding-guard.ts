/**
 * Heady™ Onboarding Guard Middleware
 * 
 * ROOT CAUSE FIX: Intercepts post-OAuth callback and enforces the 5-stage
 * onboarding sequence instead of skipping directly to API key display.
 * 
 * Flow: OAuth Provider → callback → this middleware → /onboarding/create-account
 *       (instead of → /dashboard with API key)
 * 
 * Determinism: Every redirect decision is logged with reason code.
 */

import { NextRequest, NextResponse } from 'next/server';

const PHI = 1.6180339887;
const SESSION_COOKIE = 'heady_session';
const ONBOARDING_COOKIE = 'heady_onboarding_stage';

// Onboarding stages in required order
export enum OnboardingStage {
  CREATE_ACCOUNT = 'create-account',      // Stage 1: username → @headyme.com
  EMAIL_CONFIG = 'email-config',           // Stage 2: email forwarding or secure client
  PERMISSIONS = 'permissions',             // Stage 3: cloud-only vs hybrid
  BUDDY_SETUP = 'buddy-setup',            // Stage 4: custom UI + context switcher
  COMPLETE = 'complete',                   // Stage 5: welcome → dashboard (API key in settings)
}

const STAGE_ORDER: OnboardingStage[] = [
  OnboardingStage.CREATE_ACCOUNT,
  OnboardingStage.EMAIL_CONFIG,
  OnboardingStage.PERMISSIONS,
  OnboardingStage.BUDDY_SETUP,
  OnboardingStage.COMPLETE,
];

const STAGE_PATHS: Record<OnboardingStage, string> = {
  [OnboardingStage.CREATE_ACCOUNT]: '/onboarding/create-account',
  [OnboardingStage.EMAIL_CONFIG]: '/onboarding/email-config',
  [OnboardingStage.PERMISSIONS]: '/onboarding/permissions',
  [OnboardingStage.BUDDY_SETUP]: '/onboarding/buddy-setup',
  [OnboardingStage.COMPLETE]: '/onboarding/complete',
};

// Paths that bypass onboarding guard
const BYPASS_PATHS = [
  '/api/',
  '/onboarding/',
  '/_next/',
  '/favicon',
  '/css/',
  '/js/',
  '/images/',
  '/health',
];

interface OnboardingState {
  stage: OnboardingStage;
  stageIndex: number;
  userId: string;
  provider: string;
  startedAt: string;
}

/**
 * Determines if a user needs onboarding redirection.
 * Returns null if no redirect needed, or the target path if redirect required.
 */
function getOnboardingRedirect(
  request: NextRequest,
  state: OnboardingState | null
): { redirect: string | null; reason: string } {
  const path = request.nextUrl.pathname;

  // Bypass check
  if (BYPASS_PATHS.some(bp => path.startsWith(bp))) {
    return { redirect: null, reason: 'BYPASS_PATH' };
  }

  // No session at all — let auth handle it
  const session = request.cookies.get(SESSION_COOKIE);
  if (!session) {
    return { redirect: null, reason: 'NO_SESSION' };
  }

  // No onboarding state means fresh OAuth user — send to stage 1
  if (!state) {
    return {
      redirect: STAGE_PATHS[OnboardingStage.CREATE_ACCOUNT],
      reason: 'NEW_USER_NO_ONBOARDING_STATE',
    };
  }

  // Onboarding complete — allow through
  if (state.stage === OnboardingStage.COMPLETE) {
    return { redirect: null, reason: 'ONBOARDING_COMPLETE' };
  }

  // User trying to access dashboard/main app before completing onboarding
  if (!path.startsWith('/onboarding/')) {
    const currentStagePath = STAGE_PATHS[state.stage];
    return {
      redirect: currentStagePath,
      reason: `INCOMPLETE_ONBOARDING_AT_STAGE_${state.stageIndex}`,
    };
  }

  // User on an onboarding page — check they're on the right stage
  const currentStageIndex = STAGE_ORDER.indexOf(state.stage);
  const requestedStage = STAGE_ORDER.find(
    s => path === STAGE_PATHS[s] || path.startsWith(STAGE_PATHS[s])
  );

  if (requestedStage) {
    const requestedIndex = STAGE_ORDER.indexOf(requestedStage);
    // Can't skip ahead
    if (requestedIndex > currentStageIndex) {
      return {
        redirect: STAGE_PATHS[state.stage],
        reason: `SKIP_PREVENTED_FROM_${requestedIndex}_TO_${currentStageIndex}`,
      };
    }
    // Can go back to review previous stages
    if (requestedIndex <= currentStageIndex) {
      return { redirect: null, reason: 'VALID_STAGE_ACCESS' };
    }
  }

  return { redirect: null, reason: 'DEFAULT_ALLOW' };
}

/**
 * Parse onboarding state from cookie
 */
function parseOnboardingState(request: NextRequest): OnboardingState | null {
  const cookie = request.cookies.get(ONBOARDING_COOKIE);
  if (!cookie?.value) return null;
  try {
    return JSON.parse(decodeURIComponent(cookie.value));
  } catch {
    return null;
  }
}

/**
 * Main middleware export — drop into Next.js middleware.ts
 */
export function onboardingGuard(request: NextRequest): NextResponse | null {
  const state = parseOnboardingState(request);
  const { redirect, reason } = getOnboardingRedirect(request, state);

  // Determinism: log every decision
  const logEntry = {
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
    hasSession: !!request.cookies.get(SESSION_COOKIE),
    onboardingStage: state?.stage ?? 'none',
    decision: redirect ? 'REDIRECT' : 'ALLOW',
    reason,
    target: redirect ?? request.nextUrl.pathname,
  };

  // In production, this goes to structured logger
  console.log('[ONBOARDING_GUARD]', JSON.stringify(logEntry));

  if (redirect) {
    const url = request.nextUrl.clone();
    url.pathname = redirect;
    return NextResponse.redirect(url);
  }

  return null; // Allow through
}

/**
 * Advance to next onboarding stage.
 * Called by each stage's completion handler.
 */
export function advanceOnboardingStage(
  currentStage: OnboardingStage,
  userId: string,
  provider: string
): OnboardingState {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const nextIndex = Math.min(currentIndex + 1, STAGE_ORDER.length - 1);
  const nextStage = STAGE_ORDER[nextIndex];

  return {
    stage: nextStage,
    stageIndex: nextIndex,
    userId,
    provider,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Next.js middleware.ts integration
 * 
 * Usage in your root middleware.ts:
 * 
 * import { onboardingGuard } from './middleware/onboarding-guard';
 * 
 * export function middleware(request: NextRequest) {
 *   const guardResponse = onboardingGuard(request);
 *   if (guardResponse) return guardResponse;
 *   return NextResponse.next();
 * }
 * 
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * };
 */
