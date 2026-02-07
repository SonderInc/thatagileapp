/**
 * Netlify Function: create a company user with initial password 12341234.
 * POST: JSON { email, firstName, lastName, companyId, roles[], employeeNumber?, phone? } + Authorization: Bearer <Firebase ID token>.
 * Caller must be admin for companyId (adminCompanyIds or rteCompanyIds). Creates Auth user and users/{uid} with mustChangePassword: true.
 * Requires: FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string).
 */

interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
}

const INITIAL_PASSWORD = '12341234';

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
    let decoded: { uid: string };
    try {
      decoded = await app.auth().verifyIdToken(token);
    } catch {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const callerUid = decoded.uid;
    const raw = typeof event.body === 'string' ? event.body : event.body ?? '{}';
    let parsed: {
      email?: string;
      firstName?: string;
      lastName?: string;
      companyId?: string;
      roles?: string[];
      employeeNumber?: string;
      phone?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const email = typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : '';
    const firstName = typeof parsed.firstName === 'string' ? parsed.firstName.trim() : '';
    const lastName = typeof parsed.lastName === 'string' ? parsed.lastName.trim() : '';
    const companyId = typeof parsed.companyId === 'string' ? parsed.companyId.trim() : '';
    const roles = Array.isArray(parsed.roles) ? parsed.roles.filter((r) => typeof r === 'string') : [];
    const employeeNumber = typeof parsed.employeeNumber === 'string' ? parsed.employeeNumber.trim() || undefined : undefined;
    const phone = typeof parsed.phone === 'string' ? parsed.phone.trim() || undefined : undefined;

    if (!email) return jsonResponse(400, { error: 'email is required' });
    if (!firstName) return jsonResponse(400, { error: 'firstName is required' });
    if (!lastName) return jsonResponse(400, { error: 'lastName is required' });
    if (!companyId) return jsonResponse(400, { error: 'companyId is required' });
    if (roles.length === 0) return jsonResponse(400, { error: 'At least one role is required' });

    const db = app.firestore();
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerData = callerDoc.exists ? callerDoc.data() : null;
    const adminCompanyIds = (callerData?.adminCompanyIds as string[] | undefined) ?? [];
    const rteCompanyIds = (callerData?.rteCompanyIds as string[] | undefined) ?? [];
    const isAdminForCompany = adminCompanyIds.includes(companyId) || rteCompanyIds.includes(companyId);
    if (!isAdminForCompany) {
      return jsonResponse(403, { error: 'You must be an admin for this company to create users' });
    }

    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || email.split('@')[0] || 'User';
    let newUid: string;
    try {
      const userRecord = await app.auth().createUser({
        email,
        password: INITIAL_PASSWORD,
        displayName,
      });
      newUid = userRecord.uid;
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : '';
      if (code === 'auth/email-already-exists') {
        return jsonResponse(400, { error: 'An account with this email already exists' });
      }
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse(400, { error: message });
    }

    const FieldValue = app.firestore.FieldValue;
    const adminCompanyIdsWrite = roles.includes('admin') ? [companyId] : [];
    const rteCompanyIdsWrite = roles.includes('rte-team-of-teams-coach') ? [companyId] : [];
    const userPayload: Record<string, unknown> = {
      email,
      displayName,
      companyId,
      companyIds: [companyId],
      companies: [{ companyId, roles }],
      adminCompanyIds: adminCompanyIdsWrite,
      rteCompanyIds: rteCompanyIdsWrite,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (employeeNumber !== undefined) userPayload.employeeNumber = employeeNumber;
    if (phone !== undefined) userPayload.phone = phone;

    await db.collection('users').doc(newUid).set(userPayload);

    return jsonResponse(200, { uid: newUid, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(500, { error: message });
  }
};
