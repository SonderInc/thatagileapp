/**
 * Netlify Function: return Firebase client config for a tenant (Phase 2).
 * Deployed as .js so Netlify runs this file (overrides .ts when both exist).
 * When no tenant config is found, returns default config from FIREBASE_* env vars.
 */

const VERSION = 'firebase-config-v2-verify';

const admin = require('firebase-admin');

const REGISTRY_COLLECTION = 'tenantFirebaseConfigs';
const REQUIRED_DEFAULT_KEYS = ['FIREBASE_PROJECT_ID', 'FIREBASE_API_KEY'];

function getAdmin() {
  if (admin.apps.length > 0) return admin;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  return admin;
}

function getDefaultConfigFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
  const apiKey = process.env.FIREBASE_API_KEY ?? '';
  const missing = REQUIRED_DEFAULT_KEYS.filter((key) => !(process.env[key] || '').trim());
  if (missing.length > 0) return { missing: [...missing] };

  const config = {
    projectId: projectId.trim(),
    apiKey: apiKey.trim(),
    authDomain:
      (process.env.FIREBASE_AUTH_DOMAIN ?? '').trim() || `${projectId.trim()}.firebaseapp.com`,
    storageBucket:
      (process.env.FIREBASE_STORAGE_BUCKET ?? '').trim() || `${projectId.trim()}.appspot.com`,
  };
  const messagingSenderId = (process.env.FIREBASE_MESSAGING_SENDER_ID ?? '').trim();
  const appId = (process.env.FIREBASE_APP_ID ?? '').trim();
  const measurementId = (process.env.FIREBASE_MEASUREMENT_ID ?? '').trim();
  if (messagingSenderId) config.messagingSenderId = messagingSenderId;
  if (appId) config.appId = appId;
  if (measurementId) config.measurementId = measurementId;

  return { config };
}

function jsonResponse(statusCode, body, cacheMaxAge = 60) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'x-firebase-config-version': VERSION,
      ...(statusCode === 200 && { 'Cache-Control': `public, max-age=${cacheMaxAge}` }),
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'x-firebase-config-version': VERSION },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const slug = (event.queryStringParameters?.slug ?? event.queryStringParameters?.companyId ?? '').trim();

  if (!slug) {
    const result = getDefaultConfigFromEnv();
    if (result.missing) {
      return jsonResponse(500, {
        error: 'Default Firebase config incomplete',
        missingKeys: result.missing,
      });
    }
    return jsonResponse(200, result.config, 60);
  }

  try {
    const app = getAdmin();
    const db = app.firestore();
    const doc = await db.collection(REGISTRY_COLLECTION).doc(slug).get();

    if (doc.exists && doc.data()) {
      const data = doc.data();
      const projectId = typeof data.projectId === 'string' ? data.projectId : '';
      const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';
      if (projectId && apiKey) {
        const config = {
          projectId,
          apiKey,
          authDomain:
            typeof data.authDomain === 'string' ? data.authDomain : `${projectId}.firebaseapp.com`,
          storageBucket:
            typeof data.storageBucket === 'string' ? data.storageBucket : `${projectId}.appspot.com`,
        };
        if (typeof data.messagingSenderId === 'string' && data.messagingSenderId)
          config.messagingSenderId = data.messagingSenderId;
        if (typeof data.appId === 'string' && data.appId) config.appId = data.appId;
        if (typeof data.measurementId === 'string' && data.measurementId)
          config.measurementId = data.measurementId;
        return jsonResponse(200, config, 300);
      }
    }

    const result = getDefaultConfigFromEnv();
    if (result.missing) {
      return jsonResponse(500, {
        error: 'Default Firebase config incomplete',
        missingKeys: result.missing,
      });
    }
    return jsonResponse(200, result.config, 60);
  } catch (err) {
    console.error('[firebase-config]', err);
    const result = getDefaultConfigFromEnv();
    if (result.missing) {
      return jsonResponse(500, {
        error: 'Default Firebase config incomplete after registry error',
        missingKeys: result.missing,
      });
    }
    return jsonResponse(200, result.config, 60);
  }
};
