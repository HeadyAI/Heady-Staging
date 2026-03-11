import * as admin from 'firebase-admin';
import { createLogger } from './logger.js';

const logger = createLogger('Firebase');

/**
 * Firebase token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  userId?: string;
  email?: string;
  emailVerified?: boolean;
  isAnonymous?: boolean;
  error?: string;
}

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(): void {
  try {
    // Firebase is automatically initialized from GOOGLE_APPLICATION_CREDENTIALS env var
    // Or manually provide credentials file path
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    logger.info('Firebase Admin SDK initialized');
  } catch (error) {
    logger.error('Firebase initialization failed', error);
    throw new Error('Failed to initialize Firebase Admin SDK');
  }
}

/**
 * Verify Firebase ID token
 */
export async function verifyFirebaseToken(
  idToken: string,
): Promise<TokenVerificationResult> {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    return {
      valid: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      isAnonymous: decodedToken.sign_in_provider === 'anonymous',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Firebase token verification failed', {
      error: errorMessage,
    });

    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * Get user info from Firebase
 */
export async function getFirebaseUser(userId: string) {
  try {
    const user = await admin.auth().getUser(userId);

    return {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Failed to get Firebase user', {
      userId,
      error: errorMessage,
    });

    return null;
  }
}

/**
 * Revoke Firebase user sessions (all tokens become invalid)
 */
export async function revokeUserSessions(userId: string): Promise<boolean> {
  try {
    await admin.auth().revokeRefreshTokens(userId);

    logger.info('Firebase user sessions revoked', { userId });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Failed to revoke Firebase user sessions', {
      userId,
      error: errorMessage,
    });

    return false;
  }
}

/**
 * Create custom token for backend authentication
 */
export async function createCustomToken(userId: string, additionalClaims?: Record<string, unknown>) {
  try {
    const customToken = await admin.auth().createCustomToken(userId, additionalClaims);

    logger.debug('Custom token created', { userId });

    return customToken;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Failed to create custom token', {
      userId,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Delete Firebase user
 */
export async function deleteFirebaseUser(userId: string): Promise<boolean> {
  try {
    await admin.auth().deleteUser(userId);

    logger.info('Firebase user deleted', { userId });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Failed to delete Firebase user', {
      userId,
      error: errorMessage,
    });

    return false;
  }
}

export default {
  initializeFirebase,
  verifyFirebaseToken,
  getFirebaseUser,
  revokeUserSessions,
  createCustomToken,
  deleteFirebaseUser,
};
