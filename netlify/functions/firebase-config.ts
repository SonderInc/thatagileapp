/**
 * Netlify Function: return Firebase client config for a tenant (Phase 2: one project per company).
 * GET ?slug=compassion-course or ?companyId=company-123
 * Reads from Firestore collection tenantFirebaseConfigs (registry). Uses same project as FIREBASE_SERVICE_ACCOUNT_JSON.
 * Returns { useDefault: true } when no dedicated config, else { projectId, apiKey, authDomain, ... }.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const admin = require('firebase-admin');

const REGISTRY_COLLECTION = 'tenantFirebaseConfigs';

function getAdmin() {
  if (admin.apps.length > 0) return admin;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  return admin;
}

export const handler = async (event: { httpMethod?: string; queryStringParameters?: Record<string, string> }) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const slug = event.queryStringParameters?.slug ?? event.queryStringParameters?.companyId ?? '';
  if (!slug || typeof slug !== 'string') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify({ useDefault: true }),
    };
  }
  try {
    const app = getAdmin();
    const db = app.firestore();
    const doc = await db.collection(REGISTRY_COLLECTION).doc(slug.trim()).get();
    if (!doc.exists || !doc.data()) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        body: JSON.stringify({ useDefault: true }),
      };
    }
    const data = doc.data() as Record<string, unknown>;
    const projectId = typeof data.projectId === 'string' ? data.projectId : '';
    const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';
    if (!projectId || !apiKey) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        body: JSON.stringify({ useDefault: true }),
      };
    }
    const config = {
      projectId,
      apiKey,
      authDomain: typeof data.authDomain === 'string' ? data.authDomain : `${projectId}.firebaseapp.com`,
      storageBucket: typeof data.storageBucket === 'string' ? data.storageBucket : `${projectId}.appspot.com`,
      messagingSenderId: typeof data.messagingSenderId === 'string' ? data.messagingSenderId : undefined,
      appId: typeof data.appId === 'string' ? data.appId : undefined,
      measurementId: typeof data.measurementId === 'string' ? data.measurementId : undefined,
    };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify(config),
    };
  } catch (err) {
    console.error('[firebase-config]', err);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useDefault: true }),
    };
  }
};
