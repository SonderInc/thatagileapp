/**
 * Netlify Function: proxy logo upload to Firebase Storage (avoids CORS).
 * POST: multipart form { tenantId, file } -> upload to tenants/{tenantId}/company-logo-{ts}, return { key, url }.
 * GET: ?key=path -> return { url } (download URL for path).
 * Requires: FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string), FIREBASE_STORAGE_BUCKET (optional, defaults from project).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Busboy = require('busboy');

interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
  queryStringParameters?: Record<string, string>;
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

function getBucket() {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (bucket) return bucket;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const parsed = JSON.parse(json) as { project_id?: string };
    if (parsed.project_id) return `${parsed.project_id}.firebasestorage.app`;
  }
  throw new Error('FIREBASE_STORAGE_BUCKET or project_id in service account required');
}

async function parseMultipart(
  event: HandlerEvent
): Promise<{ tenantId: string; file: { data: Buffer; mimeType: string } }> {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Content-Type must be multipart/form-data');
  }
  const body = event.body;
  const isBase64 = event.isBase64Encoded === true;
  const buffer = Buffer.from(body ?? '', isBase64 ? 'base64' : 'utf8');

  return new Promise((resolve, reject) => {
    let tenantId = '';
    let fileData: Buffer[] = [];
    let mimeType = 'application/octet-stream';
    const busboy = Busboy({ headers: { 'content-type': contentType } });

    busboy.on('field', (name: string, value: string) => {
      if (name === 'tenantId') tenantId = value;
    });
    busboy.on('file', (name: string, stream: NodeJS.ReadableStream, info: { mimeType: string }) => {
      if (name !== 'file') {
        stream.resume();
        return;
      }
      mimeType = info.mimeType || mimeType;
      stream.on('data', (chunk: Buffer) => fileData.push(chunk));
    });
    busboy.on('finish', () => {
      if (!tenantId) return reject(new Error('tenantId required'));
      resolve({
        tenantId,
        file: {
          data: Buffer.concat(fileData),
          mimeType,
        },
      });
    });
    busboy.on('error', reject);
    busboy.write(buffer);
    busboy.end();
  });
}

export const handler = async (event: HandlerEvent) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const key = event.queryStringParameters?.key;
      if (!key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'key required' }) };
      }
      const adm = getAdmin();
      const bucketName = getBucket();
      const bucket = adm.storage().bucket(bucketName);
      const file = bucket.file(key);
      const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
      const [url] = await file.getSignedUrl({ action: 'read', expires });
      return { statusCode: 200, headers, body: JSON.stringify({ url }) };
    }

    if (event.httpMethod === 'POST') {
      const { tenantId, file: filePart } = await parseMultipart(event);
      const path = `tenants/${tenantId}/company-logo-${Date.now()}`;
      const adm = getAdmin();
      const bucketName = getBucket();
      const bucket = adm.storage().bucket(bucketName);
      const blob = bucket.file(path);
      await blob.save(filePart.data, {
        contentType: filePart.mimeType,
        metadata: { cacheControl: 'public, max-age=31536000' },
      });
      const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
      const [url] = await blob.getSignedUrl({ action: 'read', expires });
      return { statusCode: 200, headers, body: JSON.stringify({ key: path, url }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: message }),
    };
  }
};
