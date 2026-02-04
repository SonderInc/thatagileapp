/**
 * Netlify Function: provision a company and set the signed-in user as admin.
 * POST: JSON { name, slug, companyType } + Authorization: Bearer <Firebase ID token>.
 * Creates companies/{companyId}, upserts users/{uid} with single-company membership and admin.
 * Requires: FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string).
 */

interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let admin: typeof import('firebase-admin') | null = null;

function getAdmin() {
  if (admin) return admin;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  }
  return admin;
}

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {}
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: HandlerEvent) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const authHeader = event.headers['authorization'] || event.headers['Authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) {
      return jsonResponse(401, { error: 'Missing or invalid token' });
    }

    const app = getAdmin();
    let decoded: { uid: string; email?: string; name?: string };
    try {
      decoded = await app.auth().verifyIdToken(token);
    } catch {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const uid = decoded.uid;
    const body = event.body;
    const raw = typeof body === 'string' ? body : body ?? '{}';
    let parsed: { name?: string; slug?: string; companyType?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const slug = typeof parsed.slug === 'string' ? parsed.slug.trim() : '';
    const companyType =
      parsed.companyType === 'training' ? 'training' : 'software';

    if (!name) {
      return jsonResponse(400, { error: 'name is required and must be non-empty' });
    }
    if (!SLUG_PATTERN.test(slug)) {
      return jsonResponse(400, {
        error: 'slug must match lowercase letters, numbers, and hyphens only',
      });
    }

    const db = app.firestore();
    const usersRef = db.collection('users').doc(uid);
    const userSnap = await usersRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const existingCompanyIds = (userData?.companyIds as string[] | undefined) ?? [];
    if (existingCompanyIds.length > 0) {
      return jsonResponse(409, {
        error: 'This user already belongs to a company.',
      });
    }

    const companyId = `company-${Date.now()}`;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const Timestamp = app.firestore.Timestamp;
    const FieldValue = app.firestore.FieldValue;

    const companiesRef = db.collection('companies').doc(companyId);
    await companiesRef.set({
      name,
      slug,
      companyType,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      seats: 50,
      trialEndsAt: Timestamp.fromDate(trialEndsAt),
    });

    const email = (decoded.email ?? '').toString().toLowerCase().trim();
    const displayName =
      (userData?.displayName as string | undefined)?.trim() ||
      (decoded.name as string | undefined)?.trim() ||
      '';

    const userPayload: Record<string, unknown> = {
      companyId,
      companyIds: [companyId],
      adminCompanyIds: [companyId],
      companies: [{ companyId, roles: ['admin'] }],
      email,
      displayName,
      mustChangePassword: false,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!userSnap.exists) {
      userPayload.createdAt = FieldValue.serverTimestamp();
    }
    await usersRef.set(userPayload, { merge: false });

    return jsonResponse(200, { companyId, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: message });
  }
};
