/**
 * Heady™ User API Route
 * 
 * GET: Returns current user profile and onboarding state
 * PATCH: Updates user profile fields
 */

import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'heady_session';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = request.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const response = await fetch(
      `${process.env.HEADY_API_URL ?? 'https://api.headyapi.com'}/internal/users/me`,
      {
        headers: {
          'Authorization': `Bearer ${session.value}`,
          'X-Service': 'heady-web',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: response.status }
      );
    }

    const user = await response.json();
    return NextResponse.json({
      uid: user.firebaseUid,
      username: user.username,
      headyEmail: user.headyEmail,
      displayName: user.displayName,
      photoURL: user.photoURL,
      provider: user.provider,
      onboardingComplete: user.onboardingComplete,
      lastOnboardingStage: user.lastOnboardingStage,
      runtimeMode: user.runtimeMode,
      buddyConfig: user.buddyConfig,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('[USER_GET_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const session = request.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const updates = await request.json();

    // Whitelist allowed fields
    const allowedFields = [
      'displayName', 'buddyConfig', 'theme', 'runtimeMode',
      'emailMode', 'forwardTo', 'voiceEnabled',
    ];

    const filtered: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) filtered[key] = updates[key];
    }

    const response = await fetch(
      `${process.env.HEADY_API_URL ?? 'https://api.headyapi.com'}/internal/users/me`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.value}`,
          'X-Service': 'heady-web',
        },
        body: JSON.stringify(filtered),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Update failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, updated: Object.keys(filtered) });
  } catch (error) {
    console.error('[USER_PATCH_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
