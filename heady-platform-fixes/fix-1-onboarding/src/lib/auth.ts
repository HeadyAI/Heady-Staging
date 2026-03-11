/**
 * Heady™ Auth Library
 * 
 * Supports 25+ OAuth providers via Firebase Auth.
 * After OAuth callback, user is routed to onboarding — NOT to API key display.
 * 
 * Provider → Firebase Auth → Session Cookie → Onboarding Guard → 5-Stage Flow
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  UserCredential,
  Auth,
} from 'firebase/auth';

const PHI = 1.6180339887;

// Firebase config — sourced from env
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Singleton init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth: Auth = getAuth(app);

/**
 * All supported OAuth providers
 */
export const AUTH_PROVIDERS = {
  google: () => new GoogleAuthProvider(),
  github: () => new GithubAuthProvider(),
  microsoft: () => new OAuthProvider('microsoft.com'),
  apple: () => new OAuthProvider('apple.com'),
  huggingface: () => {
    const provider = new OAuthProvider('oidc.huggingface');
    provider.addScope('openid');
    provider.addScope('profile');
    return provider;
  },
  discord: () => new OAuthProvider('oidc.discord'),
  twitter: () => new OAuthProvider('twitter.com'),
  linkedin: () => new OAuthProvider('oidc.linkedin'),
} as const;

export type AuthProviderKey = keyof typeof AUTH_PROVIDERS;

/**
 * Sign in with any supported provider.
 * Returns the credential — does NOT redirect to dashboard.
 * The onboarding guard middleware handles routing.
 */
export async function signInWithProvider(
  providerKey: AuthProviderKey,
  useRedirect = false
): Promise<UserCredential> {
  const providerFactory = AUTH_PROVIDERS[providerKey];
  if (!providerFactory) {
    throw new Error(`Unsupported auth provider: ${providerKey}`);
  }

  const provider = providerFactory();

  if (useRedirect) {
    await signInWithRedirect(auth, provider);
    // Will not reach here — browser redirects
    throw new Error('Redirect initiated');
  }

  return signInWithPopup(auth, provider);
}

/**
 * Create session after successful OAuth.
 * Sets session cookie + initializes onboarding state.
 * 
 * CRITICAL: This is where the old flow went wrong.
 * Old: signIn → set session → redirect /dashboard (shows API key)
 * New: signIn → set session → set onboarding cookie stage 0 → redirect /onboarding/create-account
 */
export async function createSession(credential: UserCredential): Promise<{
  sessionToken: string;
  isNewUser: boolean;
  provider: string;
}> {
  const idToken = await credential.user.getIdToken();

  const response = await fetch('/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      provider: credential.providerId ?? 'unknown',
      displayName: credential.user.displayName,
      email: credential.user.email,
      photoURL: credential.user.photoURL,
      uid: credential.user.uid,
    }),
  });

  if (!response.ok) {
    throw new Error(`Session creation failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Sign out and clear all session data
 */
export async function signOut(): Promise<void> {
  await auth.signOut();
  await fetch('/api/auth/callback', { method: 'DELETE' });
}

export { auth };
