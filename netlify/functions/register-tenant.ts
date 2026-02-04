/**
 * Netlify Function: single-step registration — create Auth user + company + user profile (admin).
 * POST: JSON { displayName, email, password, companyName, companyType }.
 * Returns custom token so client can sign in; no Bearer token required (public registration).
 * Requires: FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string).
 */

interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

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
  body: Record<string, unknown>
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: HandlerEvent) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const raw = typeof event.body === 'string' ? event.body : event.body ?? '{}';
    let parsed: {
      displayName?: string;
      email?: string;
      password?: string;
      companyName?: string;
      companyType?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
    const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : '';
    const password = typeof parsed.password === 'string' ? parsed.password : '';
    const companyName = typeof parsed.companyName === 'string' ? parsed.companyName.trim() : '';
    const companyType = parsed.companyType === 'training' ? 'training' : 'software';

    if (!email) return jsonResponse(400, { error: 'email is required' });
    if (!password || password.length < 6) return jsonResponse(400, { error: 'password is required (at least 6 characters)' });
    if (!companyName) return jsonResponse(400, { error: 'companyName is required' });

    const slug = slugify(companyName) || 'new-company';

    const app = getAdmin();
    const auth = app.auth();

    let uid: string;
    try {
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0] || 'User',
      });
      uid = userRecord.uid;
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : '';
      if (code === 'auth/email-already-exists') {
        return jsonResponse(409, { error: 'Account already exists. Please sign in.' });
      }
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse(400, { error: message });
    }

    const companyId = `company-${Date.now()}`;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const Timestamp = app.firestore.Timestamp;
    const FieldValue = app.firestore.FieldValue;
    const db = app.firestore();

    await db.collection('companies').doc(companyId).set({
      name: companyName,
      slug,
      companyType,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      seats: 50,
      trialEndsAt: Timestamp.fromDate(trialEndsAt),
    });

    await db.collection('users').doc(uid).set({
      companyId,
      companyIds: [companyId],
      adminCompanyIds: [companyId],
      companies: [{ companyId, roles: ['admin'] }],
      displayName: displayName || email.split('@')[0] || 'User',
      email,
      mustChangePassword: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const customToken = await auth.createCustomToken(uid);

    return jsonResponse(200, {
      customToken,
      slug,
      companyId,
      uid,
      email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: message });
  }
};
