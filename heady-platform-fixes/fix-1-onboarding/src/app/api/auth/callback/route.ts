/**
 * Heady™ Auth Callback API Route
 * 
 * POST: Receives Firebase ID token after OAuth, creates session,
 *       and sets onboarding state cookie.
 * 
 * CRITICAL FIX: This route now checks if user has completed onboarding.
 * If not, it sets onboarding stage to 'create-account' instead of
 * redirecting to dashboard with API key.
 * 
 * DELETE: Signs out and clears all cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OnboardingStage } from '../../../middleware/onboarding-guard';

const SESSION_COOKIE = 'heady_session';
const ONBOARDING_COOKIE = 'heady_onboarding_stage';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

interface AuthCallbackBody {
  idToken: string;
  provider: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: AuthCallbackBody = await request.json();

    if (!body.idToken || !body.uid) {
      return NextResponse.json(
        { error: 'Missing idToken or uid' },
        { status: 400 }
      );
    }

    // Verify token with Firebase Admin (in production)
    // For now, trust the client-side Firebase Auth verification
    // TODO: Add firebase-admin verification for production hardening
    const sessionToken = generateSessionToken(body.uid);

    // Check if user exists in database
    const existingUser = await lookupUser(body.uid);
    const isNewUser = !existingUser;

    // Create or update user record
    await upsertUser({
      firebaseUid: body.uid,
      provider: body.provider,
      displayName: body.displayName,
      email: body.email,
      photoURL: body.photoURL,
    });

    // Build response
    const response = NextResponse.json({
      sessionToken,
      isNewUser,
      provider: body.provider,
    });

    // Set session cookie
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
      domain: '.headyme.com', // Accessible across subdomains
    });

    // CRITICAL FIX: Set onboarding state
    if (isNewUser || !existingUser?.onboardingComplete) {
      // Determine starting stage
      const startStage = isNewUser
        ? OnboardingStage.CREATE_ACCOUNT
        : (existingUser?.lastOnboardingStage ?? OnboardingStage.CREATE_ACCOUNT);

      const onboardingState = {
        stage: startStage,
        stageIndex: Object.values(OnboardingStage).indexOf(startStage),
        userId: body.uid,
        provider: body.provider,
        startedAt: new Date().toISOString(),
      };

      response.cookies.set(ONBOARDING_COOKIE, JSON.stringify(onboardingState), {
        httpOnly: false, // Needs to be readable by middleware
        secure: true,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
        domain: '.headyme.com',
      });
    }

    // Log the decision
    console.log('[AUTH_CALLBACK]', JSON.stringify({
      timestamp: new Date().toISOString(),
      uid: body.uid,
      provider: body.provider,
      isNewUser,
      onboardingComplete: existingUser?.onboardingComplete ?? false,
      action: isNewUser ? 'NEW_USER_ONBOARDING' : 'RETURNING_USER',
    }));

    return response;
  } catch (error) {
    console.error('[AUTH_CALLBACK_ERROR]', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    maxAge: 0,
    path: '/',
    domain: '.headyme.com',
  });

  response.cookies.set(ONBOARDING_COOKIE, '', {
    httpOnly: false,
    secure: true,
    maxAge: 0,
    path: '/',
    domain: '.headyme.com',
  });

  return response;
}

// ── Helpers ──────────────────────────────────────────────

function generateSessionToken(uid: string): string {
  // In production: use crypto.randomUUID() + sign with JWT
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `heady_${uid.substring(0, 8)}_${timestamp}_${random}`;
}

interface UserRecord {
  firebaseUid: string;
  onboardingComplete: boolean;
  lastOnboardingStage: OnboardingStage | null;
}

async function lookupUser(uid: string): Promise<UserRecord | null> {
  // In production: query Prisma/PostgreSQL
  // Placeholder for database lookup
  try {
    const response = await fetch(
      `${process.env.HEADY_API_URL ?? 'https://api.headyapi.com'}/internal/users/${uid}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HEADY_INTERNAL_KEY}`,
          'X-Service': 'heady-onboarding',
        },
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function upsertUser(data: {
  firebaseUid: string;
  provider: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}): Promise<void> {
  try {
    await fetch(
      `${process.env.HEADY_API_URL ?? 'https://api.headyapi.com'}/internal/users`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HEADY_INTERNAL_KEY}`,
          'X-Service': 'heady-onboarding',
        },
        body: JSON.stringify(data),
      }
    );
  } catch (error) {
    console.error('[UPSERT_USER_ERROR]', error);
  }
}
