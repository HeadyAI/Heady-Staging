'use strict';

const admin = require('firebase-admin');

let _app = null;

/**
 * Initialize Firebase Admin SDK using environment-based credentials.
 * Supports three modes:
 *   1. GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON)
 *   2. FIREBASE_SERVICE_ACCOUNT env var (JSON string of service account)
 *   3. Application Default Credentials (GCP environments)
 *
 * @returns {admin.app.App}
 */
function initFirebaseAdmin() {
  if (_app) return _app;

  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    _app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    _app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  } else {
    _app = admin.initializeApp({
      projectId,
    });
  }

  return _app;
}

/**
 * Get the initialized Firebase Admin app.
 * @returns {admin.app.App}
 */
function getFirebaseApp() {
  if (!_app) {
    return initFirebaseAdmin();
  }
  return _app;
}

/**
 * Get the Firebase Auth instance.
 * @returns {admin.auth.Auth}
 */
function getAuth() {
  return getFirebaseApp().auth ? getFirebaseApp().auth() : admin.auth(getFirebaseApp());
}

module.exports = {
  initFirebaseAdmin,
  getFirebaseApp,
  getAuth,
};
