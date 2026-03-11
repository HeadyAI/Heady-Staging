/**
 * Heady™ Onboarding API Routes
 * 
 * Handles stage completion, data persistence, and stage advancement.
 * Each POST advances the user to the next onboarding stage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OnboardingStage, advanceOnboardingStage } from '../../../middleware/onboarding-guard';
import { validateStageData, getNextStage, EmailMode, RuntimeMode } from '../../../lib/onboarding-stages';

const ONBOARDING_COOKIE = 'heady_onboarding_stage';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

/**
 * POST /api/onboarding
 * Body: { stage: string, data: Record<string, unknown> }
 * 
 * Validates stage data, persists it, advances to next stage.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { stage, data } = body;

    if (!stage || !data) {
      return NextResponse.json(
        { error: 'Missing stage or data' },
        { status: 400 }
      );
    }

    // Validate required fields
    const validation = validateStageData(stage, data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Missing required fields', missing: validation.missing },
        { status: 422 }
      );
    }

    // Process stage-specific logic
    const result = await processStage(stage, data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode ?? 500 }
      );
    }

    // Get onboarding state from cookie
    const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE);
    const currentState = onboardingCookie
      ? JSON.parse(decodeURIComponent(onboardingCookie.value))
      : null;

    // Advance to next stage
    const nextStage = getNextStage(stage);
    const newState = advanceOnboardingStage(
      stage as OnboardingStage,
      currentState?.userId ?? 'unknown',
      currentState?.provider ?? 'unknown'
    );

    const response = NextResponse.json({
      success: true,
      currentStage: stage,
      nextStage: nextStage?.id ?? 'complete',
      nextPath: nextStage?.path ?? '/dashboard',
      stageResult: result.data,
    });

    // Update onboarding cookie
    response.cookies.set(ONBOARDING_COOKIE, JSON.stringify(newState), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
      domain: '.headyme.com',
    });

    // Log progression
    console.log('[ONBOARDING_ADVANCE]', JSON.stringify({
      timestamp: new Date().toISOString(),
      userId: currentState?.userId,
      from: stage,
      to: nextStage?.id ?? 'complete',
    }));

    return response;
  } catch (error) {
    console.error('[ONBOARDING_ERROR]', error);
    return NextResponse.json(
      { error: 'Onboarding step failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding
 * Returns current onboarding state for the user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const onboardingCookie = request.cookies.get(ONBOARDING_COOKIE);

  if (!onboardingCookie?.value) {
    return NextResponse.json({ stage: null, complete: false });
  }

  try {
    const state = JSON.parse(decodeURIComponent(onboardingCookie.value));
    return NextResponse.json({
      stage: state.stage,
      stageIndex: state.stageIndex,
      complete: state.stage === OnboardingStage.COMPLETE,
      provider: state.provider,
    });
  } catch {
    return NextResponse.json({ stage: null, complete: false });
  }
}

// ── Stage Processors ─────────────────────────────────────

interface StageResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}

async function processStage(
  stage: string,
  data: Record<string, unknown>
): Promise<StageResult> {
  switch (stage) {
    case 'create-account':
      return processCreateAccount(data);
    case 'email-config':
      return processEmailConfig(data);
    case 'permissions':
      return processPermissions(data);
    case 'buddy-setup':
      return processBuddySetup(data);
    case 'complete':
      return processComplete(data);
    default:
      return { success: false, error: `Unknown stage: ${stage}`, statusCode: 400 };
  }
}

async function processCreateAccount(
  data: Record<string, unknown>
): Promise<StageResult> {
  const username = (data.username as string).toLowerCase().trim();

  // Validate username format
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    return {
      success: false,
      error: 'Username must be 3-30 characters, start with letter/number, contain only letters, numbers, dots, hyphens, underscores',
      statusCode: 422,
    };
  }

  // Check availability via Heady™API
  try {
    const checkResponse = await fetch(
      `${process.env.HEADY_API_URL ?? 'https://api.headyapi.com'}/internal/check-username`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HEADY_INTERNAL_KEY}`,
        },
        body: JSON.stringify({ username }),
      }
    );

    if (checkResponse.status === 409) {
      return { success: false, error: 'Username already taken', statusCode: 409 };
    }
  } catch {
    // If API is down, allow username (will be validated on final submit)
    console.warn('[CREATE_ACCOUNT] Username check API unreachable, allowing provisionally');
  }

  return {
    success: true,
    data: {
      username,
      headyEmail: `${username}@headyme.com`,
      createdAt: new Date().toISOString(),
    },
  };
}

async function processEmailConfig(
  data: Record<string, unknown>
): Promise<StageResult> {
  const emailMode = data.emailMode as EmailMode;
  const forwardTo = data.forwardTo as string | undefined;

  if (emailMode === EmailMode.FORWARD_PROVIDER || emailMode === EmailMode.FORWARD_CUSTOM) {
    if (!forwardTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forwardTo)) {
      return { success: false, error: 'Valid forwarding email required', statusCode: 422 };
    }
  }

  // Configure Cloudflare Email Routing
  try {
    await fetch(
      `${process.env.HEADY_API_URL ?? 'https://api.headyapi.com'}/internal/email/configure`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HEADY_INTERNAL_KEY}`,
        },
        body: JSON.stringify({
          mode: emailMode,
          forwardTo: forwardTo ?? null,
        }),
      }
    );
  } catch {
    console.warn('[EMAIL_CONFIG] Email routing API unreachable');
  }

  return {
    success: true,
    data: { emailMode, forwardTo: forwardTo ?? null },
  };
}

async function processPermissions(
  data: Record<string, unknown>
): Promise<StageResult> {
  const runtimeMode = data.runtimeMode as RuntimeMode;
  const allowFileSystem = data.allowFileSystem as boolean | undefined;
  const allowCloudStorage = data.allowCloudStorage as boolean | undefined;

  return {
    success: true,
    data: {
      runtimeMode,
      allowFileSystem: runtimeMode === RuntimeMode.HYBRID ? (allowFileSystem ?? true) : false,
      allowCloudStorage: allowCloudStorage ?? true,
      configuredAt: new Date().toISOString(),
    },
  };
}

async function processBuddySetup(
  data: Record<string, unknown>
): Promise<StageResult> {
  const buddyName = (data.buddyName as string).trim();
  const theme = data.theme as string;
  const contexts = data.contexts as string[] | undefined;
  const voiceEnabled = data.voiceEnabled as boolean | undefined;

  if (buddyName.length < 1 || buddyName.length > 30) {
    return { success: false, error: 'Buddy name must be 1-30 characters', statusCode: 422 };
  }

  // Register with Heady™Buddy service
  try {
    await fetch(
      `${process.env.HEADY_BUDDY_URL ?? 'https://buddy.headybuddy.org'}/api/configure`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HEADY_INTERNAL_KEY}`,
        },
        body: JSON.stringify({
          buddyName,
          theme,
          contexts: contexts ?? ['default'],
          voiceEnabled: voiceEnabled ?? false,
        }),
      }
    );
  } catch {
    console.warn('[BUDDY_SETUP] HeadyBuddy API unreachable');
  }

  return {
    success: true,
    data: {
      buddyName,
      theme,
      contexts: contexts ?? ['default'],
      voiceEnabled: voiceEnabled ?? false,
    },
  };
}

async function processComplete(
  data: Record<string, unknown>
): Promise<StageResult> {
  // Generate API key — but DON'T display it here.
  // It goes to Settings > API page.
  try {
    const response = await fetch(
      `${process.env.HEADY_API_URL ?? 'https://api.headyapi.com'}/internal/api-keys/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HEADY_INTERNAL_KEY}`,
        },
        body: JSON.stringify({ scope: 'pilot' }),
      }
    );

    if (response.ok) {
      const keyData = await response.json();
      return {
        success: true,
        data: {
          onboardingComplete: true,
          completedAt: new Date().toISOString(),
          apiKeyGenerated: true,
          apiKeyLocation: '/settings/api', // NOT displayed inline
        },
      };
    }
  } catch {
    console.warn('[COMPLETE] API key generation unreachable');
  }

  return {
    success: true,
    data: {
      onboardingComplete: true,
      completedAt: new Date().toISOString(),
      apiKeyGenerated: false,
      apiKeyLocation: '/settings/api',
    },
  };
}
