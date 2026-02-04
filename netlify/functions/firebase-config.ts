/**
 * Netlify Function: return Firebase client config for a tenant (Phase 2: one project per company).
 * GET ?slug=compassion-course or ?companyId=company-123
 * Reads from Firestore collection tenantFirebaseConfigs (registry). Uses same project as FIREBASE_SERVICE_ACCOUNT_JSON.
 * When no tenant config is found, returns default config from FIREBASE_* env vars (same shape as tenant response).
 */

/** Deployment verification: if this header appears in responses, the new function is live. */
const VERSION = 'firebase-config-v3-live';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

const REGISTRY_COLLECTION = 'tenantFirebaseConfigs';

const REQUIRED_DEFAULT_KEYS = ['FIREBASE_PROJECT_ID', 'FIREBASE_API_KEY'] as const;

type ConfigPayload = {
  projectId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
};

function getAdmin() {
  if (admin.apps.length > 0) return admin;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  return admin;
}

function getDefaultConfigFromEnv(): { config: ConfigPayload } | { missing: string[] } {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
  const apiKey = process.env.FIREBASE_API_KEY ?? '';
  const missing = REQUIRED_DEFAULT_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) return { missing: [...missing] };

  const config: ConfigPayload = {
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

const COMMON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'x-firebase-config-version': VERSION,
} as const;

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: { ...COMMON_HEADERS },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: {
  httpMethod?: string;
  queryStringParameters?: Record<string, string>;
}) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...COMMON_HEADERS },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const slug = (event.queryStringParameters?.slug ?? event.queryStringParameters?.companyId ?? '').trim();

  // No slug: return default config from env
  if (!slug) {
    const result = getDefaultConfigFromEnv();
    if ('missing' in result) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[firebase-config] source=default env missing:', result.missing.join(', '));
      }
      return jsonResponse(500, {
        error: 'Default Firebase config incomplete',
        missingKeys: result.missing,
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[firebase-config] source=default');
    }
    return jsonResponse(200, result.config as unknown as Record<string, unknown>);
  }

  try {
    const app = getAdmin();
    const db = app.firestore();
    const doc = await db.collection(REGISTRY_COLLECTION).doc(slug).get();

    if (doc.exists && doc.data()) {
      const data = doc.data() as Record<string, unknown>;
      const projectId = typeof data.projectId === 'string' ? data.projectId : '';
      const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';
      if (projectId && apiKey) {
        const config: ConfigPayload = {
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
        if (process.env.NODE_ENV !== 'production') {
          console.log('[firebase-config] source=tenant slug=', slug);
        }
        return jsonResponse(200, config as unknown as Record<string, unknown>);
      }
    }

    // Tenant not found or invalid: fall back to default config from env
    const result = getDefaultConfigFromEnv();
    if ('missing' in result) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[firebase-config] source=default (tenant not found) env missing:', result.missing.join(', '));
      }
      return jsonResponse(500, {
        error: 'Default Firebase config incomplete',
        missingKeys: result.missing,
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[firebase-config] source=default (tenant not found) slug=', slug);
    }
    return jsonResponse(200, result.config as unknown as Record<string, unknown>);
  } catch (err) {
    console.error('[firebase-config]', err);
    // On registry error, fall back to default config from env
    const result = getDefaultConfigFromEnv();
    if ('missing' in result) {
      return jsonResponse(500, {
        error: 'Default Firebase config incomplete after registry error',
        missingKeys: result.missing,
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[firebase-config] source=default (registry error)');
    }
    return jsonResponse(200, result.config as unknown as Record<string, unknown>);
  }
};
